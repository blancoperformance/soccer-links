import { forwardRef, useEffect, useLayoutEffect, useState, type RefObject } from "react";

/**
 * Faixa mínima da barra compacta; o bloco de compra só conta como visível acima dela.
 * Com a área segura do iPhone a barra fica mais alta, e aí vale a altura medida.
 */
export const BAR_ZONE = 72;

/**
 * Diz se o bloco de compra (dentro do conteúdo) está na área visível da ficha.
 * Começa como "visível" para a barra não piscar antes da primeira leitura; sem IntersectionObserver
 * devolve false, e a barra fica sempre à mostra (melhor um botão a mais do que nenhum).
 */
export function useBlockVisible(
  target: RefObject<Element | null>,
  root: RefObject<Element | null>,
  enabled: boolean,
  bar?: RefObject<HTMLElement | null>,
): boolean {
  const [visible, setVisible] = useState(true);
  const zone = () => Math.max(BAR_ZONE, Math.ceil(bar?.current?.offsetHeight ?? 0));
  // primeira leitura antes de pintar: a ficha já abre com a barra no estado certo
  useLayoutEffect(() => {
    if (!enabled) return;
    const el = target.current;
    const r = root.current;
    if (!el || !r) return;
    const a = el.getBoundingClientRect();
    const b = r.getBoundingClientRect();
    if (b.height > 0) setVisible(a.bottom > b.top && a.top < b.bottom - zone());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, root, enabled]);
  useEffect(() => {
    if (!enabled) return;
    const el = target.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(false);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        const last = entries[entries.length - 1];
        if (last) setVisible(last.isIntersecting);
      },
      { root: root.current, rootMargin: `0px 0px -${zone()}px 0px`, threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, root, enabled]);
  return visible;
}

/**
 * Barra de baixo, compacta: uma linha com preço e "Comprar". Entra de baixo só quando `show`;
 * escondida fica invisível para toque, foco e leitor de tela. Só em tela menor que 1024px: no computador
 * a compra fica só no bloco do próprio conteúdo, sem faixa presa embaixo.
 */
export const BuyBar = forwardRef<
  HTMLDivElement,
  {
    show: boolean;
    /** Texto pequeno antes do valor ("a partir de", "Total"). */
    prefix?: string | null;
    amount: string | null;
    onBuy: () => void;
  }
>(function BuyBar({ show, prefix, amount, onBuy }, ref) {
  // sem transição no primeiro quadro: a barra não "entra" toda vez que a ficha abre
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => (r2 = requestAnimationFrame(() => setReady(true))));
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, []);
  return (
    <div
      ref={ref}
      data-testid="buy-bar"
      data-show={show}
      aria-hidden={!show}
      className={`absolute inset-x-0 bottom-0 z-20 border-t border-mts-btn-border bg-mts-column px-5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_18px_rgba(0,0,0,0.07)] sm:px-8 lg:hidden ${
        ready
          ? "motion-safe:transition-[transform,visibility] motion-safe:duration-300 motion-safe:ease-out"
          : ""
      } ${show ? "translate-y-0" : "invisible translate-y-full"}`}
    >
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-mts-text">
          {prefix && <span className="mr-1.5 text-[13px] text-mts-muted">{prefix}</span>}
          {amount && (
            <span className="text-[19px] font-extrabold tracking-tight tabular-nums">{amount}</span>
          )}
        </p>
        <button
          type="button"
          tabIndex={show ? 0 : -1}
          onClick={onBuy}
          className="flex h-11 min-w-[128px] shrink-0 items-center justify-center rounded-[14px] bg-mts-ink px-5 text-[15px] font-semibold text-mts-on-ink hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mts-ink"
        >
          Comprar
        </button>
      </div>
    </div>
  );
});
