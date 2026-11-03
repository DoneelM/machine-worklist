import type { RiskDriver, WorklistItem } from "@/lib/api";

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

/** The reason a machine is on the list, in plain words, from its most unusual component. */
export function reason(item: WorklistItem): string {
  switch (item.top_driver) {
    case "vibration":
      return `Vibration ${item.vib_trend >= 0 ? "up" : "down"} ${pct(Math.abs(item.vib_trend), 1)} on the prior week`;
    case "temperature":
      return `Temperature ${item.temp_change >= 0 ? "up" : "down"} ${Math.abs(item.temp_change).toFixed(1)}°C on the prior week`;
    case "defects":
      return `${item.defects_per_1k.toFixed(2)} serious defects per 1k units`;
    default:
      return `${pct(item.yield_shortfall, 1)} below planned output`;
  }
}

export const statusLabel = { open: "Open", claimed: "Claimed", resolved: "Resolved" } as const;

export function shortName(email?: string | null) {
  if (!email) return "";
  return email.split("@")[0];
}

/** A model driver in plain words, e.g. "Power draw 41.2 (top 4% of the fleet)". */
export function driverText(d: RiskDriver): string {
  if (typeof d.value !== "number") return `${d.label}: ${d.value}`;
  const v = formatDriverValue(d.feature, d.value);
  const p = d.percentile;
  const where = p == null ? "" : p >= 0.5 ? ` (top ${Math.max(1, Math.round((1 - p) * 100))}% of its type)` : ` (bottom ${Math.max(1, Math.round(p * 100))}% of its type)`;
  return `${d.label} ${v}${where}`;
}

/** How much a reading moves risk, in percentage points (what-if vs a typical machine of its type). */
export const driverEffect = (d: RiskDriver) => `${d.contribution >= 0 ? "+" : "−"}${(Math.abs(d.contribution) * 100).toFixed(1)} pts`;

function formatDriverValue(feature: string, v: number): string {
  if (feature === "vib_trend" || feature === "vib_vs_30d") return `${v >= 0 ? "+" : ""}${pct(v, 1)}`;
  if (feature.endsWith("share_7d") || feature.startsWith("yield")) return pct(v, 1);
  if (feature === "age_days") return `${(v / 365.25).toFixed(1)} yrs`;
  if (feature.startsWith("vib")) return `${v.toFixed(2)} mm/s`;
  if (feature === "temp_trend") return `${v >= 0 ? "+" : ""}${v.toFixed(1)}°C`;
  if (feature.startsWith("temp")) return `${v.toFixed(1)}°C`;
  if (feature === "power_7d") return `${v.toFixed(1)} kW`;
  if (feature === "rpm_7d") return `${Math.round(v).toLocaleString()} rpm`;
  return Number.isInteger(v) ? `${v}` : v.toFixed(2);
}

/** Model risk as a multiple of today's fleet average, e.g. "3.4×". */
export const lift = (v: number | null | undefined) => (v == null ? "–" : `${v.toFixed(1)}×`);
