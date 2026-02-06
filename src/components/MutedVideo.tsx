import { useRef, useEffect, type VideoHTMLAttributes } from 'react';

/**
 * Wraps a <video> element and enforces muted playback.
 * Volume cannot be enabled by the user (volume/muted are forced via ref + volumechange listener).
 */
export function MutedVideo({
  src,
  poster,
  className,
  controls = true,
  children,
  ...rest
}: VideoHTMLAttributes<HTMLVideoElement>) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const enforceMuted = () => {
      if (!video.muted || video.volume > 0) {
        video.muted = true;
        video.volume = 0;
      }
    };

    enforceMuted();
    video.addEventListener('volumechange', enforceMuted);
    return () => video.removeEventListener('volumechange', enforceMuted);
  }, [src, children]);

  return (
    <>
      <style>{`
        video::-webkit-media-controls-volume-slider { display: none !important; }
        video::-webkit-media-controls-mute-button { display: none !important; }
      `}</style>
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className={className}
        controls={controls}
        muted
        playsInline
        controlsList="nodownload"
        {...rest}
      >
        {children}
      </video>
    </>
  );
}
