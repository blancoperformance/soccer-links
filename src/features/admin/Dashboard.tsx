import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Radio,
  Download,
  FileText,
  LayoutGrid,
  LogOut,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Tag,
  Trash2,
  Users,
  UserRound,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isInternalDevice, setInternalDevice } from "@/lib/tracking";
import { BarList, C, Columns, Funnel, Journey, Kpi, TrendChart } from "./charts";
import { Leads } from "./Leads";
import { Sales } from "./Sales";
import { Live } from "./Live";
import { LivePage } from "./LivePage";
import { WorkspaceChooser, WorkspaceSwitch } from "./WorkspaceChooser";
import {
  canOpenBlack,
  forgetBlackAccess,
  getWorkspace,
  setWorkspace,
  type Workspace,
} from "./workspace";
import {
  categoryName,
  DashboardError,
  delta,
  deviceName,
  fmt,
  funnelStory,
  highlights,
  hasPurchaseFunnel,
  loadDashboard,
  loadLeads,
  pctLabel,
  peak,
  productName,
  quizGroups,
  QUIZ_QUESTION_LABEL,
  purchaseFunnel,
  rankedProducts,
  resetEvents,
  sourceName,
  toCsv,
  WEEKDAYS,
  WEEKDAYS_SHORT,
  type DashboardData,
  type LeadRow,
} from "./data";

const Report = lazy(() => import("./Report").then((m) => ({ default: m.Report })));

const PERIODS = [
  { id: 1, label: "Hoje" },
  { id: 7, label: "7 dias" },
  { id: 30, label: "30 dias" },
  { id: 90, label: "90 dias" },
];

const dayFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
const fullFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/** A preset (last N days) or dates the user picked. Kept on this browser between visits. */
type Period = { kind: "preset"; days: number } | { kind: "custom"; from: string; to: string };
const PERIOD_KEY = "sg:painel:periodo";

const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parseDay = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

function readPeriod(): Period {
  try {
    const p = JSON.parse(window.localStorage.getItem(PERIOD_KEY) ?? "null") as Period | null;
    if (p?.kind === "preset" && PERIODS.some((x) => x.id === p.days)) return p;
    if (
      p?.kind === "custom" &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.from) &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.to)
    )
      return p;
  } catch {
    /* ignore */
  }
  return { kind: "preset", days: 30 };
}

function range(p: Period) {
  const now = new Date();
  let from: Date;
  let to: Date;
  if (p.kind === "preset") {
    to = now;
    from = new Date(now);
    from.setHours(0, 0, 0, 0);
    if (p.days > 1) from.setDate(from.getDate() - (p.days - 1));
  } else {
    from = parseDay(p.from);
    // Through the end of the last chosen day (or now, when that day is today).
    const end = parseDay(p.to);
    end.setDate(end.getDate() + 1);
    to = end > now ? now : end;
  }
  const span = Math.max(1, to.getTime() - from.getTime());
  return { from, to, prevFrom: new Date(from.getTime() - span), prevTo: from };
}

