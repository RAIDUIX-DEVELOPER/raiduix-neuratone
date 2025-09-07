"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  const [timer, setTimer] = useState(0);
  useEffect(() => {
    if (timer > 0) {
      const id = setTimeout(() => {
        window.dispatchEvent(new CustomEvent("neuratone-stop-all"));
      }, timer * 1000);
      return () => clearTimeout(id);
    }
  }, [timer]);
  return (
    <div className="min-h-dvh p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Settings</h1>
        <Link href="/app" className="text-sm underline">
          Back
        </Link>
      </header>
      <section className="space-y-4">
        <div className="card spotlight p-4 rounded-md space-y-3">
          <h2 className="text-sm font-semibold tracking-wide">Theme</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`px-3 py-1 rounded text-xs ${
                theme === "light" ? "bg-teal-500 text-white" : "bg-slate-200"
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`px-3 py-1 rounded text-xs ${
                theme === "dark" ? "bg-teal-500 text-white" : "bg-slate-200"
              }`}
            >
              Dark
            </button>
          </div>
        </div>
        <div className="card spotlight p-4 rounded-md space-y-3">
          <h2 className="text-sm font-semibold tracking-wide">
            Timer (auto-stop)
          </h2>
          <input
            type="number"
            value={timer}
            onChange={(e) => setTimer(Number(e.target.value))}
            className="border rounded px-2 py-1 text-sm w-32"
          />
          <p className="text-[10px] text-slate-500">
            Seconds until all layers stop. 0 disables.
          </p>
        </div>
        <div className="text-xs text-slate-500">
          NeuraTone
          <sup className="ml-1 text-teal-400 font-semibold relative -top-1">
            RAIDUIX
          </sup>
        </div>
      </section>
    </div>
  );
}
