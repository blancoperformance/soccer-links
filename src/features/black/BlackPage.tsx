import "./black.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  CalendarPlus,
  Gamepad2,
  LifeBuoy,
  Mail,
  MessageCircle,
  Play,
  Radio,
  Tag,
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

/** Pôr do sol de Vice City nas cores da Soccer: o degradê que assina a página. */
const SUNSET =
  "bg-gradient-to-r from-[#ffb36b] via-[#ff4fa8] to-[#c64bff] bg-clip-text text-transparent";
const GTA = "gta-6-grand-theft-auto-vi-ps5-midia-digital";
const gtaUrl = withUtm(`${STORE}/produtos/${GTA}/`, {
  content: "black-gta6",
  campaign: `black-${black.year}`,
});

/**
 * Trailer oficial do canal da Rockstar, só incorporado (nunca baixado nem recortado).
 * Fica atrás do topo: imagem do trailer em todo lugar e, no computador, o vídeo mudo em loop.
 */
function HeroBackdrop() {
  const id = black.trailerId;
  const [bg, setBg] = useState(false);
  const [bgOn, setBgOn] = useState(false);
  const [poster, setPoster] = useState(true);
  const img = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = img.current;
    if (el && el.complete && !el.naturalWidth) setPoster(false);
    const big = window.matchMedia("(min-width: 1024px)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const save = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
      ?.saveData;
    if (!big || calm || save || !id) return;
    const t = window.setTimeout(() => setBg(true), 900);
    return () => window.clearTimeout(t);
  }, [id]);
  return (
    <div className="bk-stage" aria-hidden>
      <div className="bk-stage__base" />
      {id && poster && (
        <img
          ref={img}
          className="bk-stage__poster"
          src={`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`}
          alt=""
          fetchPriority="high"
          onError={() => setPoster(false)}
        />
      )}
      {bg && (
        <div className={`bk-stage__video ${bgOn ? "is-on" : ""}`}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&playsinline=1&rel=0&modestbranding=1&disablekb=1&iv_load_policy=3`}
            title="Trailer do GTA VI ao fundo"
            tabIndex={-1}
            allow="autoplay; encrypted-media"
            onLoad={() => window.setTimeout(() => setBgOn(true), 1500)}
          />
        </div>
      )}
      <div className="bk-stage__shade" />
    </div>
  );
}

/** O trailer com som, em tela cheia, quando a pessoa toca no play. */
function TrailerModal({ onClose }: { onClose: () => void }) {
  const id = black.trailerId;
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
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title="Trailer oficial do GTA VI"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
      <button type="button" className="bk-modal__close" onClick={onClose}>
        Fechar
      </button>
    </div>
  );
}

function PlayButton({ onPlay }: { onPlay: () => void }) {
  if (!black.trailerId) return null;
  return (
    <button type="button" className="bk-play group" onClick={onPlay}>
      <span className="bk-play__ring">
        <Play className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden />
      </span>
      <span className="text-left">
        <b className="block text-[14px] font-semibold text-white">Assistir ao trailer</b>
        <span className="block text-[12px] text-white/60">Oficial · Rockstar Games</span>
      </span>
    </button>
  );
}

/** Capa real do GTA 6, puxada da loja. Sem foto: um bloco com o nome. */
function GtaCover() {
  const game = getGame(GTA);
  const { live } = useLiveGame(GTA, true);
  const src = live?.images[0];
  const [broken, setBroken] = useState(false);
  return (
    <span className="bk-case">
      {src && !broken ? (
        <img
          src={sized(src, 640)}
          alt={game?.name ?? "GTA VI"}
          loading="lazy"
          onError={() => setBroken(true)}
        />
      ) : (
        <span className={`bk-case__none font-display ${SUNSET}`}>GTA VI</span>
      )}
    </span>
  );
}

export function BlackPage() {
  const now = useNow();
  const [total, setTotal] = useState<number | null>(null);
  const [bar, setBar] = useState(false);
  const [movie, setMovie] = useState(false);
  const openMovie = () => {
    setMovie(true);
    track("links_clique", { item_name: "Black: trailer GTA VI" });
  };
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
      ph: ["antes"],
      icon: Zap,
      t: "Ofertas da semana",
      d: "Até 18/11, toda semana tem oferta com preço baixo direto no site, sem cupom. O aviso sai primeiro no grupo.",
    },
    {
      n: "02",
      ph: ["lancamento"],
      icon: Gamepad2,
      t: "O GTA 6 chega, dia 19",
      d: "No dia do lançamento, o preço do GTA 6 na Soccer é avisado primeiro no Grupo VIP.",
    },
    {
      n: "03",
      ph: ["pre"],
      icon: Radio,
      t: "Fim de semana do GTA",
      d: `De 20 a 22/11, os preços da loja descem para a abertura da Black. Live na ${black.liveDay}.`,
    },
    {
      n: "04",
      ph: ["entre", "black"],
      icon: Tag,
      t: "Black Friday, 27 a 30",
      d: "A Black da Soccer, com o GTA 6 junto, até a Cyber Monday. Quem está no grupo vê cada oferta antes.",
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
        <div className="absolute bottom-[-30%] right-[-10%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(closest-side,rgba(255,79,168,.14),transparent)] blur-2xl" />
        <div className="absolute bottom-[-25%] left-[-12%] h-[480px] w-[480px] rounded-full bg-[radial-gradient(closest-side,rgba(255,150,80,.08),transparent)] blur-2xl" />
      </div>

      <div className="relative">
        <HeroBackdrop />
        <header className="relative z-10 mx-auto flex w-full max-w-[1200px] items-center justify-between px-6 py-5">
          <a
            href="/"
            aria-label="Soccer Games"
            className="flex items-center"
            onClick={() => track("links_clique", { item_name: "Black: logo" })}
          >
            <img
              src="/logo-soccer.png"
              alt="Soccer Games"
              width={40}
              height={40}
              className="h-10 w-10"
            />
          </a>
          <span className="flex items-center gap-2 text-[12px] text-white/70">
            <span className="sg-live-dot h-1.5 w-1.5 rounded-full bg-[#c64bff]" aria-hidden />
            Black {black.year} · GTA 6
          </span>
        </header>

        {/* HERO: no celular, título, cadastro e depois a contagem; no computador, cadastro à direita */}
        <section className="relative z-10 mx-auto grid w-full max-w-[1200px] gap-10 px-6 pb-16 pt-[min(52vw,300px)] sm:pt-24 lg:min-h-[calc(100svh-80px)] lg:grid-cols-[1fr_460px] lg:content-center lg:gap-x-16 lg:gap-y-10 lg:pb-28 lg:pt-10">
          <div className="lg:col-start-1 lg:row-start-1">
            <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.18em] text-[#ff9bd0]">
              <span className="h-px w-6 bg-gradient-to-r from-[#ffb36b] to-[#ff4fa8]" aria-hidden />
              GTA 6 · 19 de novembro
            </p>
            <h1 className="font-display mt-4 text-[clamp(50px,10vw,108px)] font-bold leading-[.92] tracking-[-0.055em] [text-shadow:0_2px_40px_rgba(0,0,0,.35)]">
              GTA 6
              <br />
              <span className={`${SUNSET} [text-shadow:none]`}>na Black</span>
              <br />
              da Soccer.
            </h1>
            <p className="mt-5 max-w-[460px] text-[16px] leading-relaxed text-white/80 sm:text-[17px]">
              O GTA 6 chega dia 19/11. O preço do fim de semana do lançamento e da Black Friday, de
              27 a 30/11, sai primeiro no Grupo VIP.
            </p>
          </div>

          <div
            ref={formRef}
            id="cadastro"
            className="relative scroll-mt-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center"
          >
            <div className="relative border border-white/15 bg-[#0b0910]/70 p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,.8)] backdrop-blur-xl sm:p-8">
              <span
                aria-hidden
                className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#ffb36b] via-[#ff4fa8] to-[#c000ff]"
              />
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
            <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
              <PlayButton onPlay={openMovie} />
              <button
                type="button"
                onClick={icsDownload}
                className="inline-flex items-center gap-2 text-[13px] text-white/70 underline underline-offset-4 hover:text-white"
              >
                <CalendarPlus className="h-4 w-4" aria-hidden /> Salvar as datas na agenda
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* MISSÃO PRINCIPAL: GTA 6 */}
      <section
        className="relative z-10 mx-auto w-full max-w-[1200px] px-6 pb-16 pt-4 lg:pb-24"
        aria-labelledby="bk-gta"
      >
        <div className="grid overflow-hidden border border-white/12 bg-white/[.025] md:grid-cols-[minmax(0,380px)_1fr]">
          <a
            href={gtaUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              track("links_clique", { item_name: "Black: GTA 6 na loja", item_url: gtaUrl })
            }
            className="relative block border-b border-white/10 md:border-b-0 md:border-r"
          >
            <GtaCover />
            <span className="absolute left-4 top-4 bg-[#060608]/80 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              Pré-venda · PS5
            </span>
          </a>
          <div className="relative flex flex-col justify-center p-6 sm:p-10">
            <span
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(255,79,168,.18),transparent)] blur-2xl"
            />
            <p className="relative text-[12px] font-semibold uppercase tracking-[0.18em] text-[#ff9bd0]">
              Missão principal
            </p>
            <h2
              id="bk-gta"
              className="font-display relative mt-3 text-[clamp(28px,3.3vw,42px)] font-bold leading-[1.04] tracking-[-0.045em]"
            >
              O GTA 6 chega dia 19.{" "}
              <span className="text-white/45">O preço sai primeiro no grupo.</span>
            </h2>
            <div className="relative mt-7 grid grid-cols-3 gap-4 border-t border-white/12 pt-5">
              {(
                [
                  ["Lançamento", "19/11", phase === "antes" || phase === "lancamento"],
                  ["Fim de semana", "20 a 22/11", phase === "pre"],
                  ["Black Friday", "27 a 30/11", phase === "entre" || phase === "black"],
                ] as const
              ).map(([l, d, on]) => (
                <p key={l}>
                  <span className="block text-[11px] text-white/55 sm:text-[12px]">{l}</span>
                  <b
                    className={`font-display mt-1 block text-[17px] font-semibold sm:text-[22px] ${on ? SUNSET : "text-white"}`}
                  >
                    {d}
                  </b>
                </p>
              ))}
            </div>
            <div className="relative mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <button
                type="button"
                onClick={toForm}
                className="flex min-h-[52px] items-center gap-6 bg-white px-6 text-[15px] font-semibold text-[#060608] transition-colors hover:bg-[#c000ff] hover:text-white"
              >
                Quero o preço primeiro <ArrowUpRight className="h-5 w-5" aria-hidden />
              </button>
              <PlayButton onPlay={openMovie} />
            </div>
          </div>
        </div>
      </section>

      {/* faixa */}
      <div className="relative z-10 overflow-hidden border-y border-white/10 py-4 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
        <div className="flex w-max animate-[sg-marquee_36s_linear_infinite] gap-10 whitespace-nowrap motion-reduce:animate-none">
          {[0, 1].map((k) => (
            <span key={k} className="flex gap-10" aria-hidden={k === 1}>
              {[
                "GTA 6 dia 19/11",
                "Fim de semana do GTA",
                "Live na sexta, 20/11",
                "Black Friday de 27 a 30/11",
                "Entrega por e-mail",
                "Garantia vitalícia",
                "PS4 e PS5",
              ].map((t) => (
                <span
                  key={t}
                  className="font-display flex items-center gap-10 text-[20px] font-medium text-white/85"
                >
                  {t} <span className={SUNSET}>✦</span>
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
        <p className="text-[12px] text-white/55">O que vai ter na Black da Soccer</p>
        <h2
          id="bn-what"
          className="font-display mt-3 max-w-[720px] text-[clamp(32px,5vw,58px)] font-semibold leading-[1.02]"
        >
          Quatro missões. <span className="text-white/40">Um grupo só.</span>
        </h2>
        <div className="mt-12 grid border-y border-white/10 md:grid-cols-2 lg:grid-cols-4">
          {what.map((w, i) => (
            <article
              key={w.n}
              className={`group relative overflow-hidden px-1 py-8 md:px-7 ${i ? "border-t border-white/10" : ""} ${i % 2 ? "md:border-l" : ""} ${i === 1 ? "md:border-t-0" : ""} ${i ? "lg:border-l lg:border-t-0" : ""}`}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 [background:radial-gradient(420px_circle_at_50%_120%,rgba(192,0,255,.22),transparent_65%)] group-hover:opacity-100"
              />
              {w.ph.includes(phase) && (
                <span
                  className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[#ffb36b] via-[#ff4fa8] to-[#c000ff]"
                  aria-hidden
                />
              )}
              <div className="relative flex items-start justify-between">
                <span className="flex flex-col gap-4">
                  <w.icon className="h-6 w-6 text-[#c64bff]" strokeWidth={1.4} aria-hidden />
                  <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/50">
                    Missão {w.n}
                    {w.ph.includes(phase) && (
                      <span className="flex items-center gap-1.5 text-[#ff9bd0]">
                        <span
                          className="sg-live-dot h-1.5 w-1.5 rounded-full bg-[#ff4fa8]"
                          aria-hidden
                        />
                        {phase === "entre" ? "próxima" : "agora"}
                      </span>
                    )}
                  </span>
                </span>
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
            { I: Gamepad2, t: "Ver os jogos", d: "Jogos de PS4 e PS5", u: "/" },
            {
              I: MessageCircle,
              t: "Falar no WhatsApp",
              d: "Dúvida antes de comprar",
              u: `https://wa.me/${WA}?text=${encodeURIComponent("Olá! Vim pela página da Black da Soccer.")}`,
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
              : "Black 2026"}
          </b>
          {phase === "antes"
            ? "para o GTA 6"
            : phase === "lancamento"
              ? "para o fim de semana do GTA"
              : phase === "black"
                ? "para o fim da Black"
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
      {movie && <TrailerModal onClose={() => setMovie(false)} />}
    </div>
  );
}
