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
  const [gifBust, setGifBust] = useState(0);

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

  // If we fall back to GIF, periodically reset the src to simulate infinite loop
  useEffect(() => {
    if (useVideo) return;
    const id = window.setInterval(() => setGifBust((n) => n + 1), 15000);
    return () => window.clearInterval(id);
  }, [useVideo]);

  if (useVideo && !prefersReducedMotion) {
    return (
      <video
        ref={videoRef}
        className={className}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster="/intro-visual.gif"
      >
        <source src="/intro-visual.webm" type="video/webm" />
        <source src="/intro-visual.mp4" type="video/mp4" />
      </video>
    );
  }

  return (
    <img
      ref={imgRef}
      src={`/intro-visual.gif?b=${gifBust}`}
      alt="Preview of the NeuraTone mixer interface"
      className={className}
      decoding="async"
    />
  );
}
