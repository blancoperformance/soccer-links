/** Linha pequena e calma com o total exato do carrinho. Não renderiza sem texto. */
export function TotalLine({ text, className = "" }: { text: string | null; className?: string }) {
  if (!text) return null;
  return (
    <p
      aria-live="polite"
      className={`text-center text-[12px] leading-snug tabular-nums text-mts-muted ${className}`}
    >
      {text}
    </p>
  );
}
