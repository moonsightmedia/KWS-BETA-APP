import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import type { Boulder } from '@/types/boulder';
import { getAvailableVideoQualities, getPreferredVideoQuality, getVideoUrl, type VideoQualityLevel } from '@/utils/videoUtils';
import { getOptimalVideoQualityWithDataSaver } from '@/utils/networkUtils';
import { getNextLowerVideoQuality, shouldFallbackAfterStall, VIDEO_STALL_FALLBACK_MS } from '@/lib/videoPlayback';
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
  const remember = (id: string) => { const node = nodes.current.get(id); if (node && Number.isFinite(node.currentTime)) restore.current.set(id, node.currentTime); };
  const changeQuality = (next: VideoQualityLevel) => {
    if (!boulder || next === quality || !getAvailableVideoQualities(boulder.betaVideoUrls, boulder.betaVideoUrl).includes(next)) return;
    remember(boulder.id); clearTimer(boulder.id); setError(false); setBlocked(false); setBuffering(true);
    setQualities(previous => ({ ...previous, [boulder.id]: next }));
  };
  const fail = (id: string) => {
    if (current.current.boulder?.id !== id) return;
    setError(true); setBuffering(false); clearTimer(id);
    const attempt = attempts.current.get(id);
    if (attempt?.failed) return;
    if (attempt) attempt.failed = true;
    trackMonitoring('play_failed', { view_id: attempt?.id, error_code: 'feed_video_unavailable' }, id);
    reportMonitoringError(new Error('Boulder-Videofeed: Video konnte nicht geladen werden.'), 'video_player');
  };
  const fallback = (id: string) => {
    const item = current.current.boulder;
    if (!item || item.id !== id || !current.current.enabled) return;
    const previous = getPreferredVideoQuality(item.betaVideoUrls, item.betaVideoUrl, current.current.qualities[id] ?? preferred);
    const lower = getNextLowerVideoQuality(previous, item.betaVideoUrls);
    if (lower && getVideoUrl(item.betaVideoUrls, item.betaVideoUrl, lower) !== getVideoUrl(item.betaVideoUrls, item.betaVideoUrl, previous)) {
      remember(id); setQualities(values => ({ ...values, [id]: lower })); setBuffering(true); setError(false);
    } else fail(id);
  };
  const request = (id: string) => {
    if (attempts.current.has(id) || !canPlay(id)) return;
    const attempt = { id: crypto.randomUUID(), time: performance.now(), started: false, failed: false, complete: false };
    attempts.current.set(id, attempt); trackMonitoring('play_requested', { view_id: attempt.id }, id);
  };
  const play = (id: string) => {
    const node = nodes.current.get(id);
    if (!node || !canPlay(id)) { node?.pause(); return; }
    request(id);
    const requestedSource = node.getAttribute('src');
    void node.play().catch(failure => { if (canPlay(id) && node.getAttribute('src') === requestedSource && failure?.name !== 'AbortError') { setBlocked(true); setBuffering(false); } });
  };
  const register = (id: string) => {
    let callback = callbacks.current.get(id);
    if (!callback) {
      callback = node => {
        const old = nodes.current.get(id);
        if (node) { nodes.current.set(id, node); if (current.current.boulder?.id === id) videoRef.current = node; }
        else { if (old) { if (!restore.current.has(id)) checkpoints.current.set(id, old.currentTime); old.pause(); old.removeAttribute('src'); old.load(); } if (videoRef.current === old) videoRef.current = null; nodes.current.delete(id); clearTimer(id); }
      };
      callbacks.current.set(id, callback);
    }
    return callback;
  };
  const activeId = boulder?.id;
  useLayoutEffect(() => { videoRef.current = activeId ? nodes.current.get(activeId) ?? null : null; }, [activeId, videoRef]);
  useEffect(() => { setProgress(0); setError(false); setBlocked(false); setBuffering(false); }, [boulder?.id]);
  useEffect(() => { if (activeId) attempts.current.delete(activeId); }, [activeId, source]);
  useEffect(() => {
    nodes.current.forEach((node, id) => { if (canPlay(id)) play(id); else { node.pause(); clearTimer(id); } });
  // The refs carry current playback intent, while these primitives define transitions.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boulder?.id, enabled, paused, holdRate, suspended, source]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); nodes.current.forEach(node => { node.pause(); node.removeAttribute('src'); node.load(); }); }, []);
  return { videoRef, register, sourceFor, quality, changeQuality, progress, error, blocked, buffering,
    retry: () => { if (!boulder) return; remember(boulder.id); attempts.current.delete(boulder.id); setError(false); setBlocked(false); setBuffering(true); videoRef.current?.load(); play(boulder.id); },
    play: () => { if (boulder) play(boulder.id); },
    events: (id: string) => ({
      onLoadedMetadata: (event: React.SyntheticEvent<HTMLVideoElement>) => {
        const node = event.currentTarget, time = restore.current.get(id) ?? checkpoints.current.get(id);
        if (time !== undefined && Number.isFinite(node.duration)) node.currentTime = Math.min(time, Math.max(0, node.duration - .1));
        restore.current.delete(id);
      },
      onLoadedData: () => play(id),
      onLoadStart: () => { if (!canPlay(id)) return; request(id); clearTimer(id); timers.current.set(id, window.setTimeout(() => { if (canPlay(id) && (nodes.current.get(id)?.readyState ?? 0) < 2) fallback(id); }, 15000)); },
      onWaiting: () => {
        if (!canPlay(id)) return;
        setBuffering(true); clearTimer(id);
        const started = attempts.current.get(id)?.started ?? false;
        timers.current.set(id, window.setTimeout(() => { const node = nodes.current.get(id); if (node && canPlay(id) && ((!started && node.readyState < 2) || shouldFallbackAfterStall({ hasStartedPlaying: started, ended: node.ended, paused: node.paused, readyState: node.readyState, duration: node.duration, currentTime: node.currentTime }))) fallback(id); }, started ? VIDEO_STALL_FALLBACK_MS : 15000));
      },
      onPlaying: () => {
        clearTimer(id); if (!canPlay(id)) { nodes.current.get(id)?.pause(); return; }
        setBlocked(false); setBuffering(false); setError(false); request(id);
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
      onError: () => { if (nodes.current.get(id)?.isConnected && current.current.enabled && current.current.boulder?.id === id) fallback(id); },
    }),
  };
}
