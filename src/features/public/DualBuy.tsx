import { brl } from "./store";

/** Licença como a ficha a enxerga (da loja ao vivo ou da planilha). */
export interface BuyOption {
  key: string;
  label: string;
  out: boolean;
  price: number | null;
}

/**
 * Regra dos botões de compra da ficha.
 * - "dual": o jogo tem duas licenças, nenhuma foi escolhida e ainda há estoque. Mostra um botão
 *   de compra por licença, sem nada pré-selecionado.
 * - "single": uma licença só, ou o cliente já escolheu, ou tudo esgotou. Fica o botão único.
 */
export function buyMode(options: BuyOption[], chosenKey: string | null): "dual" | "single" {
  if (options.length !== 2) return "single";
  if (options.every((o) => o.out)) return "single";
  if (chosenKey && options.some((o) => o.key === chosenKey)) return "single";
  return "dual";
}

/** Primária sempre primeiro; ela é o botão principal. */
export const dualOrder = (options: BuyOption[]) =>
  [...options].sort((a, b) => Number(b.key === "primaria") - Number(a.key === "primaria"));

export const dualLabel = (o: BuyOption) =>
  o.out ? `${o.label} · esgotada` : o.price != null ? `${o.label} · ${brl(o.price)}` : o.label;

/** Dois botões lado a lado; em tela muito estreita ficam empilhados. */
export function DualBuy({
  options,
  onBuy,
}: {
  options: BuyOption[];
  onBuy: (key: string) => void;
}) {
  const [first, second] = dualOrder(options) as [BuyOption, BuyOption];
  return (
    <div
      role="group"
      aria-label="Comprar por licença"
      className="grid w-full grid-cols-2 gap-2 max-[374px]:grid-cols-1"
    >
      {[first, second].map((o, i) => (
        <button
          key={o.key}
          type="button"
          disabled={o.out}
          onClick={() => onBuy(o.key)}
          className={`flex min-h-[52px] items-center justify-center rounded-[14px] px-2 text-center text-[14px] font-semibold leading-tight whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mts-ink motion-safe:transition-opacity ${
            i === 0
              ? "bg-mts-ink text-mts-on-ink hover:opacity-90 disabled:opacity-40"
              : "border-2 border-mts-ink bg-transparent text-mts-text hover:bg-[var(--mts-glow)] disabled:border-mts-btn-border disabled:text-mts-muted disabled:opacity-60"
          }`}
        >
          {dualLabel(o)}
        </button>
      ))}
    </div>
  );
}
