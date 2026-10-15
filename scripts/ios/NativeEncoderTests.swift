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
                var details: [String: Any] = [NSLocalizedDescriptionKey: error?.message ?? "Native rejection without details"]
                if let cause = error?.error { details[NSUnderlyingErrorKey] = cause }
                failure = NSError(domain: error?.code ?? "encoder", code: 1,
                                  userInfo: details)
                done.fulfill()
            })!
        switch method {
        case "encode": plugin.encode(call)
        case "cancel": plugin.cancel(call)
        case "stripAudio": plugin.stripAudio(call)
        case "deleteFile": plugin.deleteFile(call)
        default: throw NSError(domain: "UnknownTestMethod", code: 1)
        }
        wait(for: [done], timeout: 180)
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
            // A moving textured image exercises the real compression budget.
            // A flat color clip can legitimately fall below the integrity floor.
            let bytes = try XCTUnwrap(CVPixelBufferGetBaseAddress(pixel)).assumingMemoryBound(to: UInt32.self)
            let stride = CVPixelBufferGetBytesPerRow(pixel) / 4
            for y in 0..<height {
                for x in 0..<width {
                    let grid = ((x / 12 + y / 12 + frame / 3) % 2) * 100
                    let blue = UInt32((x + frame * 11 + grid) % 256)
                    let green = UInt32((y + frame * 7 + grid) % 256)
                    let red = UInt32((x / 2 + y / 2 + frame * 13) % 256)
                    bytes[y * stride + x] = 0xff000000 | (red << 16) | (green << 8) | blue
                }
            }
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
        let numericKeys = ["width", "height", "frameRate", "videoBitrate", "averageBitrate",
                           "durationSeconds", "fileSize", "encodingAttempts"]
        print("KWS_NATIVE_ENCODER_VERIFIED", metadata.filter { numericKeys.contains($0.key) })
        XCTAssertEqual(metadata["skipped"] as? Bool, false)
        XCTAssertEqual(metadata["playable"] as? Bool, true)
        XCTAssertLessThanOrEqual(try XCTUnwrap(metadata["frameRate"] as? Double), 30.25)
        XCTAssertGreaterThanOrEqual(try XCTUnwrap(metadata["frameRate"] as? Double), 24)
        XCTAssertLessThanOrEqual(try XCTUnwrap(metadata["videoBitrate"] as? Int), 4_600_000)
        XCTAssertLessThanOrEqual(try XCTUnwrap(metadata["averageBitrate"] as? Int), 4_800_000)
        let output = URL(fileURLWithPath: try XCTUnwrap(metadata["path"] as? String))
        defer { try? FileManager.default.removeItem(at: output) }
        XCTAssertNotEqual(output, source)
        XCTAssertTrue(FileManager.default.fileExists(atPath: source.path))
        let asset = AVURLAsset(url: output)
        let track = try XCTUnwrap(asset.tracks(withMediaType: .video).first)
        XCTAssertTrue(asset.isPlayable)
        XCTAssertEqual(asset.tracks(withMediaType: .video).count, 1)
        XCTAssertEqual(asset.tracks(withMediaType: .audio).count, 0)
        XCTAssertLessThanOrEqual(max(track.naturalSize.width, track.naturalSize.height), 1920)
        XCTAssertGreaterThanOrEqual(max(track.naturalSize.width, track.naturalSize.height), 640)
        XCTAssertEqual(track.naturalSize.width / track.naturalSize.height, 16.0 / 9.0, accuracy: 0.01)
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

    private func audioFixture() throws -> URL {
        let videoURL = try fixture(width: 640, height: 360, fps: 30)
        // A real PCM WAV sine wave; AVFoundation exports it as AAC in the fixture MP4.
        let samples = 44100 * 3
        var wav = Data()
        func text(_ value: String) { wav.append(value.data(using: .ascii)!) }
        func u32(_ value: UInt32) { var number = value.littleEndian; withUnsafeBytes(of: &number) { wav.append(contentsOf: $0) } }
        func u16(_ value: UInt16) { var number = value.littleEndian; withUnsafeBytes(of: &number) { wav.append(contentsOf: $0) } }
        text("RIFF"); u32(UInt32(36 + samples * 2)); text("WAVEfmt "); u32(16)
        u16(1); u16(1); u32(44100); u32(88200); u16(2); u16(16); text("data"); u32(UInt32(samples * 2))
        for sample in 0..<samples { u16(UInt16(bitPattern: Int16(sin(Double(sample) * 2 * .pi * 440 / 44100) * 8000))) }
        let sound = directory.appendingPathComponent("sound.wav")
        try wav.write(to: sound)
        let video = AVURLAsset(url: videoURL)
        let audio = AVURLAsset(url: sound)
        let composition = AVMutableComposition()
        let videoTrack = try XCTUnwrap(video.tracks(withMediaType: .video).first)
        try XCTUnwrap(composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid))
            .insertTimeRange(videoTrack.timeRange, of: videoTrack, at: .zero)
        try XCTUnwrap(composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid))
            .insertTimeRange(CMTimeRange(start: .zero, duration: video.duration),
                             of: try XCTUnwrap(audio.tracks(withMediaType: .audio).first), at: .zero)
        let output = directory.appendingPathComponent("source-with-audio.mp4")
        let export = try XCTUnwrap(AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality))
        export.outputURL = output; export.outputFileType = .mp4
        let done = expectation(description: "audio fixture")
        export.exportAsynchronously { done.fulfill() }
        wait(for: [done], timeout: 60)
        XCTAssertEqual(export.status, .completed)
        XCTAssertEqual(AVURLAsset(url: output).tracks(withMediaType: .audio).count, 1)
        return output
    }

    func testLosslessFallbackRemovesAudioAndKeepsSource() throws {
        let source = try audioFixture()
        let metadata = try invoke("stripAudio", options: ["inputPath": source.path, "operationId": UUID().uuidString])
        let output = URL(fileURLWithPath: try XCTUnwrap(metadata["path"] as? String))
        defer { try? FileManager.default.removeItem(at: output) }
        let result = AVURLAsset(url: output)
        XCTAssertTrue(result.isPlayable)
        XCTAssertEqual(result.tracks(withMediaType: .video).count, 1)
        XCTAssertTrue(result.tracks(withMediaType: .audio).isEmpty)
        XCTAssertEqual(CMTimeGetSeconds(result.duration), CMTimeGetSeconds(AVURLAsset(url: source).duration), accuracy: 0.1)
        XCTAssertTrue(FileManager.default.fileExists(atPath: source.path))
        XCTAssertEqual(AVURLAsset(url: source).tracks(withMediaType: .audio).count, 1)
        // Reusing a silent source must not generate another file.
        let repeated = try invoke("stripAudio", options: ["inputPath": output.path, "operationId": UUID().uuidString])
        XCTAssertEqual(repeated["skipped"] as? Bool, true)
        XCTAssertEqual(repeated["path"] as? String, output.path)
    }
}
