import "./black.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, CalendarPlus, Gamepad2, LifeBuoy, MessageCircle, Play } from "lucide-react";
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
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Vídeos oficiais do canal da Rockstar, só incorporados (nunca baixados nem reeditados).
 * A montagem do topo alterna trechos deles: trailer 1, trailer 2 e o Extended Look.
 */
const VIDEOS = ["VQRLujxTm3c", "QdBZY2fkU-0", "tJbzMqJGH4k"];
const REEL: [string, number][] = [
  ["VQRLujxTm3c", 12],
  ["QdBZY2fkU-0", 22],
  ["tJbzMqJGH4k", 95],
  ["VQRLujxTm3c", 40],
  ["QdBZY2fkU-0", 50],
  ["tJbzMqJGH4k", 310],
  ["VQRLujxTm3c", 70],
  ["QdBZY2fkU-0", 72],
  ["tJbzMqJGH4k", 620],
  ["VQRLujxTm3c", 104],
  ["tJbzMqJGH4k", 905],
  ["VQRLujxTm3c", 132],
];
const CLIP_MS = 8000;

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

const split = (left: number) => ({
  d: Math.floor(left / 864e5),
  h: pad(Math.floor((left / 36e5) % 24)),
  m: pad(Math.floor((left / 6e4) % 60)),
  s: pad(Math.floor((left / 1e3) % 60)),
});

/** Para onde a contagem aponta em cada fase. */
const COUNT_TO: Record<Phase, string> = {
  antes: "o GTA 6",
  lancamento: "o fim de semana do GTA",
  pre: "a Black Friday",
  entre: "a Black Friday",
  black: "o fim da Black",
  fim: "",
};

