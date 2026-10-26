import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Crown, Search, UserPlus, Users } from "lucide-react";
import { Card, Note } from "../../ui";
import { Select, type SelectTone } from "../../Select";
import { sb, SQL_PLANO } from "./data";

/*
 * Equipe e acessos: o dono escolhe, por e-mail, o que cada pessoa abre. As funções do banco
 * conferem que quem chama é o dono (painel_donos); a tela só mostra o resultado.
 */
export interface Acesso {
  email: string;
  conta: boolean;
  ultimo_acesso: string | null;
  dono: boolean;
  links: boolean;
  leads: boolean;
  black: "editor" | "leitor" | null;
}
type Perm = Pick<Acesso, "links" | "leads" | "black">;

export const CARGOS: { k: string; n: string; t: string; tone: SelectTone; p: Perm }[] = [
  {
    k: "gestor",
    n: "Gestor da loja",
    t: "Painel Links, plano da Black e cadastros do VIP",
    tone: "brand",
    p: { links: true, leads: true, black: "editor" },
  },
  {
    k: "black-leads",
    n: "Time da Black + cadastros",
    t: "Edita o plano e o quadro e vê os cadastros do VIP",
    tone: "brand",
    p: { links: false, leads: true, black: "editor" },
  },
  {
    k: "black-editor",
    n: "Time da Black",
    t: "Edita o plano, o calendário e o quadro",
    tone: "ok",
    p: { links: false, leads: false, black: "editor" },
  },
  {
    k: "black-leitor",
    n: "Só acompanha a Black",
    t: "Vê o plano e o quadro, não edita",
    tone: "warn",
    p: { links: false, leads: false, black: "leitor" },
  },
  {
    k: "links",
    n: "Só o painel Links",
    t: "Visitas, vendas, quiz e contatos do links",
    tone: "ok",
    p: { links: true, leads: false, black: null },
  },
  {
    k: "nenhum",
    n: "Sem acesso",
    t: "A conta existe, mas não abre nada",
    tone: "muted",
    p: { links: false, leads: false, black: null },
  },
];
const igual = (a: Perm, b: Perm) =>
  a.links === b.links && a.leads === b.leads && a.black === b.black;
const cargoDe = (p: Perm) => CARGOS.find((c) => igual(c.p, p))?.k ?? "custom";
const OPTS = CARGOS.map((c) => ({ value: c.k, label: c.n, hint: c.t, tone: c.tone }));

const quando = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const initials = (e: string) => e.slice(0, 2).toUpperCase();

function Pessoa({
  a,
  onSalvar,
}: {
  a: Acesso;
  onSalvar: (email: string, p: Perm) => Promise<boolean>;
}) {
  const [p, setP] = useState<Perm>({ links: a.links, leads: a.leads, black: a.black });
  const [salvando, setSalvando] = useState(false);
  const mudou = !igual(p, a);
  const cargo = cargoDe(p);
  const toggle = (k: "links" | "leads", label: string) => (
    <label className={`sg-switch ${p[k] ? "is-on" : ""}`}>
      <input
        type="checkbox"
        checked={p[k]}
        onChange={(e) => setP({ ...p, [k]: e.target.checked })}
      />
      <span className="sg-switch__track" aria-hidden>
        <i />
      </span>
      {label}
    </label>
  );
  return (
    <li className={`sg-person-row ${a.dono ? "is-owner" : ""}`}>
      <span className="sg-avatar" aria-hidden>
        {a.dono ? <Crown /> : initials(a.email)}
      </span>
      <span className="sg-person-row__who">
        <b>{a.email}</b>
        <small>
          {a.dono
            ? "Dono · acesso total e libera os acessos"
            : !a.conta
              ? "Ainda sem conta: crie em Supabase > Authentication > Users"
              : a.ultimo_acesso
                ? `Último acesso ${quando.format(new Date(a.ultimo_acesso))}`
                : "Tem conta, nunca entrou"}
        </small>
      </span>
      {a.dono ? (
        <span className="sg-chip sg-chip--brand">Dono</span>
      ) : (
        <>
          <span className="sg-person-row__role">
            <Select
              label={`Cargo de ${a.email}`}
              value={cargo}
              onChange={(k) => {
                const c = CARGOS.find((x) => x.k === k);
                if (c) setP(c.p);
              }}
              options={
                cargo === "custom"
                  ? [
                      ...OPTS,
                      { value: "custom", label: "Personalizado", tone: "muted" as SelectTone },
                    ]
                  : OPTS
              }
            />
          </span>
          <span className="sg-person-row__perms">
            {toggle("links", "Links")}
            {toggle("leads", "Cadastros VIP")}
            <Select
              size="s"
              label={`Black de ${a.email}`}
              value={p.black ?? ""}
              onChange={(v) => setP({ ...p, black: (v || null) as Perm["black"] })}
              options={[
                { value: "", label: "Black: não", tone: "muted" },
                { value: "editor", label: "Black: edita", tone: "ok" },
                { value: "leitor", label: "Black: só vê", tone: "warn" },
              ]}
            />
          </span>
          <button
            type="button"
            className={`sg-btn sg-btn--s ${mudou ? "sg-btn--primary" : "sg-btn--ghost"}`}
            disabled={!mudou || salvando}
            onClick={async () => {
              setSalvando(true);
              await onSalvar(a.email, p);
              setSalvando(false);
            }}
          >
            {salvando ? "Salvando..." : mudou ? "Salvar" : "Salvo"}
          </button>
        </>
      )}
    </li>
  );
}

