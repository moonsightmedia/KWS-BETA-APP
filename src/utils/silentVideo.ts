/** Lossless, video-only remux. No MediaRecorder or real-time re-encoding. */
export async function prepareSilentVideoFile(file: File, abortSignal?: AbortSignal): Promise<File> {
  if (abortSignal?.aborted) throw new DOMException('Video preparation cancelled', 'AbortError');
  const { FFmpeg } = await import('@ffmpeg/ffmpeg');
  const { fetchFile } = await import('@ffmpeg/util');
  const ffmpeg = new FFmpeg();
  const controller = new AbortController();
  const signal = controller.signal;
  const cancel = () => controller.abort();
  abortSignal?.addEventListener('abort', cancel, { once: true });
  if (abortSignal?.aborted) controller.abort();
  const abort = () => ffmpeg.terminate();
  const abortError = () => new DOMException('Video preparation cancelled', 'AbortError');
  signal?.addEventListener('abort', abort, { once: true });
  // Bound downloads and worker loading as well as the remux. A broken worker
  // asset must not leave the upload spinning forever.
  const timeout = setTimeout(() => controller.abort(), 120_000);
  const urls: string[] = [];
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  const fetchCore = async (name: string, mimeType: string) => {
    const response = await fetch(`${base}/${name}`, { signal });
    if (!response.ok) throw new Error('Video processor unavailable');
    const url = URL.createObjectURL(new Blob([await response.arrayBuffer()], { type: mimeType }));
    urls.push(url);
    return url;
  };
  try {
    if (signal.aborted) throw abortError();
    // A dedicated worker prevents concurrent uploads from sharing a filesystem.
    const coreURL = await fetchCore('ffmpeg-core.js', 'text/javascript');
    if (signal?.aborted) throw abortError();
    const wasmURL = await fetchCore('ffmpeg-core.wasm', 'application/wasm');
    if (signal?.aborted) throw abortError();
    await ffmpeg.load({ coreURL, wasmURL });
    if (signal?.aborted) throw abortError();
    await ffmpeg.writeFile('source', await fetchFile(file));
    const webm = file.type.includes('webm') || /\.webm$/i.test(file.name);
    const extension = webm ? 'webm' : 'mp4';
    const args = ['-i', 'source', '-map', '0:v:0', '-c:v', 'copy', '-an', '-sn', '-dn', '-map_metadata', '-1', '-map_chapters', '-1'];
    if (!webm) args.push('-movflags', '+faststart');
    args.push(`silent.${extension}`);
    const exit = await ffmpeg.exec(args, 120_000);
    if (exit !== 0) throw new Error('Audio removal failed');
    const data = await ffmpeg.readFile(`silent.${extension}`);
    if (!(data instanceof Uint8Array) || data.byteLength === 0) throw new Error('Empty silent video');
    return new File([new Uint8Array(data).buffer], file.name.replace(/\.[^.]+$/, '') + `.${extension}`, {
      type: webm ? 'video/webm' : 'video/mp4', lastModified: file.lastModified,
    });
  } catch (error) {
    if (abortSignal?.aborted) throw abortError();
    // Never silently upload an audio-bearing original when preparation fails.
    throw Object.assign(new Error('Die Tonspur konnte nicht entfernt werden. Bitte erneut versuchen.'), { cause: error });
  } finally {
    clearTimeout(timeout);
    abortSignal?.removeEventListener('abort', cancel);
    signal?.removeEventListener('abort', abort);
    ffmpeg.terminate();
    urls.forEach(url => URL.revokeObjectURL(url));
  }
}
