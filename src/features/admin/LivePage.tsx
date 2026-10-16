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
import { C } from "./charts";
import { deviceName, fmt, productName, sourceName } from "./data";
import { describe } from "./Live";
import { useRecentEvents, type Ev } from "./live-feed";

const ACTIVE_MIN = 5;
const REFRESH_MS = 10000;

/** How far the person got, from arriving to leaving for the store checkout. */
const STAGES = [
  { label: "Chegou", tone: "bg-neutral-100 text-neutral-600" },
  { label: "Explorando a página", tone: "bg-neutral-900 text-white" },
  { label: "Vendo produto", tone: "bg-neutral-900 text-white" },
  { label: "Escolheu licença", tone: "bg-[#f5e8ff] text-[#6a0096]" },
  { label: "Foi ao checkout", tone: "bg-[#8a00c2] text-white" },
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
  return <I className="h-3.5 w-3.5" />;
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
      className={`flex flex-col border bg-white transition-opacity ${p.active ? "border-neutral-200" : "border-neutral-200 opacity-60"}`}
      style={p.active && p.stage >= 3 ? { borderColor: C.accent } : undefined}
    >
      <header className="flex items-start justify-between gap-3 border-b border-neutral-100 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold text-neutral-950">
            {p.active && (
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ background: C.accent }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ background: C.accent }}
                />
              </span>
            )}
            Visitante {p.n}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-neutral-500">
            <span className="flex items-center gap-1 whitespace-nowrap">
              <DeviceIcon d={p.device} />
              {deviceName(p.device ?? "desconhecido")}
            </span>
            <span className="text-neutral-300">·</span>
            <span className="whitespace-nowrap">
              {p.source ? sourceName(p.source) : "Sem origem"}
            </span>
            <span className="text-neutral-300">·</span>
            <span className="whitespace-nowrap">
              {p.active ? `há ${ago(now - p.first)} na página` : `saiu há ${ago(now - p.last)}`}
            </span>
          </p>
        </div>
        <span className={`shrink-0 px-2 py-1 text-[11px] font-semibold ${stage.tone}`}>
          {stage.label}
        </span>
      </header>

      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          {p.active ? "Fazendo agora" : "Última coisa que fez"}
        </p>
        <p className="mt-1 text-[15px] font-medium leading-snug text-neutral-950">
          {last ? describe(last) : "–"}
        </p>
        {p.product && (
          <p className="mt-1.5 text-xs text-neutral-600">
            De olho em <span className="font-medium text-neutral-900">{p.product}</span>
            {p.size ? ` · licença ${p.size}` : ""}
          </p>
        )}
      </div>

      <ol className="mt-auto border-t border-neutral-100 px-4 py-3">
        {steps.map((e, i) => {
          const Icon = iconOf(e);
          const hot = stageOf(e) >= 3;
          return (
            <li key={`${e.created_at}-${i}`} className="flex items-start gap-2.5 py-1">
              <Icon
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                style={{ color: hot ? C.accent : i === 0 ? C.ink : C.faint }}
              />
              <span
                className={`min-w-0 flex-1 text-xs leading-snug ${i === 0 ? "text-neutral-900" : "text-neutral-500"}`}
              >
                {describe(e)}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-neutral-400">
                {ago(now - new Date(e.created_at).getTime())}
              </span>
            </li>
          );
        })}
        {p.events.length > 6 && (
          <li className="pt-1 text-[11px] text-neutral-400">+ {p.events.length - 6} ações antes</li>
        )}
      </ol>
    </article>
  );
}

