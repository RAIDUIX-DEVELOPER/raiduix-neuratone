"use client";
import { useAppStore } from "@/lib/store";
import dynamic from "next/dynamic";

const Mixer = dynamic(() => import("@/app/app/ui/Mixer"), { ssr: false });

export default function AppDashboard() {
  const layers = useAppStore((s) => s.layers);
  return (
    <div className="min-h-dvh p-4 md:p-8 flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Mixer{" "}
          <span className="text-sm text-teal-400">({layers.length}/5)</span>
        </h1>
      </header>
      <Mixer />
    </div>
  );
}
