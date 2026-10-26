import { ArrowRight, Crown, LayoutGrid, LogOut } from "lucide-react";
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

/** Escolha logo depois do login. Só mostra os painéis que este usuário pode abrir. */
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
    <div className="sg-gate">
      <div className="sg-gate__card sg-gate__card--wide">
        <div className="sg-gate__logo">
          <img src="/logo-soccer.png" alt="Soccer Games" width={42} height={42} />
          <span>Painel Soccer · {email}</span>
        </div>
        <h1>O que você quer abrir?</h1>
        <p className="sg-gate__sub">
          A escolha fica salva neste navegador. Dá para trocar depois pelo menu.
        </p>
        <div className="sg-choose">
          {OPTIONS.filter((o) => allowed.includes(o.id)).map((o) => {
            const Icon = o.id === "links" ? LayoutGrid : Crown;
            return (
              <button
                key={o.id}
                type="button"
                className="sg-choose__opt"
                onClick={() => onChoose(o.id)}
              >
                <span
                  className={`sg-choose__ico ${o.id === "black" ? "sg-choose__ico--brand" : ""}`}
                  aria-hidden
                >
                  <Icon />
                </span>
                <span className="sg-choose__text">
                  <strong>{o.title}</strong>
                  <span>{o.text}</span>
                </span>
                <ArrowRight className="sg-choose__go" aria-hidden />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onSignOut}
          className="sg-btn sg-btn--ghost"
          style={{ marginTop: 16 }}
        >
          <LogOut aria-hidden /> Sair
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
