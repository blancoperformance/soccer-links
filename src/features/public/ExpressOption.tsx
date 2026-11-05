import { track } from "@/lib/tracking";
import { EXPRESS_PRICE, express, useExpress } from "./express";

/**
 * Linha opcional da Entrega Expressa, numa linha só para não empurrar o Comprar no celular.
 * Nunca vem marcada; a escolha dura só a sessão.
 */
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
      aria-label={`Entrega Expressa por mais R$ ${EXPRESS_PRICE}: receber em até 2 minutos. Os 2 minutos contam a partir do pagamento confirmado.`}
      onClick={toggle}
      className={`flex min-h-10 w-full items-center gap-2.5 rounded-[12px] px-3 py-1.5 text-left ring-1 motion-safe:transition-colors ${
        checked ? "bg-[#c000ff]/10 ring-[#c000ff]" : "bg-transparent ring-black/10"
      } ${className}`}
    >
      <span
        aria-hidden
        className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 motion-safe:transition-colors ${
          checked ? "border-[#8a00c2] bg-[#8a00c2]" : "border-mts-muted bg-transparent"
        }`}
      >
        {checked && (
          <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2.5 6.5l2.3 2.3L9.5 3.8" />
          </svg>
        )}
      </span>
      {/* cabe numa linha em 390px; em tela mais estreita quebra em vez de cortar o texto */}
      <span aria-hidden className="min-w-0 flex-1 text-[12px] leading-tight text-mts-muted">
        <strong className="font-semibold text-mts-text">Até 2 min</strong> após o pagamento confirmado
      </span>
      <span aria-hidden className="shrink-0 text-[12px] font-semibold text-[#8a00c2]">+ R$ {EXPRESS_PRICE}</span>
    </button>
  );
}
