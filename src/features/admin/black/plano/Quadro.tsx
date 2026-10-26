import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2, X } from "lucide-react";
import { Note } from "../../ui";
import { Select } from "../../Select";
import { aoVivo, SQL_PLANO } from "./data";
import { fmtD, spDate, type Oferta } from "./logic";
import {
  atrasada,
  COLUNAS,
  criarTarefas,
  excluirTarefa,
  loadTarefas,
  pesoPrio,
  PRIORIDADES,
  salvarTarefa,
  tipoNome,
  TIPOS,
  type Status,
  type Tarefa,
} from "./tarefas";

const quando = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});
const initials = (n: string) =>
  n
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("") || "?";

/** Quadro do time: quem está fazendo o quê, em quatro colunas, ao vivo. */
export function Quadro({
  ofertas,
  canW,
  toast,
}: {
  ofertas: Oferta[];
  canW: boolean;
  toast: (t: string) => void;
}) {
  const [rows, setRowsState] = useState<Tarefa[]>([]);
  const rowsRef = useRef<Tarefa[]>([]);
  const setRows = (r: Tarefa[]) => {
    rowsRef.current = r;
    setRowsState(r);
  };
  const [estado, setEstado] = useState<"carregando" | "ok" | "sem-tabela" | "erro">("carregando");
  const [resp, setResp] = useState("");
  const [filtro, setFiltro] = useState<"" | "atrasadas" | "urgentes">("");
  const [aberta, setAberta] = useState<number | null>(null);
  const [arrastando, setArrastando] = useState<number | null>(null);
  const [sobre, setSobre] = useState<Status | null>(null);
  const hoje = spDate();

  const load = useCallback(async () => {
    const r = await loadTarefas();
    if (!r.ok) {
      setEstado(r.missing ? "sem-tabela" : "erro");
      return;
    }
    setRows(r.rows);
    setEstado("ok");
  }, []);

  useEffect(() => {
    void load();
    const off = aoVivo("black_tarefas", () => void load());
    const poll = window.setInterval(
      () => document.visibilityState === "visible" && void load(),
      45000,
    );
    return () => {
      off();
      window.clearInterval(poll);
    };
  }, [load]);

  const patchLocal = (id: number, patch: Partial<Tarefa>) =>
    setRows(rowsRef.current.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  const mover = async (id: number, status: Status) => {
    const t = rowsRef.current.find((x) => x.id === id);
    if (!t || t.status === status || !canW) return;
    const ordem = Date.now() / 1000;
    patchLocal(id, { status, ordem });
    if (!(await salvarTarefa(id, { status, ordem }))) {
      toast("Não foi possível mover o card.");
      void load();
    }
  };

  const nova = async (status: Status = "fazer") => {
    if (!canW) return;
    const r = await criarTarefas([
      {
        titulo: "",
        tipo: "arte",
        status,
        prioridade: "normal",
        resp: "",
        ordem: Date.now() / 1000,
      },
    ]);
    if (!r?.[0]) {
      toast("Não foi possível criar a tarefa.");
      return;
    }
    setRows([...rowsRef.current, r[0]]);
    setAberta(r[0].id);
  };

  const ofPorId = useMemo(() => new Map(ofertas.map((o) => [String(o.id), o])), [ofertas]);
  const ofLabel = (id: string | null) => {
    const o = id ? ofPorId.get(id) : undefined;
    return o ? `${fmtD(o.data)} · ${o.produto || "Sem nome"}` : "";
  };
  const pessoas = useMemo(
    () => [...new Set(rows.map((t) => t.resp.trim()).filter(Boolean))].sort(),
    [rows],
  );
  const vis = rows.filter(
    (t) =>
      (!resp || t.resp.trim() === resp) &&
      (filtro !== "atrasadas" || atrasada(t, hoje)) &&
      (filtro !== "urgentes" || t.prioridade === "urgente"),
  );
  const nAtras = rows.filter((t) => atrasada(t, hoje)).length;
  const feitas = rows.filter((t) => t.status === "pronto").length;
  const tarefa = aberta != null ? rows.find((t) => t.id === aberta) : undefined;

  if (estado === "sem-tabela")
    return (
      <Note tone="warn" icon={AlertTriangle}>
        O quadro ainda não está ativo no banco. Rode no Supabase o arquivo{" "}
        <span className="sg-mono">{SQL_PLANO}</span>.
      </Note>
    );
  if (estado === "erro")
    return (
      <Note tone="bad" icon={AlertTriangle}>
        Não foi possível carregar o quadro. Atualize a página.
      </Note>
    );
  if (estado === "carregando") return <div className="sg-skel" style={{ height: 360 }} />;

  return (
    <>
      <div className="sg-kb__top">
        <div className="sg-kb__stats">
          <span>
            <b className="sg-mono">{rows.length}</b> tarefas
          </span>
          <span>
            <b className="sg-mono">{rows.length ? Math.round((feitas / rows.length) * 100) : 0}%</b>{" "}
            prontas
          </span>
          <span className={nAtras ? "is-bad" : ""}>
            <b className="sg-mono">{nAtras}</b> atrasada{nAtras === 1 ? "" : "s"}
          </span>
          <span className="sg-kb__progress" aria-hidden>
            <i style={{ width: `${rows.length ? (feitas / rows.length) * 100 : 0}%` }} />
          </span>
        </div>
        <div className="sg-kb__filters">
          <Select
            label="Responsável"
            value={resp}
            onChange={setResp}
            options={[
              { value: "", label: "Todo o time" },
              ...pessoas.map((p) => ({ value: p, label: p })),
            ]}
          />
          <div className="sg-seg" role="group" aria-label="Filtro">
            {(
              [
                ["", "Todas"],
                ["atrasadas", `Atrasadas${nAtras ? ` ${nAtras}` : ""}`],
                ["urgentes", "Urgentes"],
              ] as const
            ).map(([k, n]) => (
              <button
                key={k}
                type="button"
                className="sg-seg__btn"
                aria-pressed={filtro === k}
                onClick={() => setFiltro(k)}
              >
                {n}
              </button>
            ))}
          </div>
          {canW && (
            <button type="button" className="sg-btn sg-btn--primary" onClick={() => void nova()}>
              <Plus aria-hidden /> Nova tarefa
            </button>
          )}
        </div>
      </div>

      <div className="sg-kb">
        {COLUNAS.map((c) => {
          const lista = vis
            .filter((t) => t.status === c.k)
            .sort((a, b) => pesoPrio(a.prioridade) - pesoPrio(b.prioridade) || a.ordem - b.ordem);
          return (
            <section
              key={c.k}
              className={`sg-kb__col is-${c.tone} ${sobre === c.k ? "is-over" : ""}`}
              aria-label={c.n}
              onDragOver={(e) => {
                if (arrastando == null) return;
                e.preventDefault();
                setSobre(c.k);
              }}
              onDragLeave={() => setSobre((s) => (s === c.k ? null : s))}
              onDrop={(e) => {
                e.preventDefault();
                setSobre(null);
                if (arrastando != null) void mover(arrastando, c.k);
                setArrastando(null);
              }}
            >
              <header className="sg-kb__colh">
                <span className="sg-kb__dot" aria-hidden />
                <b>{c.n}</b>
                <span className="sg-mono">{lista.length}</span>
              </header>
              <div className="sg-kb__cards">
                {lista.map((t) => {
                  const late = atrasada(t, hoje);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`sg-kb__card ${late ? "is-late" : ""} ${t.status === "pronto" ? "is-done" : ""} prio-${t.prioridade}`}
                      draggable={canW}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", String(t.id));
                        setArrastando(t.id);
                      }}
                      onDragEnd={() => {
                        setArrastando(null);
                        setSobre(null);
                      }}
                      onClick={() => setAberta(t.id)}
                    >
                      <span className="sg-kb__tags">
                        <span className="sg-chip">{tipoNome(t.tipo)}</span>
                        {(t.prioridade === "urgente" || t.prioridade === "alta") && (
                          <span
                            className={`sg-chip ${t.prioridade === "urgente" ? "sg-chip--bad" : "sg-chip--warn"}`}
                          >
                            {t.prioridade === "urgente" ? "Urgente" : "Alta"}
                          </span>
                        )}
                      </span>
                      <span className="sg-kb__title">{t.titulo || "Sem título"}</span>
                      {t.oferta_id && ofLabel(t.oferta_id) && (
                        <span className="sg-kb__of">{ofLabel(t.oferta_id)}</span>
                      )}
                      <span className="sg-kb__foot">
                        <span className="sg-kb__who">
                          <span className="sg-avatar sg-avatar--soft" aria-hidden>
                            {initials(t.resp)}
                          </span>
                          {t.resp || "Sem responsável"}
                        </span>
                        {t.prazo && (
                          <span className={`sg-mono ${late ? "sg-kb__late" : "sg-muted"}`}>
                            {late ? "atrasou · " : ""}
                            {fmtD(t.prazo)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {canW && (
                  <button type="button" className="sg-kb__add" onClick={() => void nova(c.k)}>
                    <Plus aria-hidden /> tarefa
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {tarefa && (
        <FichaTarefa
          key={tarefa.id}
          t={tarefa}
          ofertas={ofertas}
          pessoas={pessoas}
          canW={canW}
          ofLabel={ofLabel}
          onClose={() => setAberta(null)}
          onLocal={(p) => patchLocal(tarefa.id, p)}
          onMove={(s) => void mover(tarefa.id, s)}
          onDeleted={() => {
            setRows(rowsRef.current.filter((x) => x.id !== tarefa.id));
            setAberta(null);
          }}
          toast={toast}
        />
      )}
    </>
  );
}

function FichaTarefa({
  t,
  ofertas,
  pessoas,
  canW,
  ofLabel,
  onClose,
  onLocal,
  onMove,
  onDeleted,
  toast,
}: {
  t: Tarefa;
  ofertas: Oferta[];
  pessoas: string[];
  canW: boolean;
  ofLabel: (id: string | null) => string;
  onClose: () => void;
  onLocal: (p: Partial<Tarefa>) => void;
  onMove: (s: Status) => void;
  onDeleted: () => void;
  toast: (t: string) => void;
}) {
  const [d, setD] = useState(t);
  const dRef = useRef(d);
  dRef.current = d;
  const dirty = useRef<Set<keyof Tarefa>>(new Set());
  const timer = useRef<number | undefined>(undefined);
  const [delArm, setDelArm] = useState(false);

  useEffect(() => {
    if (!dirty.current.size) setD(t);
  }, [t]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    if (!dirty.current.size) return;
    const patch: Record<string, unknown> = {};
    for (const k of dirty.current)
      patch[k] = dRef.current[k] === "" && k === "prazo" ? null : dRef.current[k];
    dirty.current = new Set();
    onLocal(patch as Partial<Tarefa>);
    if (!(await salvarTarefa(dRef.current.id, patch as Partial<Tarefa>)))
      toast("Não foi possível salvar. Confira sua permissão de edição.");
  }, [onLocal, toast]);
  useEffect(() => () => void flush(), [flush]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const campo = <K extends keyof Tarefa>(k: K, v: Tarefa[K], agora = false) => {
    if (!canW) return;
    const next = { ...dRef.current, [k]: v };
    setD(next);
    dRef.current = next;
    dirty.current.add(k);
    window.clearTimeout(timer.current);
    if (agora) void flush();
    else timer.current = window.setTimeout(() => void flush(), 700);
  };

  return (
    <>
      <button type="button" className="sg-veil" aria-label="Fechar a tarefa" onClick={onClose} />
      <aside className="sg-drawer" aria-label="Tarefa" role="dialog" aria-modal="true">
        <header className="sg-drawer__head">
          <div style={{ minWidth: 0 }}>
            <span className="sg-drawer__kicker">
              <i aria-hidden /> {tipoNome(d.tipo)}
              {d.oferta_id && ofLabel(d.oferta_id) ? ` · ${ofLabel(d.oferta_id)}` : ""}
            </span>
            <h2 className="sg-drawer__title">{d.titulo || "Nova tarefa"}</h2>
            <span className="sg-drawer__state">{canW ? "Salva sozinho" : "Só leitura"}</span>
          </div>
          <button
            type="button"
            className="sg-btn sg-btn--icon sg-btn--ghost"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X />
          </button>
        </header>
        <div className="sg-drawer__body">
          <section className="sg-drawer__sec">
            <label className="sg-field">
              <span className="sg-field__label">Tarefa</span>
              <input
                className="sg-input"
                maxLength={200}
                placeholder="Ex.: Arte do story do GTA VI"
                value={d.titulo}
                disabled={!canW}
                onChange={(e) => campo("titulo", e.target.value)}
                autoFocus={!d.titulo}
              />
            </label>
            <div className="sg-form2">
              <div className="sg-field">
                <span className="sg-field__label">Tipo</span>
                <Select
                  label="Tipo"
                  value={d.tipo}
                  disabled={!canW}
                  onChange={(v) => campo("tipo", v, true)}
                  options={TIPOS.map((x) => ({ value: x.k, label: x.n }))}
                />
              </div>
              <div className="sg-field">
                <span className="sg-field__label">Situação</span>
                <Select
                  label="Situação"
                  value={d.status}
                  disabled={!canW}
                  onChange={(v) => {
                    setD({ ...dRef.current, status: v });
                    onMove(v);
                  }}
                  options={COLUNAS.map((x) => ({ value: x.k, label: x.n, tone: x.tone }))}
                />
              </div>
            </div>
            <div className="sg-form2">
              <div className="sg-field">
                <span className="sg-field__label">Prioridade</span>
                <Select
                  label="Prioridade"
                  value={d.prioridade}
                  disabled={!canW}
                  onChange={(v) => campo("prioridade", v, true)}
                  options={PRIORIDADES.map((x) => ({ value: x.k, label: x.n, tone: x.tone }))}
                />
              </div>
              <label className="sg-field">
                <span className="sg-field__label">Prazo</span>
                <input
                  className="sg-input sg-mono"
                  type="date"
                  value={d.prazo ?? ""}
                  disabled={!canW}
                  onChange={(e) => campo("prazo", e.target.value || null, true)}
                />
              </label>
            </div>
            <label className="sg-field">
              <span className="sg-field__label">Responsável</span>
              <input
                className="sg-input"
                maxLength={80}
                list="sg-pessoas"
                placeholder="Quem faz"
                value={d.resp}
                disabled={!canW}
                onChange={(e) => campo("resp", e.target.value)}
              />
              <datalist id="sg-pessoas">
                {pessoas.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
            <div className="sg-field">
              <span className="sg-field__label">Oferta ligada</span>
              <Select
                label="Oferta"
                value={d.oferta_id ?? ""}
                disabled={!canW}
                onChange={(v) => campo("oferta_id", v || null, true)}
                options={[
                  { value: "", label: "Nenhuma" },
                  ...ofertas.map((o) => ({
                    value: String(o.id),
                    label: `${fmtD(o.data)} · ${o.produto || "Sem nome"}`,
                  })),
                ]}
              />
            </div>
            <label className="sg-field">
              <span className="sg-field__label">Observações</span>
              <textarea
                className="sg-input sg-textarea"
                rows={4}
                maxLength={1000}
                placeholder="Link da arte, o que falta, quem aprova"
                value={d.obs}
                disabled={!canW}
                onChange={(e) => campo("obs", e.target.value)}
              />
            </label>
          </section>
          <footer className="sg-drawer__foot">
            <span className="sg-muted" style={{ fontSize: 12 }}>
              {t.atualizado_por
                ? `Última alteração: ${t.atualizado_por} em ${quando.format(new Date(t.atualizado_em))}`
                : ""}
            </span>
            {canW && (
              <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {d.status !== "pronto" && (
                  <button
                    type="button"
                    className="sg-btn sg-btn--s sg-btn--primary"
                    onClick={() => {
                      setD({ ...dRef.current, status: "pronto" });
                      onMove("pronto");
                    }}
                  >
                    <CheckCircle2 aria-hidden /> Marcar como pronta
                  </button>
                )}
                <button
                  type="button"
                  className={`sg-btn sg-btn--s ${delArm ? "sg-btn--danger-solid" : "sg-btn--danger"}`}
                  onClick={async () => {
                    if (!delArm) {
                      setDelArm(true);
                      window.setTimeout(() => setDelArm(false), 4000);
                      return;
                    }
                    dirty.current = new Set();
                    if (await excluirTarefa(t.id)) onDeleted();
                    else toast("Não foi possível excluir.");
                  }}
                >
                  <Trash2 aria-hidden /> {delArm ? "Clique de novo para excluir" : "Excluir"}
                </button>
              </span>
            )}
          </footer>
        </div>
      </aside>
    </>
  );
}
