import "./black.css";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  ArrowUpRight,
  CalendarPlus,
  Gamepad2,
  LifeBuoy,
  Mail,
  MessageCircle,
  Play,
  ShieldCheck,
} from "lucide-react";
import { callRpc, readRpc } from "@/lib/backend";
import { loadClarity, loadGtm, loadPixel, track } from "@/lib/tracking";
import { withUtm } from "@/lib/utm";
import { getGame } from "@/features/public/games";
import { useLiveGame } from "@/features/public/GameCard";
import { sized } from "@/features/public/store";
import { black, phaseAt, type Phase } from "./config";
import { blackFaq } from "./faq";

const WA = "5518996366686";
const STORE = "https://lojasoccergames.com.br";
const GTA = "gta-6-grand-theft-auto-vi-ps5-midia-digital";
/** Capinhas que voam no palco e passam na faixa: o que mais vende e o que está chegando. */
const STAGE = [
  "ea-sports-fc-26-para-ps5-midia-digital",
  "marvels-spider-man-2-para-ps5-midia-digital",
  "red-dead-redemption-2-ps4-midia-digital",
];
const SHELF = [
  GTA,
  "pre-venda-ea-sports-fc-27-midia-digital-para-ps4-copia-18soh",
  "marvels-spider-man-2-para-ps5-midia-digital",
  "god-of-war-ragnarok-ps5-midia-digital",
  "call-of-duty-black-ops-7-midia-digital-ps5",
  "hogwarts-legacy-ps5-midia-digital",
  "gran-turismo-7-ps5-midia-digital",
  "red-dead-redemption-2-ps4-midia-digital",
  "ghost-of-yotei-para-ps5-midia-digital",
  "mortal-kombat-1-ps5-midia-digital",
  "resident-evil-requiem-para-ps5-rcytd",
];
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

/** Capinha real do jogo, puxada da loja. Sem foto: um bloco com o nome. */
function Case({
  slug,
  className = "",
  style,
  w = 320,
}: {
  slug: string;
  className?: string;
  style?: CSSProperties;
  w?: number;
}) {
  const game = getGame(slug);
  const { live } = useLiveGame(slug, true);
  const src = live?.images[0];
  const [broken, setBroken] = useState(false);
  return (
    <span className={className} style={style}>
      {src && !broken ? (
        <img
          src={sized(src, w)}
          alt={game?.name ?? ""}
          loading="lazy"
          onError={() => setBroken(true)}
          style={{ display: "block", width: "100%", aspectRatio: "1", objectFit: "cover" }}
        />
      ) : (
        <span
          style={{
            display: "grid",
            placeItems: "center",
            aspectRatio: "1",
            padding: 10,
            background: "linear-gradient(150deg,#2a0f3f,#12081c)",
            fontSize: 11,
            fontWeight: 800,
            textAlign: "center",
            lineHeight: 1.2,
          }}
        >
          {game?.short ?? game?.name ?? "PS5"}
        </span>
      )}
    </span>
  );
}

const LABEL: Record<Phase, { pre: string; when: string }> = {
  antes: {
    pre: "O GTA 6 chega em",
    when: "19 de novembro · fim de semana do GTA de 20 a 22/11 · Black de 27 a 30/11",
  },
  lancamento: {
    pre: "O GTA 6 chegou. O fim de semana do GTA começa em",
    when: "20 de novembro, 00h · live na sexta",
  },
  pre: {
    pre: "Fim de semana do GTA rolando. A Black Friday começa em",
    when: "27 de novembro, 00h · até a Cyber Monday, 30/11",
  },
  entre: {
    pre: "A Black Friday da Soccer começa em",
    when: "27 de novembro, 00h · até a Cyber Monday, 30/11",
  },
  black: { pre: "Black Friday rolando. Termina em", when: "Segunda, 30 de novembro, 23h59" },
  fim: { pre: "A Black 2026 terminou", when: "As ofertas da semana continuam no grupo" },
};

