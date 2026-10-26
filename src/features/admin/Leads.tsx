import { useEffect, useState } from "react";
import { Check, Copy, Download, MessageCircle, Send, ShoppingBag } from "lucide-react";
import { ConfirmDelete } from "./ConfirmDelete";
import { NewTag, When } from "./when";
import {
  deleteContact,
  LEAD_STATUS,
  leadsCsv,
  leadsDispatchCsv,
  loadLeads,
  productName,
  setLeadStatus,
  type LeadRow,
  type LeadStatus,
  dispatchPhone,
  QUIZ_QUESTION_LABEL,
  loadRecovery,
  recoveryMessage,
  recoveryPaste,
  type Recovery,
} from "./data";
import { Select, type SelectOption, type SelectTone } from "./Select";

const STATUS_TONE: Record<LeadStatus, SelectTone> = {
  novo: "brand",
  "em-contato": "warn",
  cliente: "ok",
  descartado: "muted",
};
const STATUS_OPTIONS: SelectOption<LeadStatus>[] = LEAD_STATUS.map((s) => ({
  value: s.id,
  label: s.label,
  tone: STATUS_TONE[s.id],
}));

/** (18) 99636-6686 */
const prettyPhone = (raw: string) => {
  let d = raw.replace(/\D/g, "");
  if (d.length > 11 && d.startsWith("55")) d = d.slice(2);
  return d.length >= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}` : raw;
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          /* ignore */
        }
      }}
      className={`sg-btn sg-btn--s ${done ? "sg-chip--brand" : ""}`}
      aria-live="polite"
    >
      {done ? <Check aria-hidden /> : <Copy aria-hidden />}
      {done ? "Copiado" : label}
    </button>
  );
}

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/** Quem é a pessoa, pelas respostas do quiz (rótulo da pergunta: resposta). */
const profileOf = (answers: Record<string, string> | null) =>
  Object.entries(answers ?? {}).map(([k, v]) => ({ k: QUIZ_QUESTION_LABEL[k] ?? k, v }));

const waUrl = (raw: string, name: string, result: string | null) => {
  const n = raw.replace(/[^0-9]/g, "");
  const first = name.split(" ")[0];
  const text = result
    ? `Olá, ${first}! Aqui é da Soccer Games. Vi que no quiz o jogo indicado para você foi ${productName(result)}. Posso te ajudar a escolher a licença?`
    : `Olá, ${first}! Aqui é da Soccer Games.`;
  return `https://wa.me/${n.startsWith("55") ? n : `55${n}`}?text=${encodeURIComponent(text)}`;
};

