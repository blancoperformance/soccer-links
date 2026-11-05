import { track } from "@/lib/tracking";
import { EXPRESS_PRICE, express, useExpress } from "./express";

/** Linha opcional da Entrega Expressa. Nunca vem marcada; a escolha dura só a sessão. */
export function ExpressOption({ className = "" }: { className?: string }) {
  const checked = useExpress();
  const toggle = () => {
    const next = !checked;
    express.set(next);
    if (next) track("links_clique", { item_name: "Expressa: marcou na compra" });
  };
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={toggle}
      className={`flex min-h-11 w-full items-start gap-3 rounded-[14px] px-3 py-2 text-left ring-1 motion-safe:transition-colors ${
        checked ? "bg-[#c000ff]/10 ring-[#c000ff]" : "bg-transparent ring-black/10"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 motion-safe:transition-colors ${
          checked ? "border-[#8a00c2] bg-[#8a00c2]" : "border-mts-muted bg-transparent"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.5l2.3 2.3L9.5 3.8" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2 text-[13px] font-semibold text-mts-text">
          <span>Receber em até 2 minutos</span>
          <span className="shrink-0 text-[#8a00c2]">+ R$ {EXPRESS_PRICE}</span>
        </span>
        <span className="mt-0.5 block text-[11px] leading-snug text-mts-muted">
          Os 2 minutos contam a partir do pagamento confirmado.
        </span>
      </span>
    </button>
  );
}
