import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, KeyRound, Mail, MessageCircle, ShieldCheck, X } from "lucide-react";
import { pixelTrack, track } from "@/lib/tracking";
import { withUtm } from "@/lib/utm";
import { productUrl, similarTo, versionsOf, type Game } from "./games";
import { brl, parcel, cartUrl, licenseHint, sized, variantFor, type LiveVariant } from "./store";
import { Cover, useLiveGame } from "./GameCard";
import { bag, bagUrl, storeScriptLikely, useBag, type BagItem } from "./bag";
import { bagEnabled } from "./content";

interface Props {
  game: Game;
  whatsapp: string;
  /** Licença sugerida (vinda do quiz). */
  suggested?: "primaria" | "secundaria" | null;
  onClose: () => void;
  onOpenOther: (g: Game) => void;
}

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-mts-btn-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-[15px] font-medium text-mts-text"
      >
        {title}
        <span
          aria-hidden
          className={`relative h-3 w-3 shrink-0 transition-transform duration-300 ${open ? "rotate-45" : ""}`}
        >
          <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
          <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current" />
        </span>
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className="pb-5 text-sm leading-relaxed text-mts-muted">{children}</div>
        </div>
      </div>
    </div>
  );
}

const waLink = (number: string, text: string) =>
  `https://wa.me/${number}?text=${encodeURIComponent(text)}`;

