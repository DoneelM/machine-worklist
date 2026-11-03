import { useEffect, useRef, useState } from "react";
import { MessageSquareText, Send, X } from "lucide-react";

import { type AskOut, ApiError, useAskData } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Turn = { question: string; answer?: AskOut; error?: string };

const STARTERS = [
  "Which 10 machines have the highest attention score, and what's driving each?",
  "How do serious defects per 1,000 units compare between day and night shifts?",
  "Which plant had the most critical defects in July 2026?",
  "Which machines does the model rank in its top 20 but the attention score doesn't?",
];

function errorText(e: unknown) {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | string;
    const detail = typeof body === "object" ? body?.detail : undefined;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) return detail.map((d: { msg?: string }) => d.msg ?? JSON.stringify(d)).join("; ");
    return `Request failed (${e.status}${e.statusText ? ` ${e.statusText}` : ""}). Try again in a moment.`;
  }
  return e instanceof Error ? e.message : "Unknown error";
}

/** Slide-out "Ask the data" chat over the Genie space. Runs as the signed-in user. */
export function AskPanel({ open, onClose, machineId }: { open: boolean; onClose: () => void; machineId: string | null }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const m = useAskData();

  useEffect(() => {
    if (open) inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && open && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Braces matter: newer browsers return a Promise from scrollIntoView, and React would call it as a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns]);

  const ask = (question: string) => {
    const q = question.trim();
    if (!q || m.isPending) return;
    setDraft("");
    setTurns((t) => [...t, { question: q }]);
    m.mutate(
      { question: q, conversation_id: conversationId },
      {
        onSuccess: (res) => {
          setConversationId(res.data.conversation_id);
          setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, answer: res.data } : x)));
        },
        onError: (e) => setTurns((t) => t.map((x, i) => (i === t.length - 1 ? { ...x, error: errorText(e) } : x))),
      },
    );
  };

  const reset = () => {
    setTurns([]);
    setConversationId(null);
    inputRef.current?.focus();
  };

  const starters = machineId
    ? [`What happened to ${machineId} over the last 30 days: vibration, temperature and defects?`, ...STARTERS.slice(0, 3)]
    : STARTERS;
  const lastSuggestions = turns.at(-1)?.answer?.suggestions ?? [];

  return (
    <aside
      aria-label="Ask the data"
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex w-full max-w-[460px] flex-col border-l border-border bg-card shadow-xl transition-[transform,visibility] duration-200",
        open ? "visible translate-x-0" : "invisible translate-x-full shadow-none",
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
        <div>
          <h2 className="font-semibold">Ask the data</h2>
          <p className="text-xs text-muted-foreground">Genie over sensors, work orders, defects, the score and model risk. Uses the app's data access.</p>
        </div>
        <div className="flex gap-1">
          {turns.length > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              New chat
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm" aria-live="polite">
        {turns.length === 0 && (
          <div className="space-y-2">
            <p className="text-muted-foreground">Try one of these, or ask your own:</p>
            {starters.map((s) => (
              <button
                key={s}
                onClick={() => ask(s)}
                className="block w-full rounded-md border border-border px-3 py-2 text-left hover:border-foreground/40 hover:bg-muted/60"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {turns.map((t, i) => (
          <div key={i} className="space-y-2">
            <p className="ml-8 rounded-md bg-signal-soft px-3 py-2">{t.question}</p>
            {!t.answer && !t.error && <p className="animate-pulse text-muted-foreground">Genie is writing the query…</p>}
            {t.error && (
              <p role="alert" className="text-destructive">
                {t.error}
              </p>
            )}
            {t.answer && <Answer a={t.answer} />}
          </div>
        ))}

        {lastSuggestions.length > 0 && !m.isPending && (
          <div className="flex flex-wrap gap-2">
            {lastSuggestions.map((s) => (
              <button key={s} onClick={() => ask(s)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted/60">
                {s}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex items-end gap-2 border-t border-border px-5 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <label className="sr-only" htmlFor="ask-input">
          Question
        </label>
        <textarea
          id="ask-input"
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(draft);
            }
          }}
          rows={2}
          maxLength={1000}
          placeholder="e.g. Which presses in Bremen ran hottest last week?"
          className="block flex-1 resize-none rounded-md border border-input bg-card px-2.5 py-2 text-sm placeholder:text-muted-foreground"
        />
        <Button type="submit" size="sm" disabled={!draft.trim() || m.isPending} aria-label="Ask">
          <Send className="size-4" aria-hidden />
        </Button>
      </form>
    </aside>
  );
}

function Answer({ a }: { a: AskOut }) {
  return (
    <div className="space-y-2">
      {a.error && <p className="text-destructive">{a.error}</p>}
      {a.text && <p className="whitespace-pre-wrap">{a.text.replace(/\*\*/g, "")}</p>}
      {a.table && a.table.rows.length > 0 && (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/60 text-left text-muted-foreground">
              <tr>
                {a.table.columns.map((c) => (
                  <th key={c} className="px-2 py-1.5 font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {a.table.rows.map((r, i) => (
                <tr key={i} className="border-t border-border">
                  {r.map((v, j) => (
                    <td key={j} className="px-2 py-1 font-mono">
                      {v ?? "–"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {a.table.total_rows > a.table.rows.length && (
            <p className="border-t border-border px-2 py-1 text-xs text-muted-foreground">
              Showing {a.table.rows.length} of {a.table.total_rows.toLocaleString()} rows
            </p>
          )}
        </div>
      )}
      {a.sql && (
        <details className="text-xs">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Show the SQL Genie ran
          </summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted p-2 font-mono whitespace-pre-wrap">{a.sql}</pre>
        </details>
      )}
    </div>
  );
}

export function AskButton({ onClick }: { onClick: () => void }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <MessageSquareText className="size-4" aria-hidden /> Ask the data
    </Button>
  );
}
