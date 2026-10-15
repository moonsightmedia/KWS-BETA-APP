package com.kletterwelt.beta;

import android.media.MediaCodec;
import android.media.MediaExtractor;
import android.media.MediaFormat;
import android.media.MediaMetadataRetriever;
import android.media.MediaMuxer;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.nio.ByteBuffer;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** No transcoding: copies video samples only to an app-owned temporary MP4. */
@CapacitorPlugin(name = "SilentVideo")
public class SilentVideoPlugin extends Plugin {
    private final ExecutorService worker = Executors.newSingleThreadExecutor();

    @PluginMethod
    public void stripAudio(PluginCall call) {
        String path = call.getString("inputPath");
        if (path == null || path.isEmpty()) { call.reject("inputPath is required"); return; }
        worker.execute(() -> remux(call, path));
    }

    private void source(MediaExtractor extractor, String path) throws Exception {
        Uri uri = Uri.parse(path);
        if ("content".equals(uri.getScheme())) extractor.setDataSource(getContext(), uri, null);
        else extractor.setDataSource("file".equals(uri.getScheme()) ? uri.getPath() : path);
    }

    private void remux(PluginCall call, String path) {
        MediaExtractor extractor = new MediaExtractor();
        MediaMuxer muxer = null;
        File output = new File(getContext().getCacheDir(), "kws-silent-" + UUID.randomUUID() + ".mp4");
        try {
            source(extractor, path);
            int video = -1;
            for (int i = 0; i < extractor.getTrackCount(); i++) {
                String mime = extractor.getTrackFormat(i).getString(MediaFormat.KEY_MIME);
                if (mime != null && mime.startsWith("video/")) {
                    if (video >= 0) throw new Exception("Exactly one video track required");
                    video = i;
                }
            }
            if (video < 0) throw new Exception("No video track");
            // Always remux, including silent content:// inputs, to obtain a readable local path.
            MediaFormat format = extractor.getTrackFormat(video);
            long duration = format.containsKey(MediaFormat.KEY_DURATION) ? format.getLong(MediaFormat.KEY_DURATION) : 0;
            extractor.selectTrack(video);
            muxer = new MediaMuxer(output.getAbsolutePath(), MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4);
            MediaMetadataRetriever metadata = new MediaMetadataRetriever();
            try {
                Uri uri = Uri.parse(path);
                if ("content".equals(uri.getScheme())) metadata.setDataSource(getContext(), uri);
                else metadata.setDataSource("file".equals(uri.getScheme()) ? uri.getPath() : path);
                String rotation = metadata.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION);
                if (rotation != null) muxer.setOrientationHint(Integer.parseInt(rotation));
            } finally { metadata.release(); }
            int track = muxer.addTrack(format);
            muxer.start();
            int initialSize = format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)
                ? Math.max(1024 * 1024, Math.min(32 * 1024 * 1024, format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE))) : 1024 * 1024;
            ByteBuffer buffer = ByteBuffer.allocateDirect(initialSize);
            MediaCodec.BufferInfo info = new MediaCodec.BufferInfo();
            int samples = 0;
            while (extractor.getSampleTime() >= 0) {
                long size = Build.VERSION.SDK_INT >= 28 ? extractor.getSampleSize() : buffer.capacity();
                if (size > 32 * 1024 * 1024) throw new Exception("Video sample too large");
                if ((extractor.getSampleFlags() & MediaExtractor.SAMPLE_FLAG_ENCRYPTED) != 0)
                    throw new Exception("Encrypted video is not supported");
                if (size > buffer.capacity()) buffer = ByteBuffer.allocateDirect((int) size);
                buffer.clear();
                int count = extractor.readSampleData(buffer, 0);
                if (count <= 0) break;
                info.set(0, count, extractor.getSampleTime(),
                    (extractor.getSampleFlags() & MediaExtractor.SAMPLE_FLAG_SYNC) != 0 ? MediaCodec.BUFFER_FLAG_KEY_FRAME : 0);
                muxer.writeSampleData(track, buffer, info);
                samples++;
                extractor.advance();
            }
            muxer.stop(); muxer.release(); muxer = null;
            if (samples == 0 || output.length() <= 0) throw new Exception("Empty video output");
            MediaExtractor check = new MediaExtractor();
            try {
                check.setDataSource(output.getAbsolutePath());
                if (check.getTrackCount() != 1 || !check.getTrackFormat(0).getString(MediaFormat.KEY_MIME).startsWith("video/"))
                    throw new Exception("Silent output validation failed");
                MediaFormat saved = check.getTrackFormat(0);
                if (duration > 0 && (!saved.containsKey(MediaFormat.KEY_DURATION) ||
                    Math.abs(saved.getLong(MediaFormat.KEY_DURATION) - duration) > Math.max(500000, duration * 0.03)))
                    throw new Exception("Video duration changed");
            } finally { check.release(); }
            JSObject result = new JSObject();
            result.put("path", output.getAbsolutePath()); result.put("fileSize", output.length());
            result.put("audioTrackCount", 0); result.put("skipped", false);
            call.resolve(result);
        } catch (Exception error) {
            if (muxer != null) { try { muxer.release(); } catch (Exception ignored) {} }
            // Only the exact app-generated output, never the source, is removed.
            output.delete();
            call.reject("Could not remove audio from video", error);
        } finally { extractor.release(); }
    }
    @Override protected void handleOnDestroy() { worker.shutdown(); }
}
