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

  React.useEffect(() => {
    if (visible) doSearch("space", "images");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const chips = kind === "images" ? IMAGE_CHIPS : VIDEO_CHIPS;

  return (
    <div
      className="absolute top-3 right-3 w-[420px] max-w-[95%] h-[calc(100%-24px)] z-40"
      style={{ display: visible ? "flex" : "none" }}
    >
      <div className="flex flex-col bg-[#0b1220]/95 backdrop-blur rounded-lg border border-teal-300/30 p-3 w-full">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setKind("images")}
            className={`px-2.5 py-1.5 rounded-md border ${
              kind === "images"
                ? "bg-teal-500/80 border-teal-400 text-white"
                : "bg-transparent border-teal-400/40 text-teal-100"
            }`}
          >
            Images
          </button>
          <button
            onClick={() => setKind("videos")}
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

        <div
          className="mt-2 grid grid-cols-3 gap-2 overflow-y-auto pr-1"
          style={{ maxHeight: "calc(100% - 140px)" }}
        >
          {loading ? (
            <div className="col-span-3 text-teal-100">Loading…</div>
          ) : hits.length === 0 ? (
            <div className="col-span-3 text-teal-100/80">No results</div>
          ) : (
            hits.map((h, i) => {
              if (kind === "images") {
                const thumb = h.previewURL || h.webformatURL;
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
                      className="w-full h-24 object-cover"
                    />
                  </button>
                );
              } else {
                const videos = h.videos || {};
                const pick =
                  videos.medium?.url ||
                  videos.small?.url ||
                  videos.large?.url ||
                  videos.tiny?.url;
                // Pixabay provides a picture_id for thumbnails
                const thumb = h.picture_id
                  ? `https://i.vimeocdn.com/video/${h.picture_id}_200x150.jpg`
                  : h.userImageURL || "";
                return (
                  <button
                    key={h.id ?? i}
                    onClick={() =>
                      onSelect({
                        kind: "video",
                        src: pick,
                        thumb,
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
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 grid place-items-center">
                        video
                      </div>
                    )}
                  </button>
                );
              }
            })
          )}
        </div>

        <div className="mt-2 text-[10px] text-teal-200/80">
          Note: Avoid permanent hotlinking; cache/store assets if needed.
          Results may be cached for up to 24h per Pixabay API guidance.
        </div>
      </div>
    </div>
  );
}
