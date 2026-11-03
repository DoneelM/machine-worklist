import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, CircleDot, Hand, Moon, RotateCcw, SearchCheck, StickyNote, Sun, X } from "lucide-react";

import {
  type ActionIn,
  type MachineDetailOut,
  type ModelEvalOut,
  type WorklistItem,
  type WorklistOut,
  ApiError,
  useApplyAction,
  useGetFilters,
  useGetMachine,
  useGetModelEval,
  useGetWorklist,
} from "@/lib/api";
import selector from "@/lib/selector";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/apx/theme-provider";
import { TrendChart } from "@/components/worklist/TrendChart";
import { AskButton, AskPanel } from "@/components/worklist/AskPanel";
import { driverEffect, driverText, lift, pct, reason, shortName, statusLabel } from "@/components/worklist/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: () => <Worklist />,
});

type StatusFilter = "all" | "open" | "claimed" | "resolved";
/** KPI tiles double as filters over the current plant/type view. */
type Focus = "all" | "today" | "agree" | "claimed";

const CREW_CAPACITY = 20; // machines a crew inspects per day, as in the evaluation
const MODEL_TOP = 20;

const surface = "rounded-xl border border-border bg-card shadow-[0_1px_2px_rgb(15_30_38/0.05),0_6px_16px_-8px_rgb(15_30_38/0.10)]";

function errorText(e: unknown) {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: string } | string;
    return typeof body === "object" && body?.detail ? body.detail : `${e.status} ${e.statusText}`;
  }
  return e instanceof Error ? e.message : "Unknown error";
}

