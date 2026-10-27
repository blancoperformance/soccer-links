import "./black.css";
import { useEffect, useMemo, useRef, useState, type MouseEvent as RMouseEvent } from "react";
import {
  ArrowUpRight,
  CalendarPlus,
  Check,
  Gamepad2,
  LifeBuoy,
  Lock,
  Mail,
  MessageCircle,
  Play,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { callRpc, readRpc } from "@/lib/backend";
import { loadClarity, loadGtm, loadPixel, track } from "@/lib/tracking";
import { withUtm } from "@/lib/utm";
import { getGame } from "@/features/public/games";
import { useLiveGame } from "@/features/public/GameCard";
import { sized } from "@/features/public/store";
import { black, phaseAt, type Phase } from "./config";
import { blackFaq } from "./faq";
import { icsText, nextMark, startReel } from "./landing";

const WA = "5518996366686";
const STORE = "https://lojasoccergames.com.br";
/** Começo da barra de carregamento (só para a barra andar até o próximo marco). */
const LOAD_FROM = Date.parse("2026-10-20T00:00:00-03:00");
const pad = (n: number) => String(n).padStart(2, "0");
const yt = (id: string) => `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;

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

/** Número em que cada dígito rola quando muda. */
function Num({ v }: { v: string }) {
  return (
    <span className="sb-num">
      {v.split("").map((ch, i) => (
        <span key={`${i}-${ch}`} className="sb-dg">
          <i>{ch}</i>
        </span>
      ))}
    </span>
  );
}

const LEVELS: { ph: Phase[]; n: string; date: string; t: string; d: string; img?: string }[] = [
  {
    ph: ["antes"],
    n: "Fase 01",
    date: "Até 18/11",
    t: "Ofertas da semana",
    d: "Toda semana tem oferta com preço baixo direto no site, sem cupom. O aviso sai primeiro no grupo.",
    img: yt("tJbzMqJGH4k"),
  },
  {
    ph: ["lancamento"],
    n: "Fase 02",
    date: "19/11",
    t: "O GTA 6 chega",
    d: "Dia do lançamento. O preço do GTA 6 na Soccer é avisado primeiro no Grupo VIP.",
    img: yt("VQRLujxTm3c"),
  },
  {
    ph: ["pre"],
    n: "Fase 03",
    date: "20 a 22/11",
    t: "Fim de semana do GTA",
    d: `Os preços da loja descem para a abertura da Black. Live na ${black.liveDay}.`,
    img: yt("QdBZY2fkU-0"),
  },
  {
    ph: ["entre", "black"],
    n: "Fase 04",
    date: "27 a 30/11",
    t: "Black Friday",
    d: "A Black da Soccer, com o GTA 6 junto, até a Cyber Monday. O grupo vê cada oferta antes.",
  },
];
const ORDER: Phase[] = ["antes", "lancamento", "pre", "entre", "black", "fim"];
function levelState(ph: Phase[], phase: Phase) {
  if (phase === "entre" && ph.includes("entre")) return "next";
  if (ph.includes(phase)) return "now";
  const last = Math.max(...ph.map((p) => ORDER.indexOf(p)));
  return ORDER.indexOf(phase) > last ? "done" : "locked";
}

const SHELF = [
  "gta-6-grand-theft-auto-vi-ps5-midia-digital",
  "ea-sports-fc-26-para-ps5-midia-digital",
  "marvels-spider-man-2-para-ps5-midia-digital",
  "god-of-war-ragnarok-ps5-midia-digital",
  "call-of-duty-black-ops-7-midia-digital-ps5",
  "red-dead-redemption-2-ps4-midia-digital",
];

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

function SignupForm({
  id,
  total,
  askEmail = false,
}: {
  id: string;
  total: number | null;
  askEmail?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "err" | "ok"; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [phone, setPhone] = useState("");
  const started = useRef(0);
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
            text: "Cadastro feito! O link do grupo vai abrir aqui assim que for liberado.",
          });
        }
      }}
    >
      <div className="sb-fields">
        <label className="sb-field">
          <span>Nome</span>
          <input
            name="nome"
            autoComplete="given-name"
            placeholder="Seu nome"
            maxLength={80}
            aria-invalid={errs["nome"] ? true : undefined}
          />
        </label>
        <label className="sb-field">
          <span>WhatsApp com DDD</span>
          <input
            name="whats"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder="(00) 00000-0000"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            aria-invalid={errs["whats"] ? true : undefined}
          />
        </label>
        {askEmail && (
          <label className="sb-field">
            <span>
              E-mail <em>(opcional)</em>
            </span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              maxLength={254}
              aria-invalid={errs["email"] ? true : undefined}
            />
          </label>
        )}
      </div>
      <input
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className={`sb-consent ${errs["ok"] ? "bad" : ""}`}>
        <input name="ok" type="checkbox" />
        <span>
          {black.consentText} Você sai quando quiser.{" "}
          <a href={black.privacyUrl} target="_blank" rel="noopener noreferrer">
            Privacidade
          </a>
        </span>
      </label>
      <button type="submit" disabled={busy} className="sb-cta">
        {busy ? "Entrando…" : "Entrar no Grupo VIP"}
        <ArrowUpRight className="h-5 w-5" aria-hidden />
      </button>
      <p className="sb-note">Grátis. Só os administradores mandam mensagem no grupo.</p>
      {total !== null && (
        <p className="sb-social">
          <b>{total.toLocaleString("pt-BR")}</b> pessoas já estão no grupo.
        </p>
      )}
      {msg && (
        <p role="status" aria-live="polite" className={`sb-msg ${msg.tone}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}

