import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Gamepad2,
  Globe,
  HelpCircle,
  Lock,
  Mail,
  ShieldCheck,
  Info,
  LayoutGrid,
  LifeBuoy,
  ListChecks,
  Megaphone,
  MessageCircle,
  MonitorSmartphone,
  MousePointerClick,
  Palette,
  Pointer,
  Radio,
  Receipt,
  RefreshCw,
  Route,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isInternalDevice, setInternalDevice } from "@/lib/tracking";
import { BarList, Columns, Empty, Funnel, Journey, Kpi, TrendChart } from "./charts";
import { SettingsPanel } from "./Settings";
import { readPrefs } from "./prefs";
import {
  Card,
  Label,
  Logo,
  Note,
  Scoreboard,
  Shell,
  ShellBoot,
  ThemeSwitch,
  type NavGroup,
} from "./ui";
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
  const fixed = readPrefs().days;
  if (fixed) return { kind: "preset", days: fixed };
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
    label: "Início",
    icon: LayoutGrid,
    title: "Início",
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
    icon: MessageCircle,
    title: "Contatos",
    sub: "Quem deixou o WhatsApp no fim do quiz.",
  },
  {
    id: "ajustes",
    label: "Configurações",
    icon: Settings,
    title: "Configurações",
    sub: "Se cada peça está funcionando, o que está ligado e o que fazer quando algo para.",
  },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

/* ---------- peças da tela ---------- */

/** Dois campos de data ("De" / "Até") com atalhos. Dias futuros não podem ser escolhidos. */
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
  const now = new Date();
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const shortcut = (label: string, a: Date, b: Date) => (
    <button key={label} type="button" onClick={() => onApply(isoDay(a), isoDay(b))}>
      {label}
    </button>
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <>
      <button type="button" aria-label="Fechar" className="sg-catch" onClick={onClose} />
      <div className="sg-picker" role="dialog" aria-label="Escolher datas">
        <p className="sg-label" style={{ margin: 0 }}>
          atalhos
        </p>
        <div className="sg-picker__quick">
          {shortcut("Ontem", yesterday, yesterday)}
          {shortcut("Este mês", monthStart, now)}
          {shortcut("Mês passado", lastMonthStart, lastMonthEnd)}
          {shortcut("Este ano", new Date(now.getFullYear(), 0, 1), now)}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) onApply(from, to);
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label className="sg-field">
              <span className="sg-field__label">De</span>
              <input
                type="date"
                value={from}
                max={to || today}
                onChange={(e) => setFrom(e.target.value)}
                className="sg-input"
                required
              />
            </label>
            <label className="sg-field">
              <span className="sg-field__label">Até</span>
              <input
                type="date"
                value={to}
                min={from}
                max={today}
                onChange={(e) => setTo(e.target.value)}
                className="sg-input"
                required
              />
            </label>
          </div>
          {!valid && from && to && (
            <p className="sg-gate__err">A data inicial precisa vir antes da final.</p>
          )}
          <button type="submit" disabled={!valid} className="sg-btn sg-btn--primary sg-btn--block">
            Ver este período
          </button>
        </form>
      </div>
    </>
  );
}

