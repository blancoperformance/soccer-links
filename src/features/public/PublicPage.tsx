import type React from "react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  CircleHelp,
  Clock,
  Crown,
  FileText,
  Gamepad2,
  KeyRound,
  LifeBuoy,
  Mail,
  MessageCircle,
  PackageSearch,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Ticket,
  X,
  Youtube,
  Instagram,
  type LucideIcon,
} from "lucide-react";
import { withUtm } from "@/lib/utm";
import { isPubliclyVisible } from "@/lib/schedule";
import { loadClarity, loadGtm, memory, track } from "@/lib/tracking";
import type { IconName, LinkItem, QuizQuestion } from "./content";
import { Quiz } from "./Quiz";
import { GameSheet } from "./GameSheet";
import { GameGrid, useLiveGame, Cover } from "./GameCard";
import {
  games,
  genreChips,
  gamesForChip,
  getGame,
  isGame,
  searchGames,
  shelves,
  STORE,
  type Game,
} from "./games";
import { loadCatalog } from "./store";
import { DealsBanner, Offers } from "./Offers";
import { BagBar } from "./BagBar";

function WhatsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3z" />
    </svg>
  );
}

const socialIcons: Record<string, () => React.ReactElement> = {
  instagram: () => <Instagram className="h-[22px] w-[22px]" aria-hidden />,
  youtube: () => <Youtube className="h-[22px] w-[22px]" aria-hidden />,
  whatsapp: WhatsIcon,
};

const itemIcons: Record<IconName, LucideIcon> = {
  sparkles: Sparkles,
  store: Store,
  handshake: Sparkles,
  "map-pin": Store,
  "message-circle": MessageCircle,
  mail: Mail,
  "package-search": PackageSearch,
  repeat: Sparkles,
  "life-buoy": LifeBuoy,
  "file-text": FileText,
  "circle-help": CircleHelp,
  ticket: Ticket,
  gamepad: Gamepad2,
  key: KeyRound,
  shield: ShieldCheck,
};

const stagger = (i: number): CSSProperties => ({ animationDelay: `${i * 50}ms` });
const waLink = (number: string, text: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
const PAGE = 12;
const TILE_ICONS = [Crown, Gamepad2, Sparkles, LifeBuoy, MessageCircle];
const GAME_COUNT = games.filter(isGame).length;

/** Logo da loja; sem o arquivo, mostra o nome em letras da marca. */
function Logo({ src, name, size = "lg" }: { src?: string; name: string; size?: "lg" | "sm" }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed)
    return (
      <img
        ref={(el) => {
          // A imagem pode falhar antes do React assumir a página; confere ao montar.
          if (el && el.complete && el.naturalWidth === 0) setFailed(true);
        }}
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className={size === "lg" ? "h-auto w-[132px]" : "h-7 w-auto"}
        fetchPriority={size === "lg" ? "high" : "auto"}
      />
    );
  return (
    <span
      className={`font-display font-bold uppercase leading-none tracking-[0.06em] text-mts-text ${size === "lg" ? "text-[26px]" : "text-[15px]"}`}
    >
      Soccer<span className="text-mts-accent"> Games</span>
    </span>
  );
}

function TrustIcon({ kind }: { kind: "mail" | "shield" | "clock" }) {
  const Icon = kind === "mail" ? Mail : kind === "shield" ? ShieldCheck : Clock;
  return <Icon className="h-3.5 w-3.5 text-mts-accent" strokeWidth={2} aria-hidden />;
}

const rowCls =
  "group flex w-full items-center gap-4 border-b border-mts-btn-border py-4 text-left text-mts-text transition-colors";

