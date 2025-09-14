"use client";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  className?: string;
};

export default function HeroVisual({ className }: Props) {
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const [useVideo, setUseVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!useVideo || prefersReducedMotion) return;
    const v = videoRef.current;
    if (!v) return;
    const onError = () => setUseVideo(false);
    v.addEventListener("error", onError);
    // Try to start playback programmatically
    const play = v.play?.();
    if (play && typeof play.catch === "function") {
      play.catch(() => {
        // If autoplay is blocked for any reason, silently continue.
      });
    }
    return () => v.removeEventListener("error", onError);
  }, [useVideo, prefersReducedMotion]);

  // No GIF fallback cycling needed now that we use MP4

  if (useVideo && !prefersReducedMotion) {
    return (
      <video
        ref={videoRef}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        aria-label="Cinematic intro video"
      >
        <source src="/hero-intro-video.mp4" type="video/mp4" />
      </video>
    );
  }

  return (
    <img
      ref={imgRef}
      src="/window.svg"
      alt="NeuraTone visual placeholder"
      className={className}
      decoding="async"
    />
  );
}