const SECTIONS = [
  {
    id: "visao",
    label: "Visão geral",
    icon: LayoutGrid,
    title: "Visão geral",
    sub: "O essencial do período em uma tela.",
  },
  {
    id: "aovivo",
    label: "Ao vivo",
    icon: Radio,
    title: "Ao vivo",
    sub: "Quem está na página agora e o que cada pessoa está fazendo.",
  },
  {
    id: "vendas",
    label: "Vendas",
    icon: ShoppingBag,
    title: "Vendas",
    sub: "As vendas pagas que vieram do links e o caminho até o carrinho.",
  },
  {
    id: "produtos",
    label: "Jogos",
    icon: Tag,
    title: "Jogos e links",
    sub: "Os jogos que atraem mais cliques na vitrine, na busca e no quiz.",
  },
  {
    id: "publico",
    label: "Público",
    icon: Users,
    title: "Quem visita",
    sub: "Horário, dia da semana, origem e aparelho.",
  },
  {
    id: "busca",
    label: "Busca e quiz",
    icon: Search,
    title: "Busca e quiz",
    sub: "O que as pessoas procuram e o que o quiz indica.",
  },
  {
    id: "contatos",
    label: "Contatos",
    icon: UserRound,
    title: "Contatos",
    sub: "Quem deixou o WhatsApp no fim do quiz.",
  },
  {
    id: "ajustes",
    label: "Ajustes",
    icon: Settings,
    title: "Ajustes",
    sub: "Contagem da equipe e limpeza de dados de teste.",
  },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

/* ---------- building blocks ---------- */

function Card({
  title,
  hint,
  action,
  children,
  className = "",
  flush = false,
}: {
  title?: string;
  hint?: string | undefined;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** No inner padding (for tables and grids that touch the border). */
  flush?: boolean;
}) {
  return (
    <section className={`border border-neutral-200 bg-white ${className}`}>
      {title && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-neutral-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-[14px] font-semibold text-neutral-950">{title}</h2>
            {hint && <p className="mt-0.5 text-xs leading-relaxed text-neutral-500">{hint}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={flush ? "" : "p-5"}>{children}</div>
    </section>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
      {children}
    </p>
  );
}

function Logo({ className = "", light = false }: { className?: string; light?: boolean }) {
  // light = fundo claro (login): logo com o S escuro. No menu preto, a logo com o S branco.
  return (
    <span aria-label="Soccer Games" className={`flex shrink-0 items-center ${className}`}>
      <img
        src={light ? "/logo-soccer-escura.png" : "/logo-soccer.png"}
        alt="Soccer Games"
        width={36}
        height={36}
        className="h-9 w-9"
      />
    </span>
  );
}

/** Two date fields ("De" / "Até") with quick shortcuts. Future days are not selectable. */
function DatePicker({
  initial,
  onApply,
  onClose,
}: {
  initial: { from: string; to: string };
  onApply: (from: string, to: string) => void;
  onClose: () => void;
}) {
  const today = isoDay(new Date());
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to > today ? today : initial.to);
  const valid = from && to && from <= to && to <= today;
  const shortcut = (label: string, a: Date, b: Date) => (
    <button
      key={label}
      type="button"
      onClick={() => onApply(isoDay(a), isoDay(b))}
      className="border border-neutral-200 px-2.5 py-1.5 text-left text-xs text-neutral-700 hover:border-neutral-950"
    >
      {label}
    </button>
  );
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const field =
    "mt-1 h-10 w-full border border-neutral-300 bg-white px-2 text-sm outline-none focus:border-neutral-950";
  return (
    <>
      <button
        type="button"
        aria-label="Fechar"
        className="fixed inset-0 z-30 cursor-default"
        onClick={onClose}
      />
      <div className="absolute right-0 top-[calc(100%+6px)] z-40 w-[300px] border border-neutral-200 bg-white p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-400">
          Atalhos
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {shortcut("Ontem", yesterday, yesterday)}
          {shortcut("Este mês", monthStart, now)}
          {shortcut("Mês passado", lastMonthStart, lastMonthEnd)}
          {shortcut("Este ano", new Date(now.getFullYear(), 0, 1), now)}
        </div>
        <form
          className="mt-4 border-t border-neutral-100 pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onApply(from, to);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-neutral-700">
              De
              <input
                type="date"
                value={from}
                max={to || today}
                onChange={(e) => setFrom(e.target.value)}
                className={field}
                required
              />
            </label>
            <label className="block text-xs font-medium text-neutral-700">
              Até
              <input
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => setTo(e.target.value)}
                className={field}
                required
              />
            </label>
          </div>
          {!valid && from && to && (
            <p className="mt-2 text-xs text-red-700">A data inicial precisa vir antes da final.</p>
          )}
          <button
            type="submit"
            disabled={!valid}
            className="mt-4 h-10 w-full bg-neutral-950 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Ver este período
          </button>
        </form>
      </div>
    </>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const field =
    "h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none transition-colors focus:border-neutral-950";
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f4f1] px-6">
      <div className="w-full max-w-sm border border-neutral-200 bg-white p-8">
        <Logo light />
        <h1 className="mt-6 text-xl font-semibold text-neutral-950">Painel dos links</h1>
        <p className="mt-1 text-sm text-neutral-500">Acesso só da equipe Soccer Games.</p>
        <form
          className="mt-7 space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            const { error: err } = await supabase.auth.signInWithPassword({
              email: email.trim().toLowerCase(),
              password,
            });
            setBusy(false);
            if (err) {
              const msg = err.message.toLowerCase();
              setError(
                msg.includes("invalid login credentials")
                  ? "E-mail ou senha incorretos."
                  : msg.includes("email not confirmed")
                    ? "Esse usuário ainda não foi confirmado no Supabase."
                    : `Não foi possível entrar (${err.message}).`,
              );
            }
          }}
        >
          <label className="block text-xs font-medium text-neutral-700" htmlFor="email">
            E-mail
          </label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <label className="block pt-1 text-xs font-medium text-neutral-700" htmlFor="password">
            Senha
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-2 h-11 w-full bg-neutral-950 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {busy ? "Entrando..." : "Entrar"}
          </button>
          {error && <p className="text-xs text-red-700">{error}</p>}
        </form>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export function Dashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [period, setPeriodState] = useState<Period>(readPeriod);
  const [picker, setPicker] = useState(false);
  const setPeriod = (p: Period) => {
    setPeriodState(p);
    setPicker(false);
    try {
      window.localStorage.setItem(PERIOD_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  };
  const [section, setSection] = useState<SectionId>("visao");
  const [data, setData] = useState<DashboardData | null>(null);
  const [prev, setPrev] = useState<DashboardData | null>(null);
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [leadsFailed, setLeadsFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState(false);
  const [internal, setInternal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setReady(true);
    });
    void supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Whoever logs into the panel is team: this browser stops counting in the stats.
  useEffect(() => {
    if (!session) return;
    setInternalDevice(true);
    setInternal(isInternalDevice());
  }, [session]);

  // Workspaces: Black 2026 only for whoever the database allows (black_vip_is_admin).
  const navigate = useNavigate();
  const [black, setBlack] = useState<boolean | null>(null);
  const [chosen, setChosen] = useState(false);
  useEffect(() => {
    if (!session) {
      setBlack(null);
      return;
    }
    let alive = true;
    void canOpenBlack(session.user.id).then((ok) => {
      if (!alive) return;
      setBlack(ok);
      if (ok && getWorkspace() === "black") void navigate({ to: "/admin/black", replace: true });
    });
    return () => {
      alive = false;
    };
  }, [session, navigate]);
  const openWorkspace = (w: Workspace) => {
    setWorkspace(w);
    setChosen(true);
    if (w === "black") void navigate({ to: "/admin/black" });
  };
  const signOut = () => {
    forgetBlackAccess();
    void supabase.auth.signOut();
  };

  // Remember the open section between visits.
  useEffect(() => {
    try {
      const s = window.localStorage.getItem("sg:painel:secao") as SectionId | null;
      if (s && SECTIONS.some((x) => x.id === s)) setSection(s);
    } catch {
      /* ignore */
    }
  }, []);
  const go = (id: SectionId) => {
    setSection(id);
    window.scrollTo({ top: 0 });
    try {
      window.localStorage.setItem("sg:painel:secao", id);
    } catch {
      /* ignore */
    }
  };

  const r = useMemo(() => range(period), [period]);
  const lastDay = period.kind === "custom" ? parseDay(period.to) : r.to;
  const periodLabel =
    period.kind === "preset" && period.days === 1
      ? `Hoje, ${fullFmt.format(r.to)}`
      : isoDay(r.from) === isoDay(lastDay)
        ? fullFmt.format(r.from)
        : `${dayFmt.format(r.from)} a ${fullFmt.format(lastDay)}`;
  const fileTag =
    period.kind === "preset" ? `${period.days}d-${isoDay(r.to)}` : `${period.from}_a_${period.to}`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cur, before, contacts] = await Promise.all([
        loadDashboard(r.from, r.to),
        loadDashboard(r.prevFrom, r.prevTo).catch(() => null),
        // Only the current and the previous period are counted here (the Contatos tab reads all).
        loadLeads(r.prevFrom).then(
          (rows) => ({ rows, failed: false }),
          () => ({ rows: null, failed: true }),
        ),
      ]);
      setData(cur);
      setPrev(before);
      setLeads(contacts.rows);
      setLeadsFailed(contacts.failed);
    } catch (e) {
      const kind = e instanceof DashboardError ? e.kind : "other";
      setError(
        kind === "forbidden"
          ? "Este e-mail não tem acesso ao painel."
          : kind === "outdated"
            ? "O banco ainda está na versão antiga do painel. Rode o SQL de atualização (supabase/migrations) no SQL Editor do Supabase e atualize esta página."
            : "Não foi possível carregar os dados. Tente atualizar a página.",
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [r]);

  useEffect(() => {
    if (session) void load();
  }, [session, load]);

  if (!ready) return null;
  if (!session) return <Login />;
  if (black === null || (black && getWorkspace() === "black")) return null;
  if (black && !chosen && getWorkspace() === null)
    return (
      <WorkspaceChooser
        allowed={["links", "black"]}
        email={session.user.email}
        onChoose={openWorkspace}
        onSignOut={signOut}
      />
    );

  if (report && data)
    return (
      <Suspense fallback={null}>
        <Report data={data} prev={prev} period={periodLabel} onClose={() => setReport(false)} />
      </Suspense>
    );

  const current = SECTIONS.find((x) => x.id === section) ?? SECTIONS[0];
  const t = data?.totals;
  const pt = prev?.totals;
  const products = data ? rankedProducts(data) : [];
  const notes = data ? highlights(data, prev) : [];
  const groups = data ? quizGroups(data) : [];
  const story = data && hasPurchaseFunnel(data) ? funnelStory(data) : null;
  const fmtDay = (s: string) => {
    const [, m, d] = s.split("-");
    return `${d}/${m}`;
  };
  const peakHour = data ? peak(data.hours, (h) => h.visits) : null;
  const peakDay = data ? peak(data.weekdays, (w) => w.visits) : null;
  const spark = data?.daily.map((d) => d.visits);

  // Contacts captured (quiz or coupon) in this period and in the previous one.
  const inRange = (row: LeadRow, a: Date, b: Date) => {
    const d = new Date(row.created_at);
    return d >= a && d < b;
  };
  const leadsNow = leads?.filter((x) => inRange(x, r.from, r.to)) ?? [];
  const leadsBefore = leads?.filter((x) => inRange(x, r.prevFrom, r.prevTo)) ?? [];
  const leadsFailedNote = "Não foi possível ler os contatos. Atualize a página.";

  const checkout = t?.checkout_sessions ?? 0;
  const empty = t ? t.visits === 0 : true;

  const nav = (
    <nav aria-label="Seções do painel" className="space-y-0.5">
      {SECTIONS.map((x) => {
        const Icon = x.icon;
        const on = x.id === section;
        return (
          <button
            key={x.id}
            type="button"
            onClick={() => go(x.id)}
            aria-current={on ? "page" : undefined}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors ${
              on
                ? "bg-white/10 font-medium text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" style={on ? { color: C.accent } : undefined} />
            {x.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f5f4f1] font-sans text-neutral-900">
      {/* Sidebar (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-neutral-950 px-3 py-6 lg:flex">
        <div className="flex items-center gap-3 px-3">
          <Logo />
          <span className="border-l border-white/15 pl-3 text-xs leading-tight text-white/60">
            Painel
            <br />
            <span className="text-sm font-medium text-white">Links da bio</span>
          </span>
        </div>
        {black && (
          <div className="mt-6 px-3">
            <WorkspaceSwitch current="links" onSwitch={openWorkspace} />
          </div>
        )}
        <div className="mt-6 flex-1">{nav}</div>
        <div className="border-t border-white/10 px-3 pt-4">
          <p className="truncate text-xs text-white/50">{session.user.email}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Top bar (mobile): logo + horizontal sections */}
        <div className="bg-neutral-950 lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <Logo />
              {black && <WorkspaceSwitch current="links" onSwitch={openWorkspace} />}
            </div>
            <button
              type="button"
              onClick={signOut}
              className="flex h-9 w-9 items-center justify-center text-white/70"
              aria-label="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-1 overflow-x-auto px-2 pb-2 [scrollbar-width:none]">
            {SECTIONS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => go(x.id)}
                className={`shrink-0 px-3 py-2 text-[13px] ${x.id === section ? "bg-white/10 font-medium text-white" : "text-white/60"}`}
              >
                {x.label}
              </button>
            ))}
          </div>
        </div>

        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-[#f5f4f1]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-neutral-950">
                {current.title}
              </h1>
              <p className="mt-0.5 text-xs text-neutral-500">
                {section === "aovivo" ? (
                  "Tempo real · últimos 30 minutos"
                ) : (
                  <>
                    {periodLabel}
                    {prev ? " · setas comparam com o período anterior" : ""}
                  </>
                )}
              </p>
            </div>
            <div
              className={`flex flex-wrap items-center gap-2 ${section === "aovivo" ? "hidden" : ""}`}
            >
              <div className="relative flex border border-neutral-300 bg-white">
                {PERIODS.map((p) => {
                  const on = period.kind === "preset" && period.days === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPeriod({ kind: "preset", days: p.id })}
                      className={`h-9 px-3 text-[13px] transition-colors ${on ? "bg-neutral-950 font-medium text-white" : "text-neutral-600 hover:text-neutral-950"}`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setPicker((v) => !v)}
                  aria-expanded={picker}
                  className={`flex h-9 items-center gap-1.5 border-l border-neutral-300 px-3 text-[13px] transition-colors ${period.kind === "custom" ? "bg-neutral-950 font-medium text-white" : "text-neutral-600 hover:text-neutral-950"}`}
                >
                  <CalendarDays className="h-4 w-4" />
                  {period.kind === "custom" ? "Datas" : "Escolher datas"}
                </button>
                {picker && (
                  <DatePicker
                    initial={
                      period.kind === "custom" ? period : { from: isoDay(r.from), to: isoDay(r.to) }
                    }
                    onApply={(from, to) => setPeriod({ kind: "custom", from, to })}
                    onClose={() => setPicker(false)}
                  />
                )}
              </div>
              <button
                type="button"
                onClick={() => void load()}
                className="flex h-9 w-9 items-center justify-center border border-neutral-300 bg-white text-neutral-600 hover:text-neutral-950"
                aria-label="Atualizar"
                title="Atualizar"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              {data && (
                <>
                  <a
                    className="flex h-9 items-center gap-2 border border-neutral-300 bg-white px-3 text-[13px] text-neutral-800 hover:border-neutral-950"
                    download={`mts-links-${fileTag}.csv`}
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(data, periodLabel))}`}
                  >
                    <Download className="h-4 w-4" /> Planilha
                  </a>
                  <button
                    type="button"
                    onClick={() => setReport(true)}
                    className="flex h-9 items-center gap-2 bg-neutral-950 px-3 text-[13px] font-medium text-white hover:opacity-90"
                  >
                    <FileText className="h-4 w-4" /> Apresentação
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] px-4 pb-24 pt-6 sm:px-8">
          <p className="mb-5 text-sm text-neutral-500">{current.sub}</p>

          {error && section !== "aovivo" && (
            <p className="mb-6 border border-red-200 bg-red-50 p-5 text-sm leading-relaxed text-red-700">
              {error}
            </p>
          )}
          {notice && (
            <p className="mb-6 border border-neutral-200 bg-white p-5 text-sm text-neutral-700">
              {notice}
            </p>
          )}
          {!data && !error && !["contatos", "ajustes", "aovivo"].includes(section) && (
            <p className="text-sm text-neutral-400">Carregando...</p>
          )}

          <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
            {/* ---------------- VISÃO GERAL ---------------- */}
            {section === "visao" && data && t && (
              <>
                <div className="grid grid-cols-2 gap-px overflow-hidden border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
                  <Kpi
                    label="Visitas"
                    value={fmt(t.visits)}
                    delta={delta(t.visits, pt?.visits)}
                    sub={`${pctLabel(t.engaged, t.visits)} interagiram`}
                    spark={spark}
                  />
                  <Kpi
                    label="Abriram um jogo"
                    value={fmt(t.product_viewers ?? 0)}
                    delta={delta(t.product_viewers ?? 0, pt?.product_viewers)}
                    sub={`${pctLabel(t.product_viewers ?? 0, t.visits)} das visitas`}
                  />
                  <Kpi
                    accent
                    label="Foram ao carrinho"
                    value={fmt(checkout)}
                    delta={delta(checkout, pt?.checkout_sessions)}
                    sub={`${pctLabel(checkout, t.visits)} das visitas`}
                  />
                  <Kpi
                    label="Contatos captados"
                    value={leads ? fmt(leadsNow.length) : "–"}
                    delta={leads ? delta(leadsNow.length, leadsBefore.length) : undefined}
                    sub={leads ? "No fim do quiz" : leadsFailed ? leadsFailedNote : undefined}
                  />
                </div>

                {hasPurchaseFunnel(data) && (
                  <Card
                    title="Jornada de compra"
                    hint="Pessoas, não cliques. A etapa marcada em vermelho é onde mais gente desiste."
                    action={
                      <button
                        type="button"
                        onClick={() => go("vendas")}
                        className="text-xs font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-950"
                      >
                        Ver detalhes
                      </button>
                    }
                  >
                    <Journey steps={purchaseFunnel(data)} />
                    {story && (
                      <p className="mt-4 text-sm leading-relaxed text-neutral-700">
                        {story.headline}
                      </p>
                    )}
                  </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-3">
                  <Card
                    className="lg:col-span-2"
                    title="Visitas por dia"
                    hint={
                      prev
                        ? "Linha tracejada: período anterior. Passe o mouse para ver cada dia."
                        : undefined
                    }
                  >
                    <TrendChart
                      points={data.daily.map((d) => ({
                        label: fmtDay(d.day),
                        value: d.visits,
                        sub: `${fmt(d.clicks)} cliques`,
                      }))}
                      {...(prev ? { prev: prev.daily.map((d) => d.visits) } : {})}
                    />
                  </Card>
                  <Card
                    title="Ao vivo"
                    hint="Atualiza sozinho a cada 15 segundos."
                    action={
                      <button
                        type="button"
                        onClick={() => go("aovivo")}
                        className="text-xs font-medium text-neutral-700 underline underline-offset-4 hover:text-neutral-950"
                      >
                        Abrir
                      </button>
                    }
                  >
                    <Live compact />
                  </Card>
                </div>

                {notes.length > 0 && (
                  <Card title="O que os números dizem" hint="Leitura automática do período.">
                    <ol className="grid gap-x-10 gap-y-4 md:grid-cols-2">
                      {notes.map((n, i) => (
                        <li key={n} className="flex gap-3 text-sm leading-relaxed text-neutral-800">
                          <span
                            className="mt-px flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-semibold tabular-nums text-white"
                            style={{ background: i === 0 ? C.accent : C.ink }}
                          >
                            {i + 1}
                          </span>
                          {n}
                        </li>
                      ))}
                    </ol>
                  </Card>
                )}
              </>
            )}

            {section === "aovivo" && <LivePage />}

            {/* ---------------- VENDAS ---------------- */}
            {section === "vendas" && data && t && (
              <>
                <Card
                  title="Vendas confirmadas na loja"
                  hint="Pedidos pagos na Nuvemshop que vieram do links, lidos direto da loja."
                >
                  <Sales from={r.from} to={r.to} />
                </Card>

                <div className="grid grid-cols-2 gap-px overflow-hidden border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
                  <Kpi
                    accent
                    label="Foram ao carrinho"
                    value={fmt(checkout)}
                    delta={delta(checkout, pt?.checkout_sessions)}
                    sub={`${pctLabel(checkout, t.product_viewers ?? 0)} de quem abriu um jogo`}
                  />
                  <Kpi
                    label="Escolheram a licença"
                    value={fmt(t.size_selectors ?? 0)}
                    delta={delta(t.size_selectors ?? 0, pt?.size_selectors)}
                    sub={`${pctLabel(t.size_selectors ?? 0, t.product_viewers ?? 0)} de quem abriu um jogo`}
                  />
                  <Kpi
                    label="Contatos do quiz"
                    value={leads ? fmt(leadsNow.length) : "–"}
                    delta={leads ? delta(leadsNow.length, leadsBefore.length) : undefined}
                    sub={leadsFailed ? leadsFailedNote : "Deixaram o WhatsApp no fim do quiz"}
                  />
                  <Kpi
                    label="Carrinho depois do quiz"
                    value={fmt(t.checkout_from_quiz ?? 0)}
                    sub={`${pctLabel(t.checkout_from_quiz ?? 0, checkout)} de quem foi ao carrinho`}
                  />
                </div>

                <Card
                  title="Como conferir as vendas de verdade"
                  hint="O painel vê a pessoa sair para o carrinho da loja. A venda fecha na Nuvemshop, então a confirmação está nos relatórios da loja e do Analytics."
                >
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="border-l-[3px] pl-4" style={{ borderColor: C.accent }}>
                      <p className="text-sm font-semibold text-neutral-950">
                        Do link para o carrinho
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                        Cada Comprar daqui abre o carrinho da loja já com o jogo e a licença
                        escolhida. O pagamento acontece na Nuvemshop, então o painel conta até o
                        carrinho e a venda confirmada fica nos relatórios da loja.
                      </p>
                    </div>
                    <div className="border-l-[3px] border-neutral-950 pl-4">
                      <p className="text-sm font-semibold text-neutral-950">
                        Todas as vendas do link
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-neutral-600">
                        Toda compra que sai daqui leva <strong>utm_medium = bio</strong> e a origem
                        real da visita (Instagram, TikTok, campanha). No Google Analytics, filtre
                        por esse meio para ver receita e pedidos.
                      </p>
                    </div>
                  </div>
                </Card>

                {hasPurchaseFunnel(data) ? (
                  <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
                    <Card
                      title="Funil de compra"
                      hint="Cada etapa conta pessoas. Embaixo de cada uma, quantos seguiram da etapa anterior."
                    >
                      <Funnel steps={purchaseFunnel(data)} stepRate />
                      {story?.loss && (
                        <p className="mt-5 border-l-[3px] border-red-600 bg-red-50/50 px-4 py-3 text-sm leading-relaxed text-neutral-800">
                          {story.loss}
                        </p>
                      )}
                      {(t.no_size_sessions ?? 0) > 0 && (
                        <p className="mt-4 text-sm leading-relaxed text-neutral-600">
                          {fmt(t.no_size_sessions ?? 0)}{" "}
                          {t.no_size_sessions === 1 ? "visita tocou" : "visitas tocaram"} em comprar
                          sem escolher a licença
                          {data.no_size_products?.[0]
                            ? `, mais em ${productName(data.no_size_products[0].item)}`
                            : ""}
                          .
                        </p>
                      )}
                    </Card>
                    <Card title="Quem foi ao checkout" hint="Por jogo, licença e origem da visita.">
                      <Label>Por jogo</Label>
                      <BarList
                        rows={(data.checkout_products ?? []).map((x) => ({
                          label: productName(x.item),
                          n: x.sessions,
                        }))}
                        max={6}
                        accent
                      />
                      <div className="mt-7 grid grid-cols-2 gap-6 border-t border-neutral-100 pt-5">
                        <div>
                          <Label>Licença</Label>
                          <BarList
                            rows={(data.checkout_sizes ?? []).map((x) => ({
                              label: x.size,
                              n: x.n,
                            }))}
                            max={5}
                          />
                        </div>
                        <div>
                          <Label>Origem</Label>
                          <BarList
                            rows={(data.checkout_by_source ?? []).map((x) => ({
                              label: sourceName(x.source),
                              n: x.n,
                            }))}
                            max={5}
                          />
                        </div>
                      </div>
                    </Card>
                  </div>
                ) : (
                  <Card>
                    <p className="text-sm leading-relaxed text-neutral-500">
                      O funil de compra ainda não está ativo no banco. Rode no SQL Editor do
                      Supabase os arquivos da pasta supabase/migrations e atualize a página.
                    </p>
                  </Card>
                )}
              </>
            )}

            {/* ---------------- PRODUTOS ---------------- */}
            {section === "produtos" && data && t && (
              <>
                <div className="grid grid-cols-2 gap-px overflow-hidden border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
                  <Kpi
                    label="Cliques em produtos"
                    value={fmt(t.product_clicks)}
                    delta={delta(t.product_clicks, pt?.product_clicks)}
                  />
                  <Kpi
                    label="Foram ao site"
                    value={pctLabel(t.to_site, t.visits)}
                    sub={`${fmt(t.to_site)} visitas`}
                    delta={delta(t.to_site, pt?.to_site)}
                  />
                  <Kpi
                    label="Cliques no total"
                    value={fmt(t.clicks)}
                    delta={delta(t.clicks, pt?.clicks)}
                  />
                  <Kpi
                    label="Atendimento"
                    value={fmt(t.support_clicks)}
                    sub="Cliques em WhatsApp e ajuda"
                    delta={delta(t.support_clicks, pt?.support_clicks)}
                  />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card
                    title="Produtos mais clicados"
                    hint="Na vitrine, na busca e no resultado do quiz."
                  >
                    <BarList rows={products} max={10} accent />
                  </Card>
                  <Card title="Botões e links" hint="Atendimento, site, redes e banners.">
                    <BarList
                      rows={data.top_links.map((x) => ({ label: x.item, n: x.n }))}
                      max={10}
                      total={t.clicks}
                    />
                  </Card>
                  <Card title="Categorias abertas" hint="Visitas que abriram cada categoria.">
                    <BarList
                      rows={data.categories.map((c) => ({ label: categoryName(c.item), n: c.n }))}
                    />
                  </Card>
                  <Card title="Funil da página" hint="Uma contagem por pessoa.">
                    <Funnel
                      steps={[
                        { label: "Visitaram", value: t.visits },
                        { label: "Interagiram", value: t.engaged },
                        { label: "Exploraram loja, busca ou quiz", value: t.explored },
                        { label: "Foram ao site", value: t.to_site },
                      ]}
                    />
                  </Card>
                </div>
              </>
            )}

            {/* ---------------- PÚBLICO ---------------- */}
            {section === "publico" && data && t && (
              <div className="grid gap-6 lg:grid-cols-3">
                <Card
                  className="lg:col-span-2"
                  title="Horário das visitas"
                  hint={
                    peakHour && peakHour.visits > 0
                      ? `Pico por volta das ${peakHour.hour}h. Bom horário para postar e responder.`
                      : undefined
                  }
                >
                  <Columns
                    data={data.hours.map((h) => ({
                      label: `${h.hour}h`,
                      value: h.visits,
                      title: `${h.hour}h: ${fmt(h.visits)}`,
                    }))}
                  />
                </Card>
                <Card
                  title="Dia da semana"
                  hint={
                    peakDay && peakDay.visits > 0
                      ? `Mais visitas: ${WEEKDAYS[peakDay.dow]?.toLowerCase()}.`
                      : undefined
                  }
                >
                  <Columns
                    data={data.weekdays.map((w) => ({
                      label: WEEKDAYS_SHORT[w.dow] ?? "",
                      value: w.visits,
                      title: fmt(w.visits),
                    }))}
                  />
                </Card>
                <Card title="De onde vieram">
                  <BarList
                    rows={data.sources.map((x) => ({ label: sourceName(x.source), n: x.n }))}
                    max={6}
                    total={t.visits}
                  />
                </Card>
                <Card title="Aparelho">
                  <BarList
                    rows={data.devices.map((x) => ({ label: deviceName(x.device), n: x.n }))}
                    max={3}
                    total={t.visits}
                  />
                </Card>
                <Card title="Campanhas" hint="Links com utm_campaign.">
                  <BarList
                    rows={data.campaigns.map((x) => ({ label: x.campaign, n: x.n }))}
                    max={6}
                  />
                </Card>
              </div>
            )}

            {/* ---------------- BUSCA E QUIZ ---------------- */}
            {section === "busca" && data && t && (
              <>
                <div className="grid grid-cols-2 gap-px overflow-hidden border border-neutral-200 bg-neutral-200 lg:grid-cols-4">
                  <Kpi
                    label="Começaram o quiz"
                    value={fmt(t.quiz_start)}
                    delta={delta(t.quiz_start, pt?.quiz_start)}
                  />
                  <Kpi
                    label="Chegaram ao resultado"
                    value={pctLabel(t.quiz_complete, t.quiz_start)}
                    sub={`${fmt(t.quiz_complete)} pessoas`}
                  />
                  <Kpi
                    label="Clicaram no indicado"
                    value={fmt(t.quiz_result_click)}
                    sub={`${pctLabel(t.quiz_result_click, t.quiz_complete)} de quem terminou`}
                  />
                  <Kpi
                    label="Buscas"
                    value={fmt(t.searches)}
                    sub={`${fmt(t.searches_no_result)} sem resultado`}
                  />
                </div>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card
                    title="O que buscaram"
                    hint="Termos digitados letra por letra contam uma vez."
                  >
                    {data.searches.length === 0 ? (
                      <p className="py-2 text-sm text-neutral-400">Sem buscas no período.</p>
                    ) : (
                      <ul className="divide-y divide-neutral-100 text-sm">
                        {data.searches.slice(0, 12).map((s) => (
                          <li key={s.term} className="flex items-center justify-between gap-3 py-2">
                            <span className="truncate">{s.term}</span>
                            <span className="flex shrink-0 items-center gap-3">
                              {s.no_result && (
                                <span className="bg-red-50 px-1.5 py-0.5 text-[11px] text-red-700">
                                  sem resultado
                                </span>
                              )}
                              <span className="tabular-nums text-neutral-500">{fmt(s.n)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                  <Card title="Peças mais indicadas pelo quiz">
                    <BarList
                      rows={data.quiz_results.map((q) => ({
                        label: productName(q.product),
                        n: q.n,
                      }))}
                      max={8}
                      accent
                    />
                  </Card>
                </div>
                {groups.length > 0 && (
                  <Card title="Respostas do quiz" hint="O que o público escolhe em cada pergunta.">
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                      {groups.map(([q, rows]) => (
                        <div key={q}>
                          <Label>{QUIZ_QUESTION_LABEL[q] ?? q}</Label>
                          <BarList rows={rows} max={5} total={rows.reduce((a, x) => a + x.n, 0)} />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
                {data.questions.length > 0 && (
                  <Card title="Perguntas escritas para o assistente">
                    <ul className="divide-y divide-neutral-100 text-sm">
                      {data.questions.map((q, i) => (
                        <li key={i} className="flex justify-between gap-4 py-2">
                          {q.question}
                          <span className="shrink-0 text-xs text-neutral-400">
                            {new Date(q.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </>
            )}

            {data &&
              empty &&
              ["visao", "vendas", "produtos", "publico", "busca"].includes(section) && (
                <p className="border border-neutral-200 bg-white p-5 text-sm leading-relaxed text-neutral-500">
                  Nenhuma visita registrada neste período. As visitas são contadas apenas em
                  links.lojasoccergames.com.br e não incluem aparelhos da equipe.
                </p>
              )}

            {/* ---------------- CONTATOS ---------------- */}
            {section === "contatos" && (
              <>
                <Card
                  title="Contatos do quiz"
                  hint="Quem deixou nome e WhatsApp no fim do quiz, com as respostas e o jogo indicado. Todos aceitaram receber mensagens."
                >
                  <Leads
                    from={r.from}
                    to={r.to}
                    periodLabel={periodLabel}
                    onChange={() => void load()}
                  />
                </Card>
              </>
            )}

            {/* ---------------- AJUSTES ---------------- */}
            {section === "ajustes" && (
              <div className="grid gap-6 md:grid-cols-2">
                <Card title="Visitas da equipe">
                  <p className="text-sm leading-relaxed text-neutral-600">
                    {internal
                      ? "Este navegador não entra nas estatísticas. "
                      : "Este navegador está sendo contado. "}
                    Para tirar o seu celular da contagem, abra uma vez{" "}
                    <span className="font-medium text-neutral-950">
                      links.lojasoccergames.com.br/?interno=1
                    </span>{" "}
                    nele.
                  </p>
                  <button
                    type="button"
                    className="mt-3 text-sm underline underline-offset-4 hover:text-neutral-950"
                    onClick={() => {
                      setInternalDevice(!internal);
                      setInternal(!internal);
                    }}
                  >
                    {internal ? "Voltar a contar este navegador" : "Não contar este navegador"}
                  </button>
                </Card>
                <Card title="Limpar dados de teste">
                  <p className="text-sm leading-relaxed text-neutral-600">
                    Apaga as estatísticas de visitas e cliques e começa do zero. Contatos e
                    cadastros da Black continuam. Não dá para desfazer.
                  </p>
                  {confirmReset ? (
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        className="flex h-9 items-center gap-2 bg-red-700 px-4 text-sm font-medium text-white hover:opacity-90"
                        onClick={async () => {
                          setConfirmReset(false);
                          try {
                            const n = await resetEvents();
                            setNotice(
                              `Pronto: ${fmt(n)} registros apagados. A contagem começa do zero agora.`,
                            );
                            void load();
                          } catch {
                            setNotice(
                              "Não foi possível limpar. Confira se o SQL de atualização foi rodado no Supabase.",
                            );
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" /> Apagar tudo
                      </button>
                      <button
                        type="button"
                        className="text-sm"
                        onClick={() => setConfirmReset(false)}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-3 text-sm underline underline-offset-4 hover:text-red-700"
                      onClick={() => setConfirmReset(true)}
                    >
                      Limpar dados
                    </button>
                  )}
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
