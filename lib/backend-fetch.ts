import "server-only";

// Calls slower than this are always logged, even in production.
const SLOW_MS = 800;
const LOG_ALL = process.env.NODE_ENV !== "production" || process.env.API_TIMING_LOG === "all";

/** Parses `app;dur=812.3, auth;dur=120.4, db;dur=300.2` into { app: {dur}, ... }. */
function parseServerTiming(header: string | null) {
  const out: Record<string, { dur: number; desc?: string }> = {};
  if (!header) return out;
  for (const entry of header.split(",")) {
    const [name, ...params] = entry.trim().split(";");
    const metric: { dur: number; desc?: string } = { dur: 0 };
    for (const p of params) {
      const [k, v] = p.split("=");
      if (k === "dur") metric.dur = Number(v);
      if (k === "desc") metric.desc = v?.replace(/"/g, "");
    }
    out[name] = metric;
  }
  return out;
}

// Query params that can carry personal data or secrets: their values never reach the logs.
const REDACTED_PARAMS = new Set(["search", "q", "email", "phone", "phoneNumber", "token", "code", "claim_code"]);

function shortPath(url: string) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) if (REDACTED_PARAMS.has(key)) u.searchParams.set(key, "[redacted]");
    return u.pathname + u.search;
  } catch {
    return url.split("?")[0];
  }
}

/**
 * Drop-in replacement for `fetch` for every Next → backend call. Logs one line per call:
 *
 *   [api] GET /api/v1/events?page=2 200 812ms · backend 600ms (auth 120ms, db 300ms) · network 212ms
 *
 * "backend" comes from the edge-backend's Server-Timing header; "network" is the rest
 * (Next ↔ Cloud Run latency, TLS, cold starts). Only slow calls are logged in production
 * unless API_TIMING_LOG=all.
 */
export async function backendFetch(input: string, init?: RequestInit): Promise<Response> {
  const start = performance.now();
  const label = `${init?.method ?? "GET"} ${shortPath(input)}`;

  let res: Response;
  try {
    res = await fetch(input, init);
  } catch (err) {
    console.warn(`[api] ${label} FAILED after ${Math.round(performance.now() - start)}ms`);
    throw err;
  }

  const total = performance.now() - start;
  if (LOG_ALL || total >= SLOW_MS) {
    const timing = parseServerTiming(res.headers.get("server-timing"));
    const parts = [`[api] ${label} ${res.status} ${Math.round(total)}ms`];
    if (timing.app) {
      const inner = Object.entries(timing)
        .filter(([name]) => name !== "app")
        .map(([name, m]) => `${name} ${Math.round(m.dur)}ms${m.desc ? `/${m.desc}` : ""}`);
      parts.push(`backend ${Math.round(timing.app.dur)}ms${inner.length ? ` (${inner.join(", ")})` : ""}`);
      parts.push(`network ${Math.round(total - timing.app.dur)}ms`);
    }
    const line = parts.join(" · ");
    if (total >= SLOW_MS) console.warn(`[slow] ${line}`);
    else console.log(line);
  }

  return res;
}
