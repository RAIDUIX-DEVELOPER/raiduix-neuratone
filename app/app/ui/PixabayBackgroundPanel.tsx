"use client";
import React from "react";

type Kind = "images" | "videos";
export type SelectPayload =
  | { kind: "image"; src: string; thumb: string; pageURL: string }
  | { kind: "video"; src: string; thumb: string; pageURL: string };

const IMAGE_CHIPS = [
  "space",
  "forest",
  "ocean",
  "mountains",
  "city",
  "abstract",
  "nebula",
  "sunset",
];
const VIDEO_CHIPS = [
  "space",
  "waves",
  "clouds",
  "rain",
  "city night",
  "stars",
  "aurora",
  "timelapse",
];

export default function PixabayBackgroundPanel({
  visible,
  onClose,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (p: SelectPayload) => void;
}) {
  const [kind, setKind] = React.useState<Kind>("images");
  const [q, setQ] = React.useState<string>("space");
  const [loading, setLoading] = React.useState(false);
  const [hits, setHits] = React.useState<any[]>([]);
  const controllerRef = React.useRef<AbortController | null>(null);

  const doSearch = async (query?: string, nextKind?: Kind) => {
    const useQ = (query ?? q).trim();
    const useKind = nextKind ?? kind;
    if (!useQ) return;
    controllerRef.current?.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;
    setLoading(true);
    try {
      const endpoint =
        useKind === "images" ? "/api/pixabay/images" : "/api/pixabay/videos";
      const url = new URL(endpoint, window.location.origin);
      url.searchParams.set("q", useQ);
      url.searchParams.set("per_page", "24");
      const r = await fetch(url.toString(), { signal: ctrl.signal });
      const data = await r.json();
      setHits(Array.isArray(data?.hits) ? data.hits : []);
    } catch (e) {
      console.error("Pixabay search failed", e);
      setHits([]);
    } finally {
      setLoading(false);
    }
  };

  // Load last used kind/query from localStorage on mount
  React.useEffect(() => {
    try {
      const lk = localStorage.getItem("pixabay.lastKind");
      if (lk === "images" || lk === "videos") setKind(lk);
      const lq = localStorage.getItem("pixabay.lastQuery");
      if (typeof lq === "string" && lq) setQ(lq);
    } catch {}
  }, []);

  // Persist kind/query when they change
  React.useEffect(() => {
    try {
      localStorage.setItem("pixabay.lastKind", kind);
    } catch {}
  }, [kind]);
  React.useEffect(() => {
    try {
      localStorage.setItem("pixabay.lastQuery", q);
    } catch {}
  }, [q]);

  // Trigger search when opening if we don't have results
  React.useEffect(() => {
    if (visible && hits.length === 0) doSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Lock background scroll while the panel is visible (especially on mobile)
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    if (visible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = prev || "";
    }
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [visible]);

  // Allow closing with Escape
  React.useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, onClose]);

  const chips = kind === "images" ? IMAGE_CHIPS : VIDEO_CHIPS;

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-hidden={!visible}
      aria-label="Pixabay background picker"
      onMouseDown={(e) => {
        if (e.target === containerRef.current) onClose();
      }}
      className={`fixed left-0 right-0 bottom-0 top-[var(--app-header-h)] z-50 sm:absolute sm:inset-0 sm:z-40 flex ${
        visible
          ? "bg-black/40 pointer-events-auto"
          : "bg-transparent pointer-events-none"
      }`}
    >
      <div
        className={`flex flex-col w-full h-full bg-[#0b1220]/95 backdrop-blur rounded-none border border-teal-300/30 p-3 pb-[env(safe-area-inset-bottom)] transition-all duration-200 ease-out ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        {/* Header */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setKind("images");
              doSearch(q, "images");
            }}
            className={`px-2.5 py-1.5 rounded-md border ${
              kind === "images"
                ? "bg-teal-500/80 border-teal-400 text-white"
                : "bg-transparent border-teal-400/40 text-teal-100"
            }`}
          >
            Images
          </button>
          <button
            onClick={() => {
              setKind("videos");
              doSearch(q, "videos");
            }}
            className={`px-2.5 py-1.5 rounded-md border ${
              kind === "videos"
                ? "bg-teal-500/80 border-teal-400 text-white"
                : "bg-transparent border-teal-400/40 text-teal-100"
            }`}
          >
            Videos
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            title="Close"
            className="text-teal-100 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-2 mt-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doSearch()}
            placeholder={`Search ${kind}`}
            className="flex-1 bg-white/5 border border-teal-300/30 rounded-md px-3 py-1.5 text-sm text-teal-50 placeholder:text-teal-200/50 focus:outline-none focus:ring-1 focus:ring-teal-400/60"
          />
          <button
            onClick={() => doSearch()}
            className="px-3 py-1.5 rounded-md border border-teal-400 bg-teal-500/80 text-white text-sm"
          >
            Search
          </button>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2 mt-2">
          {chips.map((c) => (
            <button
              key={c}
              onClick={() => {
                setQ(c);
                doSearch(c);
              }}
              className="px-2 py-1 rounded-full border border-teal-300/30 text-teal-100 hover:bg-white/5 text-xs"
            >
              {c}
            </button>
          ))}
        </div>

        {/* License note */}
        <div className="mt-2 text-[11px] text-teal-200">
          Media from Pixabay — free for commercial use, no attribution required.
          Please review the
          <a
            className="text-teal-300 hover:underline ml-1"
            href="https://pixabay.com/service/license/"
            target="_blank"
            rel="noreferrer noopener"
          >
            Pixabay License
          </a>
          .
        </div>

        {/* Results scroller */}
        <div className="mt-2 flex-1 min-h-0 overflow-y-auto pr-1">
          <div className="grid grid-cols-3 gap-2">
            {loading ? (
              <div className="col-span-3 text-teal-100">Loading…</div>
            ) : hits.length === 0 ? (
              <div className="col-span-3 text-teal-100/80">No results</div>
            ) : (
              hits.map((h, i) => {
                if (kind === "images") {
                  const thumb = h.webformatURL || h.previewURL;
                  const src = h.largeImageURL || h.webformatURL || h.previewURL;
                  return (
                    <button
                      key={h.id ?? i}
                      onClick={() =>
                        onSelect({
                          kind: "image",
                          src,
                          thumb,
                          pageURL: h.pageURL,
                        })
                      }
                      title="Set as background"
                      className="border border-teal-300/30 rounded-md overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={thumb}
                        alt={h.tags || "image"}
                        loading="lazy"
                        className="w-full h-24 object-cover"
                      />
                    </button>
                  );
                } else {
                  const videos = h.videos || {};
                  const pick =
                    videos.tiny?.url ||
                    videos.small?.url ||
                    videos.medium?.url ||
                    videos.large?.url;
                  const pictureId: string | undefined = h.picture_id;
                  const thumb = pictureId
                    ? `https://i.vimeocdn.com/video/${pictureId}_295x166.jpg`
                    : null;
                  return (
                    <button
                      key={h.id ?? i}
                      onClick={() =>
                        onSelect({
                          kind: "video",
                          src: pick,
                          thumb: thumb || "",
                          pageURL: h.pageURL,
                        })
                      }
                      title="Set as background"
                      className="border border-teal-300/30 rounded-md overflow-hidden text-teal-100"
                    >
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={h.tags || "video"}
                          loading="lazy"
                          className="w-full h-24 object-cover"
                        />
                      ) : pick ? (
                        <video
                          src={pick}
                          muted
                          playsInline
                          loop
                          autoPlay
                          preload="metadata"
                          className="w-full h-24 object-cover"
                        />
                      ) : (
                        <div className="w-full h-24 grid place-items-center text-teal-200/80 text-xs">
                          No preview
                        </div>
                      )}
                    </button>
                  );
                }
              })
            )}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-2 text-[10px] text-teal-200/80">
          Note: Avoid permanent hotlinking; cache/store assets if needed.
          Results may be cached for up to 24h per Pixabay API guidance.
        </div>
      </div>
    </div>
  );
}
