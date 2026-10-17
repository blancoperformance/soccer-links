/**
 * "Caça-ofertas": tudo aqui vem dos preços reais da loja (preço de / por da Nuvemshop).
 * Nada de número inventado: sem oferta real, o bloco não aparece.
 *  - Faixa com o maior desconto do dia.
 *  - Roleta: gira pelas capas e para numa oferta de verdade (do console escolhido).
 *  - Ranking dos maiores descontos, com quanto a pessoa economiza.
 */
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Flame, RotateCw, Sparkles, Timer } from "lucide-react";
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

const img = (d: Deal, w = 480) => (d.live.images[0] ? sized(d.live.images[0], w) : "");

/** Faixa do topo: "Hoje tem jogo com até 84% OFF" + contagem da campanha da loja. */
export function DealsBanner({ onGo }: { onGo: () => void }) {
  const deals = useDeals();
  const left = useCountdown(offersCfg.endsAt);
  if (!deals?.length) return null;
  const top = deals[0]!;
  const live = left != null && left > 0;
  const covers = deals.filter((d) => d.live.images[0]).slice(0, 3);
  return (
    <button
      type="button"
      onClick={() => {
        track("links_clique", { item_name: "Ofertas: faixa do topo" });
        onGo();
      }}
      className="group relative mb-2 mt-5 flex w-full items-center gap-3 overflow-hidden rounded-[22px] bg-[linear-gradient(120deg,#5b00a3_0%,#8a00c2_45%,#ff2d87_100%)] py-5 pl-5 pr-3 text-left text-white transition active:scale-[.99]"
    >
      {/* brilho que passa (faixa diagonal, sem sombra em volta) */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/20 blur-md animate-[sg-sweep_3.2s_ease-in-out_infinite]"
      />
      <span className="relative min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
          <Flame className="h-3.5 w-3.5" aria-hidden /> Ofertas de hoje
        </span>
        <span className="mt-1 block leading-none">
          <span className="text-[14px] font-semibold text-white/90">Jogos com até </span>
          <span className="block text-[38px] font-black leading-[0.95] tracking-tight">
            {top.pct}% <span className="text-[22px]">OFF</span>
          </span>
        </span>
        <span className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[12px] text-white/90">
          {live ? (
            <>
              <Timer className="h-3.5 w-3.5" aria-hidden /> Acaba em <Countdown ms={left!} />
            </>
          ) : (
            <>{deals.length} jogos em oferta agora</>
          )}
        </span>
      </span>
      <span className="relative flex h-24 w-[104px] shrink-0 items-center justify-center">
        {covers.map((d, k) => (
          <img
            key={d.game.slug}
            src={img(d)}
            alt=""
            className="absolute h-[72px] w-[72px] rounded-[14px] object-cover shadow-[0_6px_14px_rgba(0,0,0,.3)] ring-2 ring-white/80"
            style={{ transform: `translateX(${(k - 1) * 18}px) rotate(${(k - 1) * 10}deg)`, zIndex: k === 1 ? 3 : k }}
          />
        ))}
        <span className="absolute -bottom-1 right-0 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#8a00c2] shadow transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="h-4 w-4" aria-hidden />
        </span>
      </span>
    </button>
  );
}

/** Raridade da oferta pelo desconto real (estilo loot de jogo). */
const tier = (pct: number) =>
  pct >= 80
    ? { name: "LENDÁRIA", cls: "from-[#ffb800] to-[#ff6a00]", ring: "ring-[#ffb800]" }
    : pct >= 65
      ? { name: "ÉPICA", cls: "from-[#b44dff] to-[#ff2d87]", ring: "ring-[#d77bff]" }
      : { name: "RARA", cls: "from-[#2f7bff] to-[#00c6ff]", ring: "ring-[#5aa8ff]" };

const SPIN_LINES = ["Embaralhando...", "Segura aí...", "Tá chegando...", "Quase..."];
const DAILY_SPINS = 3;
const todayKey = () => `sg:giros:${new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })}`;
function readSpins(): number {
  try {
    return Number(localStorage.getItem(todayKey()) ?? 0) || 0;
  } catch {
    return 0;
  }
}
function saveSpins(n: number) {
  try {
    localStorage.setItem(todayKey(), String(n));
  } catch {
    /* sem storage: não limita */
  }
}

function Confetti() {
  const bits = Array.from({ length: 26 }, (_, i) => i);
  const colors = ["#ffb800", "#ff2d87", "#7dffb3", "#d77bff", "#ffffff", "#00c6ff"];
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {bits.map((i) => {
        const a = (i / bits.length) * Math.PI * 2;
        const d = 90 + (i % 5) * 22;
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-2.5 w-1.5 rounded-[2px] animate-[sg-confetti_.9s_cubic-bezier(.15,.7,.3,1)_forwards]"
            style={
              {
                background: colors[i % colors.length],
                "--x": `${Math.cos(a) * d}px`,
                "--y": `${Math.sin(a) * d - 30}px`,
                "--r": `${(i * 47) % 360}deg`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </span>
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
  const [used, setUsed] = useState(0);
  const [line, setLine] = useState(SPIN_LINES[0]!);
  useEffect(() => setUsed(readSpins()), []);
  const left = Math.max(0, DAILY_SPINS - used);
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
    if (spinning || pool.length === 0 || left === 0) return;
    const u = used + 1;
    setUsed(u);
    saveSpins(u);
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
      setLine(SPIN_LINES[Math.min(SPIN_LINES.length - 1, Math.floor((step / total) * SPIN_LINES.length))]!);
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
      <div className="relative mt-4 overflow-hidden rounded-[24px] bg-[radial-gradient(120%_80%_at_50%_0%,#3a0066_0%,#0f0f0f_60%)] p-5 text-white">
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#ffb800]">Roleta Soccer</p>
            <p className="mt-1 text-[22px] font-black leading-[1.05] tracking-tight">
              Qual jogo vai
              <br />
              cair pra você?
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold">
            {left} {left === 1 ? "giro" : "giros"} hoje
          </span>
        </div>

        <div
          className={`relative mx-auto mt-5 flex aspect-square w-[min(100%,250px)] items-center justify-center overflow-hidden rounded-[20px] bg-white/5 ring-4 transition ${won && !spinning ? tier(won.pct).ring : "ring-white/10"} ${spinning ? "animate-[sg-shake_.18s_linear_infinite]" : ""}`}
        >
          {face && img(face) ? (
            <img
              src={img(face, 480)}
              alt={won ? face.game.name : ""}
              className={`h-full w-full object-cover transition duration-150 ${spinning ? "scale-95 brightness-75" : "scale-100"}`}
            />
          ) : (
            <span className="flex flex-col items-center gap-2 text-white/30">
              <Sparkles className="h-10 w-10" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-widest">Toque em girar</span>
            </span>
          )}
          {spinning && (
            <span className="absolute inset-x-0 bottom-3 text-center text-sm font-black tracking-wide">{line}</span>
          )}
          {won && !spinning && (
            <>
              <Confetti key={spins} />
              <span
                className={`absolute left-2.5 top-2.5 z-10 animate-[sg-pop_.5s_ease-out] rounded-full bg-gradient-to-r px-2.5 py-1 text-[11px] font-black tracking-wider ${tier(won.pct).cls}`}
              >
                OFERTA {tier(won.pct).name}
              </span>
              <span className="absolute bottom-2.5 right-2.5 z-10 animate-[sg-pop_.6s_ease-out] rounded-2xl bg-[#ff2d87] px-3 py-1.5 text-2xl font-black leading-none shadow-lg">
                -{won.pct}%
              </span>
            </>
          )}
        </div>

        {won && !spinning ? (
          <div className="relative mt-4 text-center">
            <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-[#7dffb3]">Caiu pra você</p>
            <p className="mt-1 text-[16px] font-extrabold leading-snug">{won.game.name}</p>
            <p className="mt-1.5 flex items-baseline justify-center gap-2">
              <span className="text-sm text-white/45 line-through">{brl(won.from)}</span>
              <span className="text-[26px] font-black leading-none text-[#7dffb3]">{brl(won.price)}</span>
            </p>
            <p className="mt-1.5 text-xs text-white/70">
              R$ {won.save.toFixed(2).replace(".", ",")} a menos na licença {won.license.toLowerCase()}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  track("links_clique", { item_name: `Roleta: abriu ${won.game.slug}` });
                  onOpen(won.game);
                }}
                className="h-[52px] flex-1 rounded-[16px] bg-white text-[15px] font-black text-[#0f0f0f] transition active:scale-[.98]"
              >
                Pegar esse jogo
              </button>
              <button
                type="button"
                onClick={spin}
                disabled={left === 0}
                aria-label="Girar de novo"
                className="flex h-[52px] w-[52px] items-center justify-center rounded-[16px] border border-white/25 disabled:opacity-30"
              >
                <RotateCw className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {left === 0 && (
              <p className="mt-3 text-xs text-white/60">Acabaram os giros de hoje. Amanhã tem mais 3.</p>
            )}
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={spin}
              disabled={spinning || pool.length === 0 || left === 0}
              className="relative mt-5 h-14 w-full overflow-hidden rounded-[18px] bg-gradient-to-r from-[#ffb800] via-[#ff2d87] to-[#8a00c2] text-[18px] font-black tracking-wide transition active:scale-[.98] disabled:opacity-60"
            >
              {spinning ? line : left === 0 ? "Volta amanhã" : spins ? "GIRAR DE NOVO" : "GIRAR"}
            </button>
            <p className="mt-2.5 text-center text-[11px] text-white/50">
              Só cai jogo com desconto de verdade da loja. 3 giros por dia.
            </p>
          </>
        )}
      </div>

      {/* Ranking */}
      <p className="mt-6 flex items-center gap-2 text-sm font-bold text-mts-text">
        <Flame className="h-4 w-4 text-[#ff2d87]" aria-hidden /> Top descontos de {plat} agora
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
              {img(d) ? (
                <img src={img(d)} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
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