function LinkRow({ item }: { item: LinkItem }) {
  const Icon = item.icon ? itemIcons[item.icon] : null;
  return (
    <a
      href={withUtm(item.url!, { content: item.slug })}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => track("links_clique", { item_name: item.title, item_url: item.url })}
      className={rowCls}
    >
      {Icon ? (
        <Icon
          className="h-[18px] w-[18px] shrink-0 text-mts-accent"
          strokeWidth={1.5}
          aria-hidden
        />
      ) : (
        <span className="w-5" />
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[15px] font-medium leading-snug">{item.title}</span>
        {item.subtitle && <span className="mt-0.5 text-xs text-mts-muted">{item.subtitle}</span>}
      </span>
      <span className="text-mts-muted transition-transform group-hover:translate-x-0.5" aria-hidden>
        →
      </span>
    </a>
  );
}

function QuickAnswers({
  items,
}: {
  items: { q: string; a: string; action?: { label: string; url: string } }[];
}) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <ul className="mt-2 border-t border-mts-btn-border">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <li key={it.q} className="border-b border-mts-btn-border">
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => {
                setOpen(isOpen ? null : i);
                if (!isOpen) track("links_clique", { item_name: `Resposta rápida: ${it.q}` });
              }}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] text-mts-text"
            >
              {it.q}
              <span
                aria-hidden
                className={`relative h-3 w-3 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`}
              >
                <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
                <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current" />
              </span>
            </button>
            <div
              className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="pb-3 text-sm leading-relaxed text-mts-muted">{it.a}</p>
                {it.action && (
                  <a
                    href={withUtm(it.action.url, { content: "resposta-rapida" })}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() =>
                      track("links_clique", {
                        item_name: it.action!.label,
                        item_url: it.action!.url,
                      })
                    }
                    className="mb-4 inline-flex items-center gap-2 border border-mts-ink px-4 py-2.5 text-[13px] font-medium text-mts-text hover:bg-mts-ink hover:text-mts-on-ink"
                  >
                    {it.action.label} <span aria-hidden>→</span>
                  </a>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function useCountdown(endsAt?: string) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!endsAt) return;
    const end = new Date(endsAt).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [endsAt]);
  return left;
}

export interface Campaign {
  enabled: boolean;
  badge?: string;
  title: string;
  subtitle?: string;
  cta: string;
  url: string;
  slug: string;
  image?: string;
  endsAt?: string;
}

const isInternal = (url: string) => url.startsWith("/");

function CampaignHero({ c }: { c: Campaign }) {
  const left = useCountdown(c.endsAt);
  if (c.endsAt && left === 0) return null;
  const parts =
    left != null
      ? ([
          ["dias", Math.floor(left / 86400000)],
          ["horas", Math.floor((left / 3600000) % 24)],
          ["min", Math.floor((left / 60000) % 60)],
          ["seg", Math.floor((left / 1000) % 60)],
        ] as const)
      : null;
  const internal = isInternal(c.url);
  return (
    <a
      href={internal ? c.url : withUtm(c.url, { content: c.slug })}
      {...(internal ? {} : { target: "_blank", rel: "noopener noreferrer" })}
      onClick={() => track("links_clique", { item_name: `Banner ${c.title}`, item_url: c.url })}
      className="group mts-enter relative mt-6 block overflow-hidden rounded-[22px] border border-mts-btn-border p-6"
      style={{
        background:
          "radial-gradient(120% 90% at 100% 0%, rgba(192,0,255,.35), transparent 60%), radial-gradient(80% 70% at 0% 100%, rgba(192,0,255,.14), transparent 60%), var(--mts-btn-bg)",
      }}
    >
      {c.image && <img src={c.image} alt="" className="mb-6 aspect-[16/9] w-full object-cover" />}
      {c.badge && (
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-mts-accent">
          <span className="sg-live-dot h-1.5 w-1.5 rounded-full bg-mts-accent" aria-hidden />{" "}
          {c.badge}
        </span>
      )}
      <span className="font-display mt-3 block text-[30px] font-semibold leading-none text-mts-text">
        {c.title}
      </span>
      {c.subtitle && (
        <span className="mt-3 block max-w-[360px] text-sm leading-relaxed text-mts-muted">
          {c.subtitle}
        </span>
      )}
      {parts && (
        <span className="mt-5 flex gap-5 text-mts-text" aria-label="Tempo restante">
          {parts.map(([label, v]) => (
            <span key={label}>
              <span className="font-display block text-xl font-semibold tabular-nums">
                {String(v).padStart(2, "0")}
              </span>
              <span className="block text-[11px] text-mts-muted">{label}</span>
            </span>
          ))}
        </span>
      )}
      <span className="mt-6 inline-flex items-center gap-2 bg-mts-ink px-4 py-3 text-[14px] font-semibold text-mts-on-ink transition-opacity group-hover:opacity-90">
        {c.cta} <span aria-hidden>→</span>
      </span>
    </a>
  );
}

