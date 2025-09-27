// Lightweight logger utility with environment guards.
// Replace direct console.* usage to allow future expansion (e.g., remote logging).

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Default minimum level (can be overridden via env var at build-time)
const MIN_LEVEL: LogLevel =
  (process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || "info";

function shouldLog(level: LogLevel) {
  if (process.env.NODE_ENV === "production" && level === "debug") return false;
  return LEVEL_ORDER[level] >= LEVEL_ORDER[MIN_LEVEL];
}

function base(level: LogLevel, args: any[]) {
  if (!shouldLog(level)) return;
  const ts = new Date().toISOString();
  // eslint-disable-next-line no-console
  console[level === "debug" ? "log" : level](
    `[${ts}] [${level.toUpperCase()}]`,
    ...args
  );
}

export const log = {
  debug: (...args: any[]) => base("debug", args),
  info: (...args: any[]) => base("info", args),
  warn: (...args: any[]) => base("warn", args),
  error: (...args: any[]) => base("error", args),
};

export default log;
