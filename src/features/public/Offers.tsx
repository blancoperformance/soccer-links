/**
 * "Caça-ofertas": tudo aqui vem dos preços reais da loja (preço de / por da Nuvemshop).
 * Nada de número inventado: sem oferta real, o bloco não aparece.
 *  - Faixa com o maior desconto do dia.
 *  - Roleta: gira pelas capas e para numa oferta de verdade (do console escolhido).
 *  - Ranking dos maiores descontos, com quanto a pessoa economiza.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Flame, RotateCw, Sparkles, Timer } from "lucide-react";
import { track } from "@/lib/tracking";
import { games, isGame, type Game } from "./games";
import { brl, loadCatalog, sized, type LiveGame } from "./store";
import { offers as offersCfg } from "./content";

export interface Deal {
  game: Game;
  live: LiveGame;
  price: number;
  from: number;
  pct: number;
  save: number;
  license: string;
}

/** Melhor oferta de cada jogo (a licença com maior desconto real). */
export function dealsFrom(cat: Record<string, LiveGame>): Deal[] {
  const out: Deal[] = [];
  for (const g of games) {
    if (!isGame(g)) continue;
    const live = cat[g.slug];
    if (!live) continue;
    let best: Deal | null = null;
    for (const v of live.variants) {
      if (!v.available || v.price == null || v.from == null || v.from <= v.price) continue;
      const pct = Math.round((1 - v.price / v.from) * 100);
      if (pct < 5) continue;
      if (!best || pct > best.pct)
        best = { game: g, live, price: v.price, from: v.from, pct, save: v.from - v.price, license: v.label };
    }
    if (best) out.push(best);
  }
  return out.sort((a, b) => b.pct - a.pct || b.save - a.save);
}

function useDeals() {
  const [deals, setDeals] = useState<Deal[] | null>(null);
  useEffect(() => {
    let on = true;
    void loadCatalog().then((cat) => on && setDeals(cat ? dealsFrom(cat) : []));
    return () => {
      on = false;
    };
  }, []);
  return deals;
}

function useCountdown(iso: string | undefined) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!iso) return;
    const end = new Date(iso).getTime();
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [iso]);
  return left;
}

const pad = (n: number) => String(n).padStart(2, "0");

function Countdown({ ms }: { ms: number }) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const parts = [
    ...(d > 0 ? [[d, "d"] as const] : []),
    [Math.floor((s % 86400) / 3600), "h"] as const,
    [Math.floor((s % 3600) / 60), "min"] as const,
    [s % 60, "s"] as const,
  ];
  return (
    <span className="inline-flex gap-1 tabular-nums">
      {parts.map(([n, u]) => (
        <span key={u} className="rounded-md bg-white/15 px-1.5 py-0.5 text-[13px] font-bold">
          {pad(n)}
          <span className="ml-0.5 text-[10px] font-semibold opacity-70">{u}</span>
        </span>
      ))}
    </span>
  );
}

const img = (d: Deal, w = 320) => (d.live.images[0] ? sized(d.live.images[0], w) : "");

/** Faixa do topo: "Hoje tem jogo com até 84% OFF" + contagem da campanha da loja. */
export function DealsBanner({ onGo }: { onGo: () => void }) {
  const deals = useDeals();
  const left = useCountdown(offersCfg.endsAt);
  if (!deals?.length) return null;
  const top = deals[0]!;
  const live = left != null && left > 0;
  return (
    <button
      type="button"
      onClick={() => {
        track("links_clique", { item_name: "Ofertas: faixa do topo" });
        onGo();
      }}
      className="mt-3 flex w-full items-center gap-3 overflow-hidden rounded-[18px] bg-gradient-to-r from-[#8a00c2] to-[#ff2d87] px-4 py-3 text-left text-white shadow-[0_8px_24px_-12px_rgba(138,0,194,.8)]"
    >
      <Flame className="h-6 w-6 shrink-0 animate-pulse" aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-extrabold leading-tight">
          Hoje tem jogo com até {top.pct}% OFF
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/85">
          {live ? (
            <>
              <Timer className="h-3.5 w-3.5" aria-hidden /> {offersCfg.label} acaba em <Countdown ms={left!} />
            </>
          ) : (
            <>{deals.length} jogos com desconto agora. Toque para caçar o seu.</>
          )}
        </span>
      </span>
    </button>
  );
}

