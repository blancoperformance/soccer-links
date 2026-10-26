import { NewTag, When } from "../when";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Crown,
  Download,
  Globe,
  LayoutGrid,
  List,
  SquareKanban,
  UserCog,
  Workflow,
  Mail,
  Radio,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Card, Note, Scoreboard, Shell, ShellBoot, type NavGroup } from "../ui";
import { supabase } from "@/integrations/supabase/client";
import { setInternalDevice } from "@/lib/tracking";
import { forgetBlackAccess, setWorkspace, type Workspace } from "../workspace";
import { loadAcesso, type Acesso } from "./plano/data";
import { Plano, type PlanoSection } from "./plano/Plano";
import {
  dateTime,
  dayKey,
  deleteBlackLead,
  download,
  keysBetween,
  loadBlackLeads,
  loadRecentBlack,
  markExported,
  emailCsv,
  matches,
  huggyCsv,
  phoneE164,
  phoneLabel,
  shiftKey,
  sourceOf,
  type BlackLead,
} from "./data";

const REFRESH_MS = 60000;
const MAX_ROWS = 500;
const fmt = (n: number) => n.toLocaleString("pt-BR");
const shortDate = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

type Kind = "huggy" | "email";
type Pending = { kind: Kind; ids: (number | string)[] } | { kind: "delete"; lead: BlackLead };

function Confirm({
  title,
  text,
  action,
  danger,
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  action: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);
  return (
    <>
      <button type="button" className="sg-veil" aria-label="Fechar" onClick={onCancel} />
      <div className="sg-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <h3 className="sg-card__title" style={{ fontSize: 17 }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar"
            className="sg-btn sg-btn--ghost sg-btn--s sg-btn--icon"
          >
            <X />
          </button>
        </div>
        <p className="sg-card__hint" style={{ marginTop: 10, fontSize: 14 }}>
          {text}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 22 }}>
          <button type="button" onClick={onCancel} className="sg-btn sg-btn--ghost">
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={danger ? "sg-btn sg-btn--danger-solid" : "sg-btn sg-btn--primary"}
          >
            {busy ? "Aguarde..." : action}
          </button>
        </div>
      </div>
    </>
  );
}

type VipSection = "aovivo" | "numeros" | "cadastros";
type BlackSection = VipSection | PlanoSection;
const VIP_SECS: string[] = ["aovivo", "numeros", "cadastros"];
const ALL_SECS: string[] = [
  ...VIP_SECS,
  "plano",
  "calendario",
  "lista",
  "quadro",
  "equipe",
  "fluxo",
];
type Period = { kind: "preset"; days: 1 | 7 | 30 } | { kind: "custom"; from: string; to: string };
const PERIOD_KEY = "sg:black:periodo";
function readPeriod(): Period {
  try {
    const p = JSON.parse(window.localStorage.getItem(PERIOD_KEY) ?? "null") as Period | null;
    if (p?.kind === "preset" && [1, 7, 30].includes(p.days)) return p;
    if (p?.kind === "custom" && p.from <= p.to) return p;
  } catch {
    /* ignore */
  }
  return { kind: "preset", days: 30 };
}

/** "↑ 20% vs ontem"; nothing when there is no base to compare. */
function Delta({ now, before, label }: { now: number; before: number; label: string }) {
  if (before === 0) return now > 0 ? <span className="sg-chip sg-delta">novo {label}</span> : null;
  const d = Math.round(((now - before) / before) * 100);
  return (
    <span className={`sg-chip sg-delta ${d > 0 ? "sg-chip--ok" : d < 0 ? "sg-chip--bad" : ""}`}>
      {d > 0 ? "↑" : d < 0 ? "↓" : "="} {Math.abs(d)}% {label}
    </span>
  );
}

