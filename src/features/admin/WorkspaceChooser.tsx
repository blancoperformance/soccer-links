import { ArrowRight } from "lucide-react";
import type { Workspace } from "./workspace";

const OPTIONS: { id: Workspace; title: string; text: string }[] = [
  {
    id: "links",
    title: "Links",
    text: "Visitas, vendas, quiz e contatos da página links.lojasoccergames.com.br.",
  },
  {
    id: "black",
    title: "Black 2026",
    text: "Cadastros do Grupo VIP da Black, com exportação para a Huggy e para e-mail.",
  },
];

/** Full-screen choice right after login. Only lists the workspaces this user may open. */
export function WorkspaceChooser({
  allowed,
  email,
  onChoose,
  onSignOut,
}: {
  allowed: Workspace[];
  email: string | undefined;
  onChoose: (w: Workspace) => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0E0E0E] px-6 font-sans text-white">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center py-16">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
          Painel Soccer Games
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">O que você quer abrir?</h1>
        <p className="mt-2 text-sm text-white/55">
          A escolha fica salva neste navegador. Dá para trocar depois pelo topo do painel.
        </p>
        <div className="mt-10 grid gap-px border border-white/15 bg-white/15 sm:grid-cols-2">
          {OPTIONS.filter((o) => allowed.includes(o.id)).map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onChoose(o.id)}
              className="group flex min-h-[180px] flex-col justify-between bg-[#0E0E0E] p-7 text-left transition-colors hover:bg-[#161616] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#8a00c2]"
            >
              <span>
                <span className="block text-xl font-semibold">{o.title}</span>
                <span className="mt-2 block text-sm leading-relaxed text-white/55">{o.text}</span>
              </span>
              <span className="mt-8 flex items-center gap-2 text-sm font-medium text-white/80 group-hover:text-[#8a00c2]">
                Abrir <ArrowRight className="h-4 w-4" />
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between border-t border-white/10 py-5 text-xs text-white/45">
        <span className="truncate">{email}</span>
        <button type="button" onClick={onSignOut} className="hover:text-white">
          Sair
        </button>
      </div>
    </div>
  );
}

/** Compact "Links | Black 2026" switch for the panel headers. */
export function WorkspaceSwitch({
  current,
  onSwitch,
  tone = "dark",
}: {
  current: Workspace;
  onSwitch: (w: Workspace) => void;
  tone?: "dark" | "light";
}) {
  const base =
    tone === "dark"
      ? "border-white/15 text-white/55 hover:text-white"
      : "border-neutral-300 text-neutral-500 hover:text-neutral-950";
  const on = tone === "dark" ? "bg-white text-[#0E0E0E]" : "bg-neutral-950 text-white";
  return (
    <div
      className={`flex border text-[12px] ${base.split(" ")[0]}`}
      role="group"
      aria-label="Painel"
    >
      {OPTIONS.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => o.id !== current && onSwitch(o.id)}
          aria-pressed={o.id === current}
          className={`h-8 px-3 font-medium transition-colors ${o.id === current ? on : base.split(" ").slice(1).join(" ")}`}
        >
          {o.title}
        </button>
      ))}
    </div>
  );
}