const AGENDA: { ph: Phase[]; d: string; t: string; s: string }[] = [
  { ph: ["antes"], d: "Até 18/11", t: "Ofertas da semana", s: "Preço baixo direto no site" },
  { ph: ["lancamento"], d: "19/11", t: "GTA 6 chega", s: "O preço sai primeiro no grupo" },
  { ph: ["pre"], d: "20 a 22/11", t: "Fim de semana do GTA", s: "Preços descem e live na sexta" },
  { ph: ["entre", "black"], d: "27 a 30/11", t: "Black Friday", s: "Até a Cyber Monday" },
];
const ORDER: Phase[] = ["antes", "lancamento", "pre", "entre", "black", "fim"];
const state = (ph: Phase[], phase: Phase) =>
  ph.includes(phase)
    ? "is-now"
    : ORDER.indexOf(phase) > Math.max(...ph.map((p) => ORDER.indexOf(p)))
      ? "is-past"
      : "";

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
  title,
}: {
  id: string;
  total: number | null;
  askEmail?: boolean;
  title?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: "err" | "ok"; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, boolean>>({});
  const [phone, setPhone] = useState("");
  const started = useRef(0);
  return (
    <div className="bk-form">
      <div className="bk-form__head">
        <span className="bk-tag">Grupo VIP · WhatsApp</span>
        <span className="bk-tag">
          <i className="bk-dot" aria-hidden /> Aberto
        </span>
      </div>
      <form
        noValidate
        aria-label="Entrar no Grupo VIP"
        className="bk-form__body"
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
              [res.error === "whatsapp" ? "whats" : res.error === "consent" ? "ok" : res.error]:
                true,
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
      >
        {title && <p className="bk-form__title">{title}</p>}
        <div className="bk-form__grid">
          <label className="bk-field">
            <span>Nome</span>
            <input
              name="nome"
              autoComplete="given-name"
              placeholder="Seu nome"
              maxLength={80}
              aria-invalid={errs["nome"] ? true : undefined}
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
            />
          </label>
          {askEmail && (
            <label className="bk-field">
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
        <label className={`bk-consent ${errs["ok"] ? "is-bad" : ""}`}>
          <input name="ok" type="checkbox" />
          <span>
            {black.consentText} Você sai quando quiser.{" "}
            <a href={black.privacyUrl} target="_blank" rel="noopener noreferrer">
              Privacidade
            </a>
          </span>
        </label>
        <button type="submit" disabled={busy} className="bk-btn">
          {busy ? "Entrando…" : "Entrar no Grupo VIP"}
          <ArrowUpRight className="h-5 w-5" aria-hidden />
        </button>
        <p className="bk-note">Grátis. Só os administradores mandam mensagem no grupo.</p>
        {total !== null && (
          <p className="bk-social">
            <b>{total.toLocaleString("pt-BR")}</b> pessoas já estão no grupo.
          </p>
        )}
        {msg && (
          <p role="status" aria-live="polite" className={`bk-msg ${msg.tone}`}>
            {msg.text}
          </p>
        )}
      </form>
    </div>
  );
}

/**
 * Fundo do topo. Em todo lugar: as imagens oficiais dos trailers se alternando.
 * No computador: trechos dos vídeos oficiais, mudos, um depois do outro, com fusão.
 */
function Reel() {
  const [still, setStill] = useState(0);
  const [video, setVideo] = useState(false);
  const [n, setN] = useState(0);
  const [pre, setPre] = useState(false);
  const [ready, setReady] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const t = window.setInterval(() => setStill((v) => (v + 1) % VIDEOS.length), 6000);
    const big = window.matchMedia("(min-width: 1024px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    let s = 0;
    if (big && !calm && !save) s = window.setTimeout(() => setVideo(true), 1200);
    return () => {
      window.clearInterval(t);
      window.clearTimeout(s);
    };
  }, []);

  useEffect(() => {
    if (!video) return;
    setPre(false);
    const a = window.setTimeout(() => setPre(true), CLIP_MS - 2500);
    const b = window.setTimeout(() => setN((v) => v + 1), CLIP_MS);
    return () => {
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [video, n]);

  const clip = (k: number, on: boolean) => {
    const [id, start] = REEL[k % REEL.length]!;
    return (
      <div key={k} className={`bk-reel__clip ${on && ready[k] ? "is-on" : ""}`}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&start=${start}&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3&fs=0`}
          title="Trecho do trailer oficial do GTA VI"
          tabIndex={-1}
          allow="autoplay; encrypted-media"
          onLoad={() => window.setTimeout(() => setReady((r) => ({ ...r, [k]: true })), 1300)}
        />
      </div>
    );
  };

  return (
    <div className="bk-reel" aria-hidden>
      {VIDEOS.map((id, i) => (
        <div key={id} className={`bk-reel__still ${still === i ? "is-on" : ""}`}>
          <img
            src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
            alt=""
            fetchPriority={i === 0 ? "high" : "low"}
            loading={i === 0 ? "eager" : "lazy"}
          />
        </div>
      ))}
      {video && clip(n, true)}
      {video && pre && clip(n + 1, false)}
      <div className="bk-reel__shade" />
    </div>
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
      className="bk-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Trailer oficial do GTA VI"
      onClick={onClose}
    >
      <div className="bk-modal__box" onClick={(e) => e.stopPropagation()}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${black.trailerId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title="Trailer oficial do GTA VI"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <button type="button" className="bk-chip bk-modal__close" onClick={onClose}>
        Fechar
      </button>
    </div>
  );
}

function Cover() {
  const game = getGame(GTA);
  const { live } = useLiveGame(GTA, true);
  const src = live?.images[0];
  const [broken, setBroken] = useState(false);
  const url = withUtm(`${STORE}/produtos/${GTA}/`, {
    content: "black-gta6",
    campaign: `black-${black.year}`,
  });
  return (
    <a
      className="bk-cover"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("links_clique", { item_name: "Black: GTA 6 na loja", item_url: url })}
    >
      {src && !broken ? (
        <img
          src={sized(src, 640)}
          alt={game?.name ?? "GTA VI"}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className="bk-cover__none">GTA VI</span>
      )}
      <span className="bk-chip">Pré-venda · PS5</span>
      <span className="bk-cover__go">
        Ver o GTA 6 na loja <ArrowUpRight className="h-4 w-4" aria-hidden />
      </span>
    </a>
  );
}

function Faq() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="bk-faq">
      {blackFaq.map((g) => (
        <div key={g.group} className="contents">
          <p className="bk-faq__g bk-tag">{g.group}</p>
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
                  <div className={`bk-faq__a ${on ? "is-on" : ""}`}>
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
  const ev = (uid: string, a: string, b: string, t: string, d: string) => [
    "BEGIN:VEVENT",
    `UID:${uid}-${black.year}@lojasoccergames.com.br`,
    `DTSTART:${a}`,
    `DTEND:${b}`,
    `SUMMARY:${t}`,
    `DESCRIPTION:${d}`,
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
      "Lançamento do GTA VI. O preço sai primeiro no Grupo VIP.",
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

export function BlackPage() {
  const now = useNow();
  const [total, setTotal] = useState<number | null>(null);
  const [bar, setBar] = useState(false);
  const [movie, setMovie] = useState(false);
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

  const { target } = phaseAt(now ?? Date.parse("2026-10-26T12:00:00-03:00"));
  const left = split(target && now ? Math.max(0, target - now) : 0);
  const clock = now ? `${left.d}d ${left.h}:${left.m}:${left.s}` : "··";

  return (
    <div className="bk" data-theme="escuro">
      <header className="bk-nav">
        <a
          href="/"
          className="bk-nav__logo"
          aria-label="Soccer Games"
          onClick={() => track("links_clique", { item_name: "Black: logo" })}
        >
          <img src="/logo-soccer.png" alt="" width={34} height={34} className="h-[34px] w-[34px]" />
          <b>Soccer Games</b>
        </a>
        <nav className="bk-nav__links" aria-label="Seções">
          <a href="#gta">
            <span>01</span>GTA 6
          </a>
          <a href="#duvidas">
            <span>02</span>Dúvidas
          </a>
          <a href="#entrar">
            <span>03</span>Grupo VIP
          </a>
        </nav>
        <div className="bk-nav__right">
          <span className="bk-nav__status bk-tag">
            <i className="bk-dot" aria-hidden /> Grupo VIP aberto
          </span>
          <button type="button" className="bk-nav__cta" onClick={() => toForm("menu")}>
            Entrar no VIP <ArrowUpRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </header>

      <aside className="bk-rail" aria-hidden>
        <span>Black Soccer {black.year}</span>
        <i />
        <span>GTA 6 · 19.11</span>
      </aside>

      <main className="bk-main">
        {/* TOPO */}
        <section className="bk-hero" aria-labelledby="bk-h1">
          <Reel />
          <div className="bk-hud">
            <span className="bk-chip">
              <i className="bk-rec" aria-hidden /> Trailer oficial
            </span>
            <button type="button" className="bk-chip" onClick={openMovie}>
              <Play className="h-3 w-3" fill="currentColor" aria-hidden /> Ver com som
            </button>
          </div>

          <div className="bk-hero__body bk-pad">
            <span className="bk-corner" aria-hidden />
            <div>
              <p className="bk-tag bk-tag--ac">Black Soccer {black.year}</p>
              <h1 id="bk-h1" className="bk-h">
                GTA 6 na Black
                <br />
                <span className="dim">da Soccer.</span>
              </h1>
              <p className="bk-lede">
                O GTA 6 chega dia <b>19/11</b>. O preço do <b>fim de semana do lançamento</b> e da{" "}
                <b>Black Friday (27 a 30/11)</b> vai primeiro para o Grupo VIP, no WhatsApp.
              </p>
              <button
                type="button"
                onClick={icsDownload}
                className="mt-6 inline-flex items-center gap-2 text-[13px] text-white/65 underline underline-offset-4 hover:text-white"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden /> Salvar as datas na agenda
              </button>
            </div>
            <div ref={formRef} id="cadastro" style={{ scrollMarginTop: 90 }}>
              <SignupForm id="topo" total={total} title="Entre antes de todo mundo." />
            </div>
          </div>

          <div className="bk-strip">
            {(
              [
                [["antes", "lancamento"], "Lançamento", "19/11", "GTA 6 para PS5"],
                [["pre"], "Fim de semana", "20 a 22/11", "Do GTA, com live na sexta"],
                [["entre", "black"], "Black Friday", "27 a 30/11", "Até a Cyber Monday"],
              ] as [Phase[], string, string, string][]
            ).map(([ph, l, d, s]) => (
              <div key={l} className={ph.includes(phase) ? "is-now" : ""}>
                <span className="bk-tag">{l}</span>
                <b>{d}</b>
                <small>{s}</small>
              </div>
            ))}
            <div role="timer" aria-label="Contagem regressiva">
              <span className="bk-tag">{phase === "fim" ? "Black 2026" : "Faltam"}</span>
              <b>{phase === "fim" ? "Encerrada" : clock}</b>
              <small>
                {phase === "fim" ? "Ofertas seguem no grupo" : `para ${COUNT_TO[phase]}`}
              </small>
            </div>
          </div>
        </section>

        {/* GTA 6 E O GRUPO */}
        <section
          id="gta"
          className="bk-cells"
          aria-label="GTA 6 e o Grupo VIP"
          style={{ scrollMarginTop: 60 }}
        >
          <div className="bk-cell bk-cell--img">
            <Cover />
          </div>
          <div className="bk-cell">
            <span className="bk-tag">No grupo</span>
            <h3>Só aviso. Nada de conversa.</h3>
            <p>Só os administradores mandam mensagem. Você sai quando quiser.</p>
            <ul className="bk-list">
              <li>
                <span>Preço do GTA 6</span>
                <span>Primeiro</span>
              </li>
              <li>
                <span>Ofertas da semana</span>
                <span>Até 18/11</span>
              </li>
              <li>
                <span>Horário da live</span>
                <span>20/11</span>
              </li>
              <li>
                <span>Lembretes da Black</span>
                <span>27 a 30/11</span>
              </li>
            </ul>
          </div>
          <div className="bk-cell">
            <span className="bk-tag">Compra</span>
            <h3>Mídia digital com garantia.</h3>
            <p>Os dados de acesso chegam no seu e-mail. PS4 e PS5.</p>
            <ul className="bk-list">
              <li className="ok">
                <span>Entrega por e-mail</span>
                <span>OK</span>
              </li>
              <li className="ok">
                <span>Pix, em geral em até 30 min</span>
                <span>OK</span>
              </li>
              <li className="ok">
                <span>Garantia vitalícia</span>
                <span>OK</span>
              </li>
              <li className="ok">
                <span>Primária ou secundária</span>
                <span>OK</span>
              </li>
            </ul>
          </div>
          <div className="bk-cell">
            <span className="bk-tag">Agenda</span>
            <h3>Tudo no mesmo grupo.</h3>
            <p>Do aquecimento à Cyber Monday.</p>
            <ol className="bk-agenda">
              {AGENDA.map((a) => (
                <li key={a.t} className={state(a.ph, phase)}>
                  <b>
                    {a.d} · {a.t}
                  </b>
                  <span>{a.s}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* DÚVIDAS */}
        <section id="duvidas" aria-labelledby="bk-faq" style={{ scrollMarginTop: 60 }}>
          <div className="bk-head bk-pad">
            <div>
              <p className="bk-tag bk-tag--ac">Antes de entrar</p>
              <h2 id="bk-faq" className="bk-h">
                Dúvidas <span className="dim">frequentes.</span>
              </h2>
            </div>
          </div>
          <div className="bk-pad">
            <Faq />
          </div>
        </section>

        {/* FECHAMENTO */}
        <section
          id="entrar"
          className="bk-final bk-pad"
          aria-labelledby="bk-final"
          style={{ scrollMarginTop: 60 }}
        >
          <div>
            <p className="bk-tag bk-tag--ac">Grupo VIP</p>
            <h2 id="bk-final" className="bk-h">
              O preço sai
              <br />
              <span className="dim">primeiro aqui.</span>
            </h2>
            <p className="bk-lede">
              Nome e WhatsApp, e o grupo abre na hora. Leva menos de um minuto.
            </p>
          </div>
          <div ref={finalRef}>
            <SignupForm id="final" total={total} askEmail />
          </div>
        </section>

        {/* ATENDIMENTO */}
        <nav className="bk-help" aria-label="Atendimento">
          {[
            {
              I: LifeBuoy,
              k: "Suporte",
              t: "Central de Atendimento",
              d: "Entrega, ativação, licenças e garantia",
              u: withUtm(`${STORE}/central-de-atendimento/`, {
                content: "black-central",
                campaign: `black-${black.year}`,
              }),
            },
            { I: Gamepad2, k: "Catálogo", t: "Ver os jogos", d: "Jogos de PS4 e PS5", u: "/" },
            {
              I: MessageCircle,
              k: "Seg a sáb, 9h às 21h · dom, 9h às 15h",
              t: "Falar no WhatsApp",
              d: "Dúvida antes de comprar",
              u: `https://wa.me/${WA}?text=${encodeURIComponent("Olá! Vim pela página da Black da Soccer.")}`,
            },
          ].map(({ I, k, t, d, u }) => (
            <a
              key={t}
              href={u}
              {...(u.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })}
              onClick={() => track("links_clique", { item_name: `Black: ${t}`, item_url: u })}
            >
              <span>
                <span className="bk-tag">{k}</span>
                <b>{t}</b>
                <em>{d}</em>
              </span>
              <I className="h-4 w-4 shrink-0" strokeWidth={1.6} aria-hidden />
            </a>
          ))}
        </nav>
        <footer className="bk-foot bk-pad">
          <span className="bk-tag">Soccer Games · lojasoccergames.com.br</span>
          <span className="bk-tag">GTA VI é marca da Rockstar Games</span>
        </footer>
      </main>

      {/* barra fixa no celular */}
      <div className={`bk-bar ${bar ? "is-on" : ""}`}>
        <span className="bk-bar__t">
          <b>{phase !== "fim" ? clock : "Grupo VIP"}</b>
          {phase !== "fim" ? `para ${COUNT_TO[phase]}` : "Ofertas no grupo"}
        </span>
        <button type="button" onClick={() => toForm("barra")}>
          Entrar no VIP
        </button>
      </div>

      {movie && <TrailerModal onClose={() => setMovie(false)} />}
    </div>
  );
}