function Worklist() {
  const [plant, setPlant] = useState("");
  const [machineType, setMachineType] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [focus, setFocus] = useState<Focus>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);

  const filters = useGetFilters(selector());
  const list = useGetWorklist({ params: { plant, machine_type: machineType }, ...selector<WorklistOut>() });
  const evaluation = useGetModelEval(selector<ModelEvalOut | null>());

  // Rule rank within the current plant/type view; it stays fixed when the KPI or status filters narrow the list.
  const all = list.data?.items ?? [];
  const rank = useMemo(() => new Map(all.map((i, n) => [i.machine_id, n + 1])), [all]);
  const today = useMemo(() => new Set(all.slice(0, CREW_CAPACITY).map((i) => i.machine_id)), [all]);
  const agree = all.filter((i) => today.has(i.machine_id) && i.risk_rank != null && i.risk_rank <= MODEL_TOP).length;
  const claimed = all.filter((i) => i.action.status === "claimed").length;

  const items = useMemo(
    () =>
      all.filter((i) => {
        if (status !== "all" && i.action.status !== status) return false;
        if (focus === "today") return today.has(i.machine_id);
        if (focus === "agree") return today.has(i.machine_id) && i.risk_rank != null && i.risk_rank <= MODEL_TOP;
        if (focus === "claimed") return i.action.status === "claimed";
        return true;
      }),
    [all, status, focus, today],
  );

  // Keep a selection that's still visible; otherwise pick the top item.
  useEffect(() => {
    if (items.length && !items.some((i) => i.machine_id === selected)) setSelected(items[0].machine_id);
    if (!items.length) setSelected(null);
  }, [items, selected]);

  const asOf = list.data?.as_of
    ? new Date(list.data.as_of).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : null;
  const toggle = (f: Focus) => setFocus((cur) => (cur === f ? "all" : f));
  const e = evaluation.data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-shell text-shell-foreground">
        <div className="mx-auto max-w-[1440px] px-6 pt-4 pb-4">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0">
              <h1 className="text-[1.375rem] font-semibold tracking-[-0.015em]">Machine attention</h1>
              <p className="mt-0.5 text-[0.9375rem] text-shell-muted">
                Today's inspection plan, ranked on vibration and temperature change, serious defects and lost output.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <AskButton onClick={() => setAskOpen(true)} />
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4" role="group" aria-label="Today at a glance">
            <KpiTile
              label="To inspect today"
              value={list.isSuccess ? `${Math.min(CREW_CAPACITY, all.length)}` : "–"}
              sub="Crew capacity, top of the rule's ranking"
              active={focus === "today"}
              onClick={() => toggle("today")}
            />
            <KpiTile
              label="Model agrees"
              value={list.isSuccess ? `${agree}` : "–"}
              unit={`of ${Math.min(CREW_CAPACITY, all.length)}`}
              sub="Also in the model's top 20 for next week"
              active={focus === "agree"}
              onClick={() => toggle("agree")}
            />
            <KpiTile
              label="Claimed"
              value={list.isSuccess ? `${claimed}` : "–"}
              sub={claimed === 1 ? "Machine being looked at now" : "Machines being looked at now"}
              active={focus === "claimed"}
              onClick={() => toggle("claimed")}
            />
            <EvidenceTile e={e} />
          </div>

          <p className="mt-3 text-[0.8125rem] text-shell-muted">
            Synthetic demo data · 14 days to {asOf ?? "…"} · Score weights: vibration 30 · temperature 15 · defects 30 · yield 25 · The
            model is a second opinion
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-6 py-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <FilterSelect label="Plant" value={plant} onChange={setPlant} options={filters.data?.plants ?? []} all="All plants" />
          <FilterSelect
            label="Machine type"
            value={machineType}
            onChange={setMachineType}
            options={filters.data?.machine_types ?? []}
            all="All types"
          />
          <FilterSelect
            label="Status"
            value={status === "all" ? "" : status}
            onChange={(v) => setStatus((v || "all") as StatusFilter)}
            options={["open", "claimed", "resolved"]}
            labels={statusLabel}
            all="Any status"
          />
          {focus !== "all" && (
            <button
              onClick={() => setFocus("all")}
              className="inline-flex h-9 items-center gap-1.5 self-end rounded-full border border-border bg-card px-3 text-sm hover:bg-muted"
            >
              <X className="size-3.5" aria-hidden />
              {focus === "today" ? "Today's 20" : focus === "agree" ? "Model agrees" : "Claimed"}
              <span className="sr-only">: clear this filter</span>
            </button>
          )}
          <p className="ml-auto self-end pb-2 text-sm text-muted-foreground" aria-live="polite">
            {list.isSuccess && `Showing ${items.length} of ${all.length} machines`}
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
          <Queue
            loading={list.isLoading}
            error={list.error}
            onRetry={() => list.refetch()}
            items={items}
            rank={rank}
            showCapacityLine={focus === "all" && status === "all"}
            selected={selected}
            onSelect={setSelected}
          />
          <aside className="lg:sticky lg:top-5 lg:self-start">
            {selected ? (
              <Detail machineId={selected} rank={rank.get(selected)} actionsEnabled={list.data?.actions_enabled ?? false} />
            ) : (
              !list.isLoading && <p className={cn(surface, "p-5 text-sm text-muted-foreground")}>Pick a machine to see why it's on the list.</p>
            )}
          </aside>
        </div>
      </main>
      <AskPanel open={askOpen} onClose={() => setAskOpen(false)} machineId={selected} />
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="inline-flex size-9 items-center justify-center rounded-lg border border-shell-line text-shell-foreground transition-colors hover:bg-shell-raised"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
    >
      {dark ? <Sun className="size-4" aria-hidden /> : <Moon className="size-4" aria-hidden />}
    </button>
  );
}

function KpiTile({
  label,
  value,
  unit,
  sub,
  active,
  onClick,
}: {
  label: string;
  value: string;
  unit?: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group rounded-xl border px-4 py-2.5 text-left transition-colors duration-150",
        active
          ? "border-signal-strong bg-shell-foreground text-shell"
          : "border-shell-line bg-shell-raised/60 text-shell-foreground hover:border-shell-muted hover:bg-shell-raised",
      )}
    >
      <span className={cn("block text-[0.8125rem] font-medium", active ? "text-shell/75" : "text-shell-muted")}>{label}</span>
      <span className="mt-1 flex items-baseline gap-1.5">
        <span className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em]">{value}</span>
        {unit && <span className={cn("text-[0.9375rem]", active ? "text-shell/75" : "text-shell-muted")}>{unit}</span>}
      </span>
      <span className={cn("mt-1.5 block text-[0.8125rem]", active ? "text-shell/75" : "text-shell-muted")}>
        {active ? "Showing only these · click to clear" : sub}
      </span>
    </button>
  );
}

