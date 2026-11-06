import { useState } from "react";
import { track } from "@/lib/tracking";
import { withUtm } from "@/lib/utm";

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

/** Explica primária e secundária ali mesmo, sem levar a pessoa para fora da ficha. */
export function LicenseHelp() {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 border-y border-mts-btn-border">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="licenca-ajuda"
        onClick={() => {
          if (!open) track("links_clique", { item_name: "Licenças: abriu explicação" });
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
        id="licenca-ajuda"
        className={`grid motion-safe:transition-[grid-template-rows] motion-safe:duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <div className={`pb-4 text-[13px] leading-relaxed text-mts-muted ${open ? "" : "invisible"}`}>
            {LICENSE_HELP.map((l) => (
              <p key={l.name} className="mt-1.5 first:mt-0">
                <strong className="font-semibold text-mts-text">{l.name}</strong> | {l.text}
              </p>
            ))}
            <a
              href={withUtm("https://lojasoccergames.com.br/ajuda-primaria-ou-secundaria/", {
                content: "ficha-licencas",
              })}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("links_clique", { item_name: "Ficha: entender licenças" })}
              className="mt-1 inline-flex min-h-11 items-center text-xs underline underline-offset-4 hover:text-mts-text"
            >
              ver detalhes na loja
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
