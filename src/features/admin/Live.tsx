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

  if (events === undefined)
    return <div className="sg-skel" style={{ height: compact ? 220 : 320 }} />;
  if (events === null)
    return (
      <p className="sg-empty">Não foi possível ler os dados agora. Tente atualizar a página.</p>
    );

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
    <div className={compact ? "sg-live sg-live--compact" : "sg-live"}>
      <div className="sg-live__now">
        <span className="sg-eyebrow">
          <span className={`sg-dot ${active.size ? "sg-dot--live" : ""}`} aria-hidden /> agora
        </span>
        <p className="sg-live__n">{fmt(active.size)}</p>
        <p className="sg-live__what">
          {active.size === 1 ? "pessoa" : "pessoas"} na página nos últimos {WINDOW_MIN} minutos
        </p>
        <div className="sg-live__meta">
          {byDevice.size > 0 && (
            <span>
              {[...byDevice.entries()]
                .map(([d, n]) => `${n} no ${deviceName(d).toLowerCase()}`)
                .join(" · ")}
            </span>
          )}
          <span>{fmt(sessions30)} visitas na última meia hora</span>
        </div>
      </div>
      <div className="sg-live__feed">
        <p className="sg-label">o que estão fazendo · últimos {FEED_MIN} min</p>
        {feed.length === 0 ? (
          <p className="sg-empty">Ninguém na página na última meia hora.</p>
        ) : (
          <ul className="sg-list">
            {feed.map((e, i) => (
              <li key={`${e.created_at}-${i}`}>
                <span className="sg-list__main">{describe(e)}</span>
                <span className="sg-list__side">{ago(e.created_at, now)}</span>
              </li>
            ))}
          </ul>
        )}
        {!compact && (
          <p className="sg-card__hint" style={{ marginTop: 12 }}>
            Atualiza sozinho a cada 15 segundos.
          </p>
        )}
      </div>
    </div>
  );
}
