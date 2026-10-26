import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ListChecks,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { games, productUrl, searchGames, type Game } from "@/features/public/games";
import { download } from "../data";
import { Card, Note } from "../../ui";
import { Select } from "../../Select";
import {
  aoVivo,
  criarOferta,
  excluirOferta,
  loadOfertas,
  loadPix,
  salvarOferta,
  savePix,
  SQL_PLANO,
  type Acesso,
} from "./data";
import {
  brl,
  buildPatch,
  calendarCells,
  D0,
  D1,
  diff,
  dow,
  FLOW,
  fmtD,
  FRI,
  genMsg,
  genSequencia,
  hasPrice,
  hora,
  MAXD,
  numv,
  ofertasCsv,
  pctOff,
  PH,
  phOf,
  precoPix,
  sortOfertas,
  spDate,
  steps,
  WD,
  type Oferta,
} from "./logic";
import { cardsDaOferta, criarTarefas } from "./tarefas";
import { Quadro } from "./Quadro";
import { Equipe } from "./Equipe";

export type PlanoSection = "plano" | "calendario" | "lista" | "quadro" | "equipe" | "fluxo";

const quando = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/* ------------------------------------------------------------------ pequenos */

function CopyBtn({
  text,
  label = "Copiar",
  primary,
}: {
  text: string;
  label?: string;
  primary?: boolean;
}) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={`sg-btn sg-btn--s ${primary ? "sg-btn--primary" : ""}`}
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setOk(true);
          window.setTimeout(() => setOk(false), 1600);
        });
      }}
    >
      {ok ? <Check aria-hidden /> : <Copy aria-hidden />} {ok ? "Copiado" : label}
    </button>
  );
}

export function Etapas({ o }: { o: Oferta }) {
  const s = [
    [o.ok_pagina, "Preço e página na loja"],
    [o.ok_arte, "Arte pronta"],
    [o.ok_envio, "Enviada no grupo"],
  ] as const;
  return (
    <span className="sg-steps" title={s.map(([v, n]) => `${n}: ${v ? "sim" : "não"}`).join(" · ")}>
      {s.map(([v, n]) => (
        <i key={n} className={v ? "on" : ""} />
      ))}
    </span>
  );
}