/** Capa em 3D: inclina seguindo o mouse, com reflexo de vidro. */
function Case({ slug }: { slug: string }) {
  const game = getGame(slug);
  const { live } = useLiveGame(slug);
  const src = live?.images[0];
  const [broken, setBroken] = useState(false);
  const url = withUtm(`${STORE}/produtos/${slug}/`, {
    content: "black-estante",
    campaign: `black-${black.year}`,
  });
  const tilt = (e: RMouseEvent<HTMLAnchorElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    e.currentTarget.style.setProperty("--ry", `${(x * 14).toFixed(1)}deg`);
    e.currentTarget.style.setProperty("--rx", `${(-y * 14).toFixed(1)}deg`);
  };
  const reset = (e: RMouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.setProperty("--ry", "0deg");
    e.currentTarget.style.setProperty("--rx", "0deg");
  };
  const name = game?.short ?? game?.name ?? "PS5";
  return (
    <a
      className="sb-case"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseMove={tilt}
      onMouseLeave={reset}
      onClick={() => track("links_clique", { item_name: `Black: ${name}`, item_url: url })}
    >
      <span className="sb-case__img">
        {src && !broken ? (
          <img
            src={sized(src, 480)}
            alt={game?.name ?? ""}
            loading="lazy"
            onError={() => setBroken(true)}
          />
        ) : (
          <b>{name}</b>
        )}
      </span>
      {slug.startsWith("gta-6") && <span className="sb-case__tag sb-pill sb-glass">Pré-venda</span>}
      <span className="sb-case__name">
        {name} <ArrowUpRight className="h-4 w-4" aria-hidden />
      </span>
    </a>
  );
}

function TrailerModal({ onClose }: { onClose: () => void }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", k);
    const o = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = o;
    };
  }, []);
  return (
    <div
      className="sb-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Trailer oficial do GTA VI"
      onClick={onClose}
    >
      <div className="sb-modal__box" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${black.trailerId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title="Trailer oficial do GTA VI"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <button type="button" className="sb-modal__close sb-pill sb-glass" onClick={onClose}>
        Fechar
      </button>
    </div>
  );
}

