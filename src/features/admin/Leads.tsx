import { useEffect, useState } from "react";
import { Check, Copy, Download, MessageCircle, Send } from "lucide-react";
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
} from "./data";

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
      className={`flex h-8 items-center gap-1.5 border px-2.5 text-xs transition-colors ${done ? "border-[#8a00c2] text-[#8a00c2]" : "border-neutral-300 text-neutral-800 hover:border-neutral-900"}`}
    >
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copiado" : label}
    </button>
  );
}

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

  if (failed)
    return (
      <p className="text-sm leading-relaxed text-neutral-500">
        Não foi possível carregar os contatos. Atualize a página para tentar de novo.
      </p>
    );
  if (rows === undefined) return null;
  if (rows === null)
    return (
      <p className="text-sm leading-relaxed text-neutral-500">
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
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <p className="text-neutral-700">
          {wholeBase ? (
            <>
              Mostrando <strong>a base inteira</strong>: {scoped.length}{" "}
              {scoped.length === 1 ? "contato" : "contatos"} desde o início.
            </>
          ) : (
            <>
              Mostrando só quem respondeu em <strong>{periodLabel}</strong>: {scoped.length}{" "}
              {scoped.length === 1 ? "contato" : "contatos"}.
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setWholeBase((v) => !v)}
          className="text-neutral-900 underline underline-offset-4 hover:no-underline"
        >
          {wholeBase ? "Ver só o período escolhido" : `Ver a base inteira (${rows.length})`}
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 bg-neutral-100 p-1 text-sm">
          {[
            { id: "todos" as const, label: "Todos", n: scoped.length },
            ...LEAD_STATUS.map((s) => ({ ...s, n: count(s.id) })),
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setFilter(s.id)}
              className={`h-8 px-3 ${filter === s.id ? "bg-white font-medium text-neutral-900" : "text-neutral-500 hover:text-neutral-900"}`}
            >
              {s.label} <span className="tabular-nums text-neutral-400">{s.n}</span>
            </button>
          ))}
        </div>
        {scoped.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <a
              className="flex h-9 items-center gap-2 border border-neutral-300 px-3 text-sm text-neutral-800 hover:border-neutral-900"
              download={`contatos-quiz-soccer-${new Date().toISOString().slice(0, 10)}.csv`}
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(leadsCsv(scoped))}`}
            >
              <Download className="h-4 w-4" /> Planilha
            </a>
            {dispatch.count > 0 && (
              <a
                className="flex h-9 items-center gap-2 bg-neutral-900 px-3 text-sm text-white hover:bg-neutral-700"
                download={`disparo-quiz-soccer-${new Date().toISOString().slice(0, 10)}.csv`}
                href={`data:text/csv;charset=utf-8,${encodeURIComponent(dispatch.csv)}`}
                title="Telefone com 55 + DDD, um contato por número, pronto para subir na plataforma de disparo"
              >
                <Send className="h-4 w-4" /> Para disparo ({dispatch.count})
              </a>
            )}
          </div>
        )}
      </div>
      {dispatch.skipped > 0 && (
        <p className="mt-2 text-xs text-neutral-500">
          {dispatch.skipped} {dispatch.skipped === 1 ? "contato ficou" : "contatos ficaram"} fora do
          arquivo de disparo por número inválido.
        </p>
      )}
      <p className="mt-2 text-xs leading-relaxed text-neutral-500">
        Como usar: copie o número e cole na Huggy, copie o nome do jogo para o espaço livre da
        mensagem pronta, envie e mude o status para <strong>Em contato</strong>, para não mandar
        duas vezes para a mesma pessoa.
      </p>
      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
        <strong>Descartado</strong> só marca para não chamar a pessoa de novo: o contato continua
        guardado e fica fora do arquivo "Para disparo". Para tirar alguém da base de vez (por
        exemplo, quando pedir para ser removido), use a lixeira.
      </p>

      {shown.length === 0 ? (
        <p className="py-6 text-sm text-neutral-400">
          {wholeBase ? "Nenhum contato aqui ainda." : "Nenhum contato neste período."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-neutral-100">
          {shown.map((r) => (
            <li
              key={r.id}
              className="grid gap-4 py-5 md:grid-cols-[1.5fr_1.2fr_auto_auto] md:items-start"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-neutral-900">
                  {r.name}
                  <NewTag iso={r.created_at} />
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  <When iso={r.created_at} />
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm tabular-nums text-neutral-800">
                    {prettyPhone(r.whatsapp)}
                  </span>
                  {dispatchPhone(r.whatsapp) && (
                    <CopyButton text={dispatchPhone(r.whatsapp)!} label="Copiar número" />
                  )}
                  <a
                    href={waUrl(r.whatsapp, r.name, r.result)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir conversa no WhatsApp"
                    aria-label={`Abrir conversa com ${r.name} no WhatsApp`}
                    className="flex h-8 w-8 items-center justify-center border border-neutral-300 text-neutral-800 hover:border-neutral-900"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
              <div className="min-w-0 text-xs">
                {r.answers?.["origem"] ? (
                  <p className="text-neutral-600">Cadastrou em: {r.answers["origem"]}</p>
                ) : (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                    {profileOf(r.answers).map(({ k, v }) => (
                      <div key={k} className="contents">
                        <dt className="text-neutral-400">{k}</dt>
                        <dd className="text-neutral-800">{v}</dd>
                      </div>
                    ))}
                    {r.result && (
                      <div className="contents">
                        <dt className="text-neutral-400">Jogo indicado</dt>
                        <dd className="font-medium text-neutral-900">{productName(r.result)}</dd>
                      </div>
                    )}
                  </dl>
                )}
                {r.result && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-3">
                    <span className="text-neutral-400">Para colar na mensagem:</span>
                    <span className="font-medium text-neutral-900">{productName(r.result)}</span>
                    <CopyButton text={productName(r.result)} label="Copiar" />
                  </div>
                )}
              </div>
              <select
                value={r.status}
                onChange={async (e) => {
                  const status = e.target.value as LeadStatus;
                  setRows((x) => x?.map((y) => (y.id === r.id ? { ...y, status } : y)));
                  try {
                    await setLeadStatus(r.id, status);
                  } catch {
                    setRows((x) => x?.map((y) => (y.id === r.id ? { ...y, status: r.status } : y)));
                  }
                }}
                className="h-9 border border-neutral-300 bg-white px-2 text-sm"
                aria-label={`Status de ${r.name}`}
              >
                {LEAD_STATUS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ConfirmDelete
                name={r.name}
                onConfirm={async () => {
                  await deleteContact("leads", r.id);
                  setRows((x) => x?.filter((y) => y.id !== r.id));
                  onChange?.();
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