function Highlight({
  game,
  context,
  onOpen,
}: {
  game: Game;
  context: boolean;
  onOpen: (g: Game) => void;
}) {
  const { live, done } = useLiveGame(game.slug, true);
  return (
    <section
      className="mts-enter mt-10"
      aria-label={context ? "Do post" : "Continue de onde parou"}
    >
      <p className="text-xs text-mts-muted">
        {context ? "Você veio por este jogo" : "Continue de onde parou"}
      </p>
      <button
        type="button"
        onClick={() => onOpen(game)}
        className="mt-3 flex w-full items-center gap-4 text-left"
      >
        <span className="block w-20 shrink-0">
          <Cover game={game} live={live} done={done} w={240} />
        </span>
        <span className="text-sm text-mts-text">
          {game.name}
          <span className="mt-1 block text-xs text-mts-muted underline underline-offset-4">
            Ver o jogo
          </span>
        </span>
      </button>
    </section>
  );
}

function Shop({
  showPrices,
  onOpen,
  shelf,
  setShelf,
  chip,
  setChip,
  whatsapp,
  query,
  setQuery,
}: {
  query: string;
  setQuery: (q: string) => void;
  showPrices: boolean;
  onOpen: (g: Game) => boolean;
  shelf: string;
  setShelf: (s: string) => void;
  chip: string | null;
  setChip: (c: string | null) => void;
  whatsapp: string;
}) {
  const [count, setCount] = useState(PAGE);
  const found = useMemo(() => searchGames(query), [query]);
  const q = query.trim();
  const noResult = q.length >= 3 && found.length === 0;
  useEffect(() => {
    if (q.length < 3) return;
    const t = setTimeout(
      () => track(noResult ? "search_no_result" : "search", { query: q.toLowerCase() }),
      1500,
    );
    return () => clearTimeout(t);
  }, [q, noResult]);
  useEffect(() => setCount(PAGE), [shelf, chip, q]);

  const current = shelves.find((s) => s.id === shelf) ?? shelves[0]!;
  const chipGames = chip ? gamesForChip(chip) : null;
  const list = q ? found : (chipGames ?? current.games);
  const label = chip ? (genreChips.find((c) => c.id === chip)?.label ?? "") : current.name;

  return (
    <div>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 text-mts-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar jogo: GTA, FC 27, Spider-Man..."
          aria-label="Buscar jogo"
          className="h-12 w-full border-0 border-b border-mts-btn-border bg-transparent pl-7 pr-8 text-[15px] text-mts-text placeholder:text-mts-muted focus:border-mts-ink focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-mts-muted hover:text-mts-text"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {!q && (
        <>
          <div
            className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-8 sm:px-8"
            aria-label="Gêneros"
          >
            {genreChips.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-pressed={chip === c.id}
                onClick={() => {
                  const next = chip === c.id ? null : c.id;
                  setChip(next);
                  if (next) track("intent_select", { collection: `genero-${c.id}`, from: "chip" });
                }}
                className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] transition-colors ${chip === c.id ? "border-mts-ink bg-mts-ink text-mts-on-ink" : "border-mts-btn-border text-mts-text hover:border-mts-ink"}`}
              >
                {c.label}
              </button>
            ))}
          </div>
          {!chip && (
            <div
              className="-mx-5 mt-3 flex overflow-x-auto px-5 [scrollbar-width:none] sm:-mx-8 sm:px-8"
              role="tablist"
              aria-label="Coleções"
            >
              {shelves.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={s.id === current.id}
                  onClick={() => {
                    setShelf(s.id);
                    track("intent_select", { collection: s.id, from: "aba" });
                  }}
                  className={`shrink-0 border-b-2 px-3 py-2.5 text-[13px] transition-colors ${s.id === current.id ? "border-mts-ink font-semibold text-mts-text" : "border-transparent text-mts-muted hover:text-mts-text"}`}
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-6" aria-live="polite">
        {(q || chip) && list.length > 0 && (
          <p className="mb-4 text-xs text-mts-muted">
            {list.length} {list.length === 1 ? "jogo" : "jogos"}
            {q ? ` para "${q}"` : ` em ${label}`}
          </p>
        )}
        {list.length > 0 && (
          <GameGrid
            games={list.slice(0, count)}
            showPrices={showPrices}
            onOpen={onOpen}
            content={q ? "busca" : chip ? `genero-${chip}` : `aba-${current.id}`}
          />
        )}
        {list.length > count && (
          <button
            type="button"
            onClick={() => {
              setCount((n) => n + PAGE);
              track("links_clique", { item_name: `Ver mais: ${q ? "busca" : label}` });
            }}
            className="mt-8 flex w-full items-center justify-center border border-mts-btn-border py-3.5 text-sm font-medium text-mts-text hover:border-mts-ink"
          >
            Ver mais {Math.min(PAGE, list.length - count)} de {list.length - count}
          </button>
        )}
        {noResult && (
          <div className="py-8 text-center">
            <p className="text-sm text-mts-text">Não encontramos "{q}" aqui.</p>
            <a
              href={`https://lojasoccergames.com.br/search/?q=${encodeURIComponent(q)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("links_clique", { item_name: "Busca sem resultado: loja" })}
              className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-mts-text underline underline-offset-4"
            >
              Procurar no site da loja
            </a>
          </div>
        )}
        {!q && !chip && (
          <a
            href={withUtm(current.url, { content: `ver-todos-${current.id}` })}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => track("links_clique", { item_name: `Ver todos ${current.name}` })}
            className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-mts-text underline decoration-mts-btn-border underline-offset-[6px] hover:decoration-mts-text"
          >
            Ver {current.name.toLowerCase()} no site
          </a>
        )}
      </div>
    </div>
  );
}

