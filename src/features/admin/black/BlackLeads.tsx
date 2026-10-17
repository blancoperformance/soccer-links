import { NewTag, When } from "../when";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { setInternalDevice } from "@/lib/tracking";
import { WorkspaceSwitch } from "../WorkspaceChooser";
import { canOpenBlack, forgetBlackAccess, setWorkspace, type Workspace } from "../workspace";
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

/*
 * Visual from painel-leads.html: #0E0E0E, ink #F3F1ED, mute #8E8E8E, hairlines instead of boxes,
 * square corners, white primary button that turns orange on hover, orange only in details.
 */
const LINE = "border-neutral-200";
const LINE2 = "border-neutral-300";
const MUTE = "text-neutral-500";
const btn = `inline-flex min-h-9 items-center gap-2 whitespace-nowrap border ${LINE2} bg-white px-3 text-[13px] text-neutral-800 transition-colors hover:border-neutral-950 disabled:cursor-wait disabled:opacity-50`;
const btnPri =
  "inline-flex min-h-9 items-center gap-2 whitespace-nowrap border border-neutral-950 bg-neutral-950 px-3 text-[13px] font-medium text-white transition-colors hover:opacity-90 disabled:cursor-wait disabled:opacity-50";
const btnGhost = `inline-flex min-h-10 items-center px-4 py-2 text-sm ${MUTE} hover:text-neutral-950`;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className={`w-full max-w-md border ${LINE2} bg-white p-6`}>
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-base font-medium">{title}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Fechar"
            className={`${MUTE} hover:text-neutral-950`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className={`mt-3 text-sm leading-relaxed ${MUTE}`}>{text}</p>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className={btnGhost}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={danger ? `${btn} hover:border-[#D8432A] hover:text-[#D8432A]` : btnPri}
          >
            {busy ? "Aguarde..." : action}
          </button>
        </div>
      </div>
    </div>
  );
}

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
  if (before === 0)
    return now > 0 ? <span className="text-[11px] text-neutral-500">novo {label}</span> : null;
  const d = Math.round(((now - before) / before) * 100);
  return (
    <span
      className={`text-[11px] ${d > 0 ? "text-emerald-700" : d < 0 ? "text-red-700" : "text-neutral-500"}`}
    >
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
      const ok = await canOpenBlack(s.user.id);
      if (!alive) return;
      if (!ok) {
        setWorkspace("links");
        void navigate({ to: "/admin", replace: true });
        return;
      }
      setInternalDevice(true);
      setSession(s);
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
    if (!session) return;
    void load();
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [session, load]);

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
    if (!session) return;
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
  }, [session, load]);

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

  if (!session) return <div className="min-h-screen bg-[#f5f4f1]" />;

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
      value: `${fmt(stats.withEmail)}${stats.inRange ? ` · ${Math.round((stats.withEmail / stats.inRange) * 100)}%` : ""}`,
      delta: <span className="text-[11px] text-neutral-500">{fmt(total)} inscritos no total</span>,
    },
  ];

  const logo = (w: string) => (
    <span
      aria-label="Soccer Games"
      className={`block whitespace-nowrap font-bold uppercase leading-none tracking-[0.06em] text-neutral-950 ${w}`}
      style={{ fontFamily: "Montserrat, sans-serif" }}
    >
      <span className="inline-flex items-center gap-[0.4em]">
        <img src="/logo-soccer-escura.png" alt="" className="h-[1.6em] w-[1.6em]" />
        <span>
          Soccer<span style={{ color: "#8a00c2" }}> Games</span>
        </span>
      </span>
    </span>
  );
  const NAV = [
    { id: "ao-vivo", label: "Ao vivo" },
    { id: "numeros", label: "Números" },
    { id: "cadastros", label: "Cadastros e exportação" },
  ];
  const card = "border border-neutral-200 bg-white";

  return (
    <div className="min-h-screen bg-[#f5f4f1] font-sans text-sm leading-normal text-neutral-950">
      {/* Sidebar (desktop), same shell as the Links panel */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col bg-neutral-950 px-3 py-6 lg:flex">
        <div className="flex items-center gap-3 px-3">
          {logo("text-[14px]")}
          <span className="border-l border-white/15 pl-3 text-xs leading-tight text-white/60">
            Painel
            <br />
            <span className="text-sm font-medium text-white">Black November</span>
          </span>
        </div>
        <div className="mt-6 px-3">
          <WorkspaceSwitch current="black" onSwitch={switchTo} />
        </div>
        <nav aria-label="Seções" className="mt-6 flex-1 space-y-0.5">
          {NAV.map((x) => (
            <a
              key={x.id}
              href={`#${x.id}`}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            >
              <span className="h-1.5 w-1.5 bg-[#8a00c2]" />
              {x.label}
            </a>
          ))}
        </nav>
        <div className="border-t border-white/10 px-3 pt-4">
          <p className="truncate text-xs text-white/50">{session.user.email}</p>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 text-xs text-white/60 hover:text-white"
          >
            Sair
          </button>
        </div>
      </aside>

      <div className="lg:pl-60">
        {/* Top bar (mobile) */}
        <div className="flex items-center justify-between gap-3 bg-neutral-950 px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            {logo("text-[14px]")}
            <WorkspaceSwitch current="black" onSwitch={switchTo} />
          </div>
          <button type="button" onClick={signOut} className="text-xs text-white/70">
            Sair
          </button>
        </div>

        <header className="sticky top-0 z-20 border-b border-neutral-200 bg-[#f5f4f1]/95 backdrop-blur">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-8">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">Grupo VIP · Black November</h1>
              <p className={`mt-0.5 text-xs ${MUTE}`}>{status} · atualiza sozinho</p>
            </div>
            <button type="button" className={btn} onClick={() => void load()} disabled={loading}>
              Atualizar
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-[1240px] space-y-6 px-4 pb-24 pt-6 sm:px-8">
          {notice && (
            <p className={`flex items-center justify-between gap-4 ${card} px-4 py-3 text-sm`}>
              {notice}
              <button
                type="button"
                onClick={() => setNotice(null)}
                aria-label="Fechar"
                className={MUTE}
              >
                <X className="h-4 w-4" />
              </button>
            </p>
          )}

          {/* Period */}
          <div className={`flex flex-wrap items-center gap-2 ${card} px-5 py-4`}>
            {([1, 7, 30] as const).map((d) => {
              const on = period.kind === "preset" && period.days === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPeriod({ kind: "preset", days: d })}
                  className={`min-h-9 border px-3 text-[13px] ${on ? "border-neutral-950 bg-neutral-950 font-medium text-white" : `${LINE2} ${MUTE} hover:text-neutral-950`}`}
                >
                  {d === 1 ? "Hoje" : `${d} dias`}
                </button>
              );
            })}
            <span className={`ml-2 text-[13px] ${MUTE}`}>De</span>
            <input
              type="date"
              value={range.from}
              max={range.to}
              onChange={(e) =>
                e.target.value && setPeriod({ kind: "custom", from: e.target.value, to: range.to })
              }
              className={`min-h-9 border bg-white px-2 text-[13px] ${period.kind === "custom" ? "border-[#8a00c2]" : LINE2}`}
            />
            <span className={`text-[13px] ${MUTE}`}>até</span>
            <input
              type="date"
              value={range.to}
              min={range.from}
              max={today}
              onChange={(e) =>
                e.target.value &&
                setPeriod({ kind: "custom", from: range.from, to: e.target.value })
              }
              className={`min-h-9 border bg-white px-2 text-[13px] ${period.kind === "custom" ? "border-[#8a00c2]" : LINE2}`}
            />
          </div>

          {/* Live */}
          <div id="ao-vivo" className={`scroll-mt-24 ${card} p-5`}>
            <h2 className={`mb-3 flex items-center gap-2 text-[13px] font-medium ${MUTE}`}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8a00c2] opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-[#8a00c2]" />
              </span>
              Ao vivo · últimos cadastros · atualiza a cada 15 segundos
            </h2>
            {recent.length === 0 ? (
              <p className={`text-xs ${MUTE}`}>Nenhum cadastro ainda.</p>
            ) : (
              <ul className="grid gap-x-8 md:grid-cols-2">
                {recent.slice(0, 10).map((l, i) => {
                  const fresh = clock - new Date(l.created_at).getTime() < 10 * 60000;
                  return (
                    <li
                      key={String(l.id)}
                      className={`flex items-baseline justify-between gap-3 border-b py-2 ${LINE}`}
                    >
                      <span className="min-w-0 truncate">
                        {fresh && i < 3 && (
                          <span className="mr-2 text-[11px] text-[#8a00c2]">novo</span>
                        )}
                        {l.nome}
                        <span className={`ml-2 text-xs ${MUTE}`}>
                          {sourceOf(l)}
                          {(l.submissions ?? 1) > 1 ? ` · ${l.submissions}x` : ""}
                          {l.email ? " · com e-mail" : ""}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 text-xs tabular-nums ${fresh ? "text-neutral-950" : MUTE}`}
                      >
                        {ago(l.created_at, clock)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* KPIs */}
          <div id="numeros" className={`grid scroll-mt-24 grid-cols-2 ${card} px-5 md:grid-cols-4`}>
            {kpis.map((k, i) => (
              <div
                key={k.label}
                className={`py-[22px] pr-5 ${i > 0 ? `md:border-l md:pl-5 ${LINE}` : ""} ${i % 2 === 1 ? `border-l pl-5 ${LINE}` : ""} ${i >= 2 ? `border-t md:border-t-0 ${LINE}` : ""}`}
              >
                <span className={`block text-xs ${MUTE}`}>{k.label}</span>
                <b className="mt-1.5 block whitespace-nowrap text-[28px] font-semibold leading-[1.1] tracking-tight md:text-[32px]">
                  {k.value}
                </b>
                <span className="mt-1.5 block min-h-4">{k.delta}</span>
              </div>
            ))}
          </div>

          {/* Chart + sources */}
          <div className={`grid ${card} px-5 md:grid-cols-[2fr_1fr]`}>
            <div className="py-[22px] md:pr-6">
              <h2 className={`mb-4 text-[13px] font-medium ${MUTE}`}>
                Inscrições por dia · {periodLabel}
              </h2>
              <div className="flex h-[120px] items-end gap-1">
                {stats.days.map((d) => {
                  const [, m, dd] = d.day.split("-");
                  const isTodayBar = d.day === today;
                  return (
                    <div
                      key={d.day}
                      className={`group relative min-w-[6px] flex-1 ${isTodayBar ? "bg-[#8a00c2]" : "bg-neutral-900 hover:bg-neutral-600"}`}
                      style={{ height: `${Math.max(2, (d.n / maxDay) * 100)}%` }}
                    >
                      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap bg-neutral-900 px-1.5 py-0.5 text-[11px] text-white group-hover:block">
                        {dd}/{m}: {d.n}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className={`mt-2 flex justify-between text-[11px] ${MUTE}`}>
                <span>{first ? `${first.slice(8, 10)}/${first.slice(5, 7)}` : ""}</span>
                <span>
                  {range.to === today ? "Hoje" : `${range.to.slice(8, 10)}/${range.to.slice(5, 7)}`}
                </span>
              </div>
            </div>
            <div className={`py-[22px] md:border-l md:pl-6 ${LINE} border-t md:border-t-0`}>
              <h2 className={`mb-4 text-[13px] font-medium ${MUTE}`}>Origem</h2>
              <ul>
                {stats.sources.length === 0 ? (
                  <li className={`flex justify-between border-b py-2 ${LINE}`}>
                    <span>Sem dados</span>
                    <b className="font-medium">0</b>
                  </li>
                ) : (
                  stats.sources.map(([s, n]) => (
                    <li key={s} className={`flex justify-between border-b py-2 ${LINE}`}>
                      <span>{s}</span>
                      <b className="font-medium tabular-nums">{fmt(n)}</b>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>

          <section id="cadastros" className={`scroll-mt-24 ${card} px-5 pb-5`}>
            {/* Tools */}
            <div className="flex flex-wrap items-center gap-2.5 py-5">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nome, WhatsApp ou e-mail"
                autoComplete="off"
                className={`min-h-10 min-w-[220px] flex-1 border-0 border-b ${LINE2} bg-transparent py-2 outline-none placeholder:text-neutral-500 focus:border-[#8a00c2]`}
              />
              <label className={`flex items-center gap-2 text-[13px] ${MUTE}`}>
                <input
                  type="checkbox"
                  checked={onlyNew}
                  onChange={(e) => setOnlyNew(e.target.checked)}
                  className="accent-[#8a00c2]"
                />
                Só não exportados
              </label>
              <button type="button" className={btn} onClick={() => exportTo("huggy")}>
                Exportar para a Huggy
              </button>
              <button type="button" className={btn} onClick={() => exportTo("email")}>
                Exportar e-mails
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className={`border-b ${LINE2} text-xs ${MUTE}`}>
                    <th className="whitespace-nowrap py-2.5 pr-3 font-medium">Data</th>
                    <th className="py-2.5 pr-3 font-medium">Nome</th>
                    <th className="py-2.5 pr-3 font-medium">WhatsApp</th>
                    <th className="hidden py-2.5 pr-3 font-medium md:table-cell">E-mail</th>
                    <th className="hidden py-2.5 pr-3 font-medium md:table-cell">Origem</th>
                    <th className="hidden py-2.5 pr-3 font-medium md:table-cell">Exportado</th>
                    <th className="py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows === null ? (
                    <tr>
                      <td colSpan={7} className={`py-3 text-xs ${MUTE}`}>
                        Carregando…
                      </td>
                    </tr>
                  ) : visible.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`py-3 text-xs ${MUTE}`}>
                        Nenhum lead encontrado.
                      </td>
                    </tr>
                  ) : (
                    visible.slice(0, MAX_ROWS).map((l) => {
                      const wa = phoneE164(l.whatsapp);
                      return (
                        <tr key={String(l.id)} className={`border-b align-top ${LINE}`}>
                          <td
                            className={`whitespace-nowrap py-3 pr-3 text-xs tabular-nums ${MUTE}`}
                          >
                            <When iso={l.created_at} time now={clock} />
                          </td>
                          <td className="py-3 pr-3">
                            {l.nome}
                            <NewTag iso={l.created_at} now={clock} />
                            {(l.submissions ?? 1) > 1 && (
                              <span
                                className={`ml-1.5 inline-block border px-1.5 text-[11px] ${LINE2} ${MUTE}`}
                                title="Enviou o formulário mais de uma vez"
                              >
                                {l.submissions}x
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap py-3 pr-3 tabular-nums">
                            {wa ? (
                              <a
                                href={`https://wa.me/${wa}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`border-b no-underline ${LINE2} hover:border-[#8a00c2]`}
                              >
                                {phoneLabel(l.whatsapp)}
                              </a>
                            ) : (
                              l.whatsapp
                            )}
                          </td>
                          <td className="hidden py-3 pr-3 md:table-cell">{l.email ?? ""}</td>
                          <td
                            className={`hidden whitespace-nowrap py-3 pr-3 text-xs md:table-cell ${MUTE}`}
                          >
                            {sourceOf(l)}
                          </td>
                          <td className="hidden py-3 pr-3 md:table-cell">
                            <span
                              className={`mr-1 inline-block border px-1.5 text-[11px] ${l.exported_huggy_at ? "border-[#8a00c2] bg-[#f5e8ff] text-[#6a0096]" : `${LINE2} ${MUTE}`}`}
                              title={
                                l.exported_huggy_at
                                  ? `Exportado em ${dateTime(l.exported_huggy_at)}`
                                  : "Ainda não exportado"
                              }
                            >
                              Huggy
                            </span>
                            {l.email && (
                              <span
                                className={`inline-block border px-1.5 text-[11px] ${l.exported_email_at ? "border-[#8a00c2] bg-[#f5e8ff] text-[#6a0096]" : `${LINE2} ${MUTE}`}`}
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
                          <td className="py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setPending({ kind: "delete", lead: l })}
                              className={`text-xs underline ${MUTE} hover:text-[#D8432A]`}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {rows !== null && (
              <p className={`mt-4 text-xs ${MUTE}`}>
                {visible.length > MAX_ROWS
                  ? `Mostrando 500 de ${fmt(visible.length)}. Use a busca ou a exportação para ver todos.`
                  : `${fmt(visible.length)} lead(s)`}
              </p>
            )}
          </section>
        </main>
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
              ? `${pending.lead.nome ?? "Este lead"} (${phoneLabel(pending.lead.whatsapp)}) será apagado de vez. Use só para pedido de exclusão (LGPD).`
              : `O arquivo com ${fmt(pending.ids.length)} ${pending.ids.length === 1 ? "lead" : "leads"} foi baixado. Marcando agora, eles deixam de aparecer em "Só não exportados".`
          }
          action={pending.kind === "delete" ? "Excluir" : "Marcar como exportados"}
          danger={pending.kind === "delete"}
          busy={busy}
          onConfirm={() => void confirmPending()}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
  );
}
