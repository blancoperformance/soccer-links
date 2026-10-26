import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Eye,
  LayoutGrid,
  ListChecks,
  LogIn,
  Monitor,
  MousePointerClick,
  Ruler,
  Search,
  ShoppingBag,
  Smartphone,
  Tablet,
  Ticket,
  UserRound,
} from "lucide-react";
import { Kpi } from "./charts";
import { deviceName, fmt, productName, sourceName } from "./data";
import { describe } from "./Live";
import { useRecentEvents, type Ev } from "./live-feed";

const ACTIVE_MIN = 5;
const REFRESH_MS = 10000;

/** How far the person got, from arriving to leaving for the store checkout. */
const STAGES = [
  { label: "Chegou", tone: "" },
  { label: "Explorando", tone: "sg-chip--info" },
  { label: "Vendo jogo", tone: "sg-chip--info" },
  { label: "Escolheu licença", tone: "sg-chip--brand" },
  { label: "Foi ao carrinho", tone: "sg-chip--new" },
] as const;

const isProductOpen = (e: Ev) =>
  (e.event === "links_clique" && Boolean(e.detail?.includes("/produtos/"))) ||
  e.event === "quiz_result_click" ||
  e.event === "assistant_result_click";

function stageOf(e: Ev): number {
  if (e.event === "checkout_click") return 4;
  if (e.event === "size_select" || e.event === "buy_no_size") return 3;
  if (isProductOpen(e)) return 2;
  if (e.event === "page_view" || e.event === "context_view") return 0;
  return 1;
}

function iconOf(e: Ev) {
  if (e.event === "checkout_click") return ShoppingBag;
  if (e.event === "size_select") return Ruler;
  if (e.event === "buy_no_size") return AlertCircle;
  if (isProductOpen(e)) return Eye;
  if (e.event === "page_view" || e.event === "context_view") return LogIn;
  if (e.event === "search" || e.event === "search_no_result") return Search;
  if (e.event.startsWith("quiz")) return ListChecks;
  if (e.event === "intent_select") return LayoutGrid;
  if (e.event === "links_clique" && e.item?.startsWith("Cupom: liberado")) return Ticket;
  if (e.event === "links_clique" && e.item?.startsWith("Quiz: contato enviado")) return UserRound;
  return MousePointerClick;
}

const DeviceIcon = ({ d }: { d: string | null }) => {
  const I = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
  return <I aria-hidden style={{ width: 14, height: 14 }} />;
};

const ago = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
};

interface Person {
  id: string;
  n: number;
  events: Ev[]; // oldest first
  first: number;
  last: number;
  stage: number;
  device: string | null;
  source: string | null;
  product: string | null;
  size: string | null;
  active: boolean;
}

function people(events: Ev[], now: number): Person[] {
  const by = new Map<string, Ev[]>();
  for (const e of [...events].reverse()) {
    const list = by.get(e.session_id) ?? [];
    list.push(e);
    by.set(e.session_id, list);
  }
  const out: Person[] = [];
  for (const [id, list] of by) {
    const evs = list.filter((e) => e.event !== "quiz_answer" || list.length < 4);
    const first = new Date(list[0]!.created_at).getTime();
    const last = new Date(list[list.length - 1]!.created_at).getTime();
    let product: string | null = null;
    let size: string | null = null;
    for (const e of list) {
      if (isProductOpen(e)) {
        product =
          e.event === "links_clique" ? (e.item ?? null) : e.item ? productName(e.item) : product;
        size = null;
      }
      if (e.event === "size_select" || e.event === "checkout_click") {
        if (e.item) product = productName(e.item);
        if (e.event === "size_select") size = e.detail;
      }
    }
    out.push({
      id,
      n: 0,
      events: evs,
      first,
      last,
      stage: Math.max(...list.map(stageOf)),
      device: list.find((e) => e.device)?.device ?? null,
      source: list.find((e) => e.utm_source)?.utm_source ?? null,
      product,
      size,
      active: now - last <= ACTIVE_MIN * 60000,
    });
  }
  // Number visitors in arrival order, so "Visitante 3" keeps its number while the page refreshes.
  [...out].sort((a, b) => a.first - b.first).forEach((p, i) => (p.n = i + 1));
  return out.sort((a, b) => Number(b.active) - Number(a.active) || b.last - a.last);
}

