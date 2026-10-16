import { C } from "./charts";
import {
  categoryName,
  deviceName,
  fmt,
  productName,
  quizAnswerLabel,
  QUIZ_QUESTION_LABEL,
  sourceName,
} from "./data";
import { FEED_MIN, useRecentEvents, type Ev } from "./live-feed";

const WINDOW_MIN = 5;
const REFRESH_MS = 15000;

export function describe(e: Ev): string {
  switch (e.event) {
    case "page_view":
      return `Chegou na página${e.utm_source ? ` pelo ${sourceName(e.utm_source)}` : ""}`;
    case "links_clique":
      if (e.detail && e.detail.includes("/produto/")) return `Abriu ${e.item ?? "um produto"}`;
      return `Clicou em ${e.item ?? "um link"}`;
    case "intent_select":
      return e.item === "quiz" ? "Abriu o quiz" : `Abriu ${categoryName(e.item ?? e.detail ?? "")}`;
    case "search":
      return `Buscou "${e.detail}"`;
    case "search_no_result":
      return `Buscou "${e.detail}" e não encontrou`;
    case "quiz_start":
      return "Começou o quiz";
    case "quiz_answer":
      return `Quiz: ${QUIZ_QUESTION_LABEL[e.item ?? ""] ?? e.item}, ${quizAnswerLabel(e.item ?? "", e.detail ?? "")}`;
    case "quiz_complete":
      return `Terminou o quiz: ${productName(e.detail ?? "")}`;
    case "quiz_result_click":
      return `Foi ver ${productName(e.item ?? "")} pelo quiz`;
    case "context_view":
      return `Chegou por um post de ${productName(e.item ?? "")}`;
    case "size_select":
      return `Escolheu a licença ${e.detail ?? ""} em ${productName(e.item ?? "")}`;
    case "checkout_click":
      return `Foi para o checkout: ${productName(e.item ?? "")}${e.detail ? ` (${e.detail})` : ""}`;
    case "buy_no_size":
      return `Tentou comprar ${productName(e.item ?? "")} sem escolher a licença`;
    case "assistant_question":
      return `Perguntou ao assistente: "${e.detail ?? ""}"`;
    case "assistant_result_click":
      return `Foi ver ${productName(e.item ?? "")} pelo assistente`;
    default:
      return e.event;
  }
}

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  return s < 60 ? `há ${s} s` : `há ${Math.round(s / 60)} min`;
};

/** People on the page now: anyone who opened or used it in the last 5 minutes. Refreshes every 15 s. */
export function Live({ compact = false }: { compact?: boolean }) {
  const { events, fetchedAt: now } = useRecentEvents(REFRESH_MS);

  if (events === undefined) return <p className="text-sm text-neutral-400">Carregando...</p>;
  if (events === null)
    return <p className="text-sm text-neutral-500">Não foi possível ler os dados agora.</p>;

  const cutoff = now - WINDOW_MIN * 60000;
  const active = new Map<string, Ev>();
  for (const e of events)
    if (new Date(e.created_at).getTime() >= cutoff && !active.has(e.session_id))
      active.set(e.session_id, e);
  const sessions30 = new Set(events.map((e) => e.session_id)).size;
  const byDevice = new Map<string, number>();
  for (const e of active.values()) {
    const d = e.device ?? "desconhecido";
    byDevice.set(d, (byDevice.get(d) ?? 0) + 1);
  }
  const feed = events.filter((e) => e.event !== "quiz_answer").slice(0, compact ? 5 : 12);

  return (
    <div className={compact ? "space-y-5" : "grid gap-8 md:grid-cols-[220px_1fr]"}>
      <div>
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
              style={{ background: active.size ? C.accent : C.faint }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: active.size ? C.accent : C.faint }}
            />
          </span>
          Agora
        </div>
        <p className="mt-2 text-6xl font-semibold tabular-nums tracking-tight">
          {fmt(active.size)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500">
          {active.size === 1 ? "pessoa" : "pessoas"} na página nos últimos {WINDOW_MIN} minutos
        </p>
        {byDevice.size > 0 && (
          <p className="mt-3 text-xs text-neutral-500">
            {[...byDevice.entries()]
              .map(([d, n]) => `${n} no ${deviceName(d).toLowerCase()}`)
              .join(" · ")}
          </p>
        )}
        <p className="mt-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
          {fmt(sessions30)} visitas na última meia hora
        </p>
      </div>
      <div>
        <p className="mb-2 text-xs text-neutral-500">
          O que estão fazendo (últimos {FEED_MIN} min)
        </p>
        {feed.length === 0 ? (
          <p className="py-4 text-sm text-neutral-400">Ninguém na página na última meia hora.</p>
        ) : (
          <ul className="divide-y divide-neutral-100 text-sm">
            {feed.map((e, i) => (
              <li
                key={`${e.created_at}-${i}`}
                className="flex items-baseline justify-between gap-4 py-2"
              >
                <span className="min-w-0 truncate text-neutral-800">{describe(e)}</span>
                <span className="shrink-0 text-xs tabular-nums text-neutral-400">
                  {ago(e.created_at, now)}
                </span>
              </li>
            ))}
          </ul>
        )}
        {!compact && (
          <p className="mt-3 text-[11px] text-neutral-400">Atualiza sozinho a cada 15 segundos.</p>
        )}
      </div>
    </div>
  );
}