function Countdown({ now }: { now: number | null }) {
  const { phase, target } = phaseAt(now ?? Date.parse("2026-10-26T12:00:00-03:00"));
  const left = target && now ? Math.max(0, target - now) : 0;
  const d = Math.floor(left / 864e5);
  const parts: [string, string][] = [
    [pad(Math.floor((left / 36e5) % 24)), "h"],
    [pad(Math.floor((left / 6e4) % 60)), "min"],
    [pad(Math.floor((left / 1e3) % 60)), "seg"],
  ];
  return (
    <div role="timer" aria-label="Contagem regressiva" className="bk-count">
      <span className="bk-count__label">{LABEL[phase].pre}</span>
      {target && (
        <>
          <span className="bk-count__days">
            <b className="bk-display bk-grad">{now ? d : "··"}</b>
            <span>{d === 1 ? "dia" : "dias"}</span>
          </span>
          <span className="bk-count__hms">
            {parts.map(([v, l]) => (
              <span key={l}>
                <b className="bk-display">{now ? v : "··"}</b>
                <small>{l}</small>
              </span>
            ))}
          </span>
        </>
      )}
      <span className="bk-count__when">{LABEL[phase].when}</span>
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
  const field = () => "bk-input";
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
          setMsg({ tone: "ok", text: "Pronto! Abrindo o grupo no WhatsApp..." });
          window.setTimeout(() => window.location.assign(group), 350);
        } else {
          setBusy(false);
          setMsg({
            tone: "ok",
            text: "Cadastro feito! O link do grupo vai abrir aqui assim que for liberado. Fique de olho no nosso Instagram.",
          });
        }
      }}
      className={compact ? "" : "mt-5"}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="bk-field">
          <span>Nome</span>
          <input
            name="nome"
            autoComplete="given-name"
            placeholder="Seu nome"
            maxLength={80}
            aria-invalid={errs["nome"] ? true : undefined}
            className={field()}
          />
        </label>
        <label className="bk-field">
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
            className={field()}
          />
        </label>
      </div>
      <label className="bk-field" style={{ marginTop: 12 }}>
        <span>
          E-mail <span style={{ opacity: 0.6, fontWeight: 500 }}>opcional</span>
        </span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          placeholder="voce@email.com"
          maxLength={254}
          aria-invalid={errs["email"] ? true : undefined}
          className={field()}
        />
      </label>
      <input
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className={`bk-ok ${errs["ok"] ? "is-bad" : ""}`}>
        <input name="ok" type="checkbox" />
        <span>
          {black.consentText} Você sai quando quiser.{" "}
          <a href={black.privacyUrl} target="_blank" rel="noopener noreferrer">
            Privacidade
          </a>
        </span>
      </label>
      <button type="submit" disabled={busy} className="bk-btn">
        {busy ? "Entrando..." : "Entrar no Grupo VIP"}
        <ArrowUpRight aria-hidden />
      </button>
      <p className="bk-fine">Grátis. Só a Soccer manda mensagem no grupo.</p>
      {msg && (
        <p
          role="status"
          aria-live="polite"
          className={`bk-msg ${msg.tone === "err" ? "is-err" : "is-ok"}`}
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
    <div className="bk-faq">
      {blackFaq.map((g) => (
        <div key={g.group} className="contents" style={{ display: "contents" }}>
          <p className="bk-faq__group">{g.group}</p>
          <ul>
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
                    <span className="bk-faq__x" aria-hidden />
                  </button>
                  <div className={`bk-faq__a ${on ? "is-open" : ""}`}>
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

function icsDownload() {
  const ev = (uid: string, start: string, end: string, title: string, desc: string) => [
    "BEGIN:VEVENT",
    `UID:${uid}-${black.year}@lojasoccergames.com.br`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${desc}`,
    "URL:https://links.lojasoccergames.com.br/black",
    "END:VEVENT",
  ];
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soccer Games//Black 2026//PT",
    ...ev(
      "gta-vi",
      "20261119T030000Z",
      "20261119T040000Z",
      "GTA 6 chega (Soccer Games)",
      "Lançamento do GTA VI. As ofertas saem primeiro no Grupo VIP.",
    ),
    ...ev(
      "fim-de-semana-gta",
      "20261120T030000Z",
      "20261123T025900Z",
      "Fim de semana do GTA 6 na Soccer",
      "Ofertas na loja e live na sexta, 20/11.",
    ),
    ...ev(
      "black-friday",
      "20261127T030000Z",
      "20261201T025900Z",
      "Black Friday Soccer Games",
      "De 27 a 30/11, até a Cyber Monday.",
    ),
    "END:VCALENDAR",
  ].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "black-soccer-games-2026.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  track("links_clique", { item_name: "Black: salvar na agenda" });
}

/** Trailer oficial (canal da Rockstar), incorporado só quando a pessoa toca no play. */
function Trailer() {
  const [on, setOn] = useState(false);
  const id = black.trailerId;
  return (
    <div className="bk-player">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title="Trailer oficial do GTA VI"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="bk-player__face"
          aria-label="Assistir ao trailer oficial do GTA VI"
          onClick={() => {
            setOn(true);
            track("links_clique", { item_name: "Black: trailer GTA VI" });
          }}
        >
          <img src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`} alt="" loading="lazy" />
          <span className="bk-player__play" aria-hidden>
            <Play />
          </span>
          <span className="bk-player__cap">Trailer oficial · Rockstar Games</span>
        </button>
      )}
    </div>
  );
}

/** No computador, o trailer roda mudo atrás do topo, depois que a página carregou. */
function BackdropVideo() {
  const [ok, setOk] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const big = window.matchMedia("(min-width: 1024px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    if (!big || calm || save) return;
    const t = window.setTimeout(() => setOk(true), 1800);
    return () => window.clearTimeout(t);
  }, []);
  if (!ok) return null;
  const id = black.trailerId;
  return (
    <div className={`bk-video ${on ? "is-on" : ""}`} aria-hidden>
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3`}
        title="Trailer do GTA VI ao fundo"
        tabIndex={-1}
        allow="autoplay; encrypted-media"
        onLoad={() => window.setTimeout(() => setOn(true), 1200)}
      />
    </div>
  );
}

export function BlackPage() {
  const now = useNow();
  const [total, setTotal] = useState<number | null>(null);
  const [bar, setBar] = useState(false);
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
    if (!("IntersectionObserver" in window)) return;
    const seen = new Map<Element, boolean>();
    const io = new IntersectionObserver(
      (en) => {
        en.forEach((e) => seen.set(e.target, e.isIntersecting));
        setBar(![...seen.values()].some(Boolean) && window.scrollY > 300);
      },
      { threshold: 0 },
    );
    [formRef.current, finalRef.current].forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  const toForm = (from: string) => {
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    track("links_clique", { item_name: `Black: ir para o cadastro (${from})` });
  };
  const daysLeft = now
    ? Math.max(0, Math.floor(((phaseAt(now).target ?? now) - now) / 864e5))
    : null;

  const order: Phase[] = ["antes", "lancamento", "pre", "entre", "black", "fim"];
  const idx = order.indexOf(phase);
  const steps: { n: string; when: string; t: string; d: string; from: Phase; to: Phase }[] = [
    {
      n: "01",
      when: "Até 18/11",
      t: "Oferta antes do site",
      d: "Toda semana a lista de ofertas chega no grupo antes de aparecer na loja.",
      from: "antes",
      to: "antes",
    },
    {
      n: "02",
      when: "19/11",
      t: "GTA 6 chegou",
      d: "Dia do lançamento. Quem comprou na pré-venda recebe no e-mail e a gente ajuda a ativar.",
      from: "lancamento",
      to: "lancamento",
    },
    {
      n: "03",
      when: "20 a 22/11",
      t: "Fim de semana do GTA",
      d: `Preços da loja descem no fim de semana do lançamento. Live na ${black.liveDay}.`,
      from: "pre",
      to: "pre",
    },
    {
      n: "04",
      when: "27 a 30/11",
      t: "Black Friday Soccer",
      d: "A Black de verdade, com o GTA 6 junto, até a Cyber Monday. O grupo vê primeiro.",
      from: "entre",
      to: "black",
    },
  ];
  const prog = Math.min(
    100,
    Math.max(
      4,
      now
        ? ((now - Date.parse("2026-10-26T00:00:00-03:00")) /
            (Date.parse(black.bigEnd) - Date.parse("2026-10-26T00:00:00-03:00"))) *
            100
        : 4,
    ),
  );

  const shelf = (
    <div className="bk-shelf" aria-label="Jogos da Soccer">
      <div className="bk-shelf__row">
        {[0, 1].map((k) => (
          <div key={k} aria-hidden={k === 1}>
            {SHELF.map((s, i) => (
              <span key={s} style={{ display: "contents" }}>
                <Case slug={s} className="bk-shelf__case" w={240} />
                {i % 4 === 3 && (
                  <span className="bk-shelf__word bk-display">
                    {["Entrega no e-mail", "Garantia vitalícia", "PS4 e PS5"][(i - 3) / 4] ??
                      "Soccer Games"}
                    <em>✦</em>
                  </span>
                )}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bk" data-theme="escuro">
      <div className="bk-sky" aria-hidden>
        <BackdropVideo />
      </div>
      <div className="bk-noise" aria-hidden />

      <div className="bk-wrap">
        <header className="bk-top">
          <a
            href="/"
            aria-label="Soccer Games"
            onClick={() => track("links_clique", { item_name: "Black: logo" })}
          >
            <img src="/logo-soccer.png" alt="Soccer Games" width={42} height={42} />
          </a>
          <span className="bk-chip">
            <i aria-hidden /> Grupo VIP · Black {black.year}
          </span>
        </header>

        <section className="bk-hero">
          <div className="bk-hero__title">
            <span className="bk-kick">
              <b>Grupo VIP</b> É de graça
            </span>
            <h1 className="bk-h1 bk-display">
              <span className="bk-grad">GTA 6</span>
              <span className="bk-h1__small">
                na Black
                <br />
                da Soccer.
              </span>
            </h1>
            <p className="bk-lead">
              {phase === "antes" ? (
                <>
                  O GTA 6 chega dia <b>19/11</b>. O preço do <b>fim de semana do lançamento</b> e da{" "}
                  <b>Black Friday</b> sai primeiro no Grupo VIP da Soccer.
                </>
              ) : (
                <>
                  O GTA 6 já chegou. As ofertas do <b>fim de semana do GTA</b> e da{" "}
                  <b>Black Friday</b> saem primeiro no Grupo VIP da Soccer.
                </>
              )}
            </p>
          </div>

          <button type="button" className="bk-btn bk-go" onClick={() => toForm("topo")}>
            Entrar no Grupo VIP <ArrowUpRight aria-hidden />
          </button>

          <div className="bk-stage" aria-hidden>
            <span className="bk-stage__ring" />
            <span className="bk-stage__vi bk-display">VI</span>
            <Case
              slug={STAGE[0]!}
              className="bk-stage__case"
              style={{ left: "4%", top: "56%", rotate: "-12deg", animationDelay: "-2s" }}
            />
            <Case
              slug={STAGE[1]!}
              className="bk-stage__case"
              style={{ right: "3%", top: "14%", rotate: "10deg", animationDelay: "-4s" }}
            />
            <Case
              slug={STAGE[2]!}
              className="bk-stage__case"
              style={{ right: "6%", bottom: "8%", rotate: "-6deg", animationDelay: "-1s" }}
            />
            <Case slug={GTA} className="bk-stage__gta" w={540} />
            <span className="bk-stage__tag bk-display">
              {phase === "antes" ? "Pré-venda · PS5" : "PS5"}
            </span>
            <img
              className="bk-stage__boy"
              src="/black/mascote.webp"
              alt=""
              width={540}
              height={1300}
            />
            <span className="bk-stage__floor" />
          </div>

          <div className="bk-hero__act">
            <Countdown now={now} />
            <button type="button" onClick={icsDownload} className="bk-agenda">
              <CalendarPlus aria-hidden /> Salvar as datas na agenda
            </button>
            <div ref={formRef} id="cadastro" className="bk-card">
              <h2 className="bk-card__title bk-display">Entra no grupo</h2>
              <p className="bk-card__sub">
                Nome e WhatsApp, e o grupo abre na hora. Leva menos de 1 minuto.
              </p>
              {total !== null && (
                <p className="bk-card__count">
                  <b className="bk-display">{total.toLocaleString("pt-BR")}</b> pessoas já estão no
                  grupo.
                </p>
              )}
              <SignupForm id="topo" />
            </div>
          </div>
        </section>
      </div>

      {shelf}

      <div className="bk-wrap">
        <section className="bk-sec" aria-labelledby="bk-fases">
          <span className="bk-eyebrow">Como vai ser</span>
          <h2 id="bk-fases" className="bk-h2 bk-display">
            4 fases até <span className="bk-grad">a Black.</span>
            <small>Tudo no mesmo grupo. Cada fase avisa primeiro quem está dentro.</small>
          </h2>
          <div className="bk-map">
            <span className="bk-map__track" aria-hidden>
              <i style={{ width: `${prog}%` }} />
            </span>
            {steps.map((s) => {
              const a = order.indexOf(s.from);
              const b = order.indexOf(s.to);
              const st = idx > b ? "is-done" : idx >= a ? "is-now" : "";
              return (
                <article key={s.n} className={`bk-stagecard ${st}`}>
                  <span className="bk-stagecard__pin">{st === "is-done" ? "✓" : s.n}</span>
                  <p className="bk-stagecard__when">
                    {s.when}
                    {st === "is-now" && <em>agora</em>}
                  </p>
                  <h3 className="bk-display">{s.t}</h3>
                  <p>{s.d}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="bk-sec" style={{ paddingTop: 0 }} aria-labelledby="bk-trailer">
          <div className="bk-trailer">
            <Trailer />
            <div>
              <span className="bk-eyebrow">Já viu o trailer?</span>
              <h2 id="bk-trailer" className="bk-h2 bk-display">
                Vai jogar <span className="bk-grad">no dia 19?</span>
                <small>
                  O GTA 6 entra no fim de semana do lançamento e na Black Friday da Soccer, em mídia
                  digital, com entrega no e-mail. O preço de cada fase sai primeiro no grupo.
                </small>
              </h2>
              <button
                type="button"
                className="bk-btn"
                style={{ maxWidth: 380 }}
                onClick={() => toForm("trailer")}
              >
                Quero o preço antes <ArrowUpRight aria-hidden />
              </button>
            </div>
          </div>
        </section>

        {black.ownerPhoto && (
          <section className="bk-sec" style={{ paddingTop: 0 }} aria-labelledby="bk-dono">
            <div className="bk-owner">
              <img src={black.ownerPhoto} alt="Geovane, dono da Soccer Games" loading="lazy" />
              <div>
                <span className="bk-eyebrow">Quem manda no grupo</span>
                <h2 id="bk-dono" className="bk-h2 bk-display">
                  É o Geovane <span className="bk-grad">que avisa.</span>
                  <small>
                    O dono da Soccer manda as ofertas no grupo. Só ele e a equipe mandam mensagem.
                  </small>
                </h2>
              </div>
            </div>
          </section>
        )}

        <section aria-label="Por que comprar na Soccer Games">
          <div className="bk-trust">
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
            ].map(({ I, t, d }) => (
              <div key={t}>
                <span className="bk-trust__ico">
                  <I aria-hidden />
                </span>
                <span>
                  <b>{t}</b>
                  <span>{d}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="bk-sec" aria-labelledby="bk-faq">
          <span className="bk-eyebrow">Antes de entrar</span>
          <h2 id="bk-faq" className="bk-h2 bk-display">
            Dúvidas
          </h2>
          <Faq />
        </section>

        <section style={{ paddingBottom: 72 }}>
          <div className="bk-final">
            <img
              className="bk-final__boy"
              src="/black/mascote.webp"
              alt=""
              aria-hidden
              loading="lazy"
            />
            <div style={{ position: "relative" }}>
              <span className="bk-eyebrow">
                {daysLeft !== null && phase !== "fim"
                  ? `Faltam ${daysLeft === 1 ? "1 dia" : `${daysLeft} dias`}`
                  : "Grupo VIP"}
              </span>
              <h2 className="bk-h2 bk-display">
                O link sai <span className="bk-grad">primeiro no grupo.</span>
                <small>
                  Quem está dentro fica sabendo antes. Quem está fora, vê depois no site.
                </small>
              </h2>
            </div>
            <div ref={finalRef} className="bk-card">
              <SignupForm id="final" compact />
            </div>
          </div>
        </section>

        <section style={{ paddingBottom: 110 }} aria-label="Atendimento">
          <p className="bk-fine">
            Atendimento · segunda a sábado, das 9h às 21h · domingo, das 9h às 15h
          </p>
          <div className="bk-help">
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
                u: `https://wa.me/${WA}?text=${encodeURIComponent("Olá! Vim pela página do Grupo VIP da Black.")}`,
              },
            ].map(({ I, t, d, u }) => (
              <a
                key={t}
                href={u}
                {...(u.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                onClick={() => track("links_clique", { item_name: `Black: ${t}`, item_url: u })}
              >
                <span>
                  <b>{t}</b>
                  <small>{d}</small>
                </span>
                <I aria-hidden />
              </a>
            ))}
          </div>
          <p className="bk-fine" style={{ textAlign: "center", marginTop: 32 }}>
            Soccer Games · lojasoccergames.com.br · GTA VI é marca da Rockstar Games
          </p>
        </section>
      </div>

      <div className={`bk-bar ${bar ? "" : "is-off"}`}>
        <span className="bk-bar__txt">
          <b className="bk-display">
            {daysLeft !== null && phase !== "fim"
              ? daysLeft === 1
                ? "1 dia"
                : `${daysLeft} dias`
              : "Black 2026"}
          </b>
          {phase === "antes"
            ? "para o GTA 6"
            : phase === "fim"
              ? "Ofertas no grupo"
              : phase === "black"
                ? "para acabar a Black"
                : "para a Black Friday"}
        </span>
        <button type="button" onClick={() => toForm("barra")}>
          Entrar no grupo
        </button>
      </div>
    </div>
  );
}