/** Deixou o WhatsApp, tocou em Comprar e não pagou: a lista de quem vale chamar primeiro. */
function RecoveryList({
  items,
  onContacted,
}: {
  items: Recovery[] | null | undefined;
  onContacted: (r: LeadRow) => void;
}) {
  // Sem a leitura de pedidos da loja (permissão ou SQL pendente) a lista simplesmente não aparece.
  if (!items) return null;
  return (
    <section className="sg-recover">
      <header className="sg-recover__head">
        <span className="sg-card__icon sg-card__icon--brand" aria-hidden>
          <ShoppingBag />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h3 className="sg-card__title">
            Foi para a compra e não comprou{" "}
            {items.length > 0 && (
              <span className="sg-chip sg-chip--new" style={{ marginLeft: 6 }}>
                {items.length}
              </span>
            )}
          </h3>
          <p className="sg-card__hint">
            Deixou o WhatsApp, tocou em Comprar e não pagou naquela visita. Chame primeiro quem está
            aqui.
          </p>
        </div>
      </header>
      {items.length === 0 ? (
        <p className="sg-empty" style={{ padding: "14px 18px" }}>
          Ninguém por enquanto. A lista olha os contatos dos últimos 30 dias ainda em “A contatar” e
          espera 30 minutos depois do clique, para não chamar quem está pagando.
        </p>
      ) : (
        <ul className="sg-recover__list">
          {items.map((r) => {
            const paste = recoveryPaste(r);
            const phone = dispatchPhone(r.lead.whatsapp) ?? r.lead.whatsapp.replace(/\D/g, "");
            return (
              <li key={r.lead.id}>
                <span className="sg-avatar sg-avatar--soft" aria-hidden>
                  {initialsOf(r.lead.name)}
                </span>
                <div className="sg-recover__who">
                  <strong>{r.lead.name}</strong>
                  <span>
                    Foi para a compra <When iso={r.at} time />
                    {paste ? ` · ${paste}` : ""}
                  </span>
                </div>
                <div className="sg-recover__act">
                  <span className="sg-mono">{prettyPhone(r.lead.whatsapp)}</span>
                  <CopyButton text={phone} label="Copiar" />
                  <a
                    href={`https://wa.me/${phone}?text=${encodeURIComponent(recoveryMessage(r))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="sg-btn sg-btn--s sg-btn--brand"
                    title="Abrir a conversa no WhatsApp com a mensagem pronta"
                  >
                    <MessageCircle aria-hidden /> Chamar
                  </a>
                  <button
                    type="button"
                    onClick={() => onContacted(r.lead)}
                    className="sg-btn sg-btn--s"
                    title="Muda o status para “Em contato” e tira da lista"
                  >
                    Já chamei
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function Leads({
  from,
  to,
  periodLabel,
  onChange,
}: {
  from: Date;
  to: Date;
  periodLabel: string;
  /** Called after a contact is deleted, so the panel numbers follow. */
  onChange?: () => void;
}) {
  const [rows, setRows] = useState<LeadRow[] | null | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState<LeadStatus | "todos">("todos");
  // Follows the period chosen at the top of the panel; one click shows the whole base.
  const [wholeBase, setWholeBase] = useState(false);

  useEffect(() => {
    void loadLeads().then(setRows, () => setFailed(true));
  }, []);
  const [recovery, setRecovery] = useState<Recovery[] | null | undefined>(undefined);
  const hasRows = Array.isArray(rows);
  useEffect(() => {
    if (!hasRows || !rows) return;
    let alive = true;
    void loadRecovery(rows).then(
      (r) => alive && setRecovery(r),
      () => alive && setRecovery(null),
    );
    return () => {
      alive = false;
    };
    // só na primeira carga: mudar o status de um contato já tira ele da lista aqui embaixo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRows]);
  const markContacted = async (lead: LeadRow) => {
    setRecovery((x) => x?.filter((y) => y.lead.id !== lead.id));
    setRows((x) => x?.map((y) => (y.id === lead.id ? { ...y, status: "em-contato" } : y)));
    try {
      await setLeadStatus(lead.id, "em-contato");
    } catch {
      setRows((x) => x?.map((y) => (y.id === lead.id ? { ...y, status: lead.status } : y)));
    }
  };

  if (failed)
    return (
      <p className="sg-empty">
        Não foi possível carregar os contatos. Atualize a página para tentar de novo.
      </p>
    );
  if (rows === undefined) return <div className="sg-skel" style={{ height: 240 }} />;
  if (rows === null)
    return (
      <p className="sg-empty">
        A tabela de contatos ainda não existe. Rode no SQL Editor do Supabase o arquivo da pasta
        supabase/migrations e atualize a página.
      </p>
    );

  const scoped = wholeBase
    ? rows
    : rows.filter((r) => {
        const d = new Date(r.created_at);
        return d >= from && d <= to;
      });
  const shown = filter === "todos" ? scoped : scoped.filter((r) => r.status === filter);
  const count = (s: LeadStatus) => scoped.filter((r) => r.status === s).length;
  // For dispatch: what is on screen, but "Todos" never carries discarded contacts.
  const dispatch = leadsDispatchCsv(
    filter === "todos" ? scoped.filter((r) => r.status !== "descartado") : shown,
  );

  return (
    <div className="sg-stack">
      <RecoveryList items={recovery} onContacted={markContacted} />

      <div className="sg-leadbar">
        <div className="sg-seg" role="group" aria-label="Filtrar por status">
          {[
            { id: "todos" as const, label: "Todos", n: scoped.length },
            ...LEAD_STATUS.map((s) => ({ ...s, n: count(s.id) })),
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              className="sg-seg__btn"
              aria-pressed={filter === s.id}
              onClick={() => setFilter(s.id)}
            >
              {s.label} <span className="sg-seg__count">{s.n}</span>
            </button>
          ))}
        </div>
        {scoped.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <a
              className="sg-btn sg-btn--s"
              download={`contatos-quiz-soccer-${new Date().toISOString().slice(0, 10)}.csv`}
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(leadsCsv(scoped))}`}
            >
              <Download aria-hidden /> Planilha
            </a>
            {dispatch.count > 0 && (
              <a
                className="sg-btn sg-btn--s sg-btn--primary"
                download={`disparo-quiz-soccer-${new Date().toISOString().slice(0, 10)}.csv`}
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(dispatch.csv)}`}
                title="Telefone com 55 + DDD, um contato por número, pronto para subir na plataforma de disparo"
              >
                <Send aria-hidden /> Para disparo · {dispatch.count}
              </a>
            )}
          </div>
        )}
      </div>

      <p className="sg-card__hint" style={{ margin: 0 }}>
        {wholeBase ? (
          <>
            Mostrando <strong>a base inteira</strong>: {scoped.length}{" "}
            {scoped.length === 1 ? "contato" : "contatos"} desde o início.{" "}
          </>
        ) : (
          <>
            Mostrando quem respondeu em <strong>{periodLabel}</strong>: {scoped.length}{" "}
            {scoped.length === 1 ? "contato" : "contatos"}.{" "}
          </>
        )}
        <button
          type="button"
          className="sg-link"
          style={{ background: "none", border: 0, padding: 0 }}
          onClick={() => setWholeBase((v) => !v)}
        >
          {wholeBase ? "Ver só o período escolhido" : `Ver a base inteira (${rows.length})`}
        </button>
        {dispatch.skipped > 0 &&
          ` · ${dispatch.skipped} ${dispatch.skipped === 1 ? "contato ficou" : "contatos ficaram"} fora do disparo por número inválido.`}
      </p>

      {shown.length === 0 ? (
        <p className="sg-empty">
          {wholeBase
            ? "Nenhum contato aqui ainda."
            : "Nenhum contato neste período. Tente ver a base inteira."}
        </p>
      ) : (
        <ul className="sg-leads">
          {shown.map((r) => (
            <li key={r.id} className={`sg-lead sg-lead--${r.status}`}>
              <div className="sg-lead__who">
                <span className="sg-avatar sg-avatar--soft" aria-hidden>
                  {initialsOf(r.name)}
                </span>
                <div style={{ minWidth: 0 }}>
                  <p className="sg-lead__name">
                    {r.name}
                    <NewTag iso={r.created_at} />
                  </p>
                  <p className="sg-lead__when">
                    <When iso={r.created_at} />
                  </p>
                  <div className="sg-lead__phone">
                    <span className="sg-mono">{prettyPhone(r.whatsapp)}</span>
                    {dispatchPhone(r.whatsapp) && (
                      <CopyButton text={dispatchPhone(r.whatsapp)!} label="Copiar" />
                    )}
                    <a
                      href={waUrl(r.whatsapp, r.name, r.result)}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Abrir conversa no WhatsApp"
                      aria-label={`Abrir conversa com ${r.name} no WhatsApp`}
                      className="sg-btn sg-btn--s sg-btn--icon"
                    >
                      <MessageCircle aria-hidden />
                    </a>
                  </div>
                </div>
              </div>
              <div className="sg-lead__profile">
                {r.answers?.["origem"] ? (
                  <span className="sg-chip">Cadastrou em: {r.answers["origem"]}</span>
                ) : (
                  <div className="sg-chips">
                    {profileOf(r.answers).map(({ k, v }) => (
                      <span key={k} className="sg-chip" title={k}>
                        <span className="sg-muted">{k}:</span> {v}
                      </span>
                    ))}
                  </div>
                )}
                {r.result && (
                  <div className="sg-lead__game">
                    <span className="sg-label" style={{ margin: 0 }}>
                      jogo indicado
                    </span>
                    <strong>{productName(r.result)}</strong>
                    <CopyButton text={productName(r.result)} label="Copiar nome" />
                  </div>
                )}
              </div>
              <div className="sg-lead__end">
                <Select
                  size="s"
                  className="sg-lead__status"
                  label={`Status de ${r.name}`}
                  value={r.status}
                  options={STATUS_OPTIONS}
                  onChange={async (status) => {
                    setRows((x) => x?.map((y) => (y.id === r.id ? { ...y, status } : y)));
                    try {
                      await setLeadStatus(r.id, status);
                    } catch {
                      setRows((x) =>
                        x?.map((y) => (y.id === r.id ? { ...y, status: r.status } : y)),
                      );
                    }
                  }}
                />
                <ConfirmDelete
                  name={r.name}
                  onConfirm={async () => {
                    await deleteContact("leads", r.id);
                    setRows((x) => x?.filter((y) => y.id !== r.id));
                    onChange?.();
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="sg-inset">
        <strong style={{ color: "var(--sg-ink)" }}>Como usar.</strong> Copie o número e cole na
        Huggy, copie o nome do jogo para o espaço livre da mensagem pronta, envie e mude o status
        para <strong>Em contato</strong>, para não mandar duas vezes. <strong>Descartado</strong> só
        marca para não chamar de novo: o contato continua guardado e fica fora do arquivo de
        disparo. Para tirar alguém da base de vez (pedido de remoção), use a lixeira.
      </div>
    </div>
  );
}
