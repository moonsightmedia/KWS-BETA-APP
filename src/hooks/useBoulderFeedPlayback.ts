import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Boulder } from '@/types/boulder';
import { getAvailableVideoQualities, getPreferredVideoQuality, getVideoUrl, type VideoQualityLevel } from '@/utils/videoUtils';
import { getOptimalVideoQualityWithDataSaver } from '@/utils/networkUtils';
import { getNextLowerVideoQuality, VIDEO_STALL_FALLBACK_MS } from '@/lib/videoPlayback';
import { reportMonitoringError, trackMonitoring } from '@/utils/monitoring';

/** Direct-video lifecycle for the prepared three-frame window. */
export function useBoulderFeedPlayback({ videoRef, boulder, enabled, paused, holdRate, suspended }: {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  boulder?: Boulder; enabled: boolean; paused: boolean; holdRate: number | null; suspended: boolean;
}) {
  const [preferred] = useState(getOptimalVideoQualityWithDataSaver);
  const [qualities, setQualities] = useState<Record<string, VideoQualityLevel>>({});
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const nodes = useRef(new Map<string, HTMLVideoElement>());
  const callbacks = useRef(new Map<string, (node: HTMLVideoElement | null) => void>());
  const checkpoints = useRef(new Map<string, number>());
  const restore = useRef(new Map<string, number>());
  const timers = useRef(new Map<string, number>());
  const waiting = useRef(new Set<string>());
  const underruns = useRef(new Map<string, number[]>());
  const pendingPlays = useRef(new WeakMap<HTMLVideoElement, symbol>());
  const bufferHint = useRef<{ show?: number; hide?: number; since: number; waiting: boolean }>({ since: 0, waiting: false });
  const attempts = useRef(new Map<string, { id: string; time: number; started: boolean; failed: boolean; complete: boolean }>());
  const current = useRef({ boulder, enabled, paused, holdRate, suspended, qualities });
  current.current = { boulder, enabled, paused, holdRate, suspended, qualities };
  const qualityFor = (item: Boulder) => getPreferredVideoQuality(item.betaVideoUrls, item.betaVideoUrl, qualities[item.id] ?? preferred);
  const sourceFor = (item: Boulder) => getVideoUrl(item.betaVideoUrls, item.betaVideoUrl, qualityFor(item));
  const source = boulder ? sourceFor(boulder) : undefined;
  const quality = boulder ? qualityFor(boulder) : preferred;
  const clearTimer = (id: string) => { const timer = timers.current.get(id); if (timer !== undefined) clearTimeout(timer); timers.current.delete(id); };
  const canPlay = (id: string) => {
    const state = current.current;
    return state.boulder?.id === id && state.enabled && (!state.paused || state.holdRate !== null) && !state.suspended && !document.hidden;
  };
  const startBuffering = (id: string) => {
    if (!canPlay(id) || bufferHint.current.waiting) return;
    const hint = bufferHint.current; hint.waiting = true;
    clearTimeout(hint.hide);
    if (!hint.since) hint.show = window.setTimeout(() => {
      if (!hint.waiting || !canPlay(id)) return;
      hint.since = performance.now(); setBuffering(true);
    }, 300);
  };
  const stopBuffering = (immediate = false) => {
    const hint = bufferHint.current; hint.waiting = false;
    clearTimeout(hint.show); clearTimeout(hint.hide);
    const hide = () => { hint.since = 0; setBuffering(false); };
    const remaining = hint.since ? Math.max(0, 450 - (performance.now() - hint.since)) : 0;
    if (immediate || !remaining) hide(); else hint.hide = window.setTimeout(hide, remaining);
  };
  const hasBuffer = (node: HTMLVideoElement) => {
    if (node.readyState < 2) return false;
    const remaining = Number.isFinite(node.duration) ? Math.max(0, node.duration - node.currentTime) : Infinity;
    const target = Math.min(1.5 * Math.max(1, current.current.holdRate ?? 1), remaining);
    for (let i = 0; i < node.buffered.length; i++) {
      if (node.buffered.start(i) <= node.currentTime + .05 && node.buffered.end(i) - node.currentTime + .05 >= target) return true;
    }
    return false;
  };
  const remember = (id: string) => { const node = nodes.current.get(id); if (node && Number.isFinite(node.currentTime)) restore.current.set(id, node.currentTime); };
  const changeQuality = (next: VideoQualityLevel) => {
    if (!boulder || next === quality || !getAvailableVideoQualities(boulder.betaVideoUrls, boulder.betaVideoUrl).includes(next)) return;
    remember(boulder.id); clearTimer(boulder.id); setError(false); setBlocked(false); startBuffering(boulder.id);
    setQualities(previous => ({ ...previous, [boulder.id]: next }));
  };
  const fail = (id: string, reason = 'load_timeout') => {
    if (current.current.boulder?.id !== id) return;
    setError(true); stopBuffering(true); waiting.current.delete(id); clearTimer(id);
    const attempt = attempts.current.get(id);
    if (attempt?.failed) return;
    if (attempt) attempt.failed = true;
    trackMonitoring('play_failed', { view_id: attempt?.id, error_code: reason }, id);
    const failure = new Error('Boulder-Videofeed: Video konnte nicht geladen werden.');
    failure.name = 'FeedVideo_' + reason;
    reportMonitoringError(failure, 'video_feed');
  };
  const fallback = (id: string, reason = 'load_timeout') => {
    const item = current.current.boulder;
    if (!item || item.id !== id || !current.current.enabled) return;
    const previous = getPreferredVideoQuality(item.betaVideoUrls, item.betaVideoUrl, current.current.qualities[id] ?? preferred);
    const lower = getNextLowerVideoQuality(previous, item.betaVideoUrls);
    if (lower && getVideoUrl(item.betaVideoUrls, item.betaVideoUrl, lower) !== getVideoUrl(item.betaVideoUrls, item.betaVideoUrl, previous)) {
      remember(id); clearTimer(id); waiting.current.delete(id); setQualities(values => ({ ...values, [id]: lower })); startBuffering(id); setError(false);
    } else fail(id, reason);
  };
  const request = (id: string) => {
    if (attempts.current.has(id) || !canPlay(id)) return;
    const attempt = { id: crypto.randomUUID(), time: performance.now(), started: false, failed: false, complete: false };
    attempts.current.set(id, attempt); trackMonitoring('play_requested', { view_id: attempt.id }, id);
  };
  const waitForBuffer = (id: string, pauseForRecovery = true) => {
    if (!canPlay(id)) return;
    // A paused Safari video may only preload a few frames. Request initial
    // playback before demanding headroom; pause only to recover a real underrun.
    if (pauseForRecovery && attempts.current.get(id)?.started) nodes.current.get(id)?.pause();
    waiting.current.add(id); startBuffering(id);
    if (timers.current.has(id)) return;
    const started = attempts.current.get(id)?.started ?? false;
    timers.current.set(id, window.setTimeout(() => {
      timers.current.delete(id);
      if (canPlay(id) && waiting.current.has(id)) fallback(id);
    }, started ? VIDEO_STALL_FALLBACK_MS : 15000));
  };
  const play = (id: string) => {
    const node = nodes.current.get(id);
    if (!node || !canPlay(id)) { node?.pause(); return; }
    request(id);
    const started = attempts.current.get(id)?.started ?? false;
    if (started ? !hasBuffer(node) : node.readyState < 3) { waitForBuffer(id); return; }
    if (!node.paused) return;
    // Keep the watchdog until `playing`, including an unresolved play promise.
    waitForBuffer(id, false);
    if (pendingPlays.current.has(node)) return;
    const requestedSource = node.getAttribute('src');
    const pending = Symbol(); pendingPlays.current.set(node, pending);
    void node.play().catch(failure => {
      if (pendingPlays.current.get(node) !== pending || !canPlay(id) || node.getAttribute('src') !== requestedSource || failure?.name === 'AbortError') return;
      if (failure?.name === 'NotAllowedError') {
        clearTimer(id); waiting.current.delete(id); setBlocked(true); stopBuffering(true);
      } else fallback(id, 'play_rejected');
    }).finally(() => { if (pendingPlays.current.get(node) === pending) pendingPlays.current.delete(node); });
  };
  const register = (id: string) => {
    let callback = callbacks.current.get(id);
    if (!callback) {
      callback = node => {
        const old = nodes.current.get(id);
        if (node) { nodes.current.set(id, node); if (current.current.boulder?.id === id) videoRef.current = node; }
        else { if (old) { if (!restore.current.has(id)) checkpoints.current.set(id, old.currentTime); old.pause(); old.removeAttribute('src'); old.load(); } if (videoRef.current === old) videoRef.current = null; nodes.current.delete(id); waiting.current.delete(id); clearTimer(id); }
      };
      callbacks.current.set(id, callback);
    }
    return callback;
  };
  const activeId = boulder?.id;
  useLayoutEffect(() => { videoRef.current = activeId ? nodes.current.get(activeId) ?? null : null; }, [activeId, videoRef]);
  // Reset synchronously before the next page can paint its predecessor's status.
  useLayoutEffect(() => { setProgress(0); setError(false); setBlocked(false); stopBuffering(true); }, [boulder?.id]);
  useEffect(() => { if (activeId) { attempts.current.delete(activeId); underruns.current.delete(activeId); } }, [activeId, source]);
  useEffect(() => {
    nodes.current.forEach((node, id) => { if (canPlay(id)) play(id); else { node.pause(); clearTimer(id); waiting.current.delete(id); } });
    if (!activeId || !canPlay(activeId)) stopBuffering(true);
  // The refs carry current playback intent, while these primitives define transitions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boulder?.id, enabled, paused, holdRate, suspended, source]);
  useEffect(() => () => { clearTimeout(bufferHint.current.show); clearTimeout(bufferHint.current.hide); timers.current.forEach(clearTimeout); nodes.current.forEach(node => { node.pause(); node.removeAttribute('src'); node.load(); }); }, []);
  return { videoRef, register, sourceFor, quality, changeQuality, progress, error, blocked, buffering,
    retry: () => { if (!boulder) return; remember(boulder.id); clearTimer(boulder.id); attempts.current.delete(boulder.id); if (videoRef.current) pendingPlays.current.delete(videoRef.current); setError(false); setBlocked(false); startBuffering(boulder.id); videoRef.current?.load(); play(boulder.id); },
    play: () => { if (boulder) play(boulder.id); },
    events: (id: string) => ({
      onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => {
        const node = event.currentTarget, time = restore.current.get(id) ?? checkpoints.current.get(id);
        if (time !== undefined && Number.isFinite(node.duration)) node.currentTime = Math.min(time, Math.max(0, node.duration - .1));
        restore.current.delete(id);
      },
      onLoadedData: (event: React.SyntheticEvent<HTMLVideoElement>) => {
        const node = event.currentTarget;
        // Decode a real first frame for the incoming page without playing a neighbor.
        if (current.current.boulder?.id !== id && node.currentTime === 0) node.currentTime = .001;
        play(id);
      },
      onCanPlay: () => play(id),
      onProgress: () => { if (waiting.current.has(id)) play(id); },
      onLoadStart: (event: React.SyntheticEvent<HTMLVideoElement>) => { pendingPlays.current.delete(event.currentTarget); if (canPlay(id)) { request(id); waitForBuffer(id); } },
      onWaiting: (event: React.SyntheticEvent<HTMLVideoElement>) => {
        if (!canPlay(id)) return;
        const node = event.currentTarget;
        if (attempts.current.get(id)?.started && !waiting.current.has(id) && !node.seeking && node.currentTime > .15) {
          const now = performance.now(), recent = (underruns.current.get(id) ?? []).filter(time => now - time < 15000);
          recent.push(now); underruns.current.set(id, recent);
          if (recent.length >= 3) { node.pause(); fallback(id); return; }
        }
        waitForBuffer(id);
      },
      onPlaying: () => {
        if (!canPlay(id)) { nodes.current.get(id)?.pause(); return; }
        clearTimer(id); waiting.current.delete(id);
        setBlocked(false); stopBuffering(); setError(false); request(id);
        const attempt = attempts.current.get(id);
        if (attempt && !attempt.started) { attempt.started = true; trackMonitoring('play_started', { view_id: attempt.id, duration_ms: Math.round(performance.now() - attempt.time) }, id); }
      },
      onTimeUpdate: (event: React.SyntheticEvent<HTMLVideoElement>) => {
        const node = event.currentTarget;
        if (!restore.current.has(id)) checkpoints.current.set(id, node.currentTime);
        if (current.current.boulder?.id !== id) return;
        const value = node.duration ? node.currentTime / node.duration : 0; setProgress(value);
        const attempt = attempts.current.get(id);
        if (value > .95 && attempt && !attempt.complete) { attempt.complete = true; trackMonitoring('play_completed', { view_id: attempt.id }, id); }
      },
      onError: () => { if (nodes.current.get(id)?.isConnected && canPlay(id)) fallback(id, 'media_error_' + (nodes.current.get(id)?.error?.code ?? 0)); },
    }),
  };
}
