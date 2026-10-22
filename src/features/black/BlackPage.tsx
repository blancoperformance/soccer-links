import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarPlus,
  Gamepad2,
  LifeBuoy,
  Mail,
  MessageCircle,
  Radio,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { callRpc, readRpc } from "@/lib/backend";
import { loadClarity, loadGtm, loadPixel, track } from "@/lib/tracking";
import { withUtm } from "@/lib/utm";
import { black, phaseAt, type Phase } from "./config";
import { blackFaq } from "./faq";

const WA = "5518996366686";
const STORE = "https://lojasoccergames.com.br";
const pad = (n: number) => String(n).padStart(2, "0");

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

function useNow(ms = 1000) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const PHASE_LABEL: Record<Phase, { pre: string; when: string }> = {
  antes: {
    pre: "A Pré-Black do GTA VI começa em",
    when: "20 de novembro, 00h · Black Friday em 27 de novembro",
  },
  pre: {
    pre: "Pré-Black acontecendo agora. A Black Friday começa em",
    when: "Live na sexta, 20 de novembro · Black Friday em 27 de novembro",
  },
  entre: { pre: "A Black Friday começa em", when: "27 de novembro, 00h" },
  black: { pre: "Black Friday acontecendo agora. Termina em", when: "Hoje, até 23h59" },
  fim: { pre: "A Black November terminou", when: "As ofertas da semana continuam no grupo" },
};

function Countdown({ now }: { now: number | null }) {
  const { phase, target } = phaseAt(now ?? Date.parse("2026-10-16T12:00:00-03:00"));
  const left = target && now ? Math.max(0, target - now) : 0;
  const d = Math.floor(left / 864e5);
  const parts: [string, string][] = [
    [pad(Math.floor((left / 36e5) % 24)), "h"],
    [pad(Math.floor((left / 6e4) % 60)), "min"],
    [pad(Math.floor((left / 1e3) % 60)), "s"],
  ];
  return (
    <div role="timer" aria-label="Contagem regressiva" className="border-t border-white/15 pt-5">
      <p className="text-[12px] text-white/75">{PHASE_LABEL[phase].pre}</p>
      {target && (
        <div className="mt-2 flex items-end gap-6">
          <p className="flex items-end gap-2">
            <span className="font-display text-[60px] sm:text-[68px] font-semibold leading-[.8] tabular-nums tracking-tight text-white">
              {now ? d : "··"}
            </span>
            <span className="pb-1 text-lg font-medium text-white">{d === 1 ? "dia" : "dias"}</span>
          </p>
          <p className="flex gap-4 border-l border-white/15 pb-1 pl-5">
            {parts.map(([v, l]) => (
              <span key={l} className="flex flex-col">
                <span className="font-display text-[22px] font-semibold leading-none tabular-nums text-white">
                  {now ? v : "··"}
                </span>
                <span className="mt-1 text-[11px] text-white/60">{l}</span>
              </span>
            ))}
          </p>
        </div>
      )}
      <p className="mt-4 text-[12px] text-white/60">{PHASE_LABEL[phase].when}</p>
    </div>
  );
}

const phoneDigits = (v: string) => {
  let d = v.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.slice(0, 11);
};
const formatPhone = (v: string) => {
  const d = phoneDigits(v);
  return d.length > 6
    ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
    : d.length > 2
      ? `(${d.slice(0, 2)}) ${d.slice(2)}`
      : d;
};
const validGroup = (u: string) => {
  try {
    const l = new URL(u);
    return l.protocol === "https:" &&
      l.hostname === "chat.whatsapp.com" &&
      /^\/[A-Za-z0-9_-]{10,}\/?$/.test(l.pathname)
      ? l.href
      : "";
  } catch {
    return "";
  }
};

