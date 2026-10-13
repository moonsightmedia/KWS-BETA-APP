import XCTest
import AVFoundation
import Capacitor
import App

/// Real AVFoundation and the shipping plugin; no mocked encoder or live uploads.
final class NativeEncoderTests: XCTestCase {
    private var directory: URL!
    private let plugin = UploadMasterEncoderPlugin()

    override func setUpWithError() throws {
        continueAfterFailure = false
        directory = FileManager.default.temporaryDirectory.appendingPathComponent("kws-native-qa-\(UUID().uuidString)")
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    }

    override func tearDownWithError() throws {
        // Only our uniquely created test directory, never user-selected media.
        if let directory { try FileManager.default.removeItem(at: directory) }
    }

    private func invoke(_ method: String, options: [String: Any]) throws -> [String: Any] {
        let done = expectation(description: method)
        var result: [String: Any]?
        var failure: NSError?
        let call = CAPPluginCall(callbackId: UUID().uuidString, methodName: method, options: options,
            success: { response, _ in result = response.map { $0.data ?? [:] }; done.fulfill() },
            error: { error in
                failure = NSError(domain: error?.code ?? "encoder", code: 1,
                                  userInfo: [NSLocalizedDescriptionKey: error?.message ?? "Native rejection without details"])
                done.fulfill()
            })!
        switch method {
        case "encode": plugin.encode(call)
        case "cancel": plugin.cancel(call)
        case "deleteFile": plugin.deleteFile(call)
        default: throw NSError(domain: "UnknownTestMethod", code: 1)
        }
        wait(for: [done], timeout: 90)
        if let failure { throw failure }
        return try XCTUnwrap(result)
    }

    private func fixture(width: Int = 2560, height: Int = 1440, fps: Int32 = 60) throws -> URL {
        let url = directory.appendingPathComponent("source-\(UUID().uuidString).mp4")
        let writer = try AVAssetWriter(outputURL: url, fileType: .mp4)
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: width, AVVideoHeightKey: height,
            AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 12_000_000]
        ])
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input,
            sourcePixelBufferAttributes: [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
                kCVPixelBufferWidthKey as String: width,
                kCVPixelBufferHeightKey as String: height
            ])
        XCTAssertTrue(writer.canAdd(input))
        writer.add(input)
        XCTAssertTrue(writer.startWriting())
        writer.startSession(atSourceTime: .zero)
        let deadline = Date().addingTimeInterval(60)
        for frame in 0..<90 {
            while !input.isReadyForMoreMediaData && Date() < deadline { Thread.sleep(forTimeInterval: 0.005) }
            XCTAssertTrue(input.isReadyForMoreMediaData, "Fixture writer stalled")
            var buffer: CVPixelBuffer?
            XCTAssertEqual(CVPixelBufferPoolCreatePixelBuffer(nil, try XCTUnwrap(adaptor.pixelBufferPool), &buffer), kCVReturnSuccess)
            let pixel = try XCTUnwrap(buffer)
            CVPixelBufferLockBaseAddress(pixel, [])
            memset(CVPixelBufferGetBaseAddress(pixel), Int32((frame * 7) % 256), CVPixelBufferGetBytesPerRow(pixel) * height)
            CVPixelBufferUnlockBaseAddress(pixel, [])
            XCTAssertTrue(adaptor.append(pixel, withPresentationTime: CMTime(value: Int64(frame), timescale: fps)))
        }
        input.markAsFinished()
        writer.endSession(atSourceTime: CMTime(value: 90, timescale: fps))
        let finished = expectation(description: "fixture writer")
        writer.finishWriting { finished.fulfill() }
        wait(for: [finished], timeout: 60)
        XCTAssertEqual(writer.status, .completed, "A real playable input is required")
        return url
    }

    func testLargeHighFrameRateVideoIsEncodedAndDecodable() throws {
        let source = try fixture()
        let metadata = try invoke("encode", options: ["inputPath": source.path, "operationId": UUID().uuidString])
        XCTAssertEqual(metadata["skipped"] as? Bool, false)
        XCTAssertEqual(metadata["playable"] as? Bool, true)
        let output = URL(fileURLWithPath: try XCTUnwrap(metadata["path"] as? String))
        defer { try? FileManager.default.removeItem(at: output) }
        XCTAssertNotEqual(output, source)
        XCTAssertTrue(FileManager.default.fileExists(atPath: source.path))
        let asset = AVURLAsset(url: output)
        let track = try XCTUnwrap(asset.tracks(withMediaType: .video).first)
        XCTAssertTrue(asset.isPlayable)
        XCTAssertEqual(asset.tracks(withMediaType: .video).count, 1)
        XCTAssertLessThanOrEqual(max(track.naturalSize.width, track.naturalSize.height), 1920)
        XCTAssertLessThanOrEqual(track.nominalFrameRate, 30.25)
        XCTAssertEqual(CMTimeGetSeconds(asset.duration), 1.5, accuracy: 0.25)
        let reader = try AVAssetReader(asset: asset)
        let decoded = AVAssetReaderTrackOutput(track: track,
            outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
        reader.add(decoded)
        XCTAssertTrue(reader.startReading())
        var frames = 0
        while let sample = decoded.copyNextSampleBuffer() {
            XCTAssertNotNil(CMSampleBufferGetImageBuffer(sample))
            frames += 1
        }
        XCTAssertEqual(reader.status, .completed)
        XCTAssertGreaterThan(frames, 20, "Encoded bytes must decode into real frames")
        _ = try invoke("deleteFile", options: ["path": output.path])
        _ = try invoke("deleteFile", options: ["path": output.path])
        XCTAssertFalse(FileManager.default.fileExists(atPath: output.path))
        XCTAssertTrue(FileManager.default.fileExists(atPath: source.path))
    }

    func testChangedPickerMetadataAndInvalidFileAreRejected() throws {
        let source = try fixture(width: 640, height: 360, fps: 30)
        XCTAssertThrowsError(try invoke("encode", options: [
            "inputPath": source.path, "operationId": UUID().uuidString,
            "sourceWidth": 100, "sourceHeight": 100
        ]))
        let invalid = directory.appendingPathComponent("invalid.mp4")
        try Data("synthetic invalid video".utf8).write(to: invalid)
        XCTAssertThrowsError(try invoke("encode", options: ["inputPath": invalid.path, "operationId": UUID().uuidString]))
        XCTAssertTrue(FileManager.default.fileExists(atPath: invalid.path))
    }

    func testCancellationBeforeEncodeRejectsWithoutDeletingSource() throws {
        let source = try fixture(width: 640, height: 360, fps: 30)
        let operation = UUID().uuidString
        _ = try invoke("cancel", options: ["operationId": operation])
        XCTAssertThrowsError(try invoke("encode", options: ["inputPath": source.path, "operationId": operation])) { error in
            XCTAssertEqual((error as NSError).domain, "ABORT_ERR")
        }
        XCTAssertTrue(FileManager.default.fileExists(atPath: source.path))
    }
}
