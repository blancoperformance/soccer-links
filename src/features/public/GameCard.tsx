import { useEffect, useRef, useState } from "react";
import { Gamepad2 } from "lucide-react";
import { withUtm } from "@/lib/utm";
import { track } from "@/lib/tracking";
import { productUrl, type Game } from "./games";
import { brl, liveSync, livePriceFrom, loadGame, sized, type LiveGame } from "./store";

/** Dados ao vivo do jogo, carregados quando o cartão aparece na tela. */
export function useLiveGame(slug: string, eager = false) {
  const [live, setLive] = useState<LiveGame | null>(() => liveSync(slug));
  const [done, setDone] = useState(Boolean(liveSync(slug)));
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let alive = true;
    const cached = liveSync(slug);
    setLive(cached);
    setDone(Boolean(cached));
    if (cached) return;
    const go = () =>
      void loadGame(slug).then((g) => {
        if (!alive) return;
        setLive(g);
        setDone(true);
      });
    if (eager || !ref.current || !("IntersectionObserver" in window)) {
      go();
      return () => {
        alive = false;
      };
    }
    const io = new IntersectionObserver(
      (en) => {
        if (en.some((e) => e.isIntersecting)) {
          io.disconnect();
          go();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(ref.current);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [slug, eager]);
  return { live, done, ref };
}

export function Cover({
  game,
  live,
  done,
  w = 480,
  className = "",
}: {
  game: Game;
  live: LiveGame | null;
  done: boolean;
  w?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const src = live?.images[0];
  useEffect(() => setBroken(false), [src]);
  return (
    <span
      className={`relative block aspect-square overflow-hidden rounded-[14px] bg-mts-photo ${className}`}
    >
      {src && !broken ? (
        <img
          key={src}
          src={sized(src, w)}
          alt={game.name}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            // Se o tamanho reduzido não existir no CDN, tenta a foto original.
            const img = e.currentTarget;
            if (img.dataset["full"] !== "1") {
              img.dataset["full"] = "1";
              img.src = src;
            } else setBroken(true);
          }}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <span
          className={`absolute inset-0 flex flex-col items-center justify-center gap-2 p-3 text-center ${done ? "" : "animate-pulse"}`}
        >
          <Gamepad2 className="h-6 w-6 text-mts-muted" strokeWidth={1.3} aria-hidden />
          {done && (
            <span className="font-display line-clamp-3 text-[13px] font-semibold leading-tight text-mts-text">
              {game.short}
            </span>
          )}
        </span>
      )}
      <span className="absolute left-2 top-2 flex gap-1">
        {game.platforms.map((p) => (
          <span
            key={p}
            className="rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-white backdrop-blur-sm"
          >
            {p}
          </span>
        ))}
      </span>
      {game.collections.includes("pre-venda") && (
        <span className="absolute bottom-2 left-2 rounded-full bg-mts-ink px-2 py-0.5 text-[10px] font-semibold text-mts-on-ink">
          Pré-venda
        </span>
      )}
    </span>
  );
}

export function GameCard({
  game,
  showPrices,
  onOpen,
  content,
}: {
  game: Game;
  showPrices: boolean;
  onOpen: (g: Game) => boolean | void;
  content?: string;
}) {
  const { live, done, ref } = useLiveGame(game.slug);
  const price = livePriceFrom(live);
  const from = live?.variants.find((v) => v.available && v.price === price)?.from ?? null;
  const out =
    done && live !== null && live.variants.length > 0 && !live.variants.some((v) => v.available);
  return (
    <a
      ref={ref as React.Ref<HTMLAnchorElement>}
      href={withUtm(productUrl(game), { content: content ?? game.slug })}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => {
        track("links_clique", { item_name: game.name, item_url: productUrl(game) });
        if (onOpen(game)) e.preventDefault();
      }}
      className="group block"
    >
      <Cover game={game} live={live} done={done} />
      <p className="mt-2.5 line-clamp-2 text-[13px] leading-snug text-mts-text">{game.short}</p>
      {showPrices && price !== null && !out && (
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1.5 text-[13px]">
          <span className="text-mts-muted">a partir de</span>
          <span className="font-semibold tabular-nums text-mts-text">{brl(price)}</span>
          {from && <span className="text-[11px] text-mts-muted line-through">{brl(from)}</span>}
        </p>
      )}
      {out && <p className="mt-0.5 text-[12px] text-mts-muted">Esgotado no momento</p>}
    </a>
  );
}

export function GameGrid({
  games,
  showPrices,
  onOpen,
  content,
}: {
  games: Game[];
  showPrices: boolean;
  onOpen: (g: Game) => boolean | void;
  content?: string;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-7">
      {games.map((g) => (
        <GameCard
          key={g.slug}
          game={g}
          showPrices={showPrices}
          onOpen={onOpen}
          {...(content ? { content } : {})}
        />
      ))}
    </div>
  );
}