/** Full "Ao vivo" section: who is on the page now, one card per person, and what they are doing. */
export function LivePage() {
  const { events, fetchedAt } = useRecentEvents(REFRESH_MS);
  const [now, setNow] = useState(Date.now());
  const [showLeft, setShowLeft] = useState(true);

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clock);
  }, []);

  const list = useMemo(() => (events ? people(events, now) : []), [events, now]);

  if (events === undefined) return <p className="text-sm text-neutral-400">Carregando...</p>;
  if (events === null)
    return (
      <p className="border border-neutral-200 bg-white p-5 text-sm text-neutral-500">
        Não foi possível ler os dados agora. Tente de novo em instantes.
      </p>
    );

  const active = list.filter((p) => p.active);
  const left = list.filter((p) => !p.active);
  const byStage = (s: number) => active.filter((p) => p.stage === s).length;
  const checkout30 = list.filter((p) => p.stage === 4).length;

  return (
    <div className="space-y-6">
      {/* Big numbers */}
      <div className="grid gap-px overflow-hidden border border-neutral-200 bg-neutral-200 lg:grid-cols-[1.1fr_2fr]">
        <div className="relative bg-neutral-950 p-6 text-white">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white/60">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
                style={{ background: active.length ? C.accent : "#777" }}
              />
              <span
                className="relative inline-flex h-2.5 w-2.5 rounded-full"
                style={{ background: active.length ? C.accent : "#777" }}
              />
            </span>
            Agora na página
          </p>
          <p className="mt-3 text-[72px] font-semibold leading-none tabular-nums tracking-tight">
            {fmt(active.length)}
          </p>
          <p className="mt-3 text-sm text-white/60">
            {active.length === 1 ? "pessoa ativa" : "pessoas ativas"} nos últimos {ACTIVE_MIN}{" "}
            minutos
          </p>
          <p className="mt-5 border-t border-white/10 pt-3 text-xs text-white/50">
            {fmt(list.length)} visitas na última meia hora · {fmt(checkout30)} foram ao checkout
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-neutral-200 sm:grid-cols-4">
          {[
            {
              label: "Explorando a página",
              n: byStage(0) + byStage(1),
              hint: "Chegaram, navegam, buscam ou fazem o quiz",
            },
            { label: "Vendo um produto", n: byStage(2), hint: "Abriram a ficha de um produto" },
            { label: "Escolheram a licença", n: byStage(3), hint: "A um clique de comprar" },
            { label: "Foram ao checkout", n: byStage(4), hint: "Saíram para pagar na loja" },
          ].map((k, i) => (
            <div key={k.label} className="bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
                {k.label}
              </p>
              <p
                className="mt-3 text-[40px] font-semibold leading-none tabular-nums"
                style={{ color: i >= 2 && k.n > 0 ? C.accent : C.ink }}
              >
                {fmt(k.n)}
              </p>
              <p className="mt-2 text-xs leading-snug text-neutral-500">{k.hint}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-neutral-950">
          Quem está na página{" "}
          <span className="font-normal text-neutral-500">
            · {active.length === 0 ? "ninguém agora" : `${active.length} agora`}
          </span>
        </h2>
        <p className="text-xs text-neutral-500">
          Atualiza sozinho a cada 10 segundos · última leitura há {ago(now - fetchedAt)}
        </p>
      </div>

      {active.length === 0 ? (
        <p className="border border-dashed border-neutral-300 bg-white p-8 text-center text-sm text-neutral-500">
          Ninguém navegando neste momento. Assim que alguém abrir o link da bio, aparece aqui.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {active.map((p) => (
            <PersonCard key={p.id} p={p} now={now} />
          ))}
        </div>
      )}

      {left.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowLeft((v) => !v)}
            className="text-sm font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-950"
          >
            {showLeft ? "Esconder" : "Mostrar"} quem saiu na última meia hora ({left.length})
          </button>
          {showLeft && (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {left.slice(0, 18).map((p) => (
                <PersonCard key={p.id} p={p} now={now} />
              ))}
            </div>
          )}
        </div>
      )}
      <p className="text-xs leading-relaxed text-neutral-400">
        Cada visitante é anônimo: o painel não sabe quem é a pessoa, só o que ela faz na página. A
        equipe não aparece aqui.
      </p>
    </div>
  );
}