export interface PublicPageProps {
  profile: { name: string; tagline: string; logo?: string; showPrices: boolean };
  socials: readonly { platform: string; label: string; url: string }[];
  items: LinkItem[];
  campaign?: Campaign;
  quiz?: QuizQuestion[];
  whatsapp?: string;
  hours?: string;
  theme?: "claro" | "escuro";
  trust?: { icon: "mail" | "shield" | "clock"; title: string; text: string }[];
  quickAnswers?: { q: string; a: string; action?: { label: string; url: string } }[];
  community?: { vip?: { enabled: boolean; title: string; sub: string; url: string } };
}

export function PublicPage({
  profile,
  socials,
  items,
  campaign,
  quiz = [],
  whatsapp = "",
  hours = "",
  theme = "claro",
  trust = [],
  quickAnswers = [],
  community,
}: PublicPageProps) {
  const [now, setNow] = useState<Date | null>(null);
  const [shelf, setShelf] = useState(shelves[0]?.id ?? "");
  const [chip, setChip] = useState<string | null>(null);
  const [quizOpen, setQuizOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [quizInitial, setQuizInitial] = useState<Record<string, string>>({});
  const [lastGame, setLastGame] = useState<Game | null>(null);
  const [context, setContext] = useState<Game | null>(null);
  const [showNav, setShowNav] = useState(false);
  const [activeSection, setActiveSection] = useState("");
  const [sheet, setSheet] = useState<{
    game: Game;
    license: "primaria" | "secundaria" | null;
  } | null>(null);

  const goTo = (id: string) =>
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );

  useEffect(() => {
    setNow(new Date());
    loadGtm();
    loadClarity();
    void loadCatalog();
    track("page_view");
    const saved = memory.get<string>("lastProduct");
    if (saved) setLastGame(getGame(saved));
    const params = new URLSearchParams(window.location.search);
    const p = params.get("p");
    if (p && getGame(p)) {
      setContext(getGame(p));
      track("context_view", { slug: p });
    }
    const c = params.get("c");
    if (c && shelves.some((s) => s.id === c)) {
      setShelf(c);
      setTimeout(() => goTo("loja"), 300);
    }
    const g = params.get("g");
    if (g && genreChips.some((x) => x.id === g)) {
      setChip(g);
      setTimeout(() => goTo("loja"), 300);
    }
    if (params.get("quiz") === "1" && quiz.length) setQuizOpen(true);
    const deep = params.get("jogo");
    if (deep && getGame(deep)) setSheet({ game: getGame(deep)!, license: null });
    const onScroll = () => setShowNav(window.scrollY > 420);
    window.addEventListener("scroll", onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    ["loja", "ideal", "atendimento", "comunidade"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    const onPop = () => {
      const slug = new URLSearchParams(window.location.search).get("jogo");
      const game = slug ? getGame(slug) : null;
      setSheet(game ? { game, license: null } : null);
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("popstate", onPop);
      io.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quizReady = quiz.length > 0;
  const visible = items.filter((i) => isPubliclyVisible(i, now ?? new Date(), quizReady));
  const vipOn = Boolean(community?.vip?.enabled && community.vip.url);

  const openGame = (g: Game, license: "primaria" | "secundaria" | null = null): boolean => {
    memory.set("lastProduct", g.slug);
    setSheet({ game: g, license });
    try {
      const u = new URL(window.location.href);
      u.searchParams.set("jogo", g.slug);
      window.history.pushState({ sgSheet: g.slug }, "", u);
    } catch {
      /* ignore */
    }
    return true;
  };
  const closeSheet = () => {
    if (window.history.state?.sgSheet) window.history.back();
    else setSheet(null);
  };
  const openQuiz = (from: string, initial: Record<string, string> = {}) => {
    track("intent_select", { intent: "quiz", from });
    setQuizInitial(initial);
    setQuizOpen(true);
  };

  const highlight = context ?? lastGame;
  const nav = [
    { id: "ofertas", label: "Ofertas" },
    { id: "loja", label: "Jogos" },
    ...(quizReady ? [{ id: "ideal", label: "Jogo ideal" }] : []),
    { id: "atendimento", label: "Atendimento" },
    ...(vipOn ? [{ id: "comunidade", label: "Grupo VIP" }] : []),
  ];

  const primary: {
    label: string;
    sub?: string | undefined;
    onClick?: () => void;
    href?: string;
    strong?: boolean;
    hot?: boolean;
    badge?: string;
  }[] = [
    ...(campaign?.enabled
      ? [{ label: campaign.title, sub: campaign.subtitle, href: campaign.url, strong: true }]
      : []),
    { label: "Ver os jogos", sub: `${GAME_COUNT} jogos de PS4 e PS5`, onClick: () => goTo("loja") },
    ...(quizReady
      ? [
          {
            label: "Qual jogo é a sua cara?",
            sub: "Responde rapidinho e a gente acha o seu",
            onClick: () => openQuiz("botao"),
            hot: true,
            badge: "1 min",
          },
        ]
      : []),
    {
      label: "Central de Atendimento",
      sub: "Entrega, ativação e licenças",
      onClick: () => goTo("atendimento"),
    },
    {
      label: "Primária ou secundária?",
      sub: "Entenda qual licença escolher",
      href: "https://lojasoccergames.com.br/ajuda-primaria-ou-secundaria/",
    },
  ];

  const sectionTitle = (t: string, sub?: string) => (
    <div>
      <h2 className="font-display flex items-center gap-2.5 text-[22px] font-semibold text-mts-text">
        <span aria-hidden className="h-5 w-1.5 rounded-full bg-mts-ink" />
        {t}
      </h2>
      {sub && <p className="mt-1 text-[13px] leading-relaxed text-mts-muted">{sub}</p>}
    </div>
  );
  const sectionCls = "mt-6 scroll-mt-20 rounded-[22px] bg-mts-column px-4 py-7 sm:px-6";

  return (
    <div data-theme={theme} className="mts-theme min-h-screen bg-mts-page font-sans">
      <nav
        aria-label="Seções"
        className={`fixed inset-x-0 top-0 z-30 flex justify-center border-b border-mts-btn-border bg-mts-column/95 backdrop-blur transition-all duration-300 ${showNav && !quizOpen && !sheet ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0"}`}
      >
        <div className="flex w-full max-w-[520px] items-center gap-3 py-2 pl-4 pr-3 sm:pl-6">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            aria-label="Voltar ao topo"
            className="shrink-0"
          >
            <Logo name={profile.name} size="sm" {...(profile.logo ? { src: profile.logo.replace(".png", "-escura.png") } : {})} />
          </button>
          <div className="flex min-w-0 flex-1 gap-5 overflow-x-auto pr-4 [mask-image:linear-gradient(to_right,black_82%,transparent)] [scrollbar-width:none]">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => goTo(n.id)}
                aria-current={activeSection === n.id ? "true" : undefined}
                className={`shrink-0 border-b-2 py-2 text-[13px] transition-colors ${activeSection === n.id ? "border-mts-ink font-medium text-mts-text" : "border-transparent text-mts-muted hover:text-mts-text"}`}
              >
                {n.label}
              </button>
            ))}
          </div>
          {campaign?.enabled ? (
            <a
              href={
                isInternal(campaign.url)
                  ? campaign.url
                  : withUtm(campaign.url, { content: `barra-topo-${campaign.slug}` })
              }
              onClick={() =>
                track("links_clique", { item_name: `Barra do topo: ${campaign.title}` })
              }
              className="shrink-0 rounded-full bg-mts-ink px-4 py-2 text-[13px] font-semibold text-mts-on-ink hover:opacity-90"
            >
              {campaign.cta}
            </a>
          ) : (
            <button
              type="button"
              onClick={() => goTo("loja")}
              className="shrink-0 rounded-[12px] bg-mts-ink px-3.5 py-2 text-[13px] font-semibold text-mts-on-ink"
            >
              Ver jogos
            </button>
          )}
        </div>
      </nav>

      <main className="mx-auto min-h-screen w-full max-w-[520px] pb-28 sm:pt-4">
        {/* topo preto, como o cabeçalho da loja */}
        <header
          className="mts-enter relative overflow-hidden bg-[#0f0f0f] px-5 pb-7 pt-6 text-white sm:rounded-[28px] sm:px-7"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 100% 0%, rgba(192,0,255,.45), transparent 55%), radial-gradient(80% 60% at 0% 100%, rgba(192,0,255,.18), transparent 60%)",
          }}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px]"
          />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2.5">
              {profile.logo && (
                <img src={profile.logo} alt="Soccer Games" width={36} height={36} className="h-9 w-9" />
              )}
            </span>
            <span className="rounded-full border border-white/25 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white/85">
              PS4 · PS5
            </span>
          </div>
          <h1 className="sr-only">{profile.name}</h1>
          <p className="font-display relative mt-6 text-[32px] font-semibold leading-[1.04]">
            Seu próximo jogo
            <br />
            <span className="text-[#d77bff]">chega no e-mail.</span>
          </p>
          <p className="relative mt-3 max-w-[340px] text-[14px] leading-relaxed text-white/70">
            {profile.tagline}
          </p>
          <form
            role="search"
            className="relative mt-5 flex h-12 items-center overflow-hidden rounded-[12px] bg-white"
            onSubmit={(e) => {
              e.preventDefault();
              goTo("loja");
            }}
          >
            <Search className="ml-4 h-4 w-4 shrink-0 text-[#6b6b73]" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goTo("loja")}
              placeholder="Buscar jogo: GTA, FC 27..."
              aria-label="Buscar jogo"
              className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-[#0f0f0f] outline-none placeholder:text-[#8d8b96] [&::-webkit-search-cancel-button]:hidden"
            />
            <button
              type="submit"
              aria-label="Buscar"
              className="flex h-full w-12 shrink-0 items-center justify-center bg-[#c000ff] text-white"
            >
              <Search className="h-4 w-4" aria-hidden />
            </button>
          </form>
          <nav className="relative mt-5 flex items-center gap-3" aria-label="Redes sociais">
            {socials.map((s) => {
              const Icon = socialIcons[s.platform];
              return (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  onClick={() => track("links_clique", { item_name: s.label, item_url: s.url })}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white transition-colors hover:border-[#c000ff] hover:bg-[#c000ff]"
                >
                  {Icon ? <Icon /> : s.label}
                </a>
              );
            })}
          </nav>
        </header>

        <div className="px-4 sm:px-0">
          {/* atalhos em blocos */}
          <div className="mts-enter mt-4 grid grid-cols-2 gap-2.5" style={stagger(1)}>
            {primary.map((b, i) => {
              const Icon = TILE_ICONS[i % TILE_ICONS.length]!;
              const wide = b.strong;
              const hot = b.hot;
              const cls = `group relative flex min-h-[112px] flex-col justify-between overflow-hidden rounded-[18px] p-4 text-left transition-transform active:scale-[.99] ${
                wide
                  ? "col-span-2 min-h-[96px] bg-[#c000ff] text-white shadow-[0_14px_40px_-16px_rgba(192,0,255,.9)]"
                  : hot
                    ? "bg-[#8a00c2] text-white"
                    : "border border-mts-btn-border bg-mts-btn text-mts-text hover:border-mts-ink"
              }`;
              const inner = (
                <>
                  {hot && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[#ff2d87] opacity-60 blur-2xl"
                    />
                  )}
                  <span className="relative flex items-start justify-between gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full ${wide || hot ? "bg-white/20 text-white" : "bg-[var(--mts-glow)] text-mts-accent"}`}
                    >
                      <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} aria-hidden />
                    </span>
                    <span
                      aria-hidden
                      className={`text-lg transition-transform group-hover:translate-x-0.5 ${wide || hot ? "text-white" : "text-mts-muted"}`}
                    >
                      {b.badge ? (
                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-black text-[#8a00c2]">
                          {b.badge}
                        </span>
                      ) : (
                        "→"
                      )}
                    </span>
                  </span>
                  <span className="relative mt-3 block">
                    <span className="font-display block text-[17px] font-semibold leading-tight">
                      {b.label}
                    </span>
                    {b.sub && (
                      <span
                        className={`mt-1 block text-[12px] leading-snug ${wide || hot ? "text-white/85" : "text-mts-muted"}`}
                      >
                        {b.sub}
                      </span>
                    )}
                  </span>
                </>
              );
              return b.href ? (
                <a
                  key={b.label}
                  href={
                    isInternal(b.href) ? b.href : withUtm(b.href, { content: "botao-principal" })
                  }
                  {...(isInternal(b.href) ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                  onClick={() => track("links_clique", { item_name: b.label, item_url: b.href })}
                  className={cls}
                >
                  {inner}
                </a>
              ) : (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => {
                    track("links_clique", { item_name: b.label });
                    b.onClick?.();
                  }}
                  className={cls}
                >
                  {inner}
                </button>
              );
            })}
          </div>

          {trust.length > 0 && (
            <ul
              className="mts-enter mt-4 flex flex-wrap gap-2"
              style={stagger(2)}
              aria-label="Garantias"
            >
              {trust.map((t) => (
                <li
                  key={t.title}
                  className="flex items-center gap-2 rounded-full border border-mts-btn-border bg-mts-btn py-1.5 pl-2 pr-3.5"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mts-glow)]">
                    <TrustIcon kind={t.icon} />
                  </span>
                  <span className="text-[12px] leading-tight text-mts-text">
                    <b className="font-semibold">{t.title}</b>{" "}
                    <span className="text-mts-muted">· {t.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          <DealsBanner onGo={() => goTo("ofertas")} />
          {highlight && (
            <Highlight game={highlight} context={Boolean(context)} onOpen={(g) => openGame(g)} />
          )}

          {campaign?.enabled && (campaign.image || campaign.endsAt) && (
            <CampaignHero c={campaign} />
          )}

          <section id="ofertas" className={sectionCls} aria-label="Ofertas">
            {sectionTitle("Caça-ofertas", "Gire a roleta ou veja os maiores descontos da loja agora.")}
            <div className="mt-5">
              <Offers onOpen={(g) => openGame(g)} />
            </div>
          </section>

          <section id="loja" className={sectionCls} aria-label="Jogos">
            {sectionTitle(
              "Jogos",
              "Procure pelo nome ou escolha o gênero. Toque no jogo para ver as licenças.",
            )}
            <div className="mt-5">
              <Shop
                showPrices={profile.showPrices}
                onOpen={openGame}
                shelf={shelf}
                setShelf={setShelf}
                chip={chip}
                setChip={setChip}
                whatsapp={whatsapp}
                query={query}
                setQuery={setQuery}
              />
            </div>
          </section>

          {quizReady && quiz[0] && (
            <section id="ideal" className={sectionCls} aria-label="Jogo ideal">
              <div
                className="relative overflow-hidden border border-mts-btn-border bg-mts-btn p-5"
                style={{
                  background:
                    "radial-gradient(90% 120% at 100% 0%, var(--mts-glow), transparent 60%), var(--mts-btn-bg)",
                }}
              >
                <span className="absolute right-4 top-4 bg-mts-ink px-2 py-1 text-[11px] font-semibold text-mts-on-ink">
                  Quiz
                </span>
                <h2 className="font-display pr-16 text-[24px] font-semibold leading-tight text-mts-text">
                  Qual vai ser o seu próximo jogo?
                </h2>
                <p className="mt-2 text-[13px] leading-relaxed text-mts-muted">
                  Poucas perguntas sobre como você joga e o que curte. A gente indica o jogo e a
                  licença.
                </p>
                <p className="mt-5 text-[13px] font-semibold text-mts-text">{quiz[0].question}</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {quiz[0].options.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => openQuiz("capa", { [quiz[0]!.id]: o.id })}
                      className="mts-button px-4 py-3.5 text-left text-[15px] font-semibold active:border-mts-ink"
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          <section id="atendimento" className={sectionCls} aria-label="Atendimento">
            {sectionTitle("Atendimento", "Resolva em um toque, sem esperar resposta.")}
            <ul className="mt-3">
              {visible.map((item) => (
                <li key={item.id}>
                  <LinkRow item={item} />
                </li>
              ))}
            </ul>
            {quickAnswers.length > 0 && (
              <div className="mt-8">
                <p className="text-[13px] font-semibold text-mts-text">Respostas rápidas</p>
                <QuickAnswers items={quickAnswers} />
              </div>
            )}
          </section>

          {vipOn && community?.vip && (
            <section id="comunidade" className={sectionCls} aria-label="Grupo VIP">
              {sectionTitle("Comunidade")}
              <a
                href={community.vip.url}
                {...(isInternal(community.vip.url)
                  ? {}
                  : { target: "_blank", rel: "noopener noreferrer" })}
                onClick={() =>
                  track("links_clique", { item_name: "Grupo VIP", item_url: community.vip!.url })
                }
                className="mts-button mt-4 flex items-center justify-between gap-4 p-4 text-left"
              >
                <span className="flex items-center gap-3">
                  <Crown
                    className="h-5 w-5 shrink-0 text-mts-accent"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span>
                    <span className="block text-[15px] font-semibold">{community.vip.title}</span>
                    <span className="mt-0.5 block text-xs text-mts-muted">{community.vip.sub}</span>
                  </span>
                </span>
                <span aria-hidden className="opacity-60">
                  →
                </span>
              </a>
            </section>
          )}

          <p className="mt-16 text-center text-[11px] text-mts-muted">
            Soccer Games ·{" "}
            <a
              href={withUtm(`${STORE}/`, { content: "rodape" })}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4"
            >
              lojasoccergames.com.br
            </a>
          </p>
        </div>
      </main>

      {quizOpen && quizReady && (
        <Quiz
          questions={quiz}
          whatsapp={whatsapp}
          initial={quizInitial}
          onClose={() => setQuizOpen(false)}
          onOpen={(g, license) => {
            setQuizOpen(false);
            openGame(g, license);
          }}
        />
      )}

      {!sheet && <BagBar />}
      {sheet && (
        <GameSheet
          game={sheet.game}
          whatsapp={whatsapp}
          suggested={sheet.license}
          onClose={closeSheet}
          onOpenOther={(g) => {
            memory.set("lastProduct", g.slug);
            setSheet({ game: g, license: sheet.license });
            try {
              const u = new URL(window.location.href);
              u.searchParams.set("jogo", g.slug);
              window.history.replaceState({ sgSheet: g.slug }, "", u);
            } catch {
              /* ignore */
            }
          }}
        />
      )}
    </div>
  );
}
