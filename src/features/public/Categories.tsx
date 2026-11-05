import { ArrowRight } from "lucide-react";
import { track } from "@/lib/tracking";
import { Cover, useLiveGame } from "./GameCard";
import { brl, livePriceFrom } from "./store";
import { getGame, GTA6_STANDARD, GTA6_ULTIMATE, type Game } from "./games";

/** Capa de cada categoria: jogos reais do catálogo (a foto vem ao vivo da loja). */
const CONSOLES = [
  { id: "ps5", label: "PS5", slug: "marvels-spider-man-2-para-ps5-midia-digital" },
  { id: "ps4", label: "PS4", slug: "god-of-war-ps4-midia-digital" },
] as const;

const GENRES = [
  { id: "futebol", label: "Futebol", slug: "ea-sports-fc-26-para-ps5-midia-digital" },
  { id: "luta", label: "Luta", slug: "tekken-7-para-ps5-midia-digital" },
  { id: "tiro", label: "Tiro", slug: "call-of-duty-modern-warfare-iii-ps4-midia-digital" },
  { id: "acao", label: "Ação e aventura", slug: "red-dead-redemption-2-ps5-midia-digital" },
  { id: "mundo-aberto", label: "Mundo aberto", slug: "hogwarts-legacy-ps5-midia-digital" },
  { id: "corrida", label: "Corrida", slug: "gran-turismo-7-ps5-midia-digital" },
  { id: "terror", label: "Terror", slug: "resident-evil-village-ps5-midia-digital" },
  { id: "rpg", label: "RPG", slug: "elden-ring-ps5-midia-digital" },
  { id: "infantil", label: "Para crianças", slug: "sonic-frontiers-para-ps5-midia-digital" },
] as const;

function Tile({
  slug,
  label,
  onClick,
  size,
}: {
  slug: string;
  label: string;
  onClick: () => void;
  size: "lg" | "sm";
}) {
  const game = getGame(slug);
  const { live, done } = useLiveGame(slug);
  if (!game) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative block shrink-0 overflow-hidden rounded-[18px] bg-[#0f0f0f] text-left transition duration-300 hover:-translate-y-0.5 active:scale-[.98] ${size === "lg" ? "w-full" : "w-[132px]"}`}
    >
      <Cover
        game={game}
        live={live}
        done={done}
        w={size === "lg" ? 480 : 260}
        bare
        className={`!rounded-none ${size === "lg" ? "!aspect-[16/10]" : ""}`}
      />
      <span className="absolute inset-x-0 bottom-0 bg-[#0f0f0f]/90 px-3 py-2.5 backdrop-blur-sm">
        <span
          className={`font-display block font-bold leading-tight text-white ${size === "lg" ? "text-[20px]" : "text-[13px]"}`}
        >
          {label}
        </span>
      </span>
    </button>
  );
}

function Version({ game, name, onOpen }: { game: Game; name: string; onOpen: (g: Game) => void }) {
  const { live } = useLiveGame(game.slug, true);
  const price = livePriceFrom(live);
  return (
    <button
      type="button"
      onClick={() => {
        track("links_clique", { item_name: `GTA 6 categoria: ${name}` });
        onOpen(game);
      }}
      className="group flex min-h-12 flex-1 flex-col items-start justify-center rounded-xl border border-white/20 px-3.5 py-2 text-left transition-colors hover:border-[#d77bff] hover:bg-white/5"
    >
      <span className="text-[14px] font-semibold text-white">{name}</span>
      {price !== null && (
        <span className="text-[12px] text-white/70">
          a partir de <b className="font-bold text-white">{brl(price)}</b>
        </span>
      )}
    </button>
  );
}

export function GtaCard({ onOpen, onShelf }: { onOpen: (g: Game) => void; onShelf: () => void }) {
  const standard = getGame(GTA6_STANDARD);
  const ultimate = getGame(GTA6_ULTIMATE);
  const { live, done } = useLiveGame(GTA6_STANDARD, true);
  if (!standard) return null;
  return (
    <section
      className="mts-enter relative mt-4 overflow-hidden rounded-[24px] bg-[#0f0f0f] p-5 text-white"
      aria-label="GTA 6"
      style={{ animationDelay: "80ms" }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-[#c000ff]/30 blur-3xl"
      />
      <p className="relative text-[13px] font-semibold text-[#d77bff]">
        Pré-venda · PS5 · chega 19/11
      </p>
      <div className="relative mt-3 grid grid-cols-[1fr_42%] items-center gap-4">
        <div>
          <h3 className="font-display text-[44px] font-black leading-[.9] tracking-[-.05em]">
            GTA 6
          </h3>
          <p className="mt-3 text-[13px] leading-relaxed text-white/70">
            Garanta o seu antes do lançamento, direto no e-mail.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            track("links_clique", { item_name: "GTA 6 categoria: capa" });
            onOpen(standard);
          }}
          aria-label="Abrir GTA 6"
          className="group block rotate-2 rounded-2xl shadow-[0_22px_36px_-12px_rgba(0,0,0,.8)] ring-1 ring-white/25 transition-transform duration-300 hover:rotate-0 hover:scale-[1.03]"
        >
          <Cover game={standard} live={live} done={done} w={420} bare />
        </button>
      </div>
      <div className="relative mt-5 flex gap-2.5">
        <Version game={standard} name="Standard" onOpen={onOpen} />
        {ultimate && <Version game={ultimate} name="Ultimate" onOpen={onOpen} />}
      </div>
      <button
        type="button"
        onClick={() => {
          track("links_clique", { item_name: "GTA 6 categoria: ver na loja" });
          onShelf();
        }}
        className="group relative mt-3.5 inline-flex items-center gap-1.5 text-[13px] text-white/75 hover:text-white"
      >
        Ver a categoria GTA 6
        <ArrowRight
          className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </button>
    </section>
  );
}

export function Categories({
  onConsole,
  onGenre,
}: {
  onConsole: (id: string) => void;
  onGenre: (id: string) => void;
}) {
  return (
    <section id="categorias" className="mt-6 scroll-mt-20" aria-label="Categorias">
      <div className="rounded-[22px] bg-mts-column px-4 py-6 sm:px-6">
        <h2 className="font-display text-[22px] font-semibold text-mts-text">
          Qual é o seu console?
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {CONSOLES.map((c) => (
            <Tile
              key={c.id}
              slug={c.slug}
              label={c.label}
              size="lg"
              onClick={() => {
                track("intent_select", { collection: c.id, from: "categoria" });
                onConsole(c.id);
              }}
            />
          ))}
        </div>
        <h2 className="font-display mt-8 text-[22px] font-semibold text-mts-text">
          Que tipo de jogo é o seu?
        </h2>
        <div className="-mx-4 mt-4 flex gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6">
          {GENRES.map((g) => (
            <Tile
              key={g.id}
              slug={g.slug}
              label={g.label}
              size="sm"
              onClick={() => {
                track("intent_select", { collection: `genero-${g.id}`, from: "categoria" });
                onGenre(g.id);
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
