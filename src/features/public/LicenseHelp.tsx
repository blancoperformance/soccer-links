import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { track } from "@/lib/tracking";

/** Textos da página do produto na loja (conferidos em 05/11/2026). */
export const LICENSE_HELP = [
  {
    name: "Licença Primária",
    text: "Garantia Vitalícia: Joga offline, em qualquer perfil. O jogo fica vinculado à sua conta para sempre.",
  },
  {
    name: "Licença Secundária",
    text: "Garantia Vitalícia: Menor investimento. Precisa estar online com a conta logada para jogar.",
  },
] as const;

function LicenseTexts() {
  return (
    <>
      {LICENSE_HELP.map((l) => (
        <p key={l.name} className="mt-1.5 first:mt-0">
          <strong className="font-semibold text-mts-text">{l.name}</strong> | {l.text}
        </p>
      ))}
    </>
  );
}

/** Explica primária e secundária ali mesmo, sem levar a pessoa para fora do Links. */
export function LicenseHelp({
  className = "mt-3",
  from = "Licenças",
}: {
  className?: string;
  /** Onde está o acordeão, para o clique medido ("Licenças" na ficha, "Quiz" no resultado). */
  from?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className={`${className} border-y border-mts-btn-border`}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => {
          if (!open) track("links_clique", { item_name: `${from}: abriu explicação` });
          setOpen(!open);
        }}
        className="flex min-h-11 w-full items-center justify-between gap-4 py-2 text-left text-[14px] font-medium text-mts-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mts-ink"
      >
        Primária ou secundária?
        <span
          aria-hidden
          className={`relative h-3 w-3 shrink-0 motion-safe:transition-transform motion-safe:duration-300 ${open ? "rotate-45" : ""}`}
        >
          <span className="absolute left-0 top-1/2 h-px w-3 -translate-y-1/2 bg-current" />
          <span className="absolute left-1/2 top-0 h-3 w-px -translate-x-1/2 bg-current" />
        </span>
      </button>
      <div
        id={id}
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div
            className={`pb-4 text-[13px] leading-relaxed text-mts-muted ${open ? "" : "invisible"}`}
          >
            <LicenseTexts />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Painel de baixo com a mesma explicação, para atalhos fora da ficha (página inicial). */
export function LicensePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="licenca-painel-titulo"
        className="w-full max-w-[520px] rounded-t-[22px] bg-mts-column px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 motion-safe:animate-[sg-fade_.25s_ease-out]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="licenca-painel-titulo"
            className="font-display text-[19px] font-semibold text-mts-text"
          >
            Primária ou secundária?
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-mts-text hover:opacity-70"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 text-[14px] leading-relaxed text-mts-muted">
          <LicenseTexts />
        </div>
        <p className="mt-3 text-[13px] text-mts-muted">
          Você escolhe a licença na ficha de cada jogo.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-[14px] bg-mts-ink text-[15px] font-semibold text-mts-on-ink hover:opacity-90"
        >
          Entendi
        </button>
      </div>
    </div>
  );
}