function EvidenceTile({ e }: { e: ModelEvalOut | null | undefined }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <section
      aria-label="Rule versus model"
      className="rounded-xl border border-shell-line bg-shell-raised/60 px-4 py-2.5"
      title={
        e
          ? `Of the ${e.crew_capacity} machines each would send a crew to daily, ${pct(e.rule_precision_at_20)} (rule) and ${pct(e.model_precision_at_20)} (model v${e.model_version}) landed in the fleet's worst 10% the next week. Overall ranking (AUC): rule ${e.rule_auc.toFixed(2)}, model ${e.model_auc.toFixed(2)}.`
          : undefined
      }
    >
      <span className="block text-[0.8125rem] font-medium text-shell-muted">
        Rule vs model{e ? `, ${fmt(e.test_start)}–${fmt(e.test_end)}` : ""}
      </span>
      {e ? (
        <>
          <span className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em]">{pct(e.rule_precision_at_20)}</span>
            <span className="text-[0.9375rem] text-shell-muted">vs</span>
            <span className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em]">{pct(e.model_precision_at_20)}</span>
          </span>
          <span className="mt-1.5 block text-[0.8125rem] text-shell-muted">
            Hit rate of each day's top 20 · random {pct(e.base_rate, 1)} · a tie, so the rule ranks
          </span>
        </>
      ) : (
        <span className="mt-2 block text-[0.9375rem] text-shell-muted">Model not trained yet</span>
      )}
    </section>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  onChange,
  options,
  all,
  labels,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: T[];
  all: string;
  labels?: Record<T, string>;
}) {
  return (
    <label className="flex flex-col gap-1 text-[0.8125rem] font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-44 rounded-lg border border-input bg-card px-3 text-[0.9375rem] font-normal text-foreground transition-colors hover:border-foreground/50"
      >
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels?.[o] ?? o}
          </option>
        ))}
      </select>
    </label>
  );
}