function SignupForm({ id, compact = false }: { id: string; compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "err" | "ok"; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [phone, setPhone] = useState("");
  const started = useRef(0);
  const field = (bad?: boolean) =>
    `block w-full border-0 border-b bg-transparent px-0 pb-2 pt-1 text-[16px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-white ${bad ? "border-[#ff8fa3]" : "border-white/30"}`;
  return (
    <form
      noValidate
      aria-label="Entrar no Grupo VIP"
      onFocus={() => {
        if (!started.current) started.current = Date.now();
      }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.currentTarget);
        const nome = String(f.get("nome") ?? "").trim();
        const email = String(f.get("email") ?? "").trim();
        const ok = f.get("ok") === "on";
        const next = {
          nome: nome.length < 2,
          whats: !/^[1-9]{2}9?\d{8}$/.test(phoneDigits(phone)),
          email: Boolean(email) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email),
          ok: !ok,
        };
        setErrs(next);
        const first = (Object.keys(next) as (keyof typeof next)[]).find((k) => next[k]);
        if (first) {
          setMsg({
            tone: "err",
            text: {
              nome: "Digite seu nome.",
              whats: "Confira o WhatsApp com DDD.",
              email: "Confira o e-mail ou deixe em branco.",
              ok: "Marque o aceite para continuar.",
            }[first],
          });
          return;
        }
        setBusy(true);
        setMsg(null);
        const utm: Record<string, string> = {};
        new URLSearchParams(window.location.search).forEach((v, k) => {
          if (/^utm_/.test(k)) utm[k] = v;
        });
        const eid = `bn${black.year}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
        let res: { ok?: boolean; error?: string } | null = null;
        try {
          res = await callRpc<{ ok?: boolean; error?: string }>("black_vip_signup", {
            p_nome: nome,
            p_whatsapp: `55${phoneDigits(phone)}`,
            p_email: email || null,
            p_consent: true,
            p_consent_text: black.consentText,
            p_utm: Object.keys(utm).length ? utm : null,
            p_page: window.location.href.split("#")[0],
            p_event_id: eid,
            p_started: started.current,
            p_empresa: String(f.get("empresa") ?? ""),
          });
        } catch {
          res = null; // falha de rede: a pessoa entra no grupo do mesmo jeito
        }
        if (res && res.ok === false && res.error && res.error !== "rate") {
          setBusy(false);
          setErrs({
            [res.error === "whatsapp" ? "whats" : res.error === "consent" ? "ok" : res.error]: true,
          });
          setMsg({
            tone: "err",
            text:
              res.error === "whatsapp"
                ? "Confira o WhatsApp com DDD."
                : "Confira os dados e tente de novo.",
          });
          return;
        }
        try {
          track("black_lead", { form: id });
          (window.dataLayer = window.dataLayer || []).push({
            event: "black_vip_lead",
            event_id: eid,
            form_id: `black_vip_${black.year}`,
          });
          window.fbq?.(
            "track",
            "Lead",
            { content_name: `Grupo VIP Black ${black.year}` },
            { eventID: eid },
          );
          window.gtag?.("event", "generate_lead", { form_id: `black_vip_${black.year}` });
        } catch {
          /* ignore */
        }
        const group = validGroup(black.groupUrl);
        if (group) {
          setMsg({ tone: "ok", text: "Pronto! Abrindo o grupo no WhatsApp…" });
          window.setTimeout(() => window.location.assign(group), 350);
        } else {
          setBusy(false);
          setMsg({
            tone: "ok",
            text: "Cadastro feito! O link do grupo vai abrir aqui assim que for liberado. Fique de olho no nosso Instagram.",
          });
        }
      }}
      className={compact ? "" : "mt-6"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-[12px] text-white/70">Nome</span>
          <input
            name="nome"
            autoComplete="given-name"
            placeholder="Seu nome"
            maxLength={80}
            aria-invalid={errs["nome"] ? true : undefined}
            className={field(errs["nome"])}
          />
        </label>
        <label className="block">
          <span className="block text-[12px] text-white/70">WhatsApp com DDD</span>
          <input
            name="whats"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            aria-invalid={errs["whats"] ? true : undefined}
            className={field(errs["whats"])}
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="block text-[12px] text-white/70">
          E-mail <span className="text-white/45">opcional</span>
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          maxLength={254}
          aria-invalid={errs["email"] ? true : undefined}
          className={field(errs["email"])}
        />
      </label>
      <input
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label
        className={`mt-5 flex cursor-pointer items-start gap-3 text-[12px] leading-relaxed ${errs["ok"] ? "text-[#ff8fa3]" : "text-white/75"}`}
      >
        <input
          name="ok"
          type="checkbox"
          className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#c000ff]"
        />
        <span>
          {black.consentText} Você sai quando quiser.{" "}
          <a
            href={black.privacyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            Privacidade
          </a>
        </span>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="group mt-6 flex min-h-[54px] w-full items-center justify-between gap-4 bg-[#c000ff] px-5 text-[15px] font-semibold text-white shadow-[0_10px_40px_-10px_rgba(192,0,255,.8)] transition-[background,transform] hover:bg-[#a800e0] active:scale-[.99] disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Entrando…" : "Entrar no Grupo VIP"}
        <ArrowUpRight
          className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
      <p className="mt-3 text-[11px] text-white/55">
        Grátis. Só os administradores mandam mensagem no grupo.
      </p>
      {msg && (
        <p
          role="status"
          aria-live="polite"
          className={`mt-3 text-[13px] leading-relaxed ${msg.tone === "err" ? "text-[#ff8fa3]" : "text-[#e7b8ff]"}`}
        >
          {msg.text}
        </p>
      )}
    </form>
  );
}

function Faq() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="grid gap-10 md:grid-cols-[1fr_2.2fr]">
      {blackFaq.map((g) => (
        <div key={g.group} className="contents">
          <p className="text-[13px] font-medium text-white/70 md:pt-5">{g.group}</p>
          <ul className="border-t border-white/12">
            {g.items.map((it) => {
              const on = open === it.q;
              return (
                <li key={it.q} className="border-b border-white/12">
                  <button
                    type="button"
                    aria-expanded={on}
                    onClick={() => {
                      setOpen(on ? null : it.q);
                      if (!on) track("links_clique", { item_name: `Black FAQ: ${it.q}` });
                    }}
                    className="flex w-full items-center justify-between gap-6 py-5 text-left text-[15px] text-white"
                  >
                    <span className={on ? "font-medium" : ""}>{it.q}</span>
                    <span
                      aria-hidden
                      className={`relative h-3.5 w-3.5 shrink-0 transition-transform duration-300 ${on ? "rotate-45" : ""}`}
                    >
                      <span
                        className={`absolute left-0 top-1/2 h-px w-3.5 -translate-y-1/2 ${on ? "bg-[#c64bff]" : "bg-white/70"}`}
                      />
                      <span
                        className={`absolute left-1/2 top-0 h-3.5 w-px -translate-x-1/2 ${on ? "bg-[#c64bff]" : "bg-white/70"}`}
                      />
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ${on ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="overflow-hidden">
                      <p className="max-w-[680px] pb-5 pr-6 text-[14px] leading-[1.75] text-white/65">
                        {it.a}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function icsDownload() {
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soccer Games//Black November//PT",
    "BEGIN:VEVENT",
    `UID:pre-black-${black.year}@lojasoccergames.com.br`,
    "DTSTART:20261120T030000Z",
    "DTEND:20261120T040000Z",
    "SUMMARY:Pré-Black Soccer Games (GTA VI)",
    "DESCRIPTION:Pré-Black da Soccer Games no fim de semana do GTA VI. Live na sexta. Black Friday em 27/11.",
    "URL:https://links.lojasoccergames.com.br/black",
    "END:VEVENT",
    "BEGIN:VEVENT",
    `UID:black-friday-${black.year}@lojasoccergames.com.br`,
    "DTSTART:20261127T030000Z",
    "DTEND:20261127T040000Z",
    "SUMMARY:Black Friday Soccer Games",
    "URL:https://links.lojasoccergames.com.br/black",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "black-november-soccer-games.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  track("links_clique", { item_name: "Black: salvar na agenda" });
}

export function BlackPage() {
  const now = useNow();
  const [total, setTotal] = useState<number | null>(null);
  const [bar, setBar] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const phase = useMemo(() => (now ? phaseAt(now).phase : "antes"), [now]);

  useEffect(() => {
    loadGtm();
    loadPixel();
    loadClarity();
    track("page_view");
    void readRpc<number>("black_vip_total").then((n) => {
      if (typeof n === "number" && n >= black.socialMin) setTotal(n);
    });
    const el = formRef.current;
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((en) => setBar(!en[0]!.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const toForm = () => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    track("links_clique", { item_name: "Black: ir para o cadastro" });
  };
  const daysLeft = now
    ? Math.max(0, Math.floor(((phaseAt(now).target ?? now) - now) / 864e5))
    : null;

  const what = [
    {
      n: "01",
      icon: Zap,
      t: "Ofertas da semana até lá",
      d: "Até a Black, toda semana tem oferta temática com preço baixo direto no site, sem cupom. O aviso sai primeiro no grupo.",
    },
    {
      n: "02",
      icon: Radio,
      t: "Pré-Black do GTA VI",
      d: `De 20 a 22 de novembro, no fim de semana do lançamento, os preços da loja descem. Live na ${black.liveDay}.`,
    },
    {
      n: "03",
      icon: Gamepad2,
      t: "Black Friday, dia 27",
      d: "O grande dia da Black November, no mesmo grupo. Quem está dentro recebe cada oferta antes.",
    },
  ];

  return (
    <div
      className="min-h-screen overflow-x-hidden bg-[#060608] font-sans text-white"
      data-theme="escuro"
    >
      {/* fundo: grade e brilho roxo */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.035)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(80%_60%_at_50%_20%,#000,transparent)]" />
        <div className="absolute -top-40 left-1/2 h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(192,0,255,.38),transparent)] blur-2xl" />
        <div className="absolute bottom-[-30%] right-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(closest-side,rgba(192,0,255,.16),transparent)] blur-2xl" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-5">
        <a
          href="/"
          aria-label="Soccer Games"
          className="flex items-center"
          onClick={() => track("links_clique", { item_name: "Black: logo" })}
        >
          <img src="/logo-soccer.png" alt="Soccer Games" width={40} height={40} className="h-10 w-10" />
        </a>
        <span className="flex items-center gap-2 text-[12px] text-white/70">
          <span className="sg-live-dot h-1.5 w-1.5 rounded-full bg-[#c64bff]" aria-hidden />
          Black November {black.year}
        </span>
      </header>

      {/* HERO: no celular, título, cadastro e depois a contagem; no computador, cadastro à direita */}
      <section className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-10 px-6 pb-16 pt-4 lg:grid-cols-[1fr_480px] lg:gap-x-16 lg:gap-y-10 lg:pb-24 lg:pt-14">
        <div className="lg:col-start-1 lg:row-start-1">
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#c64bff]">
            Acesso antecipado
          </p>
          <h1 className="font-display mt-4 text-[clamp(46px,9.5vw,100px)] font-semibold leading-[.95] tracking-[-0.05em]">
            A Black
            <br />
            <span className="bg-gradient-to-r from-white via-[#e9b6ff] to-[#c64bff] bg-clip-text text-transparent">
              November
            </span>
            <br />
            {phase === "antes" ? "vem aí." : phase === "fim" ? "foi assim." : "chegou."}
          </h1>
          <p className="mt-5 max-w-[460px] text-[16px] leading-relaxed text-white/75 sm:text-[17px]">
            Pré-Black no fim de semana do GTA VI e Black Friday no dia 27. As ofertas chegam
            primeiro no Grupo VIP.
          </p>
        </div>

        <div
          ref={formRef}
          id="cadastro"
          className="relative scroll-mt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center"
        >
          <div className="relative border border-white/15 bg-white/[.04] p-6 backdrop-blur-xl sm:p-8">
            <span aria-hidden className="absolute left-0 top-8 h-7 w-[2px] bg-[#c000ff]" />
            <p className="text-[12px] text-white/70">Grupo VIP no WhatsApp</p>
            <h2 className="font-display mt-2 text-[26px] font-semibold leading-tight sm:text-[28px]">
              Entre antes de todo mundo.
            </h2>
            <p className="mt-3 text-[14px] leading-relaxed text-white/70">
              Avisos de oferta, horário da live e lembretes da Black. Só os administradores mandam
              mensagem.
            </p>
            {total !== null && (
              <p className="mt-4 text-[13px] text-white/80">
                <b className="font-display text-[18px] text-white">
                  {total.toLocaleString("pt-BR")}
                </b>{" "}
                pessoas já estão no grupo.
              </p>
            )}
            <SignupForm id="topo" />
          </div>
        </div>

        <div className="max-w-[520px] lg:col-start-1 lg:row-start-2">
          <Countdown now={now} />
          <button
            type="button"
            onClick={icsDownload}
            className="mt-5 inline-flex items-center gap-2 text-[13px] text-white/70 underline underline-offset-4 hover:text-white"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden /> Salvar as datas na agenda
          </button>
        </div>
      </section>

      {/* faixa */}
      <div className="relative z-10 overflow-hidden border-y border-white/10 py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="flex w-max animate-[sg-marquee_36s_linear_infinite] gap-10 whitespace-nowrap motion-reduce:animate-none">
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-10" aria-hidden={k === 1}>
              {[
                "Pré-Black do GTA VI",
                "Live na sexta, 20/11",
                "Black Friday 27/11",
                "Entrega por e-mail",
                "Garantia vitalícia",
                "PS4 e PS5",
              ].map((t) => (
                <span
                  key={t}
                  className="font-display flex items-center gap-10 text-[20px] font-medium text-white/85"
                >
                  {t} <span className="text-[#c64bff]">✦</span>
                </span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* O QUE VAI TER */}
      <section
        className="relative z-10 mx-auto w-full max-w-[1200px] px-6 py-20 lg:py-28"
        aria-labelledby="bn-what"
      >
        <p className="text-[12px] text-white/55">O que vai ter na Black November</p>
        <h2
          id="bn-what"
          className="font-display mt-3 max-w-[720px] text-[clamp(32px,5vw,58px)] font-semibold leading-[1.02]"
        >
          Um mês inteiro de oferta. <span className="text-white/40">Primeiro no grupo.</span>
        </h2>
        <div className="mt-12 grid border-y border-white/10 md:grid-cols-3">
          {what.map((w, i) => (
            <article
              key={w.n}
              className={`group relative overflow-hidden px-1 py-8 md:px-8 ${i ? "border-t border-white/10 md:border-l md:border-t-0" : ""}`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [background:radial-gradient(420px_circle_at_50%_120%,rgba(192,0,255,.22),transparent_65%)] group-hover:opacity-100"
              />
              <div className="relative flex items-start justify-between">
                <w.icon className="h-6 w-6 text-[#c64bff]" strokeWidth={1.4} aria-hidden />
                <span className="font-display text-[56px] font-semibold leading-none text-white/[.07]">
                  {w.n}
                </span>
              </div>
              <h3 className="font-display relative mt-6 text-[22px] font-semibold">{w.t}</h3>
              <p className="relative mt-3 max-w-[320px] text-[14px] leading-relaxed text-white/65">
                {w.d}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 md:flex-row md:items-center md:justify-between">
        <p className="font-display max-w-[700px] text-[clamp(24px,3.2vw,36px)] font-semibold leading-tight">
          {daysLeft !== null && phase !== "fim" ? (
            <>
              Faltam{" "}
              <span className="border-b-2 border-[#c000ff]">
                {daysLeft === 1 ? "1 dia" : `${daysLeft} dias`}
              </span>
              . Quem está no grupo fica sabendo antes.
            </>
          ) : (
            "Quem está no grupo fica sabendo antes."
          )}
        </p>
        <button
          type="button"
          onClick={toForm}
          className="flex min-h-[54px] shrink-0 items-center justify-between gap-6 bg-white px-6 text-[15px] font-semibold text-[#060608] transition-colors hover:bg-[#c000ff] hover:text-white md:min-w-[280px]"
        >
          Entrar no Grupo VIP <ArrowUpRight className="h-5 w-5" aria-hidden />
        </button>
      </section>

      {/* GARANTIAS */}
      <section
        className="relative z-10 mx-auto w-full max-w-[1200px] px-6 py-20"
        aria-label="Por que comprar na Soccer Games"
      >
        <div className="grid border-y border-white/10 sm:grid-cols-3">
          {[
            {
              I: Mail,
              t: "Chega no seu e-mail",
              d: "Pix em geral em menos de 30 minutos, no horário de atendimento.",
            },
            {
              I: ShieldCheck,
              t: "Garantia vitalícia",
              d: "Em todas as contas, seguindo as regras de utilização.",
            },
            {
              I: Gamepad2,
              t: "PS4 e PS5",
              d: "Licença primária, que joga offline, ou secundária, mais barata.",
            },
          ].map(({ I, t, d }, i) => (
            <div
              key={t}
              className={`py-7 sm:px-7 ${i ? "border-t border-white/10 sm:border-l sm:border-t-0" : ""}`}
            >
              <I className="h-5 w-5 text-[#c64bff]" strokeWidth={1.4} aria-hidden />
              <p className="mt-4 text-[16px] font-semibold">{t}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/60">{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DÚVIDAS */}
      <section
        className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-20"
        aria-labelledby="bn-faq"
      >
        <p className="text-[12px] text-white/55">Antes de entrar</p>
        <h2 id="bn-faq" className="font-display mt-3 text-[clamp(30px,4.4vw,48px)] font-semibold">
          Dúvidas frequentes.
        </h2>
        <div className="mt-10">
          <Faq />
        </div>
      </section>

      {/* CADASTRO FINAL */}
      <section className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-20">
        <div className="grid gap-10 border border-white/15 bg-[linear-gradient(135deg,rgba(192,0,255,.18),rgba(255,255,255,.02)_55%)] p-6 sm:p-10 lg:grid-cols-[1fr_440px]">
          <div>
            <h2 className="font-display text-[clamp(30px,4vw,46px)] font-semibold leading-[1.02]">
              O link sai primeiro no grupo.
            </h2>
            <p className="mt-4 max-w-[420px] text-[15px] leading-relaxed text-white/70">
              Deixe seu nome e WhatsApp e entre agora. Leva menos de um minuto.
            </p>
          </div>
          <SignupForm id="final" compact />
        </div>
      </section>

      {/* ATENDIMENTO */}
      <section
        className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-28"
        aria-label="Atendimento"
      >
        <p className="text-[12px] text-white/55">
          Atendimento · segunda a sábado, das 9h às 21h · domingo, das 9h às 15h
        </p>
        <div className="mt-5 grid border-y border-white/10 sm:grid-cols-3">
          {[
            {
              I: LifeBuoy,
              t: "Central de Atendimento",
              d: "Entrega, ativação, licenças e garantia",
              u: withUtm(`${STORE}/central-de-atendimento/`, {
                content: "black-central",
                campaign: `black-${black.year}`,
              }),
            },
            { I: Gamepad2, t: "Ver os jogos", d: "Mais de 380 jogos de PS4 e PS5", u: "/" },
            {
              I: MessageCircle,
              t: "Falar no WhatsApp",
              d: "Dúvida antes de comprar",
              u: `https://wa.me/${WA}?text=${encodeURIComponent("Olá! Vim pela página da Black November.")}`,
            },
          ].map(({ I, t, d, u }, i) => (
            <a
              key={t}
              href={u}
              {...(u.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              onClick={() => track("links_clique", { item_name: `Black: ${t}`, item_url: u })}
              className={`group flex items-start justify-between gap-4 py-6 transition-colors hover:bg-white/[.03] sm:px-6 ${i ? "border-t border-white/10 sm:border-l sm:border-t-0" : ""}`}
            >
              <span>
                <I className="h-5 w-5 text-[#c64bff]" strokeWidth={1.4} aria-hidden />
                <span className="mt-3 block text-[15px] font-semibold">{t}</span>
                <span className="mt-1 block text-[12px] text-white/55">{d}</span>
              </span>
              <ArrowUpRight
                className="h-4 w-4 text-white/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
                aria-hidden
              />
            </a>
          ))}
        </div>
        <p className="mt-10 text-center text-[11px] text-white/40">
          Soccer Games · lojasoccergames.com.br
        </p>
      </section>

      {/* barra fixa no celular */}
      <div
        className={`fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-white/15 bg-[#0c0c10]/95 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur transition-transform duration-300 lg:hidden ${bar ? "translate-y-0" : "translate-y-full"}`}
      >
        <span className="flex-1 text-[11px] leading-tight text-white/60">
          <b className="font-display block text-[16px] text-white">
            {daysLeft !== null && phase !== "fim"
              ? daysLeft === 1
                ? "1 dia"
                : `${daysLeft} dias`
              : "Black November"}
          </b>
          {phase === "antes"
            ? "para a Pré-Black"
            : phase === "fim"
              ? "Ofertas no grupo"
              : "para a Black Friday"}
        </span>
        <button
          type="button"
          onClick={toForm}
          className="min-h-[46px] bg-[#c000ff] px-5 text-[14px] font-semibold text-white"
        >
          Entrar no grupo
        </button>
      </div>
    </div>
  );
}