/** Mensagem no formato do WhatsApp: *negrito*, _itálico_, ~riscado~ e > citação. Links ficam como estão. */
function Wa({ text }: { text: string }) {
  const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const fmt = (t: string) =>
    esc(t)
      .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
      .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?])/g, "$1<i>$2</i>")
      .replace(/~([^~\n]+)~/g, "<s>$1</s>");
  const html = text
    .split("\n")
    .map((line) => {
      const quote = line.startsWith("> ");
      const body = (quote ? line.slice(2) : line)
        .split(/(https?:\/\/\S+)/g)
        .map((part, i) => (i % 2 ? `<u>${esc(part)}</u>` : fmt(part)))
        .join("");
      return quote ? `<span class="q">${body}</span>` : body;
    })
    .join("\n");
  return <div className="sg-wa" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Sequencia({ o, pix, compact }: { o: Oferta; pix: number | null; compact?: boolean }) {
  const seq = genSequencia(o, pix);
  const [k, setK] = useState(1);
  if (compact) {
    const p = seq[k] ?? seq[0]!;
    return (
      <div className="sg-seq sg-seq--tabs">
        <div className="sg-seg" role="tablist" aria-label="Mensagens do dia">
          {seq.map((x, i) => (
            <button
              key={x.k}
              type="button"
              role="tab"
              className="sg-seg__btn"
              aria-selected={i === k}
              aria-pressed={i === k}
              onClick={() => setK(i)}
            >
              <span className="sg-mono">{x.quando}</span> {x.nome}
            </button>
          ))}
        </div>
        <span className="sg-seq__art" style={{ paddingLeft: 0 }}>
          {p.arte}
        </span>
        <Wa text={p.texto} />
        <CopyBtn text={p.texto} label={`Copiar ${p.nome.toLowerCase()}`} primary />
      </div>
    );
  }
  return (
    <ol className="sg-seq">
      {seq.map((p, i) => (
        <li key={p.k}>
          <div className="sg-seq__head">
            <span className="sg-seq__n">{i + 1}</span>
            <b>{p.nome}</b>
            <span className="sg-mono sg-muted">{p.quando}</span>
            <span className="sg-seq__art">{p.arte}</span>
          </div>
          <Wa text={p.texto} />
          <CopyBtn text={p.texto} label={`Copiar ${p.nome.toLowerCase()}`} />
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ escolher o jogo */

function GamePicker({
  value,
  disabled,
  onText,
  onPick,
}: {
  value: string;
  disabled: boolean;
  onText: (v: string) => void;
  onPick: (g: Game) => void;
}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  // O texto só vai para o banco ao escolher um jogo ou sair do campo (não salva "spi").
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const box = useRef<HTMLDivElement>(null);
  const list = useMemo(
    () => (text.trim().length >= 2 ? searchGames(text).slice(0, 8) : []),
    [text],
  );
  useEffect(() => {
    const close = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, []);
  const pick = (g: Game) => {
    onPick(g);
    setOpen(false);
  };
  return (
    <div className="sg-combo" ref={box}>
      <span className="sg-combo__icon" aria-hidden>
        <Search />
      </span>
      <input
        className="sg-input"
        data-k="produto"
        value={text}
        disabled={disabled}
        maxLength={200}
        onBlur={() => text !== value && onText(text)}
        placeholder="Digite o nome do jogo e escolha da loja"
        role="combobox"
        aria-expanded={open && list.length > 0}
        aria-autocomplete="list"
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          setI(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (!open || !list.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setI((x) => (x + 1) % list.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setI((x) => (x - 1 + list.length) % list.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            const g = list[i];
            if (g) pick(g);
          } else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && list.length > 0 && (
        <ul className="sg-combo__list" role="listbox">
          {list.map((g, j) => (
            <li
              key={g.slug}
              role="option"
              aria-selected={j === i}
              className={j === i ? "is-active" : ""}
              onPointerEnter={() => setI(j)}
              onPointerDown={(e) => {
                e.preventDefault();
                pick(g);
              }}
            >
              <span>{g.name}</span>
              <small>
                {g.platforms.join(" e ")} ·{" "}
                {g.licenses
                  .filter((l) => !l.out)
                  .map((l) => l.label)
                  .join(", ") || "sem licença em estoque"}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ ficha da oferta */

type Field = keyof Oferta;

function Ficha({
  o,
  all,
  pix,
  canW,
  onClose,
  onSaved,
  onDeleted,
  onOpen,
  toast,
}: {
  o: Oferta;
  all: Oferta[];
  pix: number | null;
  canW: boolean;
  onClose: () => void;
  onSaved: (o: Oferta) => void;
  onDeleted: (id: number) => void;
  onOpen: (id: number) => void;
  toast: (t: string) => void;
}) {
  const [d, setD] = useState<Oferta>(o);
  const dRef = useRef(d);
  dRef.current = d;
  const dirty = useRef<Set<Field>>(new Set());
  const timer = useRef<number | undefined>(undefined);
  const [state, setState] = useState<"" | "salvando" | "salvo" | "erro">("");
  const [delArm, setDelArm] = useState(false);

  // Mudança de fora (outra pessoa) entra se nada aqui estiver sendo editado.
  useEffect(() => {
    if (o.id !== dRef.current.id) {
      setD(o);
      dirty.current = new Set();
      return;
    }
    if (!dirty.current.size) setD(o);
  }, [o]);

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const ks = [...dirty.current];
    if (!ks.length) return;
    dirty.current = new Set();
    const cur = dRef.current;
    const patch = buildPatch(cur, ks);
    onSaved({ ...cur, ...patch } as Oferta);
    const ok = await salvarOferta(cur.id, patch);
    setState(ok ? "salvo" : "erro");
    if (ok) window.setTimeout(() => setState((s) => (s === "salvo" ? "" : s)), 1500);
  }, [onSaved]);

  useEffect(() => () => void flush(), [flush]);
  useEffect(() => {
    const out = () => void flush();
    window.addEventListener("pagehide", out);
    return () => window.removeEventListener("pagehide", out);
  }, [flush]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const set = (patch: Partial<Oferta>, now = false) => {
    if (!canW) return;
    const next = { ...dRef.current, ...patch } as Oferta;
    if ("msg_custom" in patch && patch.msg_custom === genMsg({ ...next, msg_custom: null }, pix))
      next.msg_custom = null;
    for (const k of Object.keys(patch) as Field[]) dirty.current.add(k);
    setD(next);
    dRef.current = next;
    setState("salvando");
    window.clearTimeout(timer.current);
    if (now) void flush();
    else timer.current = window.setTimeout(() => void flush(), 700);
  };

  const pickGame = (g: Game) => {
    const lic = g.licenses.filter((l) => !l.out);
    const from = Math.max(0, ...g.licenses.map((l) => Number(l.from ?? 0)));
    set(
      {
        produto: g.name,
        slug: g.slug,
        link: productUrl(g),
        plataforma: g.platforms.join(" e "),
        licencas: (lic.length ? lic : g.licenses).map((l) => l.label).join(" ou "),
        ...(dRef.current.preco_de == null && from > 0 ? { preco_de: from } : {}),
      },
      true,
    );
  };

  const ph = phOf(d.data);
  const de = Number(d.preco_de ?? 0);
  const por = Number(d.preco_por ?? 0);
  const dsc = pctOff(de, por);
  const msg = d.msg_custom ?? genMsg(d, pix);
  const irmas = all.filter((x) => x.data === d.data);
  const game = d.slug ? games.find((g) => g.slug === d.slug) : undefined;

  const txt = (k: Field, label: string, max: number, extra: Record<string, unknown> = {}) => (
    <label className="sg-field">
      <span className="sg-field__label">{label}</span>
      <input
        className="sg-input"
        data-k={k}
        maxLength={max}
        value={(d[k] as string | null) ?? ""}
        disabled={!canW}
        onChange={(e) => set({ [k]: e.target.value } as Partial<Oferta>)}
        {...extra}
      />
    </label>
  );
  const money = (k: "preco_de" | "preco_por", label: string) => (
    <label className="sg-field">
      <span className="sg-field__label">{label}</span>
      <input
        className="sg-input sg-mono"
        data-k={k}
        type="number"
        min={0}
        step={0.01}
        inputMode="decimal"
        value={d[k] ?? ""}
        disabled={!canW}
        onChange={(e) => set({ [k]: numv(e.target.value) } as Partial<Oferta>)}
      />
    </label>
  );
  const check = (k: "ok_pagina" | "ok_arte" | "ok_envio", label: string, sub: string) => (
    <label className={`sg-tick ${d[k] ? "is-on" : ""}`}>
      <input
        type="checkbox"
        checked={Boolean(d[k])}
        disabled={!canW}
        onChange={(e) => set({ [k]: e.target.checked } as Partial<Oferta>, true)}
      />
      <span className="sg-tick__box" aria-hidden>
        <Check />
      </span>
      <span>
        <b>{label}</b>
        <small>{sub}</small>
      </span>
    </label>
  );

  return (
    <>
      <button type="button" className="sg-veil" aria-label="Fechar a ficha" onClick={onClose} />
      <aside className="sg-drawer" aria-label="Ficha da oferta" role="dialog" aria-modal="true">
        <header className="sg-drawer__head">
          <div style={{ minWidth: 0 }}>
            <span
              className="sg-drawer__kicker"
              style={{ "--c": ph?.c ?? "var(--sg-muted)" } as CSSProperties}
            >
              <i aria-hidden /> {fmtD(d.data)} · {WD[dow(d.data)]}
              {ph ? ` · ${ph.n}` : ""}
            </span>
            <h2 className="sg-drawer__title">{d.produto || "Nova oferta"}</h2>
            <span className={`sg-drawer__state is-${state || "idle"}`}>
              {state === "salvando"
                ? "Salvando..."
                : state === "salvo"
                  ? "Salvo"
                  : state === "erro"
                    ? "Não salvou. Confira sua permissão."
                    : canW
                      ? "Salva sozinho"
                      : "Só leitura"}
            </span>
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

        {irmas.length > 1 && (
          <div className="sg-seg sg-drawer__sib" role="group" aria-label="Ofertas do dia">
            {irmas.map((x) => (
              <button
                key={x.id}
                type="button"
                className="sg-seg__btn"
                aria-pressed={x.id === d.id}
                onClick={() => onOpen(x.id)}
              >
                {x.produto || "Sem nome"}
              </button>
            ))}
          </div>
        )}

        <div className="sg-drawer__body">
          <section className="sg-drawer__sec">
            <span className="sg-label">o jogo</span>
            <GamePicker
              value={d.produto ?? ""}
              disabled={!canW}
              onText={(v) => set({ produto: v, slug: null })}
              onPick={pickGame}
            />
            {game && (
              <div className="sg-chips" style={{ marginTop: 10 }}>
                {game.licenses.map((l) => (
                  <span key={l.key} className={`sg-chip ${l.out ? "sg-chip--bad" : ""}`}>
                    {l.label}
                    {l.price ? ` · ${brl(l.price)}` : ""}
                    {l.out ? " · esgotada" : ""}
                  </span>
                ))}
                <span className="sg-muted" style={{ fontSize: 12 }}>
                  preços da planilha da loja, confira o atual
                </span>
              </div>
            )}
            <div className="sg-form2">
              {txt("plataforma", "Plataforma", 40, { placeholder: "PS5" })}
              <label className="sg-field">
                <span className="sg-field__label">Horário da liberação</span>
                <input
                  className="sg-input sg-mono"
                  type="time"
                  data-k="hora"
                  value={hora(d.hora)}
                  disabled={!canW}
                  onChange={(e) => set({ hora: e.target.value || null })}
                />
              </label>
            </div>
            {txt("licencas", "Licença (como vai na mensagem)", 200, {
              placeholder: "Primária ou Secundária",
            })}
            {txt("link", "Link do jogo na loja", 500, {
              inputMode: "url",
              placeholder: "https://lojasoccergames.com.br/produtos/...",
            })}
          </section>

          <section className="sg-drawer__sec">
            <span className="sg-label">preço</span>
            <div className="sg-form2">
              {money("preco_de", "De (R$)")}
              {money("preco_por", "Por (R$)")}
            </div>
            {de > 0 && por > 0 ? (
              <>
                {por >= de ? (
                  <Note tone="bad" icon={AlertTriangle}>
                    O preço "por" precisa ser menor que o "de".
                  </Note>
                ) : dsc != null && dsc > MAXD ? (
                  <Note tone="bad" icon={AlertTriangle}>
                    Desconto de {dsc}%, acima de {MAXD}%. Confira se o preço está certo antes de
                    liberar.
                  </Note>
                ) : null}
                <div className="sg-calc">
                  <div>
                    <span>Desconto</span>
                    <b>{dsc == null ? "–" : `${dsc}%`}</b>
                  </div>
                  <div>
                    <span>Economia</span>
                    <b>{por < de ? brl(de - por) : "–"}</b>
                  </div>
                  {pix && (
                    <div>
                      <span>No Pix (−{pix}%)</span>
                      <b>{brl(precoPix(por, pix))}</b>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="sg-muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
                Coloque o "de" e o "por" para a mensagem sair completa.
              </p>
            )}
          </section>

          <section className="sg-drawer__sec">
            <span className="sg-label">etapas</span>
            <div className="sg-ticks">
              {check("ok_pagina", "Preço e página na loja", "Preço baixado e página conferida")}
              {check("ok_arte", "Arte pronta", "Arte do jogo com o preço")}
              {check("ok_envio", "Enviada no grupo", "Liberação feita no horário")}
            </div>
            <div className="sg-form2">
              {txt("resp", "Responsável", 80, { placeholder: "Quem cuida" })}
              <span />
            </div>
            <label className="sg-field">
              <span className="sg-field__label">Observações do time</span>
              <textarea
                className="sg-input sg-textarea"
                data-k="obs"
                rows={3}
                maxLength={1000}
                value={d.obs ?? ""}
                disabled={!canW}
                onChange={(e) => set({ obs: e.target.value })}
              />
            </label>
          </section>

          <section className="sg-drawer__sec">
            <div className="sg-drawer__row">
              <span className="sg-label" style={{ margin: 0 }}>
                mensagem de liberação {d.msg_custom ? "· editada" : "· automática"}
              </span>
              {canW && d.msg_custom && (
                <button
                  type="button"
                  className="sg-btn sg-btn--s sg-btn--ghost"
                  onClick={() => set({ msg_custom: null }, true)}
                >
                  Voltar ao automático
                </button>
              )}
            </div>
            <textarea
              className="sg-input sg-textarea sg-mono"
              data-k="msg_custom"
              rows={10}
              value={msg}
              disabled={!canW}
              onChange={(e) => set({ msg_custom: e.target.value })}
            />
            <div className="sg-drawer__row" style={{ justifyContent: "flex-start" }}>
              <CopyBtn text={msg} label="Copiar mensagem" primary />
              {canW && (
                <button
                  type="button"
                  className="sg-btn sg-btn--s"
                  onClick={async () => {
                    await flush();
                    const r = await criarTarefas(cardsDaOferta(dRef.current));
                    toast(
                      r
                        ? "Tarefas criadas no Quadro do time: arte, preço na loja e mensagens."
                        : "Não deu para criar as tarefas. O SQL do plano já foi rodado?",
                    );
                  }}
                >
                  <ListChecks aria-hidden /> Criar tarefas no quadro
                </button>
              )}
            </div>
          </section>

          <section className="sg-drawer__sec">
            <span className="sg-label">sequência do dia no grupo</span>
            <Sequencia o={d} pix={pix} />
          </section>

          <footer className="sg-drawer__foot">
            <span className="sg-muted" style={{ fontSize: 12 }}>
              {o.atualizado_por && o.atualizado_em
                ? `Última alteração: ${o.atualizado_por} em ${quando.format(new Date(o.atualizado_em))}`
                : ""}
            </span>
            {canW && (
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
                  window.clearTimeout(timer.current);
                  if (await excluirOferta(d.id)) onDeleted(d.id);
                  else toast("Não foi possível excluir.");
                }}
              >
                <Trash2 aria-hidden /> {delArm ? "Clique de novo para excluir" : "Excluir oferta"}
              </button>
            )}
          </footer>
        </div>
      </aside>
    </>
  );
}

/* ------------------------------------------------------------------ telas */

function Fases({ t, all }: { t: string; all: Oferta[] }) {
  const total = diff(D0, D1) + 1;
  const pos = t < D0 ? 0 : t > D1 ? 100 : ((diff(D0, t) + 0.5) / total) * 100;
  return (
    <div className="sg-phases">
      <div className="sg-phases__track">
        {PH.map((p) => {
          const n = diff(p.a, p.b) + 1;
          const on = t >= p.a && t <= p.b;
          const done = t > p.b;
          return (
            <div
              key={p.k}
              className={`sg-phase ${on ? "is-on" : ""} ${done ? "is-done" : ""}`}
              style={{ flexGrow: n, "--c": p.c } as CSSProperties}
              title={p.t}
            >
              <span className="sg-phase__bar" />
              <span className="sg-phase__name">{p.n}</span>
              <span className="sg-phase__when sg-mono">
                {fmtD(p.a)}
                {p.a !== p.b ? `–${fmtD(p.b)}` : ""} ·{" "}
                {all.filter((o) => o.data >= p.a && o.data <= p.b).length} ofertas
              </span>
            </div>
          );
        })}
        <span
          className="sg-phases__now"
          style={{ left: `${pos}%` }}
          aria-label={`Hoje, ${fmtD(t)}`}
        >
          <span>hoje</span>
        </span>
      </div>
    </div>
  );
}

function Calendario({
  all,
  t,
  canW,
  onDay,
  onOpen,
  onNew,
}: {
  all: Oferta[];
  t: string;
  canW: boolean;
  onDay: (d: string) => void;
  onOpen: (id: number) => void;
  onNew: (d: string) => void;
}) {
  const cells = useMemo(() => calendarCells(), []);
  return (
    <div className="sg-cal" role="grid" aria-label="Calendário de ofertas">
      {["seg", "ter", "qua", "qui", "sex", "sáb", "dom"].map((x) => (
        <div key={x} className="sg-cal__dh" role="columnheader">
          {x}
        </div>
      ))}
      {cells.map(({ d, inRange }) => {
        if (!inRange) return <div key={d} className="sg-cal__day is-void" aria-hidden />;
        const p = phOf(d);
        const offs = all.filter((o) => o.data === d);
        return (
          <div
            key={d}
            role="gridcell"
            tabIndex={0}
            className={`sg-cal__day ${d === t ? "is-today" : ""} ${d < t ? "is-past" : ""}`}
            style={{ "--c": p?.c ?? "var(--sg-line)" } as CSSProperties}
            onClick={() => onDay(d)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                e.preventDefault();
                onDay(d);
              }
            }}
          >
            <div className="sg-cal__d">
              <b className="sg-mono">{d.slice(8)}</b>
              <span>
                {d.slice(8) === "01" || d === D0
                  ? `${WD[dow(d)]} · ${["", "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"][Number(d.slice(5, 7))]}`
                  : WD[dow(d)]}
              </span>
              {d === t && <em>hoje</em>}
            </div>
            {offs.map((o) => (
              <button
                key={o.id}
                type="button"
                className={`sg-cal__chip ${steps(o) === 3 ? "is-full" : !hasPrice(o) ? "is-warn" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(o.id);
                }}
              >
                <span className="sg-cal__chip-t">{o.produto || "Sem nome"}</span>
                <span className="sg-cal__chip-m">
                  <span className="sg-mono">{hora(o.hora)}</span>
                  {!hasPrice(o) && <span>sem preço</span>}
                  <Etapas o={o} />
                </span>
              </button>
            ))}
            {canW && (
              <button
                type="button"
                className="sg-cal__add"
                onClick={(e) => {
                  e.stopPropagation();
                  onNew(d);
                }}
                aria-label={`Nova oferta em ${fmtD(d)}`}
              >
                <Plus aria-hidden /> oferta
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const FASE_OPTS = [
  { value: "", label: "Todas as fases" },
  ...PH.map((p) => ({ value: p.k, label: p.n })),
];

function Lista({
  all,
  canW,
  onOpen,
}: {
  all: Oferta[];
  canW: boolean;
  onOpen: (id: number) => void;
}) {
  const [q, setQ] = useState("");
  const [f, setF] = useState("");
  const [pend, setPend] = useState(false);
  const rows = all.filter((o) => {
    if (f && phOf(o.data)?.k !== f) return false;
    if (pend && steps(o) === 3) return false;
    const s = q.trim().toLowerCase();
    return !s || `${o.produto} ${o.plataforma} ${o.resp}`.toLowerCase().includes(s);
  });
  return (
    <Card
      title="Todas as ofertas"
      hint={`${all.length} no plano · clique numa linha para abrir a ficha`}
      icon={CalendarDays}
      flush
      action={
        <button
          type="button"
          className="sg-btn sg-btn--s"
          onClick={() => download("black2026-soccer-ofertas.csv", ofertasCsv(rows))}
        >
          <Download aria-hidden /> Planilha
        </button>
      }
    >
      <div className="sg-blacktools" style={{ padding: "14px 20px" }}>
        <div className="sg-search" style={{ flex: "1 1 240px" }}>
          <Search aria-hidden />
          <input
            className="sg-input"
            type="search"
            placeholder="Buscar jogo, plataforma ou responsável"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select label="Fase" value={f} options={FASE_OPTS} onChange={setF} />
        <label className="sg-check">
          <input type="checkbox" checked={pend} onChange={(e) => setPend(e.target.checked)} /> Só
          pendentes
        </label>
      </div>
      <div className="sg-table-wrap">
        <table className="sg-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Jogo</th>
              <th>Licença</th>
              <th style={{ textAlign: "right" }}>De / Por</th>
              <th>Desc.</th>
              <th>Resp.</th>
              <th>Etapas</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((o) => {
                const dsc = pctOff(o.preco_de, o.preco_por);
                return (
                  <tr key={o.id} onClick={() => onOpen(o.id)} style={{ cursor: "pointer" }}>
                    <td data-label="Data" className="sg-mono">
                      {fmtD(o.data)} <span className="sg-muted">{WD[dow(o.data)]}</span>{" "}
                      {hora(o.hora)}
                    </td>
                    <td data-label="Jogo">
                      <b style={{ fontWeight: 550 }}>{o.produto || "Sem nome"}</b>
                      {o.plataforma && <span className="sg-muted"> · {o.plataforma}</span>}
                    </td>
                    <td data-label="Licença" className="sg-muted">
                      {o.licencas}
                    </td>
                    <td
                      data-label="De / Por"
                      className="sg-mono"
                      style={{ textAlign: "right", whiteSpace: "nowrap" }}
                    >
                      {Number(o.preco_de ?? 0) > 0 && (
                        <span className="sg-muted">{brl(Number(o.preco_de))} / </span>
                      )}
                      {hasPrice(o) ? (
                        <b>{brl(Number(o.preco_por))}</b>
                      ) : (
                        <span className="sg-chip sg-chip--warn">sem preço</span>
                      )}
                    </td>
                    <td data-label="Desc.">
                      {dsc ? <span className="sg-chip sg-chip--brand">{dsc}%</span> : ""}
                    </td>
                    <td data-label="Resp." className="sg-muted">
                      {o.resp}
                    </td>
                    <td data-label="Etapas">
                      <Etapas o={o} /> <span className="sg-mono sg-muted">{steps(o)}/3</span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="sg-empty">
                  {all.length
                    ? "Nenhuma oferta com esse filtro."
                    : canW
                      ? "Nenhuma oferta ainda. Crie a primeira pelo calendário."
                      : "Nenhuma oferta ainda."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ raiz */

export function Plano({
  section,
  acesso,
  toast,
}: {
  section: PlanoSection;
  acesso: Acesso;
  toast: (t: string) => void;
}) {
  const canW = acesso.papel === "editor";
  const [rows, setRows] = useState<Oferta[] | null>(null);
  const [erro, setErro] = useState(false);
  const [pix, setPix] = useState<number | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);
  const [now, setNow] = useState(() => new Date());
  const t = spDate(now);

  const load = useCallback(async () => {
    const r = await loadOfertas();
    if (!r) {
      setErro(true);
      return;
    }
    setErro(false);
    setRows(r);
    setPix(await loadPix());
  }, []);

  useEffect(() => {
    if (!acesso.papel) return;
    void load();
    const off = aoVivo("black_ofertas", () => void load());
    const poll = window.setInterval(
      () => document.visibilityState === "visible" && void load(),
      45000,
    );
    const clock = window.setInterval(() => setNow(new Date()), 60000);
    return () => {
      off();
      window.clearInterval(poll);
      window.clearInterval(clock);
    };
  }, [acesso.papel, load]);

  const all = useMemo(() => sortOfertas(rows ?? []), [rows]);
  const aberto = aberta != null ? all.find((o) => o.id === aberta) : undefined;

  const nova = async (d: string) => {
    if (!canW) return;
    const o = await criarOferta(d);
    if (!o) {
      toast("Não foi possível criar a oferta.");
      return;
    }
    setRows((r) => [...(r ?? []), o]);
    setAberta(o.id);
  };
  const abrirDia = (d: string) => {
    const first = all.find((o) => o.data === d);
    if (first) setAberta(first.id);
    else if (canW) void nova(d);
  };
  const onSaved = useCallback(
    (o: Oferta) => setRows((r) => r?.map((x) => (x.id === o.id ? o : x)) ?? null),
    [],
  );

  if (section === "equipe") return acesso.dono ? <Equipe toast={toast} /> : null;
  if (section === "fluxo")
    return (
      <Card
        title="Como cada oferta sai"
        hint="Do jogo escolhido até a liberação no grupo."
        icon={ListChecks}
      >
        <ol className="sg-flow">
          {FLOW.map(([a, b], i) => (
            <li key={a}>
              <span className="sg-flow__n sg-mono">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <b>{a}</b>
                <span>{b}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
    );

  if (acesso.semSql)
    return (
      <Note tone="warn" icon={AlertTriangle}>
        O plano da Black ainda não está ativo no banco. Rode no Supabase (SQL Editor) o arquivo{" "}
        <span className="sg-mono">{SQL_PLANO}</span> e atualize a página.
      </Note>
    );
  if (!acesso.papel)
    return (
      <Note tone="warn" icon={AlertTriangle}>
        Este e-mail ainda não tem acesso ao plano da Black. Peça para o dono liberar em Equipe e
        acessos.
      </Note>
    );
  if (erro)
    return (
      <Note tone="bad" icon={AlertTriangle}>
        Não deu para carregar o plano. Atualize a página.
      </Note>
    );
  if (!rows) return <div className="sg-skel" style={{ height: 320 }} />;

  if (section === "quadro") return <Quadro ofertas={all} canW={canW} toast={toast} />;

  const ficha = aberto && (
    <Ficha
      key={aberto.id}
      o={aberto}
      all={all}
      pix={pix}
      canW={canW}
      onClose={() => setAberta(null)}
      onSaved={onSaved}
      onDeleted={(id) => {
        setRows((r) => r?.filter((x) => x.id !== id) ?? null);
        setAberta(null);
      }}
      onOpen={setAberta}
      toast={toast}
    />
  );

  if (section === "calendario")
    return (
      <>
        <div className="sg-cal__tools">
          <div className="sg-cal__legend">
            {PH.map((p) => (
              <span key={p.k} style={{ "--c": p.c } as CSSProperties}>
                <i aria-hidden /> {p.n}
              </span>
            ))}
          </div>
          <PixField pix={pix} canW={canW} onSaved={setPix} toast={toast} />
        </div>
        <Calendario
          all={all}
          t={t}
          canW={canW}
          onDay={abrirDia}
          onOpen={setAberta}
          onNew={(d) => void nova(d)}
        />
        {ficha}
      </>
    );
  if (section === "lista")
    return (
      <>
        <Lista all={all} canW={canW} onOpen={setAberta} />
        {ficha}
      </>
    );

  // section === "plano": visão do dia
  const hoje = all.filter((o) => o.data === t);
  const prox = all.filter((o) => o.data > t).slice(0, 5);
  const env = all.filter((o) => o.ok_envio).length;
  const sem = all.filter((o) => !hasPrice(o)).length;
  const prontas = all.filter((o) => steps(o) === 3).length;
  const dias = diff(t, FRI);
  const ph = phOf(t);
  return (
    <>
      <section className="sg-board" aria-label="Placar da campanha">
        <header className="sg-board__head">
          <span className="sg-board__title">
            placar da campanha · {fmtD(D0)} a {fmtD(D1)}
          </span>
          {ph && (
            <span className="sg-board__live" style={{ background: ph.c }}>
              <span className="sg-board__rec" aria-hidden /> {ph.n}
            </span>
          )}
        </header>
        <div
          className="sg-board__cells"
          style={{ gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}
        >
          <div className="sg-board__cell is-accent">
            <span className="sg-board__label">Ofertas no plano</span>
            <span className="sg-board__value">{all.length}</span>
            <span className="sg-board__sub">{env} já enviadas no grupo</span>
          </div>
          <div className="sg-board__cell">
            <span className="sg-board__label">Prontas (3 de 3)</span>
            <span className="sg-board__value">{prontas}</span>
            <span className="sg-board__sub">preço na loja, arte e envio</span>
          </div>
          <div className="sg-board__cell">
            <span className="sg-board__label">Sem preço</span>
            <span className="sg-board__value">{sem}</span>
            <span className="sg-board__sub">
              {sem ? "a mensagem sai incompleta" : "tudo com preço"}
            </span>
          </div>
          <div className="sg-board__cell">
            <span className="sg-board__label">Dias até a Black</span>
            <span className="sg-board__value">{dias > 0 ? dias : 0}</span>
            <span className="sg-board__sub">sexta, 27/11</span>
          </div>
        </div>
        <div className="sg-board__strip" style={{ display: "block" }}>
          <Fases t={t} all={all} />
        </div>
      </section>

      <div className="sg-grid sg-grid--split">
        <Card
          title={`Hoje, ${fmtD(t)}`}
          hint={
            ph ? ph.t : t < D0 ? `A campanha começa em ${fmtD(D0)}.` : "Fora das fases da campanha."
          }
          icon={CalendarDays}
          brand
          action={
            canW ? (
              <button type="button" className="sg-btn sg-btn--s" onClick={() => void nova(t)}>
                <Plus aria-hidden /> Oferta de hoje
              </button>
            ) : undefined
          }
        >
          {hoje.length ? (
            <div className="sg-stack" style={{ gap: 18 }}>
              {hoje.map((o) => (
                <div key={o.id} className="sg-today">
                  <button type="button" className="sg-today__head" onClick={() => setAberta(o.id)}>
                    <span>
                      <b>{o.produto || "Sem nome"}</b>
                      <small>
                        <span className="sg-mono">{hora(o.hora)}</span> ·{" "}
                        {hasPrice(o) ? brl(precoPix(o.preco_por, pix)) : "falta o preço"} ·{" "}
                        {steps(o)}/3 etapas
                      </small>
                    </span>
                    <Etapas o={o} />
                  </button>
                  <Sequencia o={o} pix={pix} compact />
                </div>
              ))}
            </div>
          ) : (
            <p className="sg-empty" style={{ margin: 0 }}>
              Nenhuma oferta para hoje. {canW ? "Crie pelo botão acima ou pelo calendário." : ""}
            </p>
          )}
        </Card>
        <Card title="Próximas ofertas" hint="As cinco seguintes." icon={CheckCircle2}>
          {prox.length ? (
            <ul className="sg-list">
              {prox.map((o) => (
                <li key={o.id} onClick={() => setAberta(o.id)} style={{ cursor: "pointer" }}>
                  <span className="sg-list__main">
                    <span className="sg-mono sg-muted" style={{ marginRight: 8 }}>
                      {fmtD(o.data)}
                    </span>
                    {o.produto || "Sem nome"}
                  </span>
                  <span className="sg-list__side">
                    <Etapas o={o} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="sg-empty" style={{ margin: 0 }}>
              Nada agendado depois de hoje.
            </p>
          )}
        </Card>
      </div>
      {ficha}
    </>
  );
}

function PixField({
  pix,
  canW,
  onSaved,
  toast,
}: {
  pix: number | null;
  canW: boolean;
  onSaved: (v: number | null) => void;
  toast: (t: string) => void;
}) {
  const [v, setV] = useState(pix == null ? "" : String(pix));
  useEffect(() => setV(pix == null ? "" : String(pix)), [pix]);
  const save = async () => {
    const n = numv(v);
    if (n === pix) return;
    if (await savePix(n)) {
      onSaved(n);
      toast(
        n
          ? `Pix de ${n}% salvo: as mensagens já mostram o valor no Pix.`
          : "Pix removido das mensagens.",
      );
    } else toast("Não foi possível salvar o Pix.");
  };
  return (
    <label className="sg-field" style={{ width: 170 }}>
      <span className="sg-field__label">Desconto do Pix na loja (%)</span>
      <input
        className="sg-input sg-mono"
        type="number"
        min={0}
        max={100}
        step={0.1}
        inputMode="decimal"
        placeholder="sem Pix"
        value={v}
        disabled={!canW}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => void save()}
        onKeyDown={(e) => e.key === "Enter" && void save()}
      />
    </label>
  );
}
