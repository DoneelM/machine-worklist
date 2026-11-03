import { useLayoutEffect, useRef, useState } from "react";

type Point = { x: string; y: number };

/** Single-series daily line with an optional reference line and a crosshair tooltip. */
export function TrendChart({
  title,
  unit,
  points,
  reference,
  referenceLabel,
  format = (v) => v.toFixed(2),
}: {
  title: string;
  unit: string;
  points: Point[];
  reference?: number;
  referenceLabel?: string;
  format?: (v: number) => string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(360);
  const [hover, setHover] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, e.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  const height = 132;
  const pad = { top: 10, right: 8, bottom: 20, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  if (points.length === 0) {
    return (
      <figure ref={wrap} className="space-y-1">
        <figcaption className="text-sm font-medium">{title}</figcaption>
        <p className="text-sm text-muted-foreground">No readings in this window.</p>
      </figure>
    );
  }

  const ys = points.map((p) => p.y).concat(reference ?? []);
  let lo = Math.min(...ys);
  let hi = Math.max(...ys);
  const span = hi - lo || Math.abs(hi) || 1;
  lo -= span * 0.12;
  hi += span * 0.12;
  const sx = (i: number) => pad.left + (points.length === 1 ? w / 2 : (i / (points.length - 1)) * w);
  const sy = (v: number) => pad.top + h - ((v - lo) / (hi - lo)) * h;
  const path = points.map((p, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`).join("");
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15];
  const shortDate = (d: string) =>
    new Date(d + "T00:00:00Z").toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const rel = (e.clientX - box.left) / box.width;
    setHover(Math.round(rel * (points.length - 1)));
  };

  const hp = hover != null ? points[hover] : null;

  return (
    <figure ref={wrap} className="space-y-1">
      <figcaption className="flex items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">
          {title} <span className="font-normal text-muted-foreground">({unit})</span>
        </span>
        <span className="font-mono text-xs text-muted-foreground" aria-live="polite">
          {hp ? `${shortDate(hp.x)} · ${format(hp.y)}` : `last: ${format(points[points.length - 1].y)}`}
        </span>
      </figcaption>
      <svg width={width} height={height} role="img" aria-label={`${title}, daily, ${points.length} days`} className="block">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={sy(t)} y2={sy(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={pad.left - 6} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
              {format(t)}
            </text>
          </g>
        ))}
        {[0, points.length - 1].map((i) => (
          <text key={i} x={sx(i)} y={height - 4} textAnchor={i ? "end" : "start"} className="fill-muted-foreground text-[10px]">
            {shortDate(points[i].x)}
          </text>
        ))}
        {reference != null && (
          <g>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={sy(reference)}
              y2={sy(reference)}
              stroke="var(--signal)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {referenceLabel && (
              <text x={width - pad.right} y={sy(reference) - 4} textAnchor="end" className="fill-muted-foreground text-[10px]">
                {referenceLabel}
              </text>
            )}
          </g>
        )}
        <path d={path} fill="none" stroke="var(--chart-1)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hp && hover != null && (
          <g pointerEvents="none">
            <line x1={sx(hover)} x2={sx(hover)} y1={pad.top} y2={pad.top + h} stroke="var(--input)" strokeWidth={1} />
            <circle cx={sx(hover)} cy={sy(hp.y)} r={4.5} fill="var(--chart-1)" stroke="var(--card)" strokeWidth={2} />
          </g>
        )}
        <rect
          x={pad.left}
          y={pad.top}
          width={w}
          height={h}
          fill="transparent"
          onPointerMove={onMove}
          onPointerLeave={() => setHover(null)}
        />
      </svg>
    </figure>
  );
}