export function Equipe({ toast }: { toast: (t: string) => void }) {
  const [rows, setRows] = useState<Acesso[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [novo, setNovo] = useState("");
  const [novoCargo, setNovoCargo] = useState("black-editor");
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const r = await sb.rpc("painel_acessos");
    if (r.error) {
      const code = (r.error as { code?: string }).code ?? "";
      setErro(
        code === "PGRST202" || code === "42883"
          ? "missing"
          : "Não foi possível carregar os acessos.",
      );
      return;
    }
    setErro(null);
    setRows((r.data ?? []) as Acesso[]);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const salvar = async (email: string, p: Perm) => {
    const r = await sb.rpc("painel_acesso_definir", {
      p_email: email,
      p_links: p.links,
      p_leads: p.leads,
      p_black: p.black,
    });
    if (r.error) {
      toast(
        /inválido/.test(r.error.message)
          ? "Confira o e-mail digitado."
          : "Não foi possível salvar o acesso.",
      );
      return false;
    }
    toast(`Acesso de ${email} salvo.`);
    await load();
    return true;
  };
  const adicionar = async () => {
    const email = novo.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      toast("Digite um e-mail válido.");
      return;
    }
    const c = CARGOS.find((x) => x.k === novoCargo);
    if (c && (await salvar(email, c.p))) setNovo("");
  };

  if (erro === "missing")
    return (
      <Note tone="warn" icon={AlertTriangle}>
        A tela de acessos ainda não está ativa no banco. Rode no Supabase o arquivo{" "}
        <span className="sg-mono">{SQL_PLANO}</span>.
      </Note>
    );
  if (erro)
    return (
      <Note tone="bad" icon={AlertTriangle}>
        {erro}
      </Note>
    );
  if (!rows) return <div className="sg-skel" style={{ height: 280 }} />;

  const vis = rows.filter((a) => !q.trim() || a.email.includes(q.trim().toLowerCase()));
  const com = rows.filter((a) => a.dono || a.links || a.leads || a.black).length;

  return (
    <>
      <Card
        title="Dar acesso"
        hint="A pessoa entra com o e-mail e a senha dela. A conta é criada no Supabase, em Authentication > Users."
        icon={UserPlus}
        brand
      >
        <div className="sg-invite">
          <input
            className="sg-input"
            type="email"
            placeholder="email@da.pessoa"
            autoComplete="off"
            value={novo}
            onChange={(e) => setNovo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void adicionar()}
          />
          <Select
            label="Cargo"
            value={novoCargo}
            onChange={setNovoCargo}
            options={OPTS.filter((o) => o.value !== "nenhum")}
          />
          <button type="button" className="sg-btn sg-btn--primary" onClick={() => void adicionar()}>
            Dar acesso
          </button>
        </div>
        <p className="sg-muted" style={{ margin: "10px 0 0", fontSize: 13 }}>
          {CARGOS.find((c) => c.k === novoCargo)?.t}
        </p>
      </Card>

      <Card
        title="Quem entra no painel"
        hint={`${com} com acesso · ${rows.length} no total`}
        icon={Users}
        flush
        action={
          <div className="sg-search" style={{ width: 220 }}>
            <Search aria-hidden />
            <input
              className="sg-input"
              type="search"
              placeholder="Buscar e-mail"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        }
      >
        <ul className="sg-people-list">
          {vis.map((a) => (
            <Pessoa key={`${a.email}-${a.links}-${a.leads}-${a.black}`} a={a} onSalvar={salvar} />
          ))}
        </ul>
      </Card>
    </>
  );
}
