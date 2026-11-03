import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, CircleDot, Hand, RotateCcw, SearchCheck, StickyNote, X } from "lucide-react";

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
import { TrendChart } from "@/components/worklist/TrendChart";
import { driverEffect, driverText, lift, pct, reason, shortName, statusLabel } from "@/components/worklist/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  component: () => <Worklist />,
});

type StatusFilter = "all" | "open" | "claimed" | "resolved";

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
  const [selected, setSelected] = useState<string | null>(null);

  const filters = useGetFilters(selector());
  const list = useGetWorklist({ params: { plant, machine_type: machineType }, ...selector<WorklistOut>() });

  const items = useMemo(
    () => (list.data?.items ?? []).filter((i) => status === "all" || i.action.status === status),
    [list.data, status],
  );

  // Keep a selection that's still visible; otherwise pick the top item.
  useEffect(() => {
    if (items.length && !items.some((i) => i.machine_id === selected)) setSelected(items[0].machine_id);
    if (!items.length) setSelected(null);
  }, [items, selected]);

  const asOf = list.data?.as_of
    ? new Date(list.data.as_of).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
    : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-end justify-between gap-x-8 gap-y-2 px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Machine attention</h1>
            <p className="text-sm text-muted-foreground">
              Which machine to look at next, ranked on vibration trend, serious defects and lost output.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Synthetic demo data · 14 days to {asOf ?? "…"} · score 40% vibration, 35% defects, 25% yield · model is a second opinion
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-5">
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
          <p className="ml-auto text-sm text-muted-foreground" aria-live="polite">
            {list.isSuccess && `Showing ${items.length} of ${list.data.items.length} machines`}
          </p>
        </div>

        <ModelEvidence />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Queue
            loading={list.isLoading}
            error={list.error}
            onRetry={() => list.refetch()}
            items={items}
            selected={selected}
            onSelect={setSelected}
          />
          <aside className="lg:sticky lg:top-5 lg:self-start">
            {selected ? (
              <Detail machineId={selected} actionsEnabled={list.data?.actions_enabled ?? false} />
            ) : (
              !list.isLoading && (
                <p className="rounded-md border border-border bg-card p-5 text-sm text-muted-foreground">
                  Pick a machine to see why it's on the list.
                </p>
              )
            )}
          </aside>
        </div>
      </div>
    </div>
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
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 min-w-40 rounded-md border border-input bg-card px-2.5 text-sm font-normal text-foreground hover:border-foreground/60"
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
  selected,
  onSelect,
}: {
  loading: boolean;
  error: unknown;
  onRetry: () => void;
  items: WorklistItem[];
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

  const head = "grid grid-cols-[2.5rem_6.5rem_minmax(0,1fr)_4rem_4.5rem_6.5rem] items-center gap-3 px-4";

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card" aria-label="Worklist">
      <div className={cn(head, "hidden border-b border-border py-2 text-xs font-medium text-muted-foreground sm:grid")}>
        <span>Rank</span>
        <span>Machine</span>
        <span>Why it's here</span>
        <span className="text-right">Score</span>
        <span className="text-right" title="Model risk of being in the fleet's worst 10% next week, as a multiple of today's fleet average">
          Model
        </span>
        <span>Status</span>
      </div>

      {loading && (
        <div aria-busy="true" aria-label="Loading worklist">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="border-b border-border px-4 py-3 last:border-0">
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
        <p className="p-5 text-sm text-muted-foreground">No machines match these filters. Widen the plant, type or status.</p>
      )}

      <div ref={listRef} role="listbox" aria-label="Machines by attention" onKeyDown={onKeyDown} className="max-h-[calc(100vh-15rem)] overflow-y-auto">
        {items.map((item, idx) => {
          const isSel = item.machine_id === selected;
          return (
            <div
              key={item.machine_id}
              data-id={item.machine_id}
              role="option"
              aria-selected={isSel}
              tabIndex={isSel || (!selected && idx === 0) ? 0 : -1}
              onClick={() => onSelect(item.machine_id)}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect(item.machine_id)}
              className={cn(
                head,
                "cursor-pointer border-b border-border py-2.5 text-sm last:border-0 hover:bg-muted/60",
                isSel && "bg-signal-soft hover:bg-signal-soft",
                "max-sm:grid-cols-[2.5rem_minmax(0,1fr)_4rem]",
              )}
            >
              <span className="font-mono text-xs text-muted-foreground">{idx + 1}</span>
              <span className="min-w-0 max-sm:col-span-1">
                <span className="block font-medium">{item.machine_id}</span>
                <span className="block truncate text-xs text-muted-foreground" title={`${item.plant} · ${item.line}`}>
                  {item.plant} · {item.line}
                </span>
              </span>
              <span className="min-w-0 max-sm:col-start-2 max-sm:row-start-2">
                <span className="block truncate" title={reason(item)}>
                  {reason(item)}
                </span>
                <span className="block truncate text-xs text-muted-foreground">{item.machine_type}</span>
              </span>
              <span className="text-right font-mono text-base font-medium max-sm:col-start-3 max-sm:row-start-1">
                {item.attention_score.toFixed(0)}
              </span>
              <ModelCell item={item} />
              <span className="max-sm:col-start-3 max-sm:row-start-2">
                <StatusTag status={item.action.status} owner={item.action.owner} />
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusTag({ status = "open", owner }: { status?: WorklistItem["action"]["status"]; owner?: string | null }) {
  const Icon = status === "resolved" ? Check : status === "claimed" ? Hand : CircleDot;
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium",
        status === "open" && "text-muted-foreground",
        status === "claimed" && "bg-signal-soft text-[#7A3A06]",
        status === "resolved" && "bg-success-soft text-success",
      )}
      title={owner ? `${statusLabel[status]} by ${owner}` : statusLabel[status]}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      <span className="truncate">{status === "claimed" && owner ? shortName(owner) : statusLabel[status]}</span>
    </span>
  );
}

function Detail({ machineId, actionsEnabled }: { machineId: string; actionsEnabled: boolean }) {
  const q = useGetMachine({ params: { machine_id: machineId }, ...selector<MachineDetailOut>() });

  if (q.isLoading)
    return (
      <div className="space-y-3 rounded-md border border-border bg-card p-5" aria-busy="true">
        <div className="h-6 w-1/2 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded bg-muted" />
        <div className="h-32 animate-pulse rounded bg-muted" />
      </div>
    );

  if (q.error || !q.data)
    return (
      <div role="alert" className="space-y-2 rounded-md border border-border bg-card p-5 text-sm">
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

  return (
    <article className="divide-y divide-border rounded-md border border-border bg-card" aria-label={`${it.machine_id} detail`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold">{it.machine_id}</h2>
            <p className="truncate text-sm text-muted-foreground">
              {it.machine_type} · {it.plant} · line {it.line}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-medium leading-none">{it.attention_score.toFixed(0)}</p>
            <p className="mt-1 text-xs text-muted-foreground">of 100</p>
          </div>
        </div>
        <p className="mt-3 text-sm">
          <span className="font-medium">Most unusual: </span>
          {reason(it)}, compared with other {it.machine_type.toLowerCase()}s.
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Fact label="Vibration, 7d" value={`${d.vib_recent.toFixed(2)} mm/s`} sub={`was ${d.vib_baseline.toFixed(2)}`} />
          <Fact label="Serious defects" value={`${it.serious_defects}`} sub={`${it.critical_defects} critical`} />
          <Fact label="Output vs plan" value={pct(d.units_produced / Math.max(1, d.units_planned))} sub={`${d.units_produced.toLocaleString()} units`} />
        </dl>
      </div>

      <SecondOpinion item={it} />

      <ActionPanel key={it.machine_id} item={it} enabled={actionsEnabled} />

      <div className="space-y-5 p-5">
        <TrendChart
          title="Daily vibration"
          unit="mm/s"
          points={d.daily.map((p) => ({ x: p.day, y: p.vibration_mm_s }))}
          reference={d.vib_baseline}
          referenceLabel="prior-week average"
        />
        <TrendChart title="Daily output vs plan" unit="% of planned" points={yieldPoints} format={(v) => pct(v)} />
      </div>

      {d.history.length > 0 && (
        <div className="p-5">
          <h3 className="mb-2 text-sm font-medium">Activity</h3>
          <ol className="space-y-2 text-sm">
            {d.history.map((h, i) => (
              <li key={i} className="flex gap-3">
                <time className="w-24 shrink-0 font-mono text-xs text-muted-foreground" dateTime={h.created_at}>
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

const MODEL_TOP = 20; // a crew's daily inspection capacity, as in the evaluation

function ModelCell({ item }: { item: WorklistItem }) {
  const top = item.risk_rank != null && item.risk_rank <= MODEL_TOP;
  return (
    <span
      className={cn("text-right font-mono text-sm max-sm:hidden", top ? "font-medium text-signal" : "text-muted-foreground")}
      title={item.risk_rank != null ? `Model ranks it #${item.risk_rank}${top ? " (in its top 20)" : ""}` : "Not scored yet"}
    >
      {top && <span className="mr-1 inline-block size-1.5 rounded-full bg-signal align-middle" aria-hidden />}
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
    <div className="space-y-2 p-5 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-medium">Model second opinion</h3>
        <span className={cn("font-mono", top && "font-medium text-signal")}>
          {lift(item.risk_lift)} <span className="text-xs font-normal text-muted-foreground">fleet avg</span>
        </span>
      </div>
      <p className="text-muted-foreground">
        Ranks it #{item.risk_rank} of the fleet for next week{top ? ", inside its top 20." : "."}
      </p>
      {raising.length > 0 && (
        <ul className="space-y-1" aria-label="What raises the model's risk">
          {raising.map((d) => (
            <li key={d.feature} className="flex justify-between gap-3">
              <span className="min-w-0 truncate" title={driverText(d)}>
                {driverText(d)}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{driverEffect(d)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">Effect = risk now minus risk if that reading were typical for its type.</p>
    </div>
  );
}

function ModelEvidence() {
  const q = useGetModelEval(selector<ModelEvalOut | null>());
  const e = q.data;
  if (!e) return null;
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" });
  return (
    <section aria-label="Rule versus model" className="mb-4 rounded-md border border-border bg-card px-4 py-3 text-sm">
      <p>
        <span className="font-medium">Rule vs model, {fmt(e.test_start)}–{fmt(e.test_end)}: </span>
        of the {e.crew_capacity} machines each would send a crew to daily, <span className="font-mono">{pct(e.rule_precision_at_20)}</span> (rule) and{" "}
        <span className="font-mono">{pct(e.model_precision_at_20)}</span> (model v{e.model_version}) landed in the fleet's worst 10% the next week,
        against <span className="font-mono">{pct(e.base_rate, 1)}</span> picking at random. A tie, so the rule keeps the ranking.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Overall ranking (AUC): rule {e.rule_auc.toFixed(2)}, model {e.model_auc.toFixed(2)}. Marking outcomes below builds the labels to retest on real inspections.
      </p>
    </section>
  );
}

function Fact({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-mono font-medium">{value}</dd>
      <dd className="truncate text-xs text-muted-foreground">{sub}</dd>
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
      <div className="flex items-center justify-between gap-2 text-sm">
        <h3 className="font-medium">Action</h3>
        <span className="text-muted-foreground">
          <StatusTag status={st} />
          {item.action.owner && st !== "open" && <span className="ml-1 text-xs">by {shortName(item.action.owner)}</span>}
        </span>
      </div>
      {!enabled && (
        <p className="rounded bg-muted px-3 py-2 text-xs text-muted-foreground">
          Saving actions needs the Lakebase database, which is connected in the deployed app only.
        </p>
      )}
      <label className="block text-xs font-medium text-muted-foreground">
        Note for the next shift
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={500}
          disabled={!enabled || busy}
          placeholder="e.g. Bearing noise on spindle; booked inspection for Thursday"
          className="mt-1 block w-full resize-y rounded-md border border-input bg-card px-2.5 py-2 text-sm font-normal text-foreground placeholder:text-muted-foreground disabled:opacity-60"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        {st !== "claimed" && st !== "resolved" && (
          <Button size="sm" onClick={() => run("claim")} disabled={!enabled || busy}>
            <Hand className="size-4" aria-hidden /> {busy && m.variables?.data.action === "claim" ? "Claiming…" : "Take this one"}
          </Button>
        )}
        {st !== "resolved" && (
          <>
            <Button size="sm" variant={st === "claimed" ? "default" : "outline"} onClick={() => run("found_issue")} disabled={!enabled || busy}>
              <SearchCheck className="size-4" aria-hidden /> {busy && m.variables?.data.action === "found_issue" ? "Saving…" : "Found an issue"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => run("false_alarm")} disabled={!enabled || busy}>
              <X className="size-4" aria-hidden /> {busy && m.variables?.data.action === "false_alarm" ? "Saving…" : "False alarm"}
            </Button>
          </>
        )}
        {st === "resolved" && (
          <Button size="sm" variant="outline" onClick={() => run("reopen")} disabled={!enabled || busy}>
            <RotateCcw className="size-4" aria-hidden /> Reopen
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => run("note")} disabled={!enabled || busy || !note.trim() || !noteChanged}>
          <StickyNote className="size-4" aria-hidden /> {lastDone === "note" && !noteChanged ? "Note saved" : "Save note"}
        </Button>
      </div>
    </div>
  );
}
