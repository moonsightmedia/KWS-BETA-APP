import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

/** Playback controls observe the existing media element, without owning its URL,
 * quality selection, load lifecycle or monitoring. */
export function useBoulderVideoControls(videoRef: RefObject<HTMLVideoElement>, source: string | undefined, enabled: boolean, active: boolean, qualityOpen = false) {
  const [visible, setVisible] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [interaction, setInteraction] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const scrub = useRef<{ time: number; resume: boolean } | null>(null);
  const preferences = useRef({ speed, loop });
  preferences.current = { speed, loop };
  const resumeAfterBackground = useRef(false);

  const reveal = useCallback(() => { setVisible(true); setInteraction(value => value + 1); }, []);
  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video || !active || document.hidden) return;
    void video.play().catch(() => { setBlocked(true); reveal(); });
  }, [active, reveal, videoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !enabled) return;
    const update = () => {
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      setTime(Number.isFinite(video.currentTime) ? video.currentTime : 0);
      setPlaying(!video.paused && !video.ended);
    };
    const metadata = () => {
      video.playbackRate = preferences.current.speed;
      video.loop = preferences.current.loop;
      update();
    };
    const playingNow = () => { setBlocked(false); update(); };
    const ended = () => { update(); reveal(); };
    metadata();
    video.addEventListener('loadedmetadata', metadata);
    video.addEventListener('durationchange', update);
    video.addEventListener('timeupdate', update);
    video.addEventListener('play', update);
    video.addEventListener('playing', playingNow);
    video.addEventListener('pause', update);
    video.addEventListener('ended', ended);
    return () => {
      video.removeEventListener('loadedmetadata', metadata);
      video.removeEventListener('durationchange', update);
      video.removeEventListener('timeupdate', update);
      video.removeEventListener('play', update);
      video.removeEventListener('playing', playingNow);
      video.removeEventListener('pause', update);
      video.removeEventListener('ended', ended);
    };
  }, [enabled, source, videoRef, reveal]);

  useEffect(() => {
    const video = videoRef.current;
    if (video && enabled) { video.playbackRate = speed; video.loop = loop; }
  }, [enabled, speed, loop, source, videoRef]);

  useEffect(() => {
    if (!enabled || !active) { resumeAfterBackground.current = false; return; }
    const changed = () => {
      const video = videoRef.current;
      if (!video) return;
      if (document.hidden) {
        resumeAfterBackground.current = !video.paused;
        video.pause();
      } else if (resumeAfterBackground.current) {
        resumeAfterBackground.current = false;
        play();
      }
    };
    document.addEventListener('visibilitychange', changed);
    return () => document.removeEventListener('visibilitychange', changed);
  }, [active, enabled, play, videoRef]);

  useEffect(() => {
    if (!enabled || !playing || !visible || scrubbing || menuOpen || qualityOpen || keyboardFocus || !active) return;
    const timer = window.setTimeout(() => setVisible(false), 2500);
    return () => window.clearTimeout(timer);
  }, [active, enabled, playing, visible, scrubbing, menuOpen, qualityOpen, keyboardFocus, interaction]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) { if (video.ended) video.currentTime = 0; play(); }
    else video.pause();
    reveal();
  };
  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (video && duration) {
      video.currentTime = Math.max(0, Math.min(duration, video.currentTime + seconds));
      setTime(video.currentTime);
    }
    reveal();
  };
  const beginScrub = () => {
    const video = videoRef.current;
    if (!video) return;
    scrub.current = { time: video.currentTime, resume: !video.paused && !video.ended };
    video.pause();
    setScrubbing(true);
    reveal();
  };
  const seek = (value: number) => {
    const video = videoRef.current;
    if (video && duration) { video.currentTime = Math.max(0, Math.min(duration, value)); setTime(video.currentTime); }
    reveal();
  };
  const finishScrub = (cancel = false) => {
    const video = videoRef.current, previous = scrub.current;
    if (!video || !previous) return;
    if (cancel) { video.currentTime = previous.time; setTime(previous.time); }
    scrub.current = null;
    setScrubbing(false);
    if (previous.resume) play();
    reveal();
  };
  return { visible, playing, duration, time, speed, loop, blocked, menuOpen, scrubbing,
    setSpeed, setLoop, setMenuOpen, setKeyboardFocus, reveal, skip, seek, beginScrub, finishScrub, togglePlayback,
    toggleVisibility: () => { if (!scrubbing && !menuOpen) { setVisible(value => !value); setInteraction(value => value + 1); } },
    restart: () => { seek(0); play(); },
  };
}

/** Keep touch/phone controls in landscape, without replacing desktop controls. */
export function useMobileVideoControls() {
  const query = '(max-width: 767px), (pointer: coarse)';
  const [enabled, setEnabled] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const media = window.matchMedia(query);
    const changed = () => setEnabled(media.matches);
    changed();
    media.addEventListener('change', changed);
    return () => media.removeEventListener('change', changed);
  }, []);
  return enabled;
}
