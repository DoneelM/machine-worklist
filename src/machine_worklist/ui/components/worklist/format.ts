import type { WorklistItem } from "@/lib/api";

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

/** The reason a machine is on the list, in plain words, from its most unusual component. */
export function reason(item: WorklistItem): string {
  switch (item.top_driver) {
    case "vibration":
      return `Vibration ${item.vib_trend >= 0 ? "up" : "down"} ${pct(Math.abs(item.vib_trend), 1)} on the prior week`;
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