function Queue({
  loading,
  error,
  onRetry,
  items,
  rank,
  showCapacityLine,
  selected,
  onSelect,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  items: WorklistItem[];
  rank: Map<string, number>;
  showCapacityLine: boolean;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const idx = items.findIndex((i) => i.machine_id === selected);
    const next = items[Math.min(items.length - 1, Math.max(0, idx + (e.key === "ArrowDown" ? 1 : -1)))];
    if (next) {
      onSelect(next.machine_id);
      listRef.current?.querySelector<HTMLElement>(`[data-id="${next.machine_id}"]`)?.focus();
    }
  };

  const head = "grid grid-cols-[1.75rem_6.25rem_minmax(0,1fr)_6.5rem_4rem_6.25rem] items-center gap-3 px-4";

  return (
    <section className={cn(surface, "overflow-hidden")} aria-label="Worklist">
      <div className={cn(head, "hidden border-b border-border bg-muted/60 py-2.5 text-[0.8125rem] font-medium text-muted-foreground sm:grid")}>
        <span>#</span>
        <span>Machine</span>
        <span>Why it's here</span>
        <span>Score</span>
        <span className="text-right" title="Model risk of being in the fleet's worst 10% next week, as a multiple of today's fleet average">
          Model
        </span>
        <span>Status</span>
      </div>

      {loading && (
        <div aria-busy="true" aria-label="Loading worklist">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3.5 last:border-0">
              <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-1/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {!loading && !!error && (
        <div role="alert" className="flex items-start gap-3 p-5 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
          <div className="space-y-2">
            <p>Couldn't load the worklist: {errorText(error)}</p>
            <Button variant="outline" size="sm" onClick={onRetry}>
              Try again
            </Button>
          </div>
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="p-5 text-sm text-muted-foreground">No machines match these filters. Widen the plant, type, status or the tile you picked.</p>
      )}

      <div
        ref={listRef}
        role="listbox"
        aria-label="Machines by attention"
        onKeyDown={onKeyDown}
        className="max-h-[calc(100vh-17rem)] min-h-80 overflow-y-auto"
      >
        {items.map((item, idx) => {
          const isSel = item.machine_id === selected;
          const r = rank.get(item.machine_id) ?? idx + 1;
          const beyond = showCapacityLine && r > CREW_CAPACITY;
          return (
            <div key={item.machine_id}>
              {showCapacityLine && r === CREW_CAPACITY + 1 && <CapacityLine />}
              <div
                data-id={item.machine_id}
                role="option"
                aria-selected={isSel}
                tabIndex={isSel || (!selected && idx === 0) ? 0 : -1}
                onClick={() => onSelect(item.machine_id)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(item.machine_id)}
                className={cn(
                  head,
                  "relative cursor-pointer border-b border-border py-3 text-[0.9375rem] transition-colors duration-150 hover:bg-muted/70 focus-visible:rounded-none focus-visible:outline-offset-[-2px]",
                  isSel && "bg-signal-soft hover:bg-signal-soft",
                  "max-sm:grid-cols-[2.25rem_minmax(0,1fr)_4.5rem]",
                )}
              >
                {isSel && <span className="absolute inset-y-0 left-0 w-[3px] bg-signal-strong" aria-hidden />}
                <span className={cn("text-[0.8125rem] font-medium", beyond ? "text-muted-foreground" : "text-foreground/80")}>{r}</span>
                <span className="min-w-0">
                  <span className="block font-mono text-[0.9375rem] font-medium tracking-tight">{item.machine_id}</span>
                  <span className="block truncate text-[0.8125rem] text-muted-foreground" title={`${item.plant} · ${item.line}`}>
                    {item.plant} · {item.line}
                  </span>
                </span>
                <span className="min-w-0 max-sm:col-start-2 max-sm:row-start-2">
                  <span className="block truncate" title={reason(item)}>
                    {reason(item)}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-muted-foreground">{item.machine_type}</span>
                </span>
                <ScoreBar score={item.attention_score} muted={beyond} />
                <ModelCell item={item} />
                <span className="max-sm:col-start-3 max-sm:row-start-2">
                  <StatusPill status={item.action.status} owner={item.action.owner} />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** The signature move: the list is cut at what one crew can inspect today. */
function CapacityLine() {
  return (
    <div role="separator" aria-label={`Crew capacity: ${CREW_CAPACITY} machines today`} className="flex items-center gap-3 bg-muted/60 px-4 py-2">
      <span className="h-px flex-1 bg-signal-strong/70" aria-hidden />
      <span className="text-[0.8125rem] font-medium text-signal-ink">Crew capacity · {CREW_CAPACITY} machines today</span>
      <span className="h-px flex-1 bg-signal-strong/70" aria-hidden />
    </div>
  );
}

function ScoreBar({ score, muted }: { score: number; muted?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 max-sm:col-start-3 max-sm:row-start-1 max-sm:justify-end">
      <span className="relative h-1.5 w-full max-w-14 overflow-hidden rounded-full bg-track max-sm:hidden" aria-hidden>
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", muted ? "bg-chart-3" : "bg-chart-1")}
          style={{ width: `${Math.max(2, Math.min(100, score))}%` }}
        />
      </span>
      <span className="w-8 text-right text-base font-semibold tabular-nums">{score.toFixed(0)}</span>
    </span>
  );
}

function StatusPill({ status = "open", owner }: { status?: WorklistItem["action"]["status"]; owner?: string | null }) {
  const Icon = status === "resolved" ? Check : status === "claimed" ? Hand : CircleDot;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[0.8125rem] font-medium",
        status === "open" && "border border-border text-muted-foreground",
        status === "claimed" && "bg-signal-soft text-signal-ink",
        status === "resolved" && "bg-success-soft text-success",
      )}
      title={owner ? `${statusLabel[status]} by ${owner}` : statusLabel[status]}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{status === "claimed" && owner ? shortName(owner) : statusLabel[status]}</span>
    </span>
  );
}

function Detail({ machineId, rank, actionsEnabled }: { machineId: string; rank?: number; actionsEnabled: boolean }) {
  const q = useGetMachine({ params: { machine_id: machineId }, ...selector<MachineDetailOut>() });

  if (q.isLoading)
    return (
      <div className={cn(surface, "space-y-3 p-5")} aria-busy="true">
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    );

  if (q.error || !q.data)
    return (
      <div role="alert" className={cn(surface, "space-y-2 p-5 text-sm")}>
        <p>Couldn't load {machineId}: {errorText(q.error)}</p>
        <Button variant="outline" size="sm" onClick={() => q.refetch()}>
          Try again
        </Button>
      </div>
    );

  const d = q.data;
  const it = d.item;
  const yieldPoints = d.daily
    .filter((p) => p.units_planned > 0)
    .map((p) => ({ x: p.day, y: p.units_produced / p.units_planned }));
  const inToday = rank != null && rank <= CREW_CAPACITY;

  return (
    <article className={cn(surface, "divide-y divide-border")} aria-label={`${it.machine_id} detail`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="font-mono text-xl font-semibold tracking-tight">{it.machine_id}</h2>
            <p className="truncate text-[0.9375rem] text-muted-foreground">
              {it.machine_type} · {it.plant} · line {it.line}
            </p>
            {rank != null && (
              <span
                className={cn(
                  "mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[0.8125rem] font-medium",
                  inToday ? "bg-signal-soft text-signal-ink" : "bg-muted text-muted-foreground",
                )}
              >
                #{rank} {inToday ? "· in today's 20" : "· below crew capacity"}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-[2.25rem] leading-none font-semibold tracking-[-0.02em] tabular-nums">{it.attention_score.toFixed(0)}</p>
            <p className="mt-1 text-[0.8125rem] text-muted-foreground">score of 100</p>
          </div>
        </div>
        <p className="mt-4 text-[0.9375rem]">
          <span className="font-medium">Most unusual: </span>
          {reason(it)}, compared with other {it.machine_type.toLowerCase()}s.
        </p>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-muted/60 p-3">
          <Fact label="Vibration, 7d" value={`${d.vib_recent.toFixed(2)} mm/s`} sub={`was ${d.vib_baseline.toFixed(2)}`} />
          <Fact label="Temperature, 7d" value={`${d.temp_recent.toFixed(1)}°C`} sub={`was ${d.temp_baseline.toFixed(1)}`} />
          <Fact label="Serious defects" value={`${it.serious_defects}`} sub={`${it.critical_defects} critical`} />
          <Fact label="Output vs plan" value={pct(d.units_produced / Math.max(1, d.units_planned))} sub={`${d.units_produced.toLocaleString()} units`} />
        </dl>
      </div>

      <ActionPanel key={it.machine_id} item={it} enabled={actionsEnabled} />

      <SecondOpinion item={it} />

      <div className="space-y-5 p-5">
        <TrendChart
          title="Daily vibration"
          unit="mm/s"
          points={d.daily.map((p) => ({ x: p.day, y: p.vibration_mm_s }))}
          reference={d.vib_baseline}
          referenceLabel="prior-week average"
        />
        <TrendChart
          title="Daily temperature"
          unit="°C"
          points={d.daily.map((p) => ({ x: p.day, y: p.temperature_c }))}
          reference={d.temp_baseline}
          referenceLabel="prior-week average"
          format={(v) => v.toFixed(1)}
        />
        <TrendChart title="Daily output vs plan" unit="% of planned" points={yieldPoints} format={(v) => pct(v)} />
      </div>

      {d.history.length > 0 && (
        <div className="p-5">
          <h3 className="mb-2 text-[0.9375rem] font-semibold">Activity</h3>
          <ol className="space-y-2 text-sm">
            {d.history.map((h, i) => (
              <li key={i} className="flex gap-3">
                <time className="w-28 shrink-0 text-[0.8125rem] text-muted-foreground tabular-nums" dateTime={h.created_at}>
                  {new Date(h.created_at).toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </time>
                <span className="min-w-0">
                  <span className="font-medium">{shortName(h.actor) || "Someone"}</span> {pastTense[h.action] ?? h.action}
                  {h.note && <span className="block break-words text-muted-foreground">“{h.note}”</span>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}

const pastTense: Record<string, string> = {
  claim: "claimed it",
  note: "added a note",
  resolve: "resolved it",
  found_issue: "found an issue",
  false_alarm: "marked it a false alarm",
  reopen: "reopened it",
};

function ModelCell({ item }: { item: WorklistItem }) {
  const top = item.risk_rank != null && item.risk_rank <= MODEL_TOP;
  return (
    <span
      className={cn("text-right text-[0.9375rem] tabular-nums max-sm:hidden", top ? "font-semibold text-signal" : "text-muted-foreground")}
      title={item.risk_rank != null ? `Model ranks it #${item.risk_rank}${top ? " (in its top 20)" : ""}` : "Not scored yet"}
    >
      {top && <span className="mr-1.5 inline-block size-2 rounded-full bg-signal-strong align-middle" aria-hidden />}
      {lift(item.risk_lift)}
      {top && <span className="sr-only"> (model top 20)</span>}
    </span>
  );
}

function SecondOpinion({ item }: { item: WorklistItem }) {
  if (item.risk_rank == null) return null;
  const top = item.risk_rank <= MODEL_TOP;
  const raising = (item.drivers ?? []).filter((d) => d.contribution > 0.001);
  return (
    <div className="space-y-2.5 p-5 text-[0.9375rem]">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-semibold">Model second opinion</h3>
        <span className={cn("tabular-nums", top ? "font-semibold text-signal" : "font-medium")}>
          {lift(item.risk_lift)} <span className="text-[0.8125rem] font-normal text-muted-foreground">fleet average</span>
        </span>
      </div>
      <p className="text-muted-foreground">
        Ranks it #{item.risk_rank} of the fleet for next week{top ? ", inside its top 20." : "."}
      </p>
      {raising.length > 0 && (
        <ul className="space-y-1.5" aria-label="What raises the model's risk">
          {raising.map((d) => (
            <li key={d.feature} className="flex justify-between gap-3">
              <span className="min-w-0 truncate" title={driverText(d)}>
                {driverText(d)}
              </span>
              <span className="shrink-0 rounded-full bg-muted px-2 text-[0.8125rem] font-medium tabular-nums">{driverEffect(d)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[0.8125rem] text-muted-foreground">Effect = risk now minus risk if that reading were typical for its type.</p>
    </div>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.8125rem] text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
      <dd className="truncate text-[0.8125rem] text-muted-foreground">{sub}</dd>
    </div>
  );
}

function ActionPanel({ item, enabled }: { item: WorklistItem; enabled: boolean }) {
  const qc = useQueryClient();
  const [note, setNote] = useState(item.action.note ?? "");
  const [lastDone, setLastDone] = useState<ActionIn["action"] | null>(null);
  const m = useApplyAction({
    mutation: {
      onSuccess: (res, vars) => {
        setLastDone(vars.data.action);
        qc.invalidateQueries({ queryKey: ["/api/worklist"] });
        qc.invalidateQueries({ queryKey: ["/api/machines/{machine_id}"] });
        const s = res.data;
        toast.success(
          vars.data.action === "note" ? `Note saved on ${item.machine_id}` : `${item.machine_id} is now ${statusLabel[s.status ?? "open"].toLowerCase()}`,
        );
      },
      onError: (e) => toast.error(`Couldn't save: ${errorText(e)}`),
    },
  });

  const run = (action: ActionIn["action"]) =>
    m.mutate({ params: { machine_id: item.machine_id }, data: { action, note: note.trim() || null } });

  const st = item.action.status ?? "open";
  const busy = m.isPending;
  const noteChanged = note.trim() !== (item.action.note ?? "").trim();

  return (
    <div className="space-y-3 p-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[0.9375rem] font-semibold">Action</h3>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <StatusPill status={st} />
          {item.action.owner && st !== "open" && <span className="text-[0.8125rem]">by {shortName(item.action.owner)}</span>}
        </span>
      </div>
      {!enabled && (
        <p className="rounded-lg bg-muted px-3 py-2 text-[0.8125rem] text-muted-foreground">
          Saving actions needs the Lakebase database, which is connected in the deployed app only.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {st !== "claimed" && st !== "resolved" && (
          <Button onClick={() => run("claim")} disabled={!enabled || busy} className="rounded-lg">
            <Hand aria-hidden /> {busy && m.variables?.data.action === "claim" ? "Claiming…" : "Take this one"}
          </Button>
        )}
        {st !== "resolved" && (
          <>
            <Button variant={st === "claimed" ? "default" : "outline"} onClick={() => run("found_issue")} disabled={!enabled || busy} className="rounded-lg">
              <SearchCheck aria-hidden /> {busy && m.variables?.data.action === "found_issue" ? "Saving…" : "Found an issue"}
            </Button>
            <Button variant="outline" onClick={() => run("false_alarm")} disabled={!enabled || busy} className="rounded-lg">
              <X aria-hidden /> {busy && m.variables?.data.action === "false_alarm" ? "Saving…" : "False alarm"}
            </Button>
          </>
        )}
        {st === "resolved" && (
          <Button variant="outline" onClick={() => run("reopen")} disabled={!enabled || busy} className="rounded-lg">
            <RotateCcw aria-hidden /> Reopen
          </Button>
        )}
      </div>
      <label className="block text-[0.8125rem] font-medium text-muted-foreground">
        Note for the next shift
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          disabled={!enabled || busy}
          placeholder="e.g. Bearing noise on spindle; booked inspection for Thursday"
          className="mt-1 block w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-[0.9375rem] font-normal text-foreground placeholder:text-muted-foreground disabled:opacity-60"
        />
      </label>
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={() => run("note")} disabled={!enabled || busy || !note.trim() || !noteChanged}>
          <StickyNote aria-hidden /> {lastDone === "note" && !noteChanged ? "Note saved" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