function PersonCard({ p, now }: { p: Person; now: number }) {
  const last = p.events[p.events.length - 1];
  const stage = STAGES[p.stage] ?? STAGES[0];
  const steps = p.events.slice(-6).reverse();
  return (
    <article
      className={`sg-person ${p.active ? "" : "sg-person--gone"} ${p.active && p.stage >= 3 ? "sg-person--hot" : ""}`}
    >
      <header className="sg-person__head">
        <div style={{ minWidth: 0 }}>
          <p className="sg-person__name">
            {p.active && <span className="sg-dot sg-dot--live" aria-hidden />}
            Visitante {p.n}
          </p>
          <p className="sg-person__meta">
            <span>
              <DeviceIcon d={p.device} />
              {deviceName(p.device ?? "desconhecido")}
            </span>
            <span>{p.source ? sourceName(p.source) : "sem origem"}</span>
            <span>
              {p.active ? `há ${ago(now - p.first)} na página` : `saiu há ${ago(now - p.last)}`}
            </span>
          </p>
        </div>
        <span className={`sg-chip ${stage.tone}`}>{stage.label}</span>
      </header>
      <div className="sg-person__now">
        <p className="sg-label" style={{ margin: 0 }}>
          {p.active ? "fazendo agora" : "última coisa que fez"}
        </p>
        <p className="sg-person__doing">{last ? describe(last) : "–"}</p>
        {p.product && (
          <p className="sg-person__eye">
            De olho em <strong>{p.product}</strong>
            {p.size ? ` · licença ${p.size}` : ""}
          </p>
        )}
      </div>
      <ol className="sg-person__steps">
        {steps.map((e, i) => {
          const Icon = iconOf(e);
          const hot = stageOf(e) >= 3;
          return (
            <li key={`${e.created_at}-${i}`} className={i === 0 ? "is-first" : ""}>
              <Icon aria-hidden className={hot ? "is-hot" : ""} />
              <span className="sg-person__step">{describe(e)}</span>
              <span className="sg-mono">{ago(now - new Date(e.created_at).getTime())}</span>
            </li>
          );
        })}
        {p.events.length > 6 && (
          <li className="sg-person__more">+ {p.events.length - 6} ações antes</li>
        )}
      </ol>
    </article>
  );
}

/** Tela "Ao vivo": quem está na página agora, um cartão por pessoa, e o que cada uma está fazendo. */
export function LivePage() {
  const { events, fetchedAt } = useRecentEvents(REFRESH_MS);
  const [now, setNow] = useState(Date.now());
  const [showLeft, setShowLeft] = useState(true);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  const list = useMemo(() => (events ? people(events, now) : []), [events, now]);

  if (events === undefined) return <div className="sg-skel" style={{ height: 260 }} />;
  if (events === null)
    return (
      <p className="sg-note">Não foi possível ler os dados agora. Tente de novo em instantes.</p>
    );

  const active = list.filter((p) => p.active);
  const left = list.filter((p) => !p.active);
  const byStage = (s: number) => active.filter((p) => p.stage === s).length;
  const checkout30 = list.filter((p) => p.stage === 4).length;

  return (
    <div className="sg-stack">
      <div className="sg-grid sg-grid--hero">
        <section
          className="sg-hero sg-hero--console"
          aria-label={`${active.length} pessoas na página agora`}
        >
          <div className="sg-hero__head">
            <span className="sg-hero__icon" aria-hidden>
              <span className={`sg-dot ${active.length ? "sg-dot--live" : ""}`} />
            </span>
            <span className="sg-hero__label">Agora na página</span>
            <span className="sg-hero__delta" style={{ marginLeft: "auto" }}>
              leitura há {ago(now - fetchedAt)}
            </span>
          </div>
          <div className="sg-hero__nums">
            <strong className="sg-hero__value">{fmt(active.length)}</strong>
            <span className="sg-hero__side">
              <span>
                {active.length === 1 ? "pessoa ativa" : "pessoas ativas"} nos últimos {ACTIVE_MIN}{" "}
                minutos
              </span>
              <span>
                <b>{fmt(list.length)}</b> visitas na meia hora · <b>{fmt(checkout30)}</b> foram ao
                carrinho
              </span>
            </span>
          </div>
          <div className="sg-hero__foot">
            <span>atualiza sozinho a cada 10 segundos</span>
          </div>
        </section>
        <div className="sg-kpis" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Kpi
            icon={LayoutGrid}
            label="Explorando a página"
            value={fmt(byStage(0) + byStage(1))}
            sub="Navegam, buscam ou fazem o quiz"
          />
          <Kpi
            icon={Eye}
            label="Vendo um jogo"
            value={fmt(byStage(2))}
            sub="Abriram a ficha de um jogo"
          />
          <Kpi
            accent={byStage(3) > 0}
            icon={Ruler}
            label="Escolheram a licença"
            value={fmt(byStage(3))}
            sub="A um toque de comprar"
          />
          <Kpi
            accent={byStage(4) > 0}
            icon={ShoppingBag}
            label="Foram ao carrinho"
            value={fmt(byStage(4))}
            sub="Saíram para pagar na loja"
          />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <h2 className="sg-card__title" style={{ fontSize: 16 }}>
          Quem está na página{" "}
          <span className="sg-muted" style={{ fontWeight: 400 }}>
            · {active.length === 0 ? "ninguém agora" : `${active.length} agora`}
          </span>
        </h2>
        <span className="sg-eyebrow">visitantes anônimos · a equipe não aparece</span>
      </div>

      {active.length === 0 ? (
        <div className="sg-card">
          <div className="sg-card__body" style={{ textAlign: "center", padding: 36 }}>
            <p className="sg-empty" style={{ justifyItems: "center" }}>
              <strong>Ninguém navegando neste momento</strong>
              Assim que alguém abrir o link da bio, aparece aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="sg-people">
          {active.map((p) => (
            <PersonCard key={p.id} p={p} now={now} />
          ))}
        </div>
      )}

      {left.length > 0 && (
        <div className="sg-stack" style={{ gap: 14 }}>
          <div>
            <button
              type="button"
              className="sg-btn sg-btn--s"
              onClick={() => setShowLeft((v) => !v)}
              aria-expanded={showLeft}
            >
              {showLeft ? "Esconder" : "Mostrar"} quem saiu na última meia hora · {left.length}
            </button>
          </div>
          {showLeft && (
            <div className="sg-people">
              {left.slice(0, 18).map((p) => (
                <PersonCard key={p.id} p={p} now={now} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