/** Vitrine do login: uma estante de jogos abstrata (sem capas, sem dados). Antes de entrar não há número real para mostrar. */
const SHELF = [
  ["PS5", "PS4", "PS5", "PS5", "PS4", "PS5", "PS4"],
  ["PS4", "PS5", "PS4", "PS5", "PS5", "PS4", "PS5"],
  ["PS5", "PS5", "PS4", "PS4", "PS5", "PS4", "PS5"],
];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="sg-login">
      <aside className="sg-login__show" aria-hidden>
        <div className="sg-login__top">
          <Logo size={40} />
          <span className="sg-login__tag">
            <ShieldCheck /> acesso da equipe
          </span>
        </div>
        <div className="sg-shelf">
          {SHELF.map((row, r) => (
            <div key={r} className={`sg-shelf__row sg-shelf__row--${r}`}>
              {[...row, ...row].map((p, i) => (
                <span
                  key={i}
                  className={`sg-shelf__case ${r === 1 && i % 7 === 3 ? "is-pick" : ""}`}
                >
                  <i>{p}</i>
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="sg-login__pitch">
          <p className="sg-login__kicker">painel soccer</p>
          <h2>
            Cada clique da bio, <em>até o jogo pago.</em>
          </h2>
          <p className="sg-login__lead">
            Quem está na página agora, o que vendeu, quem chamar e a Black do Grupo VIP.
          </p>
          <p className="sg-login__press">
            <kbd>Enter</kbd> para entrar
          </p>
        </div>
      </aside>

      <div className="sg-login__form">
        <div className="sg-login__box">
          <div className="sg-login__mlogo">
            <Logo size={40} />
          </div>
          <h1>Entrar no painel</h1>
          <p className="sg-gate__sub">Bem-vindo de volta. Use o e-mail da equipe Soccer Games.</p>
          <form
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
            <label className="sg-field">
              <span className="sg-field__label">E-mail</span>
              <span className="sg-icon-input">
                <Mail aria-hidden />
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="sg-input"
                  placeholder="voce@lojasoccergames.com.br"
                />
              </span>
            </label>
            <label className="sg-field">
              <span className="sg-field__label">Senha</span>
              <span className="sg-icon-input">
                <Lock aria-hidden />
                <input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="sg-input"
                  style={{ paddingRight: 46 }}
                />
                <button
                  type="button"
                  className="sg-btn sg-btn--ghost sg-btn--s sg-btn--icon sg-icon-input__end"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "Esconder a senha" : "Mostrar a senha"}
                >
                  {show ? <EyeOff /> : <Eye />}
                </button>
              </span>
            </label>
            {error && (
              <p className="sg-gate__err" role="alert">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="sg-btn sg-btn--primary sg-btn--block"
              style={{ height: 46, marginTop: 4 }}
            >
              {busy ? "Entrando..." : "Entrar"}
              {!busy && <ArrowRight />}
            </button>
          </form>
          <p className="sg-login__safe">
            <ShieldCheck aria-hidden /> Conexão protegida. Cada pessoa vê só o que o acesso dela
            permite.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ---------- page ---------- */

function boardSub(d: number | null | undefined, text: string) {
  if (d === null || d === undefined) return text;
  return (
    <>
      <span className={`sg-chip ${d >= 0 ? "sg-chip--ok" : "sg-chip--bad"}`}>
        {d >= 0 ? "+" : "−"}
        {Math.abs(d)}%
      </span>{" "}
      {text}
    </>
  );
}

/** Há uma sessão salva neste navegador? (só para escolher entre esqueleto e tela de login) */
const hasStoredSession = () => {
  try {
    return Object.keys(window.localStorage).some(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
    );
  } catch {
    return false;
  }
};

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
      // Deixa o painel da Black já baixado: a troca fica instantânea.
      if (ok) void import("./black/BlackLeads");
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
      const home = readPrefs().home;
      const s = (
        home !== "ultima" ? home : window.localStorage.getItem("sg:painel:secao")
      ) as SectionId | null;
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

  if (!ready) return hasStoredSession() ? <ShellBoot /> : null;
  if (!session) return <Login />;
  if (black === null)
    return <ShellBoot workspace={getWorkspace() === "black" ? "black" : "links"} />;
  if (black && getWorkspace() === "black") return <ShellBoot workspace="black" />;
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
        <div className="sgp" data-theme="light">
          <Report data={data} prev={prev} period={periodLabel} onClose={() => setReport(false)} />
        </div>
      </Suspense>
    );

  const current = SECTIONS.find((x) => x.id === section) ?? SECTIONS[0];
  const t = data?.totals;
  const pt = prev?.totals;
  const products = data ? rankedProducts(data) : [];
  const notes = data ? highlights(data, prev) : [];
  const groups2 = data ? quizGroups(data) : [];
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

  const leadsToCall = leads?.filter((x) => x.status === "novo").length ?? 0;
  const groups: NavGroup[] = [
    {
      label: "acompanhar",
      items: [
        { id: "visao", label: "Início", icon: LayoutGrid },
        { id: "aovivo", label: "Ao vivo", icon: Radio, live: true },
        { id: "vendas", label: "Vendas", icon: ShoppingBag },
      ],
    },
    {
      label: "entender",
      items: [
        { id: "produtos", label: "Jogos", icon: Gamepad2 },
        { id: "publico", label: "Público", icon: Users },
        { id: "busca", label: "Busca e quiz", icon: Search },
      ],
    },
    {
      label: "agir",
      items: [
        { id: "contatos", label: "Contatos", icon: MessageCircle, badge: leadsToCall || undefined },
      ],
    },
    { label: "sistema", items: [{ id: "ajustes", label: "Configurações", icon: Settings }] },
  ];
  const periodTools = section !== "aovivo" && section !== "ajustes";
  const tools = (
    <>
      {periodTools && (
        <div className="sg-tools__period">
          <div className="sg-seg" role="group" aria-label="Período">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="sg-seg__btn"
                aria-pressed={period.kind === "preset" && period.days === p.id}
                onClick={() => setPeriod({ kind: "preset", days: p.id })}
              >
                {p.label}
              </button>
            ))}
            <button
              type="button"
              className="sg-seg__btn"
              aria-pressed={period.kind === "custom"}
              aria-expanded={picker}
              onClick={() => setPicker((v) => !v)}
            >
              <CalendarDays aria-hidden />
              {period.kind === "custom" ? "Datas" : "Datas"}
            </button>
          </div>
          {picker && (
            <DatePicker
              initial={
                period.kind === "custom" ? period : { from: isoDay(r.from), to: isoDay(r.to) }
              }
              onApply={(from, to) => setPeriod({ kind: "custom", from, to })}
              onClose={() => setPicker(false)}
            />
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="sg-btn sg-btn--icon"
            aria-label="Atualizar os números"
            title="Atualizar"
          >
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      )}
      {data && periodTools && (
        <>
          <a
            className="sg-btn"
            download={`soccer-links-${fileTag}.csv`}
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(data, periodLabel))}`}
          >
            <Download aria-hidden /> Planilha
          </a>
          <button type="button" onClick={() => setReport(true)} className="sg-btn sg-btn--primary">
            <FileText aria-hidden /> Apresentação
          </button>
        </>
      )}
    </>
  );

  const goBtn = (id: SectionId, label: string) => (
    <button type="button" className="sg-pill-link" onClick={() => go(id)}>
      {label} <ChevronRight aria-hidden />
    </button>
  );
  const maxDaily = Math.max(1, ...(data?.daily ?? []).map((d) => d.visits));
  const peakDaily = data?.daily.findIndex((d) => d.visits === maxDaily) ?? -1;

  return (
    <Shell
      workspace="links"
      canSwitch={Boolean(black)}
      onSwitch={openWorkspace}
      product="Links da bio"
      email={session.user.email}
      onSignOut={signOut}
      alert={leadsToCall}
      groups={groups}
      current={section}
      onNav={(id) => go(id as SectionId)}
      tabs={["visao", "aovivo", "vendas", "contatos"]}
      eyebrow={
        section === "aovivo" ? (
          <>
            <span className="sg-dot sg-dot--live" aria-hidden /> tempo real · últimos 30 minutos
          </>
        ) : (
          <>
            <CalendarDays aria-hidden /> {periodLabel}
          </>
        )
      }
      title={current.title}
      sub={current.sub}
      tools={tools}
    >
      <div className="sg-stack sg-loading" data-busy={loading}>
        {error && section !== "aovivo" && (
          <Note tone="bad" icon={AlertTriangle}>
            {error}
          </Note>
        )}
        {notice && (
          <Note tone="ok" icon={CheckCircle2} onClose={() => setNotice(null)}>
            {notice}
          </Note>
        )}
        {!data && !error && !["contatos", "ajustes", "aovivo"].includes(section) && (
          <div className="sg-stack" aria-label="Carregando">
            <div className="sg-skel" style={{ height: 230 }} />
            <div className="sg-kpis">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="sg-skel" style={{ height: 150 }} />
              ))}
            </div>
          </div>
        )}

        {/* ---------------- VISÃO GERAL ---------------- */}
        {section === "visao" && data && t && (
          <>
            <Scoreboard
              label={`placar · ${periodLabel}`}
              live={{ text: "ver quem está agora", onClick: () => go("aovivo") }}
              actions={
                <>
                  <button type="button" className="sg-hero__btn" onClick={() => go("vendas")}>
                    Ver vendas <ArrowRight aria-hidden />
                  </button>
                </>
              }
              cells={[
                {
                  label: "Visitas",
                  value: fmt(t.visits),
                  sub: boardSub(
                    delta(t.visits, pt?.visits),
                    `${fmt(t.product_clicks)} cliques em jogos`,
                  ),
                },
                {
                  label: "Abriram um jogo",
                  value: fmt(t.product_viewers ?? 0),
                  sub: boardSub(
                    delta(t.product_viewers ?? 0, pt?.product_viewers),
                    `${pctLabel(t.product_viewers ?? 0, t.visits)} das visitas`,
                  ),
                  onClick: () => go("produtos"),
                },
                {
                  label: "Foram ao carrinho",
                  value: fmt(checkout),
                  accent: true,
                  sub: boardSub(
                    delta(checkout, pt?.checkout_sessions),
                    `${pctLabel(checkout, t.visits)} das visitas`,
                  ),
                  onClick: () => go("vendas"),
                },
                {
                  label: "Contatos do quiz",
                  value: leads ? fmt(leadsNow.length) : "–",
                  sub: leads
                    ? boardSub(
                        delta(leadsNow.length, leadsBefore.length),
                        leadsToCall ? `${fmt(leadsToCall)} esperando contato` : "no fim do quiz",
                      )
                    : leadsFailed
                      ? leadsFailedNote
                      : undefined,
                  onClick: () => go("contatos"),
                },
              ]}
              bars={data.daily.map((d) => ({ key: d.day, label: fmtDay(d.day), value: d.visits }))}
              barsLabel={
                <>
                  visitas por dia
                  <br />
                  pico {peakDaily >= 0 ? fmtDay(data.daily[peakDaily]!.day) : "–"}
                </>
              }
            />

            <div className="sg-grid sg-grid--split">
              {hasPurchaseFunnel(data) && (
                <Card
                  title="Jornada de compra"
                  hint="Pessoas, não cliques. A etapa marcada em vermelho é onde mais gente desiste."
                  icon={Route}
                  action={goBtn("vendas", "Detalhes")}
                >
                  <Journey steps={purchaseFunnel(data)} />
                  {story && (
                    <p className="sg-inset" style={{ marginTop: 16 }}>
                      {story.headline}
                    </p>
                  )}
                </Card>
              )}
              <Card
                title="Ao vivo"
                hint="Quem está na página agora."
                icon={Radio}
                brand
                action={goBtn("aovivo", "Abrir")}
              >
                <Live compact />
              </Card>
            </div>

            <Card
              title="Visitas por dia"
              hint={
                prev
                  ? "Linha tracejada: período anterior. Passe o mouse ou o dedo para ver cada dia."
                  : undefined
              }
              icon={TrendingUp}
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

            {notes.length > 0 && (
              <Card
                title="O que os números dizem"
                hint="Leitura automática do período."
                icon={Sparkles}
                brand
              >
                <ol className="sg-notes">
                  {notes.map((n, i) => (
                    <li key={n}>
                      <span className="sg-notes__n">{i + 1}</span>
                      <span>{n}</span>
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
              icon={Receipt}
              brand
            >
              <Sales from={r.from} to={r.to} />
            </Card>

            <div className="sg-kpis">
              <Kpi
                accent
                icon={ShoppingCart}
                label="Foram ao carrinho"
                value={fmt(checkout)}
                delta={delta(checkout, pt?.checkout_sessions)}
                sub={`${pctLabel(checkout, t.product_viewers ?? 0)} de quem abriu um jogo`}
              />
              <Kpi
                icon={BadgeCheck}
                label="Escolheram a licença"
                value={fmt(t.size_selectors ?? 0)}
                delta={delta(t.size_selectors ?? 0, pt?.size_selectors)}
                sub={`${pctLabel(t.size_selectors ?? 0, t.product_viewers ?? 0)} de quem abriu um jogo`}
              />
              <Kpi
                icon={MessageCircle}
                label="Contatos do quiz"
                value={leads ? fmt(leadsNow.length) : "–"}
                delta={leads ? delta(leadsNow.length, leadsBefore.length) : undefined}
                sub={leadsFailed ? leadsFailedNote : "Deixaram o WhatsApp no fim do quiz"}
              />
              <Kpi
                icon={Sparkles}
                label="Carrinho depois do quiz"
                value={fmt(t.checkout_from_quiz ?? 0)}
                sub={`${pctLabel(t.checkout_from_quiz ?? 0, checkout)} de quem foi ao carrinho`}
              />
            </div>

            {hasPurchaseFunnel(data) ? (
              <div className="sg-grid sg-grid--2">
                <Card
                  title="Funil de compra"
                  hint="Cada etapa conta pessoas. Embaixo, quantos seguiram da etapa anterior."
                  icon={Filter}
                >
                  <Funnel steps={purchaseFunnel(data)} stepRate />
                  {story?.loss && (
                    <p className="sg-inset sg-inset--bad" style={{ marginTop: 18 }}>
                      {story.loss}
                    </p>
                  )}
                  {(t.no_size_sessions ?? 0) > 0 && (
                    <p className="sg-card__hint" style={{ marginTop: 14 }}>
                      {fmt(t.no_size_sessions ?? 0)}{" "}
                      {t.no_size_sessions === 1 ? "visita tocou" : "visitas tocaram"} em comprar sem
                      escolher a licença
                      {data.no_size_products?.[0]
                        ? `, mais em ${productName(data.no_size_products[0].item)}`
                        : ""}
                      .
                    </p>
                  )}
                </Card>
                <Card
                  title="Quem foi ao carrinho"
                  hint="Por jogo, licença e origem da visita."
                  icon={ShoppingCart}
                >
                  <Label>por jogo</Label>
                  <BarList
                    rows={(data.checkout_products ?? []).map((x) => ({
                      label: productName(x.item),
                      n: x.sessions,
                    }))}
                    max={6}
                    accent
                  />
                  <div
                    className="sg-grid sg-grid--2"
                    style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid var(--sg-line)" }}
                  >
                    <div>
                      <Label>licença</Label>
                      <BarList
                        rows={(data.checkout_sizes ?? []).map((x) => ({ label: x.size, n: x.n }))}
                        max={5}
                      />
                    </div>
                    <div>
                      <Label>origem</Label>
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
              <Note tone="warn" icon={AlertTriangle}>
                O funil de compra ainda não está ativo no banco. Rode no SQL Editor do Supabase os
                arquivos da pasta supabase/migrations e atualize a página.
              </Note>
            )}

            <Card title="Como conferir as vendas" hint="Onde cada número nasce." icon={HelpCircle}>
              <div className="sg-grid sg-grid--2">
                <div className="sg-inset">
                  <strong style={{ color: "var(--sg-ink)" }}>Do link para o carrinho.</strong> Cada
                  Comprar daqui abre o carrinho da loja já com o jogo e a licença. O painel conta
                  até o carrinho; a venda paga aparece no quadro de vendas acima.
                </div>
                <div className="sg-inset">
                  <strong style={{ color: "var(--sg-ink)" }}>No Google Analytics.</strong> Toda
                  compra que sai daqui leva <span className="sg-mono">utm_medium=bio</span> e a
                  origem real da visita. Filtre por esse meio para ver receita e pedidos.
                </div>
              </div>
            </Card>
          </>
        )}

        {/* ---------------- JOGOS ---------------- */}
        {section === "produtos" && data && t && (
          <>
            <div className="sg-kpis">
              <Kpi
                icon={MousePointerClick}
                label="Cliques em jogos"
                value={fmt(t.product_clicks)}
                delta={delta(t.product_clicks, pt?.product_clicks)}
              />
              <Kpi
                accent
                icon={ExternalLink}
                label="Foram ao site"
                value={pctLabel(t.to_site, t.visits)}
                sub={`${fmt(t.to_site)} visitas`}
                delta={delta(t.to_site, pt?.to_site)}
              />
              <Kpi
                icon={Pointer}
                label="Cliques no total"
                value={fmt(t.clicks)}
                delta={delta(t.clicks, pt?.clicks)}
              />
              <Kpi
                icon={LifeBuoy}
                label="Atendimento"
                value={fmt(t.support_clicks)}
                sub="Cliques em ajuda e central"
                delta={delta(t.support_clicks, pt?.support_clicks)}
              />
            </div>
            <div className="sg-grid sg-grid--2">
              <Card
                title="Jogos mais clicados"
                hint="Na vitrine, na busca e no resultado do quiz."
                icon={Gamepad2}
                brand
              >
                <BarList rows={products} max={10} accent />
              </Card>
              <Card
                title="Botões e links"
                hint="Atendimento, site, redes e banners."
                icon={Pointer}
              >
                <BarList
                  rows={data.top_links.map((x) => ({ label: x.item, n: x.n }))}
                  max={10}
                  total={t.clicks}
                />
              </Card>
              <Card
                title="Categorias abertas"
                hint="Visitas que abriram cada categoria."
                icon={Tag}
              >
                <BarList
                  rows={data.categories.map((c) => ({ label: categoryName(c.item), n: c.n }))}
                />
              </Card>
              <Card title="Funil da página" hint="Uma contagem por pessoa." icon={Filter}>
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
          <>
            <div className="sg-grid sg-grid--hero">
              <Card
                title="Horário das visitas"
                hint={
                  peakHour && peakHour.visits > 0
                    ? `Pico por volta das ${peakHour.hour}h. Bom horário para postar e responder.`
                    : undefined
                }
                icon={Clock}
                brand
              >
                <Columns
                  data={data.hours.map((h) => ({
                    label: `${h.hour}h`,
                    value: h.visits,
                    title: `${h.hour}h: ${fmt(h.visits)}`,
                  }))}
                  height={180}
                />
              </Card>
              <Card
                title="Dia da semana"
                hint={
                  peakDay && peakDay.visits > 0
                    ? `Mais visitas: ${WEEKDAYS[peakDay.dow]?.toLowerCase()}.`
                    : undefined
                }
                icon={CalendarDays}
              >
                <Columns
                  data={data.weekdays.map((w) => ({
                    label: WEEKDAYS_SHORT[w.dow] ?? "",
                    value: w.visits,
                    title: fmt(w.visits),
                  }))}
                  height={180}
                />
              </Card>
            </div>
            <div className="sg-grid sg-grid--3">
              <Card title="De onde vieram" icon={Globe}>
                <BarList
                  rows={data.sources.map((x) => ({ label: sourceName(x.source), n: x.n }))}
                  max={6}
                  total={t.visits}
                  accent
                />
              </Card>
              <Card title="Aparelho" icon={Smartphone}>
                <BarList
                  rows={data.devices.map((x) => ({ label: deviceName(x.device), n: x.n }))}
                  max={3}
                  total={t.visits}
                />
              </Card>
              <Card title="Campanhas" hint="Links com utm_campaign." icon={Megaphone}>
                <BarList
                  rows={data.campaigns.map((x) => ({ label: x.campaign, n: x.n }))}
                  max={6}
                />
              </Card>
            </div>
          </>
        )}

        {/* ---------------- BUSCA E QUIZ ---------------- */}
        {section === "busca" && data && t && (
          <>
            <div className="sg-kpis">
              <Kpi
                icon={Sparkles}
                label="Começaram o quiz"
                value={fmt(t.quiz_start)}
                delta={delta(t.quiz_start, pt?.quiz_start)}
              />
              <Kpi
                accent
                icon={BadgeCheck}
                label="Chegaram ao resultado"
                value={pctLabel(t.quiz_complete, t.quiz_start)}
                sub={`${fmt(t.quiz_complete)} pessoas`}
              />
              <Kpi
                icon={MousePointerClick}
                label="Clicaram no indicado"
                value={fmt(t.quiz_result_click)}
                sub={`${pctLabel(t.quiz_result_click, t.quiz_complete)} de quem terminou`}
              />
              <Kpi
                icon={Search}
                label="Buscas"
                value={fmt(t.searches)}
                sub={`${fmt(t.searches_no_result)} sem resultado`}
              />
            </div>
            <div className="sg-grid sg-grid--2">
              <Card
                title="O que buscaram"
                hint="Termos digitados letra por letra contam uma vez."
                icon={Search}
              >
                {data.searches.length === 0 ? (
                  <Empty>Sem buscas no período.</Empty>
                ) : (
                  <ul className="sg-list">
                    {data.searches.slice(0, 12).map((s) => (
                      <li key={s.term}>
                        <span className="sg-list__main">{s.term}</span>
                        <span className="sg-list__side">
                          {s.no_result && (
                            <span className="sg-chip sg-chip--bad">sem resultado</span>
                          )}
                          {fmt(s.n)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
              <Card title="Jogos mais indicados pelo quiz" icon={Sparkles} brand>
                <BarList
                  rows={data.quiz_results.map((q) => ({ label: productName(q.product), n: q.n }))}
                  max={8}
                  accent
                />
              </Card>
            </div>
            {groups2.length > 0 && (
              <Card
                title="Respostas do quiz"
                hint="O que o público escolhe em cada pergunta."
                icon={ListChecks}
              >
                <div className="sg-grid sg-grid--3">
                  {groups2.map(([q, rows]) => (
                    <div key={q}>
                      <Label>{(QUIZ_QUESTION_LABEL[q] ?? q).toLowerCase()}</Label>
                      <BarList rows={rows} max={5} total={rows.reduce((a, x) => a + x.n, 0)} />
                    </div>
                  ))}
                </div>
              </Card>
            )}
            {data.questions.length > 0 && (
              <Card title="Perguntas escritas para o assistente" icon={MessageCircle}>
                <ul className="sg-list">
                  {data.questions.map((q, i) => (
                    <li key={i}>
                      <span style={{ minWidth: 0 }}>{q.question}</span>
                      <span className="sg-list__side">
                        {new Date(q.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}

        {data && empty && ["visao", "vendas", "produtos", "publico", "busca"].includes(section) && (
          <Note icon={Info}>
            Nenhuma visita registrada neste período. As visitas são contadas só em
            links.lojasoccergames.com.br e não incluem aparelhos da equipe.
          </Note>
        )}

        {/* ---------------- CONTATOS ---------------- */}
        {section === "contatos" && (
          <Card
            title="Contatos do quiz"
            hint="Quem deixou nome e WhatsApp no fim do quiz, com as respostas e o jogo indicado. Todos aceitaram receber mensagens."
            icon={MessageCircle}
            brand
          >
            <Leads from={r.from} to={r.to} periodLabel={periodLabel} onChange={() => void load()} />
          </Card>
        )}

        {/* ---------------- AJUSTES ---------------- */}
        {section === "ajustes" && (
          <SettingsPanel
            email={session.user.email}
            screens={SECTIONS.map((x) => ({ id: x.id, label: x.label }))}
            internal={internal}
            onToggleInternal={() => {
              setInternalDevice(!internal);
              setInternal(!internal);
            }}
            onSignOut={signOut}
            onReset={async () => {
              try {
                const n = await resetEvents();
                setNotice(`Pronto: ${fmt(n)} registros apagados. A contagem começa do zero agora.`);
                void load();
              } catch {
                setNotice(
                  "Não foi possível zerar. Confira se o SQL de atualização foi rodado no Supabase.",
                );
              }
            }}
          />
        )}
      </div>
    </Shell>
  );
}