export function GameSheet({ game, whatsapp, suggested = null, onClose, onOpenOther }: Props) {
  const { live, done } = useLiveGame(game.slug, true);
  const [pick, setPick] = useState<string | null>(suggested);
  const [nudge, setNudge] = useState(false);
  const [slide, setSlide] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const licRef = useRef<HTMLDivElement>(null);
  const inBag = useBag();
  const others = bagEnabled ? inBag.filter((i) => i.slug !== game.slug) : [];
  const versions = useMemo(() => versionsOf(game).filter((v) => v.slug !== game.slug), [game]);
  const plat = game.platforms.length === 1 ? game.platforms[0]! : null;
  /** Mesma edição no outro console (troca PS4/PS5 sem mudar de edição). */
  const counterpart = useMemo(() => {
    if (!plat) return null;
    const other = plat === "PS5" ? "PS4" : "PS5";
    const ed = (g: Game) =>
      g.name.toLowerCase().replace(/\b(ps4|ps5|playstation ?[45])\b/g, "").replace(/\s+/g, " ").trim();
    const pool = versions.filter((v) => v.platforms.length === 1 && v.platforms[0] === other);
    return pool.find((v) => ed(v) === ed(game)) ?? pool[0] ?? null;
  }, [versions, plat, game]);
  /** Outras edições do mesmo console (a troca de console fica no seletor). */
  const editions = useMemo(
    () => (plat ? versions.filter((v) => v.platforms.includes(plat)) : versions),
    [versions, plat],
  );
  const [flash, setFlash] = useState<string | null>(null);
  const prevSlug = useRef(game.slug);
  useEffect(() => {
    if (prevSlug.current === game.slug) return;
    prevSlug.current = game.slug;
    if (!plat) return;
    setFlash(`Versão ${plat}`);
    const t = window.setTimeout(() => setFlash(null), 1600);
    return () => clearTimeout(t);
  }, [game.slug, plat]);
  const switchTo = (v: Game) => {
    track("links_clique", { item_name: `Versão: ${v.name}`, item_url: productUrl(v) });
    onOpenOther(v);
  };
  const similar = useMemo(() => similarTo(game, 4), [game]);

  useEffect(() => {
    pixelTrack("ViewContent", { content_type: "product", content_name: game.slug });
  }, [game.slug]);

  useEffect(() => {
    setPick(suggested);
    setSlide(0);
    scroller.current?.scrollTo({ top: 0 });
    const raf = requestAnimationFrame(() => scroller.current?.scrollTo({ top: 0 }));
    return () => cancelAnimationFrame(raf);
  }, [game.slug, suggested]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // Licenças: as da loja (ao vivo) quando houver; senão as da planilha, sem preço.
  const options: { key: string; label: string; variant: LiveVariant | null; out: boolean }[] =
    live && live.variants.length
      ? live.variants.map((v) => ({ key: v.key, label: v.label, variant: v, out: !v.available }))
      : game.licenses.map((l) => ({ key: l.key, label: l.label, variant: null, out: l.out }));
  const single = options.length === 1 ? options[0]! : null;
  const chosenKey = single ? single.key : pick;
  const chosen = options.find((o) => o.key === chosenKey) ?? null;
  const variant = chosen?.variant ?? (chosenKey ? variantFor(live, chosenKey) : null);
  const allOut = options.length > 0 && options.every((o) => o.out);
  const storeUrl = withUtm(productUrl(game), { content: `ficha-${game.slug}` });
  const images = live?.images.length ? live.images : [];

  const buy = () => {
    if (!chosen && !single) {
      track("buy_no_size", { product: game.slug });
      setNudge(true);
      licRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => setNudge(false), 1600);
      return;
    }
    if (!variant || variant.id <= 0) {
      // Sem o código da licença: abre a página do produto na loja.
      track("checkout_click", { product: game.slug, detail: "sem licença (loja)" });
      track("links_clique", {
        item_name: `Comprar na loja: ${game.name}`,
        item_url: productUrl(game),
      });
      window.location.href = storeUrl;
      return;
    }
    const item = bagEnabled && storeScriptLikely() ? toItem() : null;
    if (item) bag.add(item);
    const url = item
      ? bagUrl(bag.get(), `ficha-${game.slug}`)
      : cartUrl(variant.id, `ficha-${game.slug}`, game.slug);
    track("checkout_click", {
      product: game.slug,
      detail: variant.label,
      size: variant.label,
      ...(variant.price !== null ? { value: variant.price, currency: "BRL" } : {}),
    });
    track("links_clique", { item_name: `Comprar: ${game.name}`, item_url: url });
    window.location.href = url;
  };

  const toItem = (): BagItem | null =>
    variant && variant.id > 0 && live?.id
      ? {
          slug: game.slug,
          name: game.name,
          productId: live.id,
          variantId: variant.id,
          license: variant.label,
          option: variant.value ?? variant.label,
          price: variant.price,
          from: variant.from,
          image: live.images[0] ? sized(live.images[0], 480) : "",
        }
      : null;

  const addToBag = () => {
    if (!chosen && !single) {
      setNudge(true);
      licRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => setNudge(false), 1600);
      return;
    }
    const item = toItem();
    if (!item) return buy();
    bag.add(item);
    pixelTrack("AddToCart", {
      content_type: "product",
      content_ids: [String(item.productId)],
      content_name: game.slug,
      ...(item.price != null ? { value: item.price, currency: "BRL" } : {}),
    });
    track("links_clique", { item_name: `Sacola: adicionou ${game.slug}`, item_url: productUrl(game) });
    onClose();
  };

  const cta = allOut
    ? "Esgotado no momento"
    : chosen
      ? variant
        ? `Comprar licença ${chosen.label.toLowerCase()}`
        : "Comprar na loja"
      : "Escolher a licença";

  return (
    <div
      className="fixed inset-0 z-[60] flex justify-center bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label={game.name}
    >
      <div className="relative flex h-full w-full max-w-[580px] flex-col bg-mts-column">
        <div className="z-20 flex shrink-0 items-center justify-between gap-3 border-b border-mts-btn-border bg-mts-column px-3 py-2">
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-mts-text hover:opacity-70"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-sm font-medium text-mts-text">{game.short}</span>
            {plat && (
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-black text-white ${plat === "PS5" ? "bg-[#0f0f0f]" : "bg-[#1f5fd6]"}`}
              >
                {plat}
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center text-mts-text hover:opacity-70"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-8">
          {flash && (
            <div className="pointer-events-none sticky top-3 z-30 -mb-10 flex justify-center">
              <span className="animate-[sg-pop_.45s_ease-out] rounded-full bg-[#0f0f0f] px-4 py-2 text-sm font-bold text-white shadow-lg">
                ✓ {flash}
              </span>
            </div>
          )}

          {/* Fotos */}
          {images.length > 1 ? (
            <div key={game.slug} className="relative animate-[sg-fade_.35s_ease-out]">
              <div
                onScroll={(e) => {
                  const el = e.currentTarget;
                  setSlide(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
                }}
                className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
              >
                {images.map((src, i) => (
                  <div
                    key={src}
                    className="relative aspect-square w-full shrink-0 snap-center bg-mts-photo"
                  >
                    <img
                      src={sized(src, 1024)}
                      onError={(e) => {
                        if (e.currentTarget.src !== src) e.currentTarget.src = src;
                      }}
                      alt={i === 0 ? game.name : ""}
                      loading={i < 2 ? "eager" : "lazy"}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {images.slice(0, 10).map((src, i) => (
                  <span
                    key={src}
                    className={`h-1 transition-all ${i === slide ? "w-5 bg-white" : "w-1.5 bg-white/40"}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <Cover
              key={game.slug}
              game={game}
              live={live}
              done={done}
              w={1024}
              className="animate-[sg-fade_.35s_ease-out]"
            />
          )}

          <div className="px-5 sm:px-8">
            {plat && counterpart && (
              <div className="mt-5" role="group" aria-label="Console">
                <p className="text-[13px] font-semibold text-mts-text">Seu console</p>
                <div className="mt-2 grid grid-cols-2 gap-1 rounded-2xl bg-mts-btn-border/40 p-1">
                  {(["PS4", "PS5"] as const).map((p) => {
                    const on = p === plat;
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={on}
                        onClick={() => !on && switchTo(counterpart)}
                        className={`h-11 rounded-xl text-[15px] font-black transition ${on ? (p === "PS5" ? "bg-[#0f0f0f] text-white shadow" : "bg-[#1f5fd6] text-white shadow") : "text-mts-muted"}`}
                      >
                        {on && <Check className="mr-1 inline h-4 w-4 align-[-2px]" aria-hidden />}
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-1.5">
              {game.platforms.map((p) => (
                <span
                  key={p}
                  className="rounded-full border border-mts-btn-border px-2.5 py-0.5 text-[11px] font-semibold text-mts-text"
                >
                  {p}
                </span>
              ))}
              {game.genres.slice(0, 3).map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-mts-btn-border px-2.5 py-0.5 text-[11px] text-mts-muted"
                >
                  {g}
                </span>
              ))}
              <span className="rounded-full border border-mts-btn-border px-2.5 py-0.5 text-[11px] text-mts-muted">
                Mídia digital
              </span>
            </div>
            <h1 className="font-display mt-3 text-[24px] font-semibold leading-tight text-mts-text">
              {game.name}
            </h1>

            {/* Preço da licença escolhida (ou o menor) */}
            <div className="mt-3 min-h-[44px]">
              {(() => {
                const v =
                  variant ??
                  live?.variants
                    .filter((x) => x.available)
                    .sort((a, b) => (a.price ?? 9e9) - (b.price ?? 9e9))[0] ??
                  null;
                if (v && v.price !== null)
                  return (
                    <>
                    <p className="flex flex-wrap items-baseline gap-x-2 text-mts-text">
                      {!variant && <span className="text-sm text-mts-muted">a partir de</span>}
                      {v.from && (
                        <span className="text-sm text-mts-muted line-through">{brl(v.from)}</span>
                      )}
                      <span className="text-[28px] font-extrabold leading-none tracking-tight">{brl(v.price)}</span>
                      {v.from && v.from > v.price && (
                        <span className="rounded-full bg-[#ff2d87] px-2 py-0.5 text-xs font-black text-white">
                          -{Math.round((1 - v.price / v.from) * 100)}%
                        </span>
                      )}
                    </p>
                    <p className="mt-1.5 text-[13px] text-mts-muted">
                      ou <strong className="font-semibold text-mts-text">{parcel(v.price)}</strong>
                      {variant && <> · licença {variant.label.toLowerCase()}</>}
                    </p>
                    </>
                  );
                if (!done) return <span className="block h-7 w-40 animate-pulse bg-mts-photo" />;
                return (
                  <p className="text-sm text-mts-muted">Preço atualizado na página da loja.</p>
                );
              })()}
            </div>

            {/* Licença */}
            {!allOut && options.length > 1 && (
              <div ref={licRef} className="mt-7 scroll-mt-24">
                <p
                  className={`text-[13px] font-semibold transition-colors ${nudge ? "text-mts-accent" : "text-mts-text"}`}
                >
                  {nudge ? "Escolha a licença para continuar" : "Escolha a licença"}
                </p>
                <div className={`mt-3 grid gap-2 ${nudge ? "animate-[mts-shake_.4s_ease]" : ""}`}>
                  {options.map((o) => {
                    const on = chosenKey === o.key;
                    return (
                      <button
                        key={o.key}
                        type="button"
                        disabled={o.out}
                        aria-pressed={on}
                        onClick={() => {
                          setPick(o.key);
                          if (!on) track("size_select", { product: game.slug, size: o.label });
                        }}
                        className={`flex items-center justify-between gap-4 rounded-[14px] border-2 px-4 py-3 text-left transition-colors ${
                          on
                            ? "border-mts-ink bg-[var(--mts-glow)]"
                            : o.out
                              ? "cursor-not-allowed border-mts-btn-border opacity-50"
                              : "border-mts-btn-border hover:border-mts-ink"
                        }`}
                      >
                        <span>
                          <span className="flex items-center gap-2 text-[15px] font-semibold text-mts-text">
                            {o.label}
                            {suggested === o.key && (
                              <span className="bg-mts-ink px-1.5 py-0.5 text-[10px] font-semibold text-mts-on-ink">
                                Indicada no quiz
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs leading-snug text-mts-muted">
                            {o.out ? "Esgotada no momento." : (licenseHint[o.key] ?? "")}
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          {o.variant?.price != null && (
                            <span className="block text-[15px] font-bold tracking-tight text-mts-text">
                              {brl(o.variant.price)}
                            </span>
                          )}
                          {on && (
                            <Check className="ml-auto mt-1 h-4 w-4 text-mts-accent" aria-hidden />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <a
                  href={withUtm("https://lojasoccergames.com.br/ajuda-primaria-ou-secundaria/", {
                    content: "ficha-licencas",
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("links_clique", { item_name: "Ficha: entender licenças" })}
                  className="mt-3 inline-block text-xs text-mts-muted underline underline-offset-4 hover:text-mts-text"
                >
                  Qual licença escolher?
                </a>
              </div>
            )}
            {!allOut && single && (
              <div ref={licRef} className="mt-7 rounded-[14px] border-2 border-mts-ink bg-white px-4 py-3.5">
                <p className="flex items-center justify-between gap-3">
                  <span className="text-[15px] font-semibold text-mts-text">Licença {single.label.toLowerCase()}</span>
                  {single.variant?.price != null && (
                    <span className="text-[15px] font-bold tracking-tight text-mts-text">{brl(single.variant.price)}</span>
                  )}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-mts-muted">
                  {licenseHint[single.key] ?? ""} É a única licença deste jogo para {plat ?? "o seu console"}.
                </p>
              </div>
            )}
            {/* Outras versões (PS4/PS5, edições) */}
            {editions.length > 0 && (
              <div className="mt-5">
                <p className="text-[13px] font-semibold text-mts-text">Outras edições</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[game, ...editions].slice(0, 6).map((v) => (
                    <button
                      key={v.slug}
                      type="button"
                      aria-pressed={v.slug === game.slug}
                      onClick={() => {
                        if (v.slug === game.slug) return;
                        switchTo(v);
                      }}
                      className={`rounded-full border px-3 py-2 text-left text-[12px] leading-tight ${v.slug === game.slug ? "border-mts-ink text-mts-text" : "border-mts-btn-border text-mts-muted hover:border-mts-ink hover:text-mts-text"}`}
                    >
                      {v.name.replace(/\s+para\s+/i, " · ")}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allOut && (
              <p className="mt-6 border border-mts-btn-border px-4 py-3 text-sm text-mts-muted">
                Esgotado no momento.{" "}
                <a
                  href={productUrl(game)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-mts-text underline underline-offset-4"
                >
                  Ver na loja
                </a>
              </p>
            )}

            {/* Como funciona */}
            <ul className="mt-7 grid grid-cols-3 border-y border-mts-btn-border py-4 text-center">
              {[
                { I: Mail, t: "Chega no e-mail", d: "Pix em geral em menos de 30 min" },
                { I: KeyRound, t: "Original", d: "Licença da PlayStation Store" },
                { I: ShieldCheck, t: "Garantia", d: "Vitalícia, seguindo as regras" },
              ].map(({ I, t, d }, i) => (
                <li
                  key={t}
                  className={`flex flex-col items-center gap-1.5 px-1.5 ${i ? "border-l border-mts-btn-border" : ""}`}
                >
                  <I className="h-5 w-5 text-mts-accent" strokeWidth={1.4} aria-hidden />
                  <span className="text-[11px] font-semibold leading-tight text-mts-text">{t}</span>
                  <span className="text-[10.5px] leading-snug text-mts-muted">{d}</span>
                </li>
              ))}
            </ul>

            {game.summary && (
              <div className="mt-7">
                <p className="text-[13px] font-semibold text-mts-text">Sobre o jogo</p>
                <p className="mt-2 text-sm leading-relaxed text-mts-muted">{game.summary}</p>
              </div>
            )}

            <div className="mt-6 border-t border-mts-btn-border">
              {Object.keys(game.specs).length > 0 && (
                <Accordion title="Ficha técnica">
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
                    {Object.entries(game.specs).map(([k, v]) => (
                      <div key={k} className="contents">
                        <dt className="font-medium text-mts-text">{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="mt-3 text-xs">Informações da página do produto na loja.</p>
                </Accordion>
              )}
              <Accordion title="Como recebo e ativo">
                <p>
                  Depois do pagamento aprovado, os dados de acesso chegam no seu e-mail. Pix em
                  geral em menos de 30 minutos, cartão em até 1 hora após a aprovação e boleto em
                  até 3 dias úteis para compensar, sempre no horário de atendimento.
                </p>
                <p className="mt-2">
                  No PS5, a ativação é por Compartilhamento de console e jogo offline. No PS4, por
                  Ativar como seu PS4 principal. Na secundária, você entra na conta, baixa o jogo e
                  joga com ela logada e online.
                </p>
              </Accordion>
              <Accordion title="Regras da conta">
                <p>
                  Não altere e-mail, senha, ID ou nome da conta e não compartilhe os dados. A conta
                  não funciona em celular, site ou outro console, e não pode ser removida nem
                  migrada. Seguindo as regras, a garantia é vitalícia.
                </p>
              </Accordion>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("links_clique", {
                    item_name: `Página na loja: ${game.name}`,
                    item_url: productUrl(game),
                  })
                }
                className="text-mts-text underline underline-offset-4"
              >
                Ver a página completa na loja
              </a>
              <a
href="https://lojasoccergames.com.br/ajuda-primaria-ou-secundaria/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() =>
                  track("links_clique", { item_name: `Ficha: primária ou secundária ${game.slug}` })
                }
                className="flex items-center gap-1.5 text-mts-muted underline underline-offset-4 hover:text-mts-text"
              >
                Primária ou secundária? Entenda
              </a>
            </div>

            {similar.length > 0 && (
              <div className="mt-10">
                <p className="text-[13px] font-semibold text-mts-text">Leve junto</p>
                {bagEnabled && (
                  <p className="mt-0.5 text-xs text-mts-muted">
                    Toque no + para pôr na sacola e pagar tudo de uma vez.
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-3">
                  {similar.map((s) => (
                    <SimilarCard key={s.slug} game={s} onOpen={() => onOpenOther(s)} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Barra de compra */}
        <div className="shrink-0 border-t border-mts-btn-border bg-mts-column px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-8">
          <div className="flex gap-2">
            {bagEnabled && !allOut && (
              <button
                type="button"
                onClick={addToBag}
                className="flex h-[52px] shrink-0 items-center justify-center rounded-[14px] border border-mts-text px-3 text-[13px] font-semibold text-mts-text"
              >
                + Sacola
              </button>
            )}
            <button
              type="button"
              disabled={allOut}
              onClick={buy}
              className="flex h-[52px] w-full items-center rounded-[14px] justify-center gap-2 bg-mts-ink text-[15px] font-semibold text-mts-on-ink transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {others.length > 0 && !allOut ? `Comprar com mais ${others.length}` : cta} {!allOut && <span aria-hidden>→</span>}
            </button>
          </div>
          <p className="mt-2 text-center text-[11px] text-mts-muted">
            Você finaliza no site da Soccer Games, com Pix, cartão ou boleto.
          </p>
        </div>
      </div>
    </div>
  );
}

function SimilarCard({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const { live, done, ref } = useLiveGame(game.slug);
  const list = useBag();
  const added = list.some((i) => i.slug === game.slug);
  const cheapest = (live?.variants ?? [])
    .filter((v) => v.available && v.price != null && v.id > 0)
    .sort((a, b) => (a.price ?? 0) - (b.price ?? 0))[0];
  return (
    <div className="relative min-w-0">
    {bagEnabled && cheapest && live?.id && (
      <button
        type="button"
        aria-label={added ? `${game.short} já está na sacola` : `Pôr ${game.short} na sacola`}
        onClick={() => {
          if (added) return bag.remove(game.slug);
          bag.add({
            slug: game.slug,
            name: game.name,
            productId: live.id!,
            variantId: cheapest.id,
            license: cheapest.label,
            option: cheapest.value ?? cheapest.label,
            price: cheapest.price,
            from: cheapest.from,
            image: live.images[0] ? sized(live.images[0], 480) : "",
          });
          pixelTrack("AddToCart", {
            content_type: "product",
            content_ids: [String(live.id)],
            content_name: game.slug,
            ...(cheapest.price != null ? { value: cheapest.price, currency: "BRL" } : {}),
          });
          track("links_clique", { item_name: `Sacola: leve junto ${game.slug}` });
        }}
        className={`absolute right-2 top-2 z-10 flex h-9 min-w-9 items-center justify-center rounded-full px-2 text-sm font-bold shadow-lg ${added ? "bg-[#1fbf6b] text-white" : "bg-white text-[#0f0f0f]"}`}
      >
        {added ? <Check className="h-4 w-4" aria-hidden /> : "+"}
      </button>
    )}
    <button
      ref={ref as React.Ref<HTMLButtonElement>}
      type="button"
      onClick={() => {
        track("links_clique", { item_name: `Parecido: ${game.name}`, item_url: productUrl(game) });
        onOpen();
      }}
      className="group block w-full text-left"
    >
      <Cover game={game} live={live} done={done} w={320} />
      <span className="mt-2 line-clamp-2 block text-[12px] leading-snug text-mts-text">
        {game.short}
      </span>
      {cheapest?.price != null && (
        <span className="mt-0.5 block text-[12px] font-bold text-mts-text">
          {cheapest.from && cheapest.from > cheapest.price && (
            <span className="mr-1 font-normal text-mts-muted line-through">{brl(cheapest.from)}</span>
          )}
          {brl(cheapest.price)}
        </span>
      )}
    </button>
    </div>
  );
}