/** Roleta + ranking. */
export function Offers({ onOpen }: { onOpen: (g: Game) => void }) {
  const deals = useDeals();
  const [plat, setPlat] = useState<"PS5" | "PS4">("PS5");
  const [spinning, setSpinning] = useState(false);
  const [face, setFace] = useState<Deal | null>(null);
  const [won, setWon] = useState<Deal | null>(null);
  const [spins, setSpins] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const timer = useRef<number | null>(null);

  const pool = useMemo(
    () => (deals ?? []).filter((d) => d.game.platforms.includes(plat)),
    [deals, plat],
  );
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  useEffect(() => {
    setWon(null);
    setFace(null);
  }, [plat]);

  if (!deals || deals.length === 0) return null;

  const spin = () => {
    if (spinning || pool.length === 0) return;
    // prêmio: uma das melhores ofertas do console (top 24), sem repetir a última
    const top = pool.slice(0, 24).filter((d) => d !== won);
    const prize = top[Math.floor(Math.random() * top.length)] ?? pool[0]!;
    // pré-carrega as capas para a roleta não piscar
    pool.slice(0, 16).forEach((d) => {
      const s = img(d);
      if (s) new Image().src = s;
    });
    setSpinning(true);
    setWon(null);
    track("links_clique", { item_name: `Roleta: girou (${plat})` });
    let step = 0;
    const total = 22;
    const next = () => {
      step++;
      if (step >= total) {
        setFace(prize);
        setWon(prize);
        setSpinning(false);
        setSpins((n) => n + 1);
        if (navigator.vibrate) navigator.vibrate(40);
        track("links_clique", { item_name: `Roleta: ${prize.game.slug} (-${prize.pct}%)` });
        return;
      }
      setFace(pool[Math.floor(Math.random() * Math.min(pool.length, 30))]!);
      // começa rápido e vai freando
      timer.current = window.setTimeout(next, 30 + step * step * 0.8);
    };
    next();
  };

  const ranking = pool.slice(0, showAll ? 30 : 6);

  return (
    <div>
      <div className="flex gap-1 rounded-full bg-white p-1 text-sm font-semibold shadow-sm">
        {(["PS5", "PS4"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPlat(p)}
            className={`h-9 flex-1 rounded-full transition ${plat === p ? "bg-mts-text text-white" : "text-mts-muted"}`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Roleta */}
      <div className="relative mt-4 overflow-hidden rounded-[22px] bg-[#0f0f0f] p-5 text-white">
        <span
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#8a00c2] opacity-40 blur-3xl"
        />
        <p className="relative flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#d77bff]">
          <Sparkles className="h-4 w-4" aria-hidden /> Roleta das ofertas
        </p>
        <p className="relative mt-1 text-[15px] text-white/80">
          Gire e veja qual oferta de {plat} caiu para você.
        </p>

        <div className="relative mx-auto mt-4 flex aspect-square w-[min(100%,260px)] items-center justify-center overflow-hidden rounded-2xl bg-white/5 ring-2 ring-[#8a00c2]/60">
          {face && img(face) ? (
            <img
              src={img(face, 480)}
              alt={won ? face.game.name : ""}
              className={`h-full w-full object-cover ${spinning ? "scale-95 blur-[1px]" : "scale-100"} transition-transform duration-200`}
            />
          ) : (
            <span className="font-display text-6xl font-black text-white/20">?</span>
          )}
          {won && !spinning && (
            <span className="absolute left-2 top-2 animate-[sg-pop_.5s_ease-out] rounded-full bg-[#ff2d87] px-3 py-1 text-lg font-black shadow-lg">
              -{won.pct}%
            </span>
          )}
        </div>

        {won && !spinning ? (
          <div className="relative mt-4 text-center">
            <p className="text-[15px] font-bold leading-snug">{won.game.name}</p>
            <p className="mt-1 text-sm">
              <span className="text-white/50 line-through">{brl(won.from)}</span>{" "}
              <span className="text-xl font-black text-[#7dffb3]">{brl(won.price)}</span>
            </p>
            <p className="mt-0.5 text-xs text-white/70">
              Você economiza {brl(won.save)} na licença {won.license.toLowerCase()}.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  track("links_clique", { item_name: `Roleta: abriu ${won.game.slug}` });
                  onOpen(won.game);
                }}
                className="h-12 flex-1 rounded-[14px] bg-white text-[15px] font-bold text-[#0f0f0f]"
              >
                Quero esse
              </button>
              <button
                type="button"
                onClick={spin}
                aria-label="Girar de novo"
                className="flex h-12 w-12 items-center justify-center rounded-[14px] border border-white/25"
              >
                <RotateCw className="h-5 w-5" aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={spin}
            disabled={spinning || pool.length === 0}
            className="relative mt-4 h-12 w-full rounded-[14px] bg-gradient-to-r from-[#8a00c2] to-[#ff2d87] text-[15px] font-extrabold disabled:opacity-70"
          >
            {spinning ? "Girando..." : spins ? "Girar de novo" : "Girar a roleta"}
          </button>
        )}
      </div>

      {/* Ranking */}
      <p className="mt-6 flex items-center gap-2 text-sm font-bold text-mts-text">
        <Flame className="h-4 w-4 text-[#ff2d87]" aria-hidden /> Maiores descontos de {plat} agora
      </p>
      <ol className="mt-3 space-y-2">
        {ranking.map((d, i) => (
          <li key={d.game.slug}>
            <button
              type="button"
              onClick={() => {
                track("links_clique", { item_name: `Ranking ofertas: ${d.game.slug}` });
                onOpen(d.game);
              }}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-2 pr-3 text-left shadow-sm"
            >
              <span className="w-5 shrink-0 text-center text-sm font-black text-mts-muted">{i + 1}</span>
              {img(d, 160) ? (
                <img src={img(d, 160)} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="h-14 w-14 shrink-0 rounded-xl bg-mts-column" />
              )}
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[13px] font-semibold leading-tight text-mts-text">{d.game.name}</span>
                <span className="mt-1 block text-xs">
                  <span className="text-mts-muted line-through">{brl(d.from)}</span>{" "}
                  <span className="font-bold text-mts-text">{brl(d.price)}</span>
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-[#ff2d87] px-2 py-1 text-xs font-black text-white">
                -{d.pct}%
              </span>
            </button>
          </li>
        ))}
      </ol>
      {pool.length > 6 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 w-full text-sm font-semibold text-mts-text underline underline-offset-4"
        >
          {showAll ? "Ver menos" : `Ver mais ofertas de ${plat}`}
        </button>
      )}
    </div>
  );
}
