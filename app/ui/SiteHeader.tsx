"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAppStore } from "@/lib/store";

export default function SiteHeader() {
  const pathname = usePathname();
  // Hide header on the mixer page to keep it distraction-free
  const isMixer = pathname?.startsWith("/app");
  const setRouteLoading = useAppStore((s) => s.setRouteLoading);

  const linkBase =
    "spotlight btn-shape cursor-pointer text-[12px] px-3 py-1.5 ring-1 ring-white/5 hover:ring-teal-400/30 text-slate-300/85 hover:text-teal-100 bg-[#0b1220]/70";

  if (isMixer) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-30">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mt-3 flex items-center justify-between rounded-xl border border-white/10 bg-[#0b1220]/60 backdrop-blur-md px-3 py-2">
          <Link
            href="/"
            className="text-[13px] font-semibold tracking-wide text-slate-200"
          >
            NeuraTone
          </Link>
          <nav className="flex items-center gap-2">
            <Link
              href="/app"
              prefetch
              className={linkBase}
              data-analytics-event="nav_click"
              data-analytics-label="app"
              onClick={() => {
                try {
                  setRouteLoading(true);
                } catch {}
              }}
            >
              Launch Mixer
            </Link>
            <a
              href="https://github.com/RAIDUIX-DEVELOPER/raiduix-neuratone"
              target="_blank"
              rel="noopener noreferrer"
              className={linkBase}
              data-analytics-event="nav_click"
              data-analytics-label="github"
              aria-label="GitHub repository"
              title="GitHub"
            >
              {/* GitHub mark (icon-only) */}
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="h-4 w-4 text-slate-200/90"
                fill="currentColor"
              >
                <path d="M12 2C6.477 2 2 6.582 2 12.205c0 4.51 2.865 8.33 6.839 9.683.5.094.683-.219.683-.487 0-.24-.009-.874-.014-1.716-2.782.616-3.369-1.36-3.369-1.36-.455-1.174-1.11-1.487-1.11-1.487-.908-.633.069-.62.069-.62 1.004.072 1.532 1.05 1.532 1.05.892 1.556 2.341 1.107 2.91.846.091-.656.35-1.107.636-1.362-2.222-.256-4.555-1.137-4.555-5.057 0-1.117.39-2.03 1.029-2.747-.103-.257-.446-1.288.098-2.684 0 0 .84-.27 2.75 1.05A9.37 9.37 0 0 1 12 7.5c.85.004 1.705.116 2.504.34 1.908-1.322 2.747-1.05 2.747-1.05.545 1.396.202 2.427.1 2.684.64.717 1.028 1.63 1.028 2.747 0 3.93-2.337 4.798-4.565 5.05.358.314.678.933.678 1.88 0 1.357-.012 2.453-.012 2.786 0 .27.18.586.688.486A10.208 10.208 0 0 0 22 12.205C22 6.582 17.523 2 12 2z" />
              </svg>
            </a>
            <a
              href="https://x.com/neuratone"
              target="_blank"
              rel="noopener noreferrer"
              className={linkBase}
              data-analytics-event="nav_click"
              data-analytics-label="x_profile"
              aria-label="X profile"
              title="X"
            >
              {/* Use the provided public/128px-X_logo_2023_(white).png asset */}
              <Image
                src="/128px-X_logo_2023_(white).png"
                width={16}
                height={16}
                alt=""
                className="h-4 w-4 object-contain"
                priority={false}
              />
            </a>
          </nav>
        </div>
      </div>
    </div>
  );
}
