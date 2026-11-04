export const STATUS_URL = "https://api.squeekchain.com/v1/status";
export const POLL_MS = 5_000;
export type CoreStatus = "ACTIVE" | "IDLE" | "COUNTER_FAULT";
export type Wheel = { status: CoreStatus; rpm: number; simulated: boolean };
export type Feed = {
  online: boolean;
  loading: boolean;
  reason: string;
  wheel: Wheel;
  freshness: string;
  distanceMm: number | null;
  blockHeight: string | null;
  blockProgress: number | null;
  observedAt: number;
  staleAfterMs: number;
  receivedAt: number;
};

export const EMPTY_FEED: Feed = {
  online: false,
  loading: true,
  reason: "Connecting to the wheel…",
  wheel: { status: "IDLE", rpm: 0, simulated: true },
  freshness: "unknown",
  distanceMm: null,
  blockHeight: null,
  blockProgress: null,
  observedAt: 0,
  staleAfterMs: 0,
  receivedAt: 0,
};

const isObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object";
const nonnegative = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const height = (v: unknown): string | null => {
  if (typeof v === "string" && /^\d{1,30}$/.test(v))
    return BigInt(v).toString();
  if (typeof v === "number" && Number.isSafeInteger(v) && v >= 0)
    return String(v);
  return null;
};

/** Verified against the public status response on 2026-11-04; no other endpoint is used. */
export function parseStatus(raw: unknown, now = Date.now()): Feed {
  if (!isObject(raw) || !isObject(raw.measurement))
    throw new Error("Wheel measurement missing");
  const m = raw.measurement;
  const status = m.coreStatus;
  if (status !== "ACTIVE" && status !== "IDLE" && status !== "COUNTER_FAULT")
    throw new Error("Unknown wheel status");
  if (!nonnegative(m.rpmMilli)) throw new Error("Invalid RPM");
  const observedAt =
    typeof m.observedAt === "string" ? Date.parse(m.observedAt) : NaN;
  const staleAfterMs = nonnegative(m.staleAfterSeconds)
    ? Math.min(Number(m.staleAfterSeconds), 120) * 1000
    : 120_000;
  const fresh =
    m.freshness === "online" &&
    Number.isFinite(observedAt) &&
    now - observedAt <= staleAfterMs &&
    observedAt - now < 30_000;
  const online = fresh && status !== "COUNTER_FAULT";
  const b = isObject(raw.builder) ? raw.builder : {};
  const projected = isObject(b.projected) ? b.projected : {};
  const anchor = isObject(b.anchor) ? b.anchor : {};
  // Select a complete pair, so a malformed projection cannot mix height and progress from different anchors.
  const validProgress = (v: unknown) =>
    (typeof v === "number" || typeof v === "string") &&
    v !== "" &&
    Number.isFinite(Number(v)) &&
    Number(v) >= 0 &&
    Number(v) < 1_000_000_000;
  const block =
    height(projected.blockHeight) !== null &&
    validProgress(projected.blockProgress)
      ? projected
      : anchor;
  return {
    online,
    loading: false,
    reason: online
      ? ""
      : status === "COUNTER_FAULT"
        ? "Wheel counter fault. Using a simulated wheel."
        : "The wheel measurement is stale. Using a simulated wheel.",
    wheel: { status, rpm: Number(m.rpmMilli) / 1000, simulated: !online },
    freshness: typeof m.freshness === "string" ? m.freshness : "unknown",
    distanceMm: nonnegative(m.distanceMm) ? Number(m.distanceMm) : null,
    blockHeight: height(block.blockHeight),
    // Live sample: cumulativeBlockUnits = blockHeight × 1e9 + blockProgress.
    blockProgress: validProgress(block.blockProgress)
      ? Number(block.blockProgress) / 1e9
      : null,
    observedAt,
    staleAfterMs,
    receivedAt: now,
  };
}

export function practiceWheel(seconds: number): Wheel {
  const cycle = seconds % 75;
  return {
    status: cycle >= 48 ? "IDLE" : "ACTIVE",
    rpm: cycle >= 48 ? 0 : cycle >= 25 ? 48 : 28,
    simulated: true,
  };
}

export function isExpired(feed: Feed, now = Date.now()) {
  return (
    feed.online &&
    (now - feed.receivedAt > 15_000 ||
      now - feed.observedAt > feed.staleAfterMs)
  );
}