const ago = (iso: string, now: number) => {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `há ${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  return h < 24 ? `há ${h}h` : shortDate(iso);
};

export function BlackLeads() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [acesso, setAcesso] = useState<Acesso | null>(null);
  const vip = acesso?.vip ?? false;
  const [rows, setRows] = useState<BlackLead[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("Atualizando…");
  const [query, setQuery] = useState("");
  const [onlyNew, setOnlyNew] = useState(false);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [period, setPeriodState] = useState<Period>(readPeriod);
  const [recent, setRecent] = useState<BlackLead[]>([]);
  const [clock, setClock] = useState(Date.now());
  const [sec, setSec] = useState<BlackSection>(() => {
    try {
      const v = window.localStorage.getItem("sg:black:secao") ?? "";
      return (ALL_SECS.includes(v) ? v : "plano") as BlackSection;
    } catch {
      return "aovivo";
    }
  });
  const goSec = (id: BlackSection) => {
    setSec(id);
    window.scrollTo({ top: 0 });
    try {
      window.localStorage.setItem("sg:black:secao", id);
    } catch {
      /* ignore */
    }
  };
  const setPeriod = (p: Period) => {
    setPeriodState(p);
    try {
      window.localStorage.setItem(PERIOD_KEY, JSON.stringify(p));
    } catch {
      /* ignore */
    }
  };

  // Guard: no session -> login at /admin (then back here); not a Black admin -> Links panel.
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      const s = data.session;
      if (!s) {
        setWorkspace("black");
        void navigate({ to: "/admin", replace: true });
        return;
      }
      const a = await loadAcesso();
      if (!alive) return;
      if (!(a.vip || a.papel || a.dono)) {
        setWorkspace("links");
        void navigate({ to: "/admin", replace: true });
        return;
      }
      setInternalDevice(true);
      setAcesso(a);
      // Abre numa tela que a pessoa pode ver.
      setSec((cur) => {
        const vipOk = VIP_SECS.includes(cur)
          ? a.vip
          : cur === "equipe"
            ? a.dono
            : Boolean(a.papel) || a.semSql || cur === "fluxo";
        return vipOk ? cur : a.papel || a.semSql ? "plano" : "aovivo";
      });
      setSession(s);
      if (a.links) void import("../Dashboard");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") void navigate({ to: "/admin", replace: true });
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    setStatus("Atualizando…");
    try {
      setRows(await loadBlackLeads());
      setStatus(
        `Atualizado às ${new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" })}`,
      );
    } catch {
      setStatus("Sem acesso: confira se este e-mail está em black_vip_admins.");
    } finally {
      setLoading(false);
    }
  }, []);

  // First load, then every 60 s while the tab is visible.
  useEffect(() => {
    if (!session || !vip) return;
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [session, vip, load]);

  const all = useMemo(() => rows ?? [], [rows]);
  const rowsRef = useRef<BlackLead[] | null>(null);
  rowsRef.current = rows;

  // Period in São Paulo day keys, and the same-length window right before it.
  const today = dayKey(new Date(clock));
  const range =
    period.kind === "preset"
      ? { from: shiftKey(today, -(period.days - 1)), to: today }
      : { from: period.from, to: period.to > today ? today : period.to };
  const span = keysBetween(range.from, range.to).length;
  const prevRange = { from: shiftKey(range.from, -span), to: shiftKey(range.from, -1) };

  const stats = useMemo(() => {
    const yesterday = shiftKey(today, -1);
    const week = { from: shiftKey(today, -6), to: today };
    const prevWeek = { from: shiftKey(today, -13), to: shiftKey(today, -7) };
    const days = keysBetween(range.from, range.to).slice(-90);
    const perDay = new Map(days.map((d) => [d, 0]));
    const sources = new Map<string, number>();
    const c = { inRange: 0, prev: 0, today: 0, yesterday: 0, week: 0, prevWeek: 0, withEmail: 0 };
    const within = (k: string, r: { from: string; to: string }) => k >= r.from && k <= r.to;
    for (const l of all) {
      const k = dayKey(l.created_at);
      if (k === today) c.today += 1;
      if (k === yesterday) c.yesterday += 1;
      if (within(k, week)) c.week += 1;
      if (within(k, prevWeek)) c.prevWeek += 1;
      if (within(k, prevRange)) c.prev += 1;
      if (!within(k, range)) continue;
      c.inRange += 1;
      if (l.email) c.withEmail += 1;
      if (perDay.has(k)) perDay.set(k, (perDay.get(k) ?? 0) + 1);
      const s = sourceOf(l);
      sources.set(s, (sources.get(s) ?? 0) + 1);
    }
    return {
      ...c,
      days: days.map((d) => ({ day: d, n: perDay.get(d) ?? 0 })),
      sources: [...sources.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, today, range.from, range.to]);

  // Table: period + "Só não exportados" (still missing Huggy, or has an e-mail still missing E-mail) + search.
  const visible = useMemo(
    () =>
      all.filter((l) => {
        const k = dayKey(l.created_at);
        return (
          k >= range.from &&
          k <= range.to &&
          (!onlyNew || !l.exported_huggy_at || (Boolean(l.email) && !l.exported_email_at)) &&
          matches(l, query)
        );
      }),
    [all, query, onlyNew, range.from, range.to],
  );

  // Live block: newest sign-ups every 15 s; a new one also refreshes the full list.
  useEffect(() => {
    if (!session || !vip) return;
    let alive = true;
    const tick = async () => {
      setClock(Date.now());
      if (document.visibilityState !== "visible") return;
      try {
        const r = await loadRecentBlack(10);
        if (!alive) return;
        setRecent(r);
        const newest = r[0];
        if (newest && rowsRef.current && !rowsRef.current.some((x) => x.id === newest.id))
          void load();
      } catch {
        /* the full load reports access problems */
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 15000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [session, vip, load]);

  const switchTo = (w: Workspace) => {
    setWorkspace(w);
    if (w === "links") void navigate({ to: "/admin" });
  };
  const signOut = () => {
    forgetBlackAccess();
    setRows(null);
    void supabase.auth.signOut();
  };

  /**
   * Same rule as the original panel: exports the whole base (the search box does not apply);
   * with "Só não exportados" on, only who was never sent to that platform. Oldest first.
   */
  const exportTo = (kind: Kind) => {
    const col = kind === "huggy" ? "exported_huggy_at" : "exported_email_at";
    const list = all
      .filter((l) => (kind === "email" ? Boolean(l.email) : true) && (!onlyNew || !l[col]))
      .slice()
      .reverse();
    if (!list.length) {
      setNotice("Nada para exportar.");
      return;
    }
    download(
      `black2026-${kind}-${dayKey(new Date())}.csv`,
      kind === "huggy" ? huggyCsv(list) : emailCsv(list),
    );
    setPending({ kind, ids: list.map((l) => l.id) });
  };

  const confirmPending = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.kind === "delete") {
        await deleteBlackLead(pending.lead.id);
        setRows((r) => r?.filter((x) => x.id !== pending.lead.id) ?? null);
      } else {
        await markExported(
          pending.kind === "huggy" ? "exported_huggy_at" : "exported_email_at",
          pending.ids,
        );
        await load();
      }
      setPending(null);
    } catch {
      setNotice(
        pending.kind === "delete"
          ? "Não foi possível excluir."
          : "O arquivo foi baixado, mas não foi possível marcar como exportado. Tente de novo.",
      );
      setPending(null);
    } finally {
      setBusy(false);
    }
  };

  if (!session || !acesso) return <ShellBoot workspace="black" />;
  const plano = !VIP_SECS.includes(sec);

  const total = all.length;
  const maxDay = Math.max(1, ...stats.days.map((d) => d.n));
  const first = stats.days[0]?.day ?? "";
  const periodLabel =
    period.kind === "preset"
      ? period.days === 1
        ? "hoje"
        : `últimos ${period.days} dias`
      : `${range.from.slice(8, 10)}/${range.from.slice(5, 7)} a ${range.to.slice(8, 10)}/${range.to.slice(5, 7)}`;
  const kpis = [
    {
      label: `Inscritos · ${periodLabel}`,
      value: fmt(stats.inRange),
      delta: <Delta now={stats.inRange} before={stats.prev} label="vs período anterior" />,
    },
    {
      label: "Hoje",
      value: fmt(stats.today),
      delta: <Delta now={stats.today} before={stats.yesterday} label="vs ontem" />,
    },
    {
      label: "Últimos 7 dias",
      value: fmt(stats.week),
      delta: <Delta now={stats.week} before={stats.prevWeek} label="vs 7 dias antes" />,
    },
    {
      label: "Com e-mail · no período",
      value: fmt(stats.withEmail),
      delta: (
        <span>
          {stats.inRange
            ? `${Math.round((stats.withEmail / stats.inRange) * 100)}% dos inscritos · `
            : ""}
          {fmt(total)} no total
        </span>
      ),
    },
  ];

  const temPlano = Boolean(acesso.papel) || acesso.semSql;
  const groups: NavGroup[] = [
    ...(temPlano
      ? [
          {
            label: "plano da black",
            items: [
              { id: "plano", label: "Hoje no plano", icon: LayoutGrid },
              { id: "calendario", label: "Calendário", icon: CalendarDays },
              { id: "lista", label: "Ofertas", icon: List },
              { id: "quadro", label: "Quadro do time", icon: SquareKanban },
            ],
          },
        ]
      : []),
    ...(vip
      ? [
          {
            label: "grupo vip",
            items: [
              { id: "aovivo", label: "Ao vivo", icon: Radio, live: true },
              { id: "numeros", label: "Números", icon: BarChart3 },
              { id: "cadastros", label: "Cadastros", icon: Users, badge: stats.today || undefined },
            ],
          },
        ]
      : []),
    {
      label: "sistema",
      items: [
        ...(acesso.dono ? [{ id: "equipe", label: "Equipe e acessos", icon: UserCog }] : []),
        { id: "fluxo", label: "Como funciona", icon: Workflow },
      ],
    },
  ];
  const tabs = groups.flatMap((g) => g.items.map((i) => i.id)).slice(0, 4);
  const titles: Record<BlackSection, { title: string; sub: string }> = {
    plano: {
      title: "Hoje no plano",
      sub: "A oferta do dia, as mensagens prontas para o grupo e o que vem depois.",
    },
    calendario: {
      title: "Calendário de ofertas",
      sub: "Um dia por quadrado, com a cor da fase. Clique no dia para abrir ou criar a oferta.",
    },
    lista: {
      title: "Ofertas da campanha",
      sub: "Todas as ofertas em ordem de data, com preço, licença e etapas.",
    },
    quadro: {
      title: "Quadro do time",
      sub: "Quem está fazendo o quê. Arraste o card para mudar de coluna.",
    },
    equipe: {
      title: "Equipe e acessos",
      sub: "Quem entra no painel e o que cada pessoa abre. Só o dono vê esta tela.",
    },
    fluxo: {
      title: "Como funciona",
      sub: "O caminho de cada oferta, do jogo escolhido até a liberação no grupo.",
    },
    aovivo: {
      title: "Grupo VIP ao vivo",
      sub: "Os últimos cadastros na landing da Black, atualizando a cada 15 segundos.",
    },
    numeros: { title: "Números da Black", sub: "Inscrições no período, por dia e por origem." },
    cadastros: {
      title: "Cadastros e exportação",
      sub: "Busque, exporte para a Huggy ou para e-mail e marque o que já foi enviado.",
    },
  };
  const period$ = (
    <div className="sg-tools__period">
      <div className="sg-seg" role="group" aria-label="Período">
        {([1, 7, 30] as const).map((d) => (
          <button
            key={d}
            type="button"
            className="sg-seg__btn"
            aria-pressed={period.kind === "preset" && period.days === d}
            onClick={() => setPeriod({ kind: "preset", days: d })}
          >
            {d === 1 ? "Hoje" : `${d} dias`}
          </button>
        ))}
      </div>
      <input
        type="date"
        value={range.from}
        max={range.to}
        aria-label="De"
        onChange={(e) =>
          e.target.value && setPeriod({ kind: "custom", from: e.target.value, to: range.to })
        }
        className="sg-input"
        style={{
          width: 150,
          height: 40,
          borderColor: period.kind === "custom" ? "var(--sg-brand)" : undefined,
        }}
      />
      <input
        type="date"
        value={range.to}
        min={range.from}
        max={today}
        aria-label="Até"
        onChange={(e) =>
          e.target.value && setPeriod({ kind: "custom", from: range.from, to: e.target.value })
        }
        className="sg-input"
        style={{
          width: 150,
          height: 40,
          borderColor: period.kind === "custom" ? "var(--sg-brand)" : undefined,
        }}
      />
      <button
        type="button"
        className="sg-btn sg-btn--icon"
        onClick={() => void load()}
        disabled={loading}
        aria-label="Atualizar"
        title="Atualizar"
      >
        <RefreshCw className={loading ? "animate-spin" : ""} />
      </button>
    </div>
  );

  return (
    <Shell
      workspace="black"
      canSwitch={acesso.links}
      onSwitch={switchTo}
      product="Black November"
      email={session.user.email}
      onSignOut={signOut}
      groups={groups}
      current={sec}
      onNav={(id) => goSec(id as BlackSection)}
      tabs={tabs}
      alert={vip ? stats.today : 0}
      eyebrow={
        plano ? (
          <>
            <span className="sg-dot sg-dot--live" aria-hidden />{" "}
            {acesso.papel === "editor"
              ? "você edita"
              : acesso.papel === "leitor"
                ? "só leitura"
                : "plano"}{" "}
            · atualiza ao vivo
          </>
        ) : (
          <>
            <span className="sg-dot sg-dot--live" aria-hidden /> {status} · atualiza sozinho
          </>
        )
      }
      title={titles[sec].title}
      sub={titles[sec].sub}
      tools={sec === "aovivo" || plano ? undefined : period$}
    >
      <div className="sg-stack">
        {notice && (
          <Note tone="brand" onClose={() => setNotice(null)}>
            {notice}
          </Note>
        )}

        {plano && <Plano section={sec as PlanoSection} acesso={acesso} toast={setNotice} />}

        {(sec === "aovivo" || sec === "numeros") && (
          <>
            <Scoreboard
              label={`placar vip · ${periodLabel}`}
              live={{ text: `${fmt(stats.today)} hoje` }}
              actions={
                <button type="button" className="sg-hero__btn" onClick={() => goSec("cadastros")}>
                  Exportar <ArrowRight aria-hidden />
                </button>
              }
              cells={kpis.map((k, i) => ({
                label: k.label,
                value: k.value,
                sub: k.delta,
                accent: i === 0,
              }))}
              bars={stats.days.map((d) => ({
                key: d.day,
                label: `${d.day.slice(8, 10)}/${d.day.slice(5, 7)}`,
                value: d.n,
              }))}
              barsLabel={
                <>
                  inscrições por dia
                  <br />
                  {first ? `${first.slice(8, 10)}/${first.slice(5, 7)}` : ""} a{" "}
                  {range.to === today ? "hoje" : `${range.to.slice(8, 10)}/${range.to.slice(5, 7)}`}
                </>
              }
            />

            <Card title="Últimos cadastros" hint="Atualiza a cada 15 segundos." icon={Radio} brand>
              {recent.length === 0 ? (
                <p className="sg-empty">Nenhum cadastro ainda.</p>
              ) : (
                <ul className="sg-list">
                  {recent.slice(0, sec === "aovivo" ? 10 : 6).map((l, i) => {
                    const fresh = clock - new Date(l.created_at).getTime() < 10 * 60000;
                    return (
                      <li key={String(l.id)}>
                        <span className="sg-list__main">
                          {fresh && i < 3 && (
                            <span className="sg-chip sg-chip--new" style={{ marginRight: 8 }}>
                              novo
                            </span>
                          )}
                          <span style={{ color: "var(--sg-ink)" }}>{l.nome}</span>
                          <span className="sg-muted" style={{ marginLeft: 8, fontSize: 12.5 }}>
                            {sourceOf(l)}
                            {(l.submissions ?? 1) > 1 ? ` · ${l.submissions}x` : ""}
                            {l.email ? " · com e-mail" : ""}
                          </span>
                        </span>
                        <span className="sg-list__side">{ago(l.created_at, clock)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Card>
          </>
        )}

        {sec === "numeros" && (
          <>
            <Card title="De onde vieram" hint="Origem dos cadastros no período." icon={Globe}>
              {stats.sources.length === 0 ? (
                <p className="sg-empty">Sem dados no período.</p>
              ) : (
                <ul className="sg-bars">
                  {stats.sources.map(([src, n], i) => (
                    <li key={src}>
                      <div className="sg-bars__top">
                        <span className="sg-bars__name">{src}</span>
                        <span className="sg-bars__val">
                          {fmt(n)}
                          <span className="sg-bars__pct">
                            {stats.inRange ? Math.round((n / stats.inRange) * 100) : 0}%
                          </span>
                        </span>
                      </div>
                      <div className="sg-track">
                        <div
                          className={`sg-track__fill ${i === 0 ? "sg-track__fill--brand" : ""}`}
                          style={{
                            width: `${Math.max(2, (n / (stats.sources[0]?.[1] ?? 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        {sec === "cadastros" && (
          <Card
            title="Cadastros"
            hint="A exportação leva a base inteira (a busca não entra). Com “Só não exportados”, vai só quem nunca foi enviado."
            icon={Users}
            flush
          >
            <div className="sg-blacktools">
              <label className="sg-search">
                <Search aria-hidden />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar nome, WhatsApp ou e-mail"
                  autoComplete="off"
                  className="sg-input"
                />
              </label>
              <label className="sg-check">
                <input
                  type="checkbox"
                  checked={onlyNew}
                  onChange={(e) => setOnlyNew(e.target.checked)}
                />
                Só não exportados
              </label>
              <button type="button" className="sg-btn" onClick={() => exportTo("huggy")}>
                <Download aria-hidden /> Huggy
              </button>
              <button
                type="button"
                className="sg-btn sg-btn--primary"
                onClick={() => exportTo("email")}
              >
                <Mail aria-hidden /> E-mails
              </button>
            </div>
            <table className="sg-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Nome</th>
                  <th>WhatsApp</th>
                  <th>E-mail</th>
                  <th>Origem</th>
                  <th>Exportado</th>
                  <th aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {rows === null ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="sg-skel" style={{ height: 120 }} />
                    </td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="sg-muted">
                      Nenhum cadastro encontrado. Tente outro período ou limpe a busca.
                    </td>
                  </tr>
                ) : (
                  visible.slice(0, MAX_ROWS).map((l) => {
                    const wa = phoneE164(l.whatsapp);
                    return (
                      <tr key={String(l.id)}>
                        <td
                          data-label="Data"
                          className="sg-muted"
                          style={{ whiteSpace: "nowrap", fontSize: 12.5 }}
                        >
                          <When iso={l.created_at} time now={clock} />
                        </td>
                        <td data-label="Nome" style={{ fontWeight: 500 }}>
                          {l.nome}
                          <NewTag iso={l.created_at} now={clock} />
                          {(l.submissions ?? 1) > 1 && (
                            <span
                              className="sg-chip"
                              style={{ marginLeft: 6 }}
                              title="Enviou o formulário mais de uma vez"
                            >
                              {l.submissions}x
                            </span>
                          )}
                        </td>
                        <td
                          data-label="WhatsApp"
                          className="sg-mono"
                          style={{ whiteSpace: "nowrap", fontSize: 13 }}
                        >
                          {wa ? (
                            <a
                              href={`https://wa.me/${wa}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="sg-link"
                            >
                              {phoneLabel(l.whatsapp)}
                            </a>
                          ) : (
                            l.whatsapp
                          )}
                        </td>
                        <td data-label="E-mail" style={{ fontSize: 13 }}>
                          {l.email ?? <span className="sg-muted">sem e-mail</span>}
                        </td>
                        <td data-label="Origem" className="sg-muted" style={{ fontSize: 12.5 }}>
                          {sourceOf(l)}
                        </td>
                        <td data-label="Exportado">
                          <span
                            className={`sg-chip ${l.exported_huggy_at ? "sg-chip--brand" : ""}`}
                            title={
                              l.exported_huggy_at
                                ? `Exportado em ${dateTime(l.exported_huggy_at)}`
                                : "Ainda não exportado"
                            }
                          >
                            Huggy
                          </span>{" "}
                          {l.email && (
                            <span
                              className={`sg-chip ${l.exported_email_at ? "sg-chip--brand" : ""}`}
                              title={
                                l.exported_email_at
                                  ? `Exportado em ${dateTime(l.exported_email_at)}`
                                  : "Ainda não exportado"
                              }
                            >
                              E-mail
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setPending({ kind: "delete", lead: l })}
                            className="sg-btn sg-btn--ghost sg-btn--s sg-btn--danger"
                            aria-label={`Excluir ${l.nome ?? "cadastro"}`}
                          >
                            <Trash2 aria-hidden />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            {rows !== null && (
              <p className="sg-card__hint" style={{ padding: "12px 20px 16px", margin: 0 }}>
                {visible.length > MAX_ROWS
                  ? `Mostrando 500 de ${fmt(visible.length)}. Use a busca ou a exportação para ver todos.`
                  : `${fmt(visible.length)} ${visible.length === 1 ? "cadastro" : "cadastros"}`}
              </p>
            )}
          </Card>
        )}
      </div>

      {pending && (
        <Confirm
          title={
            pending.kind === "delete"
              ? "Excluir definitivamente?"
              : `Marcar como exportados para ${pending.kind === "huggy" ? "a Huggy" : "a lista de e-mails"}?`
          }
          text={
            pending.kind === "delete"
              ? `${pending.lead.nome ?? "Este cadastro"} (${phoneLabel(pending.lead.whatsapp)}) será apagado de vez. Use só para pedido de exclusão (LGPD).`
              : `O arquivo com ${fmt(pending.ids.length)} ${pending.ids.length === 1 ? "cadastro" : "cadastros"} foi baixado. Marcando agora, eles deixam de aparecer em "Só não exportados".`
          }
          action={pending.kind === "delete" ? "Excluir" : "Marcar como exportados"}
          danger={pending.kind === "delete"}
          busy={busy}
          onConfirm={() => void confirmPending()}
          onCancel={() => setPending(null)}
        />
      )}
    </Shell>
  );
}
