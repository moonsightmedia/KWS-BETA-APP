import AVFoundation
import Capacitor

/** KWS Upload Master Encoder v1.2.0. App-local and registered by KWSBridgeViewController. */
@objc(UploadMasterEncoderPlugin)
public final class UploadMasterEncoderPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "UploadMasterEncoderPlugin"
    public let jsName = "UploadMasterEncoder"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "encode", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteFile", returnType: CAPPluginReturnPromise)
    ]

    private let encoderVersion = "1.2.0"
    // Matches the server HD contract. The validation headroom permits normal
    // encoder variance without allowing an unexpectedly expensive upload.
    private let targetVideoBitrate = 4_000_000
    private let targetAudioBitrate = 128_000
    private let maxFrameRate = 30.0
    private let maximumVideoBitrate = 4_600_000.0
    private let maximumTotalBitrate = 4_800_000.0
    private let workQueue = DispatchQueue(label: "de.kletterwelt.upload-master-encoder", qos: .userInitiated)
    private let registryLock = NSLock()
    private var jobs: [String: EncodingJob] = [:]
    private var pendingCancellation: Set<String> = []

    @objc public func encode(_ call: CAPPluginCall) {
        guard let path = call.getString("inputPath"), !path.isEmpty,
              let operationId = call.getString("operationId"), !operationId.isEmpty else {
            call.reject("inputPath and operationId are required")
            return
        }

        let inputURL = fileURL(for: path)
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("kws-upload-master-\(UUID().uuidString).mp4")
        let expectedDuration = call.getDouble("sourceDurationSeconds")
        let expectedWidth = call.getInt("sourceWidth")
        let expectedHeight = call.getInt("sourceHeight")
        let job = EncodingJob(id: operationId, outputURL: outputURL)
        guard register(job) else {
            rejectCancelled(call)
            return
        }

        workQueue.async { [weak self] in
            self?.loadAndEncode(inputURL: inputURL, job: job, call: call,
                                expectedDuration: expectedDuration,
                                expectedWidth: expectedWidth,
                                expectedHeight: expectedHeight)
        }
    }

    @objc public func cancel(_ call: CAPPluginCall) {
        guard let operationId = call.getString("operationId"), !operationId.isEmpty else {
            call.reject("operationId is required")
            return
        }
        registryLock.lock()
        let job = jobs[operationId]
        if job == nil { pendingCancellation.insert(operationId) }
        registryLock.unlock()
        job?.cancel()

        // Covers the narrow race where JS aborts before encode reaches the native queue.
        workQueue.asyncAfter(deadline: .now() + 30) { [weak self] in
            self?.registryLock.lock()
            self?.pendingCancellation.remove(operationId)
            self?.registryLock.unlock()
        }
        call.resolve()
    }

    @objc public func deleteFile(_ call: CAPPluginCall) {
        guard let path = call.getString("path"), !path.isEmpty else {
            call.reject("path is required")
            return
        }
        do {
            try FileManager.default.removeItem(at: fileURL(for: path))
            call.resolve()
        } catch {
            if (error as NSError).code == NSFileNoSuchFileError { call.resolve() }
            else { call.reject("Could not delete encoded video", nil, error) }
        }
    }

    private func register(_ job: EncodingJob) -> Bool {
        registryLock.lock(); defer { registryLock.unlock() }
        if pendingCancellation.remove(job.id) != nil { return false }
        guard jobs[job.id] == nil else { return false }
        jobs[job.id] = job
        return true
    }

    private func finish(_ job: EncodingJob) {
        job.clearCancellationHandlers()
        registryLock.lock()
        jobs.removeValue(forKey: job.id)
        pendingCancellation.remove(job.id)
        registryLock.unlock()
    }

    private func fileURL(for value: String) -> URL {
        if let url = URL(string: value), url.isFileURL { return url }
        return URL(fileURLWithPath: value)
    }

    private func loadAndEncode(inputURL: URL, job: EncodingJob, call: CAPPluginCall,
                               expectedDuration: Double?, expectedWidth: Int?, expectedHeight: Int?) {
        guard FileManager.default.fileExists(atPath: inputURL.path) else {
            finish(job); call.reject("Input video does not exist"); return
        }
        if job.isCancelled { finish(job); rejectCancelled(call); return }

        let asset = AVURLAsset(url: inputURL)
        asset.loadValuesAsynchronously(forKeys: ["playable", "duration", "tracks"]) { [weak self] in
            guard let self else { return }
            self.workQueue.async {
                var keyError: NSError?
                guard asset.statusOfValue(forKey: "tracks", error: &keyError) == .loaded,
                      asset.statusOfValue(forKey: "duration", error: &keyError) == .loaded,
                      asset.statusOfValue(forKey: "playable", error: &keyError) == .loaded,
                      asset.isPlayable else {
                    self.finish(job); call.reject("Input video is not playable", nil, keyError); return
                }
                self.encodeLoadedAsset(asset, inputURL: inputURL, job: job, call: call,
                                       expectedDuration: expectedDuration,
                                       expectedWidth: expectedWidth, expectedHeight: expectedHeight)
            }
        }
    }

    private func encodeLoadedAsset(_ asset: AVAsset, inputURL: URL, job: EncodingJob, call: CAPPluginCall,
                                   expectedDuration: Double?, expectedWidth: Int?, expectedHeight: Int?) {
        guard !job.isCancelled else { finish(job); rejectCancelled(call); return }
        let sourceVideos = asset.tracks(withMediaType: .video)
        let sourceAudios = asset.tracks(withMediaType: .audio)
        guard sourceVideos.count == 1, let videoTrack = sourceVideos.first else {
            finish(job); call.reject("Input must contain exactly one video track"); return
        }

        let sourceDuration = CMTimeGetSeconds(asset.duration)
        let sourceVideoDuration = CMTimeGetSeconds(videoTrack.timeRange.duration)
        let sourceDisplaySize = displaySize(for: videoTrack)
        guard sourceDuration.isFinite, sourceDuration > 0,
              sourceDisplaySize.width > 0, sourceDisplaySize.height > 0 else {
            finish(job); call.reject("Input duration or dimensions are invalid"); return
        }
        if !matchesPickerMetadata(duration: sourceDuration, size: sourceDisplaySize,
                                  expectedDuration: expectedDuration,
                                  expectedWidth: expectedWidth, expectedHeight: expectedHeight) {
            finish(job); call.reject("Input video metadata changed after selection"); return
        }

        let sourceBytes = fileSize(inputURL)
        let sourceTotalBitrate = sourceDuration > 0 ? Double(sourceBytes) * 8 / sourceDuration : 0
        let sourceFrameRate = resolvedFrameRate(videoTrack)
        let sourceStats: (frameRate: Double, videoBitrate: Double, frameCount: Int)
        do {
            sourceStats = try videoSampleStats(asset: asset, track: videoTrack,
                                               duration: sourceVideoDuration, job: job)
        } catch {
            finish(job)
            if job.isCancelled || (error as? EncoderError) == .cancelled { rejectCancelled(call) }
            else { call.reject("Could not inspect source video samples", nil, error) }
            return
        }
        let sourceVideoBitrate = sourceStats.videoBitrate
        let sourceFrameCount = sourceStats.frameCount
        if max(sourceDisplaySize.width, sourceDisplaySize.height) <= 1920,
           sourceFrameRate > 0, sourceFrameRate <= maxFrameRate + 0.25,
           sourceVideoBitrate > 0, sourceVideoBitrate <= maximumVideoBitrate,
           sourceTotalBitrate > 0, sourceTotalBitrate <= maximumTotalBitrate {
            guard !job.isCancelled else { finish(job); rejectCancelled(call); return }
            finish(job)
            call.resolve(baseMetadata(path: inputURL.path, bytes: sourceBytes, duration: sourceDuration,
                                      size: sourceDisplaySize, videoTracks: 1,
                                      audioTracks: sourceAudios.count, totalBitrate: sourceTotalBitrate,
                                      videoBitrate: sourceVideoBitrate, frameRate: sourceFrameRate,
                                      skipped: true))
            return
        }

        let outputSize = evenConstrainedSize(sourceDisplaySize)
        guard !job.isCancelled else { finish(job); rejectCancelled(call); return }
        do {
            try? FileManager.default.removeItem(at: job.outputURL)
            let reader = try AVAssetReader(asset: asset)
            let writer = try AVAssetWriter(outputURL: job.outputURL, fileType: .mp4)
            writer.shouldOptimizeForNetworkUse = true

            let composition = makeVideoComposition(asset: asset, track: videoTrack,
                                                   sourceDisplaySize: sourceDisplaySize,
                                                   outputSize: outputSize,
                                                   sourceFrameRate: sourceFrameRate)
            let videoOutput = AVAssetReaderVideoCompositionOutput(videoTracks: [videoTrack], videoSettings: [
                kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarVideoRange
            ])
            videoOutput.videoComposition = composition
            videoOutput.alwaysCopiesSampleData = false
            guard reader.canAdd(videoOutput) else { throw EncoderError.cannotAdd("video composition output") }
            reader.add(videoOutput)

            let outputFrameRate = min(maxFrameRate, sourceFrameRate > 0 ? sourceFrameRate : maxFrameRate)
            let videoInput = AVAssetWriterInput(mediaType: .video,
                                                outputSettings: videoSettings(size: outputSize, frameRate: outputFrameRate))
            videoInput.expectsMediaDataInRealTime = false
            guard writer.canAdd(videoInput) else { throw EncoderError.cannotAdd("video writer input") }
            writer.add(videoInput)

            var audioOutput: AVAssetReaderTrackOutput?
            var audioInput: AVAssetWriterInput?
            var expectedAudioChannels: Int?
            var expectedAudioSampleRate: Double?
            var expectedAudioDuration: Double?
            if let audioTrack = sourceAudios.first {
                let format = try sourceAudioFormat(audioTrack)
                expectedAudioChannels = format.channels
                expectedAudioSampleRate = format.sampleRate
                expectedAudioDuration = CMTimeGetSeconds(audioTrack.timeRange.duration)
                let output = AVAssetReaderTrackOutput(track: audioTrack, outputSettings: [
                    AVFormatIDKey: kAudioFormatLinearPCM
                ])
                output.alwaysCopiesSampleData = false
                let input = AVAssetWriterInput(mediaType: .audio, outputSettings: [
                    AVFormatIDKey: kAudioFormatMPEG4AAC,
                    AVEncoderBitRateKey: targetAudioBitrate,
                    AVNumberOfChannelsKey: format.channels,
                    AVSampleRateKey: format.sampleRate
                ])
                guard reader.canAdd(output), writer.canAdd(input) else {
                    throw EncoderError.cannotAdd("audio reader/writer path")
                }
                reader.add(output); writer.add(input)
                audioOutput = output; audioInput = input
            }

            job.attach(reader: reader, writer: writer)
            guard !job.isCancelled else { throw EncoderError.cancelled }
            guard writer.startWriting() else { throw writer.error ?? EncoderError.startFailed }
            guard reader.startReading() else { throw reader.error ?? EncoderError.startFailed }
            writer.startSession(atSourceTime: .zero)

            appendTracks(reader: reader, writer: writer, job: job,
                         videoOutput: videoOutput, videoInput: videoInput,
                         audioOutput: audioOutput, audioInput: audioInput,
                         sourceDuration: sourceDuration, sourceVideoDuration: sourceVideoDuration,
                         expectedSize: outputSize,
                         maximumFrameCount: sourceFrameCount,
                         expectedAudioChannels: expectedAudioChannels,
                         expectedAudioSampleRate: expectedAudioSampleRate,
                         expectedAudioDuration: expectedAudioDuration, call: call)
        } catch {
            job.stopWithoutMarkingCancelled()
            try? FileManager.default.removeItem(at: job.outputURL)
            finish(job)
            if job.isCancelled || (error as? EncoderError) == .cancelled { rejectCancelled(call) }
            else { call.reject("Could not create upload master", nil, error) }
        }
    }

    private func appendTracks(reader: AVAssetReader, writer: AVAssetWriter, job: EncodingJob,
                              videoOutput: AVAssetReaderOutput, videoInput: AVAssetWriterInput,
                              audioOutput: AVAssetReaderOutput?, audioInput: AVAssetWriterInput?,
                              sourceDuration: Double, sourceVideoDuration: Double, expectedSize: CGSize,
                              maximumFrameCount: Int,
                              expectedAudioChannels: Int?, expectedAudioSampleRate: Double?,
                              expectedAudioDuration: Double?,
                              call: CAPPluginCall) {
        let group = DispatchGroup()
        let result = AppendResult()
        group.enter()
        append(output: videoOutput, input: videoInput, writer: writer, job: job,
               queueLabel: "de.kletterwelt.upload-master-encoder.video",
               minimumFrameSpacing: 1.0 / maxFrameRate) { error in
            result.record(error)
            if error != nil { job.interruptPendingAppends() }
            group.leave()
        }
        if let audioOutput, let audioInput {
            group.enter()
            append(output: audioOutput, input: audioInput, writer: writer, job: job,
                   queueLabel: "de.kletterwelt.upload-master-encoder.audio",
                   minimumFrameSpacing: nil) { error in
                result.record(error)
                if error != nil { job.interruptPendingAppends() }
                group.leave()
            }
        }

        group.notify(queue: workQueue) { [weak self] in
            guard let self else { return }
            if job.isCancelled || reader.status == .cancelled {
                job.stopWithoutMarkingCancelled(); try? FileManager.default.removeItem(at: job.outputURL)
                self.finish(job); self.rejectCancelled(call); return
            }
            if let error = result.error ?? (reader.status == .failed ? reader.error : nil) {
                job.stopWithoutMarkingCancelled(); try? FileManager.default.removeItem(at: job.outputURL)
                self.finish(job); call.reject("Encoding stream failed", nil, error); return
            }
            writer.finishWriting { [weak self] in
                guard let self else { return }
                if job.isCancelled {
                    try? FileManager.default.removeItem(at: job.outputURL)
                    self.finish(job); self.rejectCancelled(call); return
                }
                guard writer.status == .completed else {
                    try? FileManager.default.removeItem(at: job.outputURL)
                    self.finish(job); call.reject("Video encoding failed", nil, writer.error ?? EncoderError.writeFailed); return
                }
                self.validateOutput(url: job.outputURL, sourceDuration: sourceDuration,
                                    sourceVideoDuration: sourceVideoDuration,
                                    expectedSize: expectedSize,
                                    maximumFrameCount: maximumFrameCount,
                                    expectedAudioChannels: expectedAudioChannels,
                                    expectedAudioSampleRate: expectedAudioSampleRate,
                                    expectedAudioDuration: expectedAudioDuration) { validation in
                    if job.isCancelled {
                        try? FileManager.default.removeItem(at: job.outputURL)
                        self.finish(job); self.rejectCancelled(call); return
                    }
                    switch validation {
                    case .success(let metadata):
                        self.finish(job); call.resolve(metadata)
                    case .failure(let error):
                        try? FileManager.default.removeItem(at: job.outputURL)
                        self.finish(job); call.reject("Encoded video validation failed", nil, error)
                    }
                }
            }
        }
    }

    private func append(output: AVAssetReaderOutput, input: AVAssetWriterInput, writer: AVAssetWriter,
                        job: EncodingJob, queueLabel: String, minimumFrameSpacing: Double?,
                        completion: @escaping (Error?) -> Void) {
        let callbackQueue = DispatchQueue(label: queueLabel)
        let gate = CompletionGate(completion)
        job.onCancel { gate.finish(EncoderError.cancelled) }
        var lastWritten = CMTime.invalid
        input.requestMediaDataWhenReady(on: callbackQueue) {
            while input.isReadyForMoreMediaData {
                if job.isCancelled { gate.finish(EncoderError.cancelled); return }
                guard let sample = output.copyNextSampleBuffer() else {
                    input.markAsFinished(); gate.finish(nil); return
                }
                if let minimumFrameSpacing {
                    let pts = CMSampleBufferGetPresentationTimeStamp(sample)
                    if lastWritten.isValid,
                       CMTimeGetSeconds(CMTimeSubtract(pts, lastWritten)) < minimumFrameSpacing - 0.001 {
                        continue
                    }
                    lastWritten = pts
                }
                if !input.append(sample) {
                    input.markAsFinished()
                    gate.finish(writer.error ?? EncoderError.appendFailed)
                    return
                }
            }
        }
    }

    private func makeVideoComposition(asset: AVAsset, track: AVAssetTrack, sourceDisplaySize: CGSize,
                                      outputSize: CGSize, sourceFrameRate: Double) -> AVMutableVideoComposition {
        let composition = AVMutableVideoComposition()
        composition.renderSize = outputSize
        let fps = min(maxFrameRate, sourceFrameRate > 0 ? sourceFrameRate : maxFrameRate)
        composition.frameDuration = CMTime(seconds: 1 / fps, preferredTimescale: 60_000)

        let sourceRect = CGRect(origin: .zero, size: track.naturalSize)
            .applying(track.preferredTransform).standardized
        let scale = min(outputSize.width / sourceDisplaySize.width,
                        outputSize.height / sourceDisplaySize.height)
        let offsetX = (outputSize.width - sourceDisplaySize.width * scale) / 2
        let offsetY = (outputSize.height - sourceDisplaySize.height * scale) / 2
        let sourceTransform = track.preferredTransform
        let renderTransform = CGAffineTransform(
            a: sourceTransform.a * scale, b: sourceTransform.b * scale,
            c: sourceTransform.c * scale, d: sourceTransform.d * scale,
            tx: (sourceTransform.tx - sourceRect.minX) * scale + offsetX,
            ty: (sourceTransform.ty - sourceRect.minY) * scale + offsetY
        )
        let layer = AVMutableVideoCompositionLayerInstruction(assetTrack: track)
        layer.setTransform(renderTransform, at: .zero)
        let instruction = AVMutableVideoCompositionInstruction()
        instruction.timeRange = CMTimeRange(start: .zero, duration: asset.duration)
        instruction.layerInstructions = [layer]
        composition.instructions = [instruction]
        return composition
    }

    private func videoSettings(size: CGSize, frameRate: Double) -> [String: Any] {
        [AVVideoCodecKey: AVVideoCodecType.h264,
         AVVideoWidthKey: Int(size.width), AVVideoHeightKey: Int(size.height),
         AVVideoCompressionPropertiesKey: [
            AVVideoAverageBitRateKey: targetVideoBitrate,
            AVVideoExpectedSourceFrameRateKey: Int(frameRate.rounded()),
            AVVideoAverageNonDroppableFrameRateKey: min(maxFrameRate, frameRate),
            AVVideoMaxKeyFrameIntervalKey: max(1, Int(frameRate.rounded()) * 2),
            AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel
         ]]
    }

    private func sourceAudioFormat(_ track: AVAssetTrack) throws -> (channels: Int, sampleRate: Double) {
        guard let description = (track.formatDescriptions as! [CMAudioFormatDescription]).first,
              let stream = CMAudioFormatDescriptionGetStreamBasicDescription(description)?.pointee,
              stream.mChannelsPerFrame > 0, stream.mSampleRate > 0 else {
            throw EncoderError.invalidAudioFormat
        }
        return (Int(stream.mChannelsPerFrame), stream.mSampleRate)
    }

    private func validateOutput(url: URL, sourceDuration: Double, sourceVideoDuration: Double,
                                expectedSize: CGSize,
                                maximumFrameCount: Int,
                                expectedAudioChannels: Int?, expectedAudioSampleRate: Double?,
                                expectedAudioDuration: Double?,
                                completion: @escaping (Result<[String: Any], Error>) -> Void) {
        let asset = AVURLAsset(url: url)
        asset.loadValuesAsynchronously(forKeys: ["playable", "duration", "tracks"]) { [weak self] in
            guard let self else { return }
            self.workQueue.async {
                do {
                    var keyError: NSError?
                    guard asset.statusOfValue(forKey: "tracks", error: &keyError) == .loaded,
                          asset.statusOfValue(forKey: "duration", error: &keyError) == .loaded,
                          asset.statusOfValue(forKey: "playable", error: &keyError) == .loaded,
                          asset.isPlayable else { throw keyError ?? EncoderError.invalidOutput }
                    let videos = asset.tracks(withMediaType: .video)
                    let audios = asset.tracks(withMediaType: .audio)
                    let expectedAudio = expectedAudioChannels != nil
                    guard videos.count == 1, let video = videos.first,
                          audios.count == (expectedAudio ? 1 : 0) else { throw EncoderError.invalidTracks }
                    guard self.codec(of: video) == kCMVideoCodecType_H264 else { throw EncoderError.invalidCodec }
                    if expectedAudio {
                        guard let audio = audios.first,
                              self.codec(of: audio) == kAudioFormatMPEG4AAC else { throw EncoderError.invalidCodec }
                        let format = try self.sourceAudioFormat(audio)
                        guard let expectedAudioChannels, let expectedAudioSampleRate,
                              format.channels == expectedAudioChannels,
                              abs(format.sampleRate - expectedAudioSampleRate) <= 1 else {
                            throw EncoderError.invalidAudioFormat
                        }
                    }

                    let duration = CMTimeGetSeconds(asset.duration)
                    let durationTolerance = max(0.5, sourceDuration * 0.03)
                    let videoDuration = CMTimeGetSeconds(video.timeRange.duration)
                    guard duration.isFinite, duration > 0,
                          abs(duration - sourceDuration) <= durationTolerance,
                          videoDuration.isFinite,
                          abs(videoDuration - sourceVideoDuration) <= max(0.5, sourceVideoDuration * 0.03) else {
                        throw EncoderError.invalidDuration
                    }
                    if let audio = audios.first {
                        let audioDuration = CMTimeGetSeconds(audio.timeRange.duration)
                        let sourceAudioDuration = expectedAudioDuration ?? sourceDuration
                        guard audioDuration.isFinite,
                              abs(audioDuration - sourceAudioDuration) <= max(0.5, sourceAudioDuration * 0.03) else {
                            throw EncoderError.invalidDuration
                        }
                    }
                    let size = self.displaySize(for: video)
                    guard Int(size.width) == Int(expectedSize.width), Int(size.height) == Int(expectedSize.height),
                          Int(size.width) % 2 == 0, Int(size.height) % 2 == 0,
                          max(size.width, size.height) <= 1920 else { throw EncoderError.invalidDimensions }

                    let sampleStats = try self.videoSampleStats(asset: asset, track: video, duration: videoDuration)
                    let audioBitrate = try audios.first.map {
                        try self.trackBitrate(asset: asset, track: $0,
                                              duration: CMTimeGetSeconds($0.timeRange.duration))
                    } ?? 0
                    let bytes = self.fileSize(url)
                    let totalBitrate = Double(bytes) * 8 / duration
                    guard sampleStats.frameRate > 0, sampleStats.frameRate <= self.maxFrameRate + 0.25,
                          sampleStats.frameCount <= maximumFrameCount,
                          sampleStats.videoBitrate > 100_000,
                          sampleStats.videoBitrate <= self.maximumVideoBitrate,
                          (!expectedAudio || (audioBitrate >= 32_000 && audioBitrate <= 147_200)),
                          totalBitrate > 100_000, totalBitrate <= self.maximumTotalBitrate else {
                        throw EncoderError.invalidBitrateOrFrameRate
                    }
                    completion(.success(self.baseMetadata(path: url.path, bytes: bytes, duration: duration,
                                                         size: size, videoTracks: 1, audioTracks: audios.count,
                                                         totalBitrate: totalBitrate,
                                                         videoBitrate: sampleStats.videoBitrate,
                                                         audioBitrate: audioBitrate,
                                                         frameRate: sampleStats.frameRate, skipped: false,
                                                         sourceDuration: sourceDuration)))
                } catch { completion(.failure(error)) }
            }
        }
    }

    private func videoSampleStats(asset: AVAsset, track: AVAssetTrack, duration: Double,
                                  job: EncodingJob? = nil) throws -> (frameRate: Double, videoBitrate: Double, frameCount: Int) {
        let reader = try AVAssetReader(asset: asset)
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: nil)
        guard reader.canAdd(output) else { throw EncoderError.cannotAdd("validation reader") }
        reader.add(output)
        guard reader.startReading() else { throw reader.error ?? EncoderError.readFailed }
        var frames = 0
        var sampleBytes = 0
        while let sample = output.copyNextSampleBuffer() {
            if job?.isCancelled == true {
                reader.cancelReading()
                throw EncoderError.cancelled
            }
            frames += 1
            sampleBytes += CMSampleBufferGetTotalSampleSize(sample)
        }
        guard reader.status == .completed, frames > 0, duration > 0 else {
            throw reader.error ?? EncoderError.readFailed
        }
        return (Double(frames) / duration, Double(sampleBytes) * 8 / duration, frames)
    }

    private func trackBitrate(asset: AVAsset, track: AVAssetTrack, duration: Double) throws -> Double {
        let reader = try AVAssetReader(asset: asset)
        let output = AVAssetReaderTrackOutput(track: track, outputSettings: nil)
        guard reader.canAdd(output) else { throw EncoderError.cannotAdd("bitrate validation reader") }
        reader.add(output)
        guard reader.startReading() else { throw reader.error ?? EncoderError.readFailed }
        var sampleBytes = 0
        while let sample = output.copyNextSampleBuffer() {
            sampleBytes += CMSampleBufferGetTotalSampleSize(sample)
        }
        guard reader.status == .completed, sampleBytes > 0, duration > 0 else {
            throw reader.error ?? EncoderError.readFailed
        }
        return Double(sampleBytes) * 8 / duration
    }

    private func baseMetadata(path: String, bytes: Int64, duration: Double, size: CGSize,
                              videoTracks: Int, audioTracks: Int, totalBitrate: Double,
                              videoBitrate: Double, audioBitrate: Double = 0,
                              frameRate: Double, skipped: Bool,
                              sourceDuration: Double? = nil) -> [String: Any] {
        ["path": path, "fileSize": bytes, "durationSeconds": duration,
         "sourceDurationSeconds": sourceDuration ?? duration,
         "width": Int(size.width), "height": Int(size.height),
         "videoTrackCount": videoTracks, "audioTrackCount": audioTracks,
         "averageBitrate": Int(totalBitrate), "videoBitrate": Int(videoBitrate),
         "audioBitrate": Int(audioBitrate),
         "frameRate": frameRate, "playable": true, "skipped": skipped,
         "encoderVersion": encoderVersion]
    }

    private func matchesPickerMetadata(duration: Double, size: CGSize, expectedDuration: Double?,
                                       expectedWidth: Int?, expectedHeight: Int?) -> Bool {
        if let expectedDuration, expectedDuration > 0,
           abs(duration - expectedDuration) > max(1, expectedDuration * 0.05) { return false }
        if let expectedWidth, let expectedHeight, expectedWidth > 0, expectedHeight > 0 {
            let direct = abs(Int(size.width) - expectedWidth) <= 2 && abs(Int(size.height) - expectedHeight) <= 2
            let swapped = abs(Int(size.width) - expectedHeight) <= 2 && abs(Int(size.height) - expectedWidth) <= 2
            if !direct && !swapped { return false }
        }
        return true
    }

    private func codec(of track: AVAssetTrack) -> FourCharCode? {
        guard let description = (track.formatDescriptions as! [CMFormatDescription]).first else { return nil }
        return CMFormatDescriptionGetMediaSubType(description)
    }

    private func resolvedFrameRate(_ track: AVAssetTrack) -> Double {
        let nominal = Double(track.nominalFrameRate)
        if nominal > 0 { return nominal }
        let seconds = CMTimeGetSeconds(track.minFrameDuration)
        return seconds > 0 ? 1 / seconds : 0
    }

    private func displaySize(for track: AVAssetTrack) -> CGSize {
        let rect = CGRect(origin: .zero, size: track.naturalSize)
            .applying(track.preferredTransform).standardized
        return CGSize(width: abs(rect.width), height: abs(rect.height))
    }

    private func evenConstrainedSize(_ size: CGSize) -> CGSize {
        let scale = min(1, 1920 / max(size.width, size.height))
        return CGSize(width: max(2, Int((size.width * scale).rounded(.down)) & ~1),
                      height: max(2, Int((size.height * scale).rounded(.down)) & ~1))
    }

    private func fileSize(_ url: URL) -> Int64 {
        Int64((try? url.resourceValues(forKeys: [.fileSizeKey]).fileSize) ?? 0)
    }

    private func rejectCancelled(_ call: CAPPluginCall) {
        call.reject("Encoding cancelled", "ABORT_ERR")
    }

    private final class EncodingJob {
        let id: String
        let outputURL: URL
        private let lock = NSLock()
        private var cancelled = false
        private var reader: AVAssetReader?
        private var writer: AVAssetWriter?
        private var cancellationHandlers: [() -> Void] = []
        init(id: String, outputURL: URL) { self.id = id; self.outputURL = outputURL }
        var isCancelled: Bool { lock.lock(); defer { lock.unlock() }; return cancelled }
        func attach(reader: AVAssetReader, writer: AVAssetWriter) {
            lock.lock(); self.reader = reader; self.writer = writer; let shouldCancel = cancelled; lock.unlock()
            if shouldCancel { reader.cancelReading(); writer.cancelWriting() }
        }
        func cancel() {
            lock.lock()
            cancelled = true
            let reader = self.reader
            let writer = self.writer
            let handlers = cancellationHandlers
            cancellationHandlers.removeAll()
            lock.unlock()
            reader?.cancelReading(); writer?.cancelWriting()
            handlers.forEach { $0() }
            try? FileManager.default.removeItem(at: outputURL)
        }
        func onCancel(_ handler: @escaping () -> Void) {
            lock.lock()
            if cancelled { lock.unlock(); handler(); return }
            cancellationHandlers.append(handler)
            lock.unlock()
        }
        func clearCancellationHandlers() {
            lock.lock(); cancellationHandlers.removeAll(); lock.unlock()
        }
        func stopWithoutMarkingCancelled() {
            lock.lock(); let reader = self.reader; let writer = self.writer; lock.unlock()
            reader?.cancelReading(); writer?.cancelWriting()
        }
        func interruptPendingAppends() {
            lock.lock()
            let reader = self.reader
            let writer = self.writer
            let handlers = cancellationHandlers
            cancellationHandlers.removeAll()
            lock.unlock()
            reader?.cancelReading(); writer?.cancelWriting()
            handlers.forEach { $0() }
        }
    }

    private final class CompletionGate {
        private let lock = NSLock()
        private var completed = false
        private let completion: (Error?) -> Void
        init(_ completion: @escaping (Error?) -> Void) { self.completion = completion }
        func finish(_ error: Error?) {
            lock.lock()
            guard !completed else { lock.unlock(); return }
            completed = true; lock.unlock(); completion(error)
        }
    }

    private final class AppendResult {
        private let lock = NSLock()
        private var storedError: Error?
        var error: Error? { lock.lock(); defer { lock.unlock() }; return storedError }
        func record(_ error: Error?) {
            guard let error else { return }
            lock.lock(); if storedError == nil { storedError = error }; lock.unlock()
        }
    }

    private enum EncoderError: Error, Equatable {
        case cannotAdd(String), startFailed, readFailed, writeFailed, appendFailed
        case invalidAudioFormat, invalidOutput, invalidTracks, invalidCodec
        case invalidDuration, invalidDimensions, invalidBitrateOrFrameRate, cancelled
    }
}