function Faq() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="sb-faq">
      {blackFaq.map((g) => (
        <div key={g.group} className="contents">
          <p className="sb-faq__g">{g.group}</p>
          <ul className="sb-faq__list sb-glass">
            {g.items.map((it) => {
              const on = open === it.q;
              return (
                <li key={it.q}>
                  <button
                    type="button"
                    aria-expanded={on}
                    onClick={() => {
                      setOpen(on ? null : it.q);
                      if (!on) track("links_clique", { item_name: `Black FAQ: ${it.q}` });
                    }}
                  >
                    <span>{it.q}</span>
                    <span className="sb-faq__x" aria-hidden />
                  </button>
                  <div className={`sb-faq__a ${on ? "on" : ""}`}>
                    <div>
                      <p>{it.a}</p>
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

function saveDates() {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([icsText()], { type: "text/calendar" }));
  a.download = "black-soccer-games-2026.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  track("links_clique", { item_name: "Black: salvar na agenda" });
}

const PERKS = [
  {
    I: Mail,
    t: "Chega no seu e-mail",
    d: "Os dados de acesso vão direto para o e-mail da compra.",
  },
  { I: Zap, t: "Pix em minutos", d: "Em geral menos de 30 minutos, no horário de atendimento." },
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
];

export function BlackPage() {
  const now = useNow();
  const [total, setTotal] = useState<number | null>(null);
  const [bar, setBar] = useState(false);
  const [movie, setMovie] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const reelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);
  const phase = useMemo(() => (now ? phaseAt(now).phase : "antes"), [now]);

  useEffect(() => {
    loadGtm();
    loadPixel();
    loadClarity();
    track("page_view");
    void readRpc<number>("black_vip_total").then((n) => {
      if (typeof n === "number" && n >= black.socialMin) setTotal(n);
    });
    if (reelRef.current) startReel(reelRef.current);
    if (!("IntersectionObserver" in window)) {
      pageRef.current?.querySelectorAll(".sb-rv").forEach((el) => el.classList.add("in"));
      return;
    }
    const rv = new IntersectionObserver(
      (en) =>
        en.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            rv.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    pageRef.current?.querySelectorAll(".sb-rv").forEach((el) => rv.observe(el));
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver((en) => {
      en.forEach((e) => seen.set(e.target, e.isIntersecting));
      setBar(![...seen.values()].some(Boolean) && window.scrollY > 300);
    });
    [formRef.current, finalRef.current].forEach((el) => el && io.observe(el));
    return () => {
      rv.disconnect();
      io.disconnect();
    };
  }, []);

  const toForm = (where: string) => {
    const el = formRef.current;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => el?.querySelector<HTMLInputElement>("input[name=nome]")?.focus(), 650);
    track("links_clique", { item_name: `Black: ir para o cadastro (${where})` });
  };
  const openMovie = () => {
    setMovie(true);
    track("links_clique", { item_name: "Black: trailer GTA VI" });
  };

  const mark = nextMark(now ?? Date.parse("2026-10-26T12:00:00-03:00"));
  const left = now ? Math.max(0, mark.t - now) : 0;
  const d = Math.floor(left / 864e5);
  const parts: [string, string][] = [
    [String(d), d === 1 ? "dia" : "dias"],
    [pad(Math.floor((left / 36e5) % 24)), "horas"],
    [pad(Math.floor((left / 6e4) % 60)), "min"],
    [pad(Math.floor((left / 1e3) % 60)), "seg"],
  ];
  const prog = now ? Math.min(1, Math.max(0, (now - LOAD_FROM) / (mark.t - LOAD_FROM))) : 0;
  const lit = Math.max(1, Math.round(prog * 24));
  const over = phase === "fim";

  return (
    <div className="sb font-sans" data-theme="escuro" ref={pageRef}>
      {/* TOPO */}
      <section className="sb-hero" aria-labelledby="sb-h1">
        <div className="sb-reel" ref={reelRef} aria-hidden>
          <img className="sb-reel__still" src={yt("VQRLujxTm3c")} alt="" fetchPriority="high" />
          <div className="bfm-bg-full bfm-wait">
            <div id="bfm-yt" />
          </div>
          <div className="sb-reel__shade" />
          <div className="sb-reel__light" />
        </div>

        <header className="sb-top sb-wrap">
          <a
            href="/"
            className="sb-top__brand"
            aria-label="Soccer Games"
            onClick={() => track("links_clique", { item_name: "Black: logo" })}
          >
            <img src="/logo-soccer.png" alt="" width={40} height={40} />
            <span className="sb-pill sb-glass">
              <i className="sb-live" aria-hidden /> Black {black.year}
            </span>
          </a>
          <button type="button" className="sb-pill sb-glass sb-btn-ghost" onClick={openMovie}>
            <Play className="h-3.5 w-3.5" fill="currentColor" aria-hidden /> Trailer com som
          </button>
        </header>

        <div className="sb-hero__body sb-wrap">
          <div>
            <p className="sb-kick">GTA 6 · 19 de novembro</p>
            <h1 id="sb-h1" className="sb-h1">
              GTA 6 na Black
              <br />
              da <span className="sb-shine">Soccer.</span>
            </h1>
            <p className="sb-lede">
              O GTA 6 chega dia <b>19/11</b>. O preço do <b>fim de semana do lançamento</b> e da{" "}
              <b>Black Friday (27 a 30/11)</b> sai primeiro no Grupo VIP, no WhatsApp.
            </p>

            {!over && (
              <div className="sb-load sb-glass" role="timer" aria-label="Contagem regressiva">
                <div className="sb-load__top">
                  <span>Carregando {mark.bar.replace(/^para /, "")}</span>
                  <b>{now ? `${Math.round(prog * 100)}%` : "··"}</b>
                </div>
                <div className="sb-bar" aria-hidden>
                  {Array.from({ length: 24 }, (_, i) => (
                    <i key={i} className={i < lit ? `on${i === lit - 1 ? " tip" : ""}` : ""} />
                  ))}
                </div>
                <div className="sb-clock">
                  {parts.map(([v, l]) => (
                    <span key={l}>
                      {now ? <Num v={v} /> : <span className="sb-num">··</span>}
                      <small>{l}</small>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div ref={formRef} id="cadastro" style={{ scrollMarginTop: 24 }}>
            <div className="sb-form sb-glass sb-glass--lit">
              <div className="sb-form__head">
                <span>Grupo VIP · WhatsApp</span>
                <span>
                  <i aria-hidden /> Aberto
                </span>
              </div>
              <p className="sb-form__title">Entre antes de todo mundo.</p>
              <p className="sb-form__sub">Preço do GTA 6, horário da live e lembretes da Black.</p>
              <SignupForm id="topo" total={total} />
            </div>
          </div>
        </div>
      </section>

      {/* SELEÇÃO DE FASE */}
      <section className="sb-sec" aria-labelledby="sb-fases">
        <div className="sb-wrap">
          <div className="sb-rv">
            <p className="sb-kick">Seleção de fase</p>
            <h2 id="sb-fases" className="sb-h2">
              Quatro fases. <span>Um grupo só.</span>
            </h2>
          </div>
          <div className="sb-levels">
            {LEVELS.map((l, i) => {
              const st = levelState(l.ph, phase);
              return (
                <article
                  key={l.n}
                  className={`sb-level sb-glass sb-rv ${st}`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  {l.img && (
                    <span className="sb-level__bg" style={{ backgroundImage: `url(${l.img})` }} />
                  )}
                  <div className="sb-level__top">
                    <span className="sb-level__n">{l.n}</span>
                    {st === "now" && (
                      <span className="sb-state sb-state--now">
                        <i className="sb-live" aria-hidden /> Agora
                      </span>
                    )}
                    {st === "next" && <span className="sb-state sb-state--now">Próxima</span>}
                    {st === "done" && (
                      <span className="sb-state sb-state--done">
                        <Check className="h-3 w-3" aria-hidden /> Concluída
                      </span>
                    )}
                    {st === "locked" && (
                      <span className="sb-state">
                        <Lock className="h-3 w-3" aria-hidden /> Bloqueada
                      </span>
                    )}
                  </div>
                  <p className="sb-level__date">{l.date}</p>
                  <h3>{l.t}</h3>
                  <p>{l.d}</p>
                </article>
              );
            })}
          </div>
          <button
            type="button"
            onClick={saveDates}
            className="mt-6 inline-flex items-center gap-2 text-[13px] text-white/70 underline underline-offset-4 hover:text-white"
          >
            <CalendarPlus className="h-4 w-4" aria-hidden /> Salvar as datas na agenda
          </button>
        </div>
      </section>

      {/* ESTANTE */}
      <section className="sb-sec" style={{ paddingTop: 0 }} aria-labelledby="sb-estante">
        <div className="sb-wrap">
          <div className="sb-rv">
            <p className="sb-kick">Na loja</p>
            <h2 id="sb-estante" className="sb-h2">
              Escolha o jogo. <span>O preço sai no grupo.</span>
            </h2>
          </div>
          <div className="sb-shelf">
            {SHELF.map((s) => (
              <Case key={s} slug={s} />
            ))}
          </div>
          <div className="sb-perks">
            {PERKS.map(({ I, t, d: txt }) => (
              <div key={t} className="sb-perk sb-glass sb-rv">
                <I className="h-5 w-5" strokeWidth={1.7} aria-hidden />
                <b>{t}</b>
                <span>{txt}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DÚVIDAS */}
      <section className="sb-sec" style={{ paddingTop: 0 }} aria-labelledby="sb-faq">
        <div className="sb-wrap">
          <div className="sb-rv">
            <p className="sb-kick">Antes de entrar</p>
            <h2 id="sb-faq" className="sb-h2">
              Dúvidas <span>frequentes.</span>
            </h2>
          </div>
          <Faq />
        </div>
      </section>

      {/* FECHAMENTO */}
      <section className="sb-sec" style={{ paddingTop: 0 }} aria-labelledby="sb-final">
        <div className="sb-wrap">
          <div className="sb-final sb-glass sb-glass--lit sb-rv">
            <span className="sb-final__bg" aria-hidden />
            <div>
              <p className="sb-kick">Grupo VIP</p>
              <h2 id="sb-final" className="sb-h2">
                {over ? (
                  "A Black 2026 acabou."
                ) : (
                  <>
                    Faltam {d === 1 ? "1 dia" : `${d} dias`}.{" "}
                    <span>O preço sai primeiro aqui.</span>
                  </>
                )}
              </h2>
              <p className="sb-lede">
                Nome e WhatsApp, e o grupo abre na hora. Leva menos de um minuto.
              </p>
            </div>
            <div ref={finalRef}>
              <SignupForm id="final" total={total} askEmail />
            </div>
          </div>

          <div className="sb-help">
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
              { I: Gamepad2, t: "Ver os jogos", d: "Jogos de PS4 e PS5", u: "/" },
              {
                I: MessageCircle,
                t: "Falar no WhatsApp",
                d: "Seg a sáb, 9h às 21h · dom, 9h às 15h",
                u: `https://wa.me/${WA}?text=${encodeURIComponent("Olá! Vim pela página da Black da Soccer.")}`,
              },
            ].map(({ I, t, d: txt, u }) => (
              <a
                key={t}
                href={u}
                className="sb-glass"
                {...(u.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                onClick={() => track("links_clique", { item_name: `Black: ${t}`, item_url: u })}
              >
                <span>
                  <b>{t}</b>
                  <em>{txt}</em>
                </span>
                <I className="h-5 w-5" strokeWidth={1.7} aria-hidden />
              </a>
            ))}
          </div>
          <p className="sb-foot">
            Soccer Games · lojasoccergames.com.br · GTA VI é marca da Rockstar Games
          </p>
        </div>
      </section>

      {/* barra fixa no celular */}
      <div className={`sb-bar-m sb-glass ${bar ? "on" : ""}`}>
        <span>
          <b>
            {over
              ? "Grupo VIP"
              : `${parts[0]![0]}d ${parts[1]![0]}:${parts[2]![0]}:${parts[3]![0]}`}
          </b>
          {over ? "Ofertas no grupo" : mark.bar}
        </span>
        <button type="button" className="sb-cta" onClick={() => toForm("barra")}>
          Entrar no VIP
        </button>
      </div>

      {movie && <TrailerModal onClose={() => setMovie(false)} />}
    </div>
  );
}
