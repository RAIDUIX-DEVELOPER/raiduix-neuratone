#!/usr/bin/env node
/**
 * Simple bundle size reporter.
 * Runs `next build` and extracts total JS size from .next trace output.
 * For deeper analysis consider @next/bundle-analyzer.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";

function run(cmd) {
  return execSync(cmd, { stdio: "pipe", encoding: "utf-8" });
}

console.log("[analyze] Building project...");
try {
  run("npm run build");
} catch (e) {
  console.error("[analyze] Build failed");
  process.exit(1);
}

const statsDir = ".next/server/app";
let total = 0;
function walk(dir) {
  for (const entry of fs.readdirSync(dir)) {
    const p = `${dir}/${entry}`;
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p);
    else if (/\.js$/.test(entry)) total += st.size;
  }
}
if (fs.existsSync(statsDir)) walk(statsDir);

function format(bytes) {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

console.log(`[analyze] Approx server bundle JS (app router): ${format(total)}`);
console.log("[analyze] (Use @next/bundle-analyzer for granular insight)");
