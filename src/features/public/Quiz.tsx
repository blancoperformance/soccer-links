import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, X } from "lucide-react";
import { memory, track } from "@/lib/tracking";
import { InsertError, insertRow, logInsertError } from "@/lib/backend";
import type { QuizQuestion } from "./content";
import { activeQuestions, scoreQuiz, type QuizResult } from "./quiz-score";
import type { Game } from "./games";
import { Cover, useLiveGame } from "./GameCard";
import { brl, licenseHint, livePriceFrom, variantFor } from "./store";
import { poolSize, replyFor, summaryOf } from "./quiz-chat";

interface QuizProps {
  questions: QuizQuestion[];
  whatsapp: string;
  /** Respostas já dadas na capa (a primeira pergunta aparece na própria página). */
  initial?: Record<string, string>;
  onClose: () => void;
  onOpen: (g: Game, license: "primaria" | "secundaria" | null) => void;
}

type Msg = { id: number; from: "bot" | "me"; text: string };
type Stage = "question" | "name" | "thinking" | "lead" | "result";

const reduced = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
const firstName = (n: string) => n.trim().split(/\s+/)[0]?.slice(0, 24) ?? "";

export function Quiz({ questions, whatsapp, initial = {}, onClose, onOpen }: QuizProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [stage, setStage] = useState<Stage>("question");
  const [name, setName] = useState<string>(() => memory.get<string>("quizName") ?? "");
  const [result, setResult] = useState<QuizResult | null>(null);
  const [history, setHistory] = useState<string[]>([]); // ids das perguntas respondidas, em ordem
  const scroller = useRef<HTMLDivElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(0);
  const busy = useRef(false);

  const active = useMemo(() => activeQuestions(questions, answers), [questions, answers]);
  const pending = active.find((q) => !answers[q.id]) ?? null;
  const step = active.filter((q) => answers[q.id]).length;

  const push = useCallback((from: Msg["from"], text: string) => {
    setMsgs((m) => [...m, { id: ++idRef.current, from, text }]);
  }, []);
  const say = useCallback(
    async (text: string, pause = 520) => {
      setTyping(true);
      await wait(Math.min(1100, pause + text.length * 6));
      setTyping(false);
      push("bot", text);
    },
    [push],
  );

  const ask = useCallback(
    async (q: QuizQuestion, nm: string) => {
      const lead = nm && Math.random() < 0.35 ? `${nm}, ` : "";
      await say(
        lead ? lead + q.question.charAt(0).toLowerCase() + q.question.slice(1) : q.question,
        380,
      );
      if (q.sub) push("bot", q.sub);
      setStage("question");
    },
    [say, push],
  );

  // Abertura
  useEffect(() => {
    track("quiz_start");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    void (async () => {
      busy.current = true;
      const saved = memory.get<string>("quizName");
      await say(
        saved
          ? `Oi de novo, ${firstName(saved)}! Bora achar o próximo jogo.`
          : "Oi! Eu te ajudo a achar o próximo jogo em poucas perguntas.",
        200,
      );
      const done = Object.keys(initial);
      for (const qid of done) {
        const q = questions.find((x) => x.id === qid);
        const o = q?.options.find((x) => x.id === initial[qid]);
        if (q && o) {
          push("bot", q.question);
          push("me", o.label);
          track("quiz_answer", { question: qid, answer: o.id });
          setHistory((h) => [...h, qid]);
          await say(replyFor(qid, o.id, initial));
        }
      }
      if (done.length && !saved) {
        await say("Como posso te chamar?", 300);
        setStage("name");
      } else {
        const next = activeQuestions(questions, initial).find((q) => !initial[q.id]);
        if (next) await ask(next, saved ? firstName(saved) : "");
      }
      busy.current = false;
    })();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rolagem acompanha a conversa; no resultado, para no começo do cartão.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    if (stage === "result" && resultRef.current) {
      el.scrollTo({
        top:
          resultRef.current.getBoundingClientRect().top -
          el.getBoundingClientRect().top +
          el.scrollTop -
          12,
        behavior: reduced() ? "auto" : "smooth",
      });
      return;
    }
    el.scrollTo({ top: el.scrollHeight, behavior: reduced() ? "auto" : "smooth" });
  }, [msgs, typing, stage]);

  const reveal = async (final: Record<string, string>) => {
    setStage("thinking");
    const r = scoreQuiz(questions, final);
    const nm = firstName(name);
    const plat = final["console"] === "ps4" ? "PS4" : final["console"] === "ps5" ? "PS5" : null;
    await say(nm ? `Lendo as suas respostas, ${nm}.` : "Lendo as suas respostas.", 300);
    await say(
      `Comparando com os ${poolSize(plat).toLocaleString("pt-BR")} jogos${plat ? ` de ${plat}` : ""} da loja.`,
      500,
    );
    if (!r) {
      await say("Não achei um jogo com tudo isso. Que tal falar com a gente no WhatsApp?");
      return;
    }
    await say(
      `Achei. ${r.kids ? "O jogo indicado é" : "O seu próximo jogo é"} ${r.best.short}.`,
      650,
    );
    track("quiz_complete", { result: r.best.slug, tags: r.signals.join(","), gift: r.gift });
    memory.set("quiz", { result: r.best.slug, at: Date.now() });
    setResult(r);
    if (memory.get("quizLead")) setStage("result");
    else {
      await say(
        "Quer que eu mande essa indicação no seu WhatsApp? Aviso também quando jogos desse estilo entrarem em oferta.",
        300,
      );
      setStage("lead");
    }
  };

  const choose = async (qid: string, oid: string, label: string) => {
    if (busy.current) return;
    busy.current = true;
    const next = { ...answers, [qid]: oid };
    setAnswers(next);
    setHistory((h) => [...h, qid]);
    push("me", label);
    track("quiz_answer", { question: qid, answer: oid });
    await say(replyFor(qid, oid, next));
    const isFirst = history.length === 0;
    if (isFirst && !name) {
      await say("Como posso te chamar?", 300);
      setStage("name");
      busy.current = false;
      return;
    }
    const q = activeQuestions(questions, next).find((x) => !next[x.id]);
    if (q) await ask(q, firstName(name));
    else await reveal(next);
    busy.current = false;
  };

  const submitName = async (raw: string | null) => {
    if (busy.current) return;
    busy.current = true;
    const nm = raw ? firstName(raw.replace(/[^\p{L}\s'-]/gu, "")) : "";
    if (nm) {
      push("me", nm);
      setName(nm);
      memory.set("quizName", nm);
      await say(`Prazer, ${nm}!`, 200);
    } else {
      push("me", "Prefiro não dizer");
      await say("Tudo bem!", 150);
    }
    const q = activeQuestions(questions, answers).find((x) => !answers[x.id]);
    if (q) await ask(q, nm);
    else await reveal(answers);
    busy.current = false;
  };

  const back = () => {
    if (busy.current || history.length === 0) return;
    const last = history[history.length - 1]!;
    // Volta uma pergunta: tira a resposta e as mensagens dela.
    const keep = { ...answers };
    delete keep[last];
    setAnswers(keep);
    setHistory((h) => h.slice(0, -1));
    setResult(null);
    setMsgs((m) => {
      let i = m.length - 1;
      let mine = 0;
      while (i >= 0) {
        if (m[i]!.from === "me") mine++;
        if (mine === 1 && m[i]!.from === "me") {
          // remove a mensagem da pessoa e tudo depois dela; mantém a pergunta
          return m.slice(0, i);
        }
        i--;
      }
      return m;
    });
    setStage("question");
  };

  const restart = () => {
    setAnswers({});
    setHistory([]);
    setResult(null);
    setMsgs([]);
    setStage("question");
    void (async () => {
      busy.current = true;
      await say(name ? `Vamos de novo, ${firstName(name)}.` : "Vamos de novo.", 150);
      const q = activeQuestions(questions, {}).find(() => true);
      if (q) await ask(q, firstName(name));
      busy.current = false;
    })();
  };

  const showOptions = stage === "question" && !typing && pending;
  const total = Math.max(active.length, step + (pending ? 1 : 0));

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-label="Quiz: descubra o seu próximo jogo"
    >
      <div className="mts-enter relative flex h-full w-full max-w-[580px] flex-col bg-mts-column">
        <div className="flex shrink-0 items-center justify-between border-b border-mts-btn-border px-3 py-2">
          <button
            type="button"
            onClick={back}
            className={`flex h-10 w-10 items-center justify-center text-mts-text transition-opacity ${history.length === 0 || stage === "thinking" ? "pointer-events-none opacity-0" : "hover:opacity-70"}`}
            aria-label="Voltar uma pergunta"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2">
            <span
              className="font-display flex h-8 w-8 items-center justify-center rounded-full bg-mts-ink text-[12px] font-bold text-mts-on-ink"
              aria-hidden
            >
              SG
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[13px] font-semibold text-mts-text">
                Assistente Soccer Games
              </span>
              <span className="block text-[11px] text-mts-muted">
                {typing
                  ? "digitando…"
                  : stage === "result"
                    ? "indicação pronta"
                    : `pergunta ${Math.min(step + 1, total)} de ${total}`}
              </span>
            </span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center text-mts-text hover:opacity-70"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="h-0.5 w-full shrink-0 bg-mts-btn-border" aria-hidden>
          <div
            className="h-full bg-mts-ink transition-[width] duration-500"
            style={{
              width: `${stage === "result" || stage === "lead" ? 100 : (step / Math.max(1, total)) * 100}%`,
            }}
          />
        </div>

        {/* conversa */}
        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-5"
          aria-live="polite"
        >
          <div className="flex flex-col gap-2.5">
            {msgs.map((m) => (
              <p
                key={m.id}
                className={`mts-enter max-w-[82%] px-4 py-2.5 text-[15px] leading-snug ${
                  m.from === "bot"
                    ? "self-start rounded-[18px] rounded-bl-[4px] bg-mts-photo text-mts-text"
                    : "self-end rounded-[18px] rounded-br-[4px] bg-mts-ink text-mts-on-ink"
                }`}
              >
                {m.text}
              </p>
            ))}
            {typing && (
              <span
                className="flex w-16 items-center justify-center gap-1 self-start rounded-[18px] rounded-bl-[4px] bg-mts-photo px-4 py-3.5"
                aria-label="digitando"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-mts-muted"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </span>
            )}
          </div>

          {result && stage === "result" && (
            <div ref={resultRef} className="mts-enter mt-6">
              <ResultCard
                game={result.best}
                license={result.license}
                kids={result.kids}
                onOpen={() => onOpen(result.best, result.license)}
              />
              {summaryOf(activeQuestions(questions, answers), answers) && (
                <p className="mt-4 border-l-2 border-mts-ink pl-3 text-[13px] leading-relaxed text-mts-muted">
                  <span className="font-semibold text-mts-text">Pelo que você me contou: </span>
                  {summaryOf(activeQuestions(questions, answers), answers)}.
                </p>
              )}
              {result.gift && (
                <p className="mt-4 text-sm leading-relaxed text-mts-muted">
                  Para presente: os dados de acesso chegam no e-mail do pedido. Se tiver dúvida de
                  como presentear, fale com a gente no WhatsApp antes de comprar.
                </p>
              )}
              {result.alternatives.length > 0 && (
                <>
                  <p className="mt-8 text-sm font-semibold text-mts-text">
                    Também combinam com você
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {result.alternatives.map((g) => (
                      <AltCard key={g.slug} game={g} onOpen={() => onOpen(g, result.license)} />
                    ))}
                  </div>
                </>
              )}
              <p className="mt-8 text-[13px] text-mts-muted">
                Ficou na dúvida?{" "}
                <a
                  href={`https://wa.me/${whatsapp}?text=${encodeURIComponent(`Olá! Fiz o quiz do link da bio e deu ${result.best.name}. Pode me ajudar a escolher?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => track("links_clique", { item_name: "Quiz: WhatsApp" })}
                  className="font-medium text-mts-text underline underline-offset-4"
                >
                  Fale com a gente no WhatsApp
                </a>
              </p>
              <button
                type="button"
                onClick={restart}
                className="mx-auto mt-8 flex items-center gap-2 text-sm font-semibold text-mts-muted hover:text-mts-text"
              >
                <RotateCcw className="h-4 w-4" aria-hidden /> Refazer o quiz
              </button>
            </div>
          )}
        </div>

        {/* área de resposta fixa embaixo */}
        {(showOptions || stage === "name" || stage === "lead") && !typing && (
          <div className="shrink-0 border-t border-mts-btn-border bg-mts-column px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {showOptions && pending && (
              <div className={`grid gap-2 ${pending.options.length > 4 ? "grid-cols-2" : ""}`}>
                {pending.options.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => void choose(pending.id, o.id, o.label)}
                    className="mts-button px-4 py-3 text-left active:border-mts-ink"
                  >
                    <span className="block text-[14px] font-semibold">{o.label}</span>
                    {o.hint && (
                      <span className="mt-0.5 block text-[12px] leading-snug text-mts-muted">
                        {o.hint}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {stage === "name" && <NameStep onDone={(n) => void submitName(n)} />}
            {stage === "lead" && result && (
              <LeadStep
                name={name}
                questions={active}
                answers={answers}
                resultSlug={result.best.slug}
                onDone={async (sent) => {
                  if (sent) {
                    memory.set("quizLead", Date.now());
                    push("me", "Pode mandar");
                    await say("Combinado! Já anotei.", 150);
                  } else push("me", "Agora não");
                  setStage("result");
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function NameStep({ onDone }: { onDone: (name: string | null) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      className="flex gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        onDone(v.trim() || null);
      }}
    >
      <input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        maxLength={40}
        autoComplete="given-name"
        placeholder="Seu nome"
        aria-label="Seu nome"
        className="h-12 min-w-0 flex-1 border border-mts-btn-border bg-mts-btn px-4 text-base text-mts-text outline-none focus:border-mts-ink"
      />
      <button
        type="submit"
        className="h-12 shrink-0 bg-mts-ink px-5 text-[14px] font-semibold text-mts-on-ink"
      >
        Enviar
      </button>
      <button
        type="button"
        onClick={() => onDone(null)}
        className="h-12 shrink-0 px-2 text-[13px] text-mts-muted underline underline-offset-4"
      >
        Pular
      </button>
    </form>
  );
}

function ResultCard({
  game,
  license,
  kids,
  onOpen,
}: {
  game: Game;
  license: "primaria" | "secundaria" | null;
  kids: boolean;
  onOpen: () => void;
}) {
  const { live, done } = useLiveGame(game.slug, true);
  const v = license ? variantFor(live, license) : null;
  const price = v?.available ? v.price : livePriceFrom(live);
  return (
    <div className="rounded-[18px] border border-mts-btn-border bg-mts-btn p-3">
      <p className="px-1 text-xs text-mts-muted">
        {kids ? "Indicado para a criança" : "Recomendado para você"}
      </p>
      <h2 className="font-display mt-1 px-1 text-[24px] font-semibold leading-tight text-mts-text">
        {game.name}
      </h2>
      <button
        type="button"
        onClick={() => {
          track("quiz_result_click", { product: game.slug });
          onOpen();
        }}
        className="mt-3 block w-full text-left"
      >
        <Cover game={game} live={live} done={done} w={800} />
      </button>
      <div className="flex items-center justify-between gap-3 px-1 pt-3">
        {license ? (
          <span className="text-xs leading-snug text-mts-muted">
            Licença {license === "primaria" ? "primária" : "secundária"}: {licenseHint[license]}
          </span>
        ) : (
          <span className="text-xs text-mts-muted">
            Primária ou secundária, você escolhe na ficha.
          </span>
        )}
        {price != null && (
          <span className="shrink-0 text-[16px] font-semibold tabular-nums text-mts-text">
            {brl(price)}
          </span>
        )}
      </div>
      {game.summary && (
        <p className="mt-3 line-clamp-3 px-1 text-[13px] leading-relaxed text-mts-muted">
          {game.summary}
        </p>
      )}
      <button
        type="button"
        onClick={() => {
          track("quiz_result_click", { product: game.slug, cta: true });
          onOpen();
        }}
        className="mt-4 flex h-[52px] w-full items-center rounded-[14px] justify-center gap-2 bg-mts-ink px-4 text-[15px] font-semibold text-mts-on-ink transition-opacity hover:opacity-90"
      >
        Escolher licença e comprar <span aria-hidden>→</span>
      </button>
    </div>
  );
}

function AltCard({ game, onOpen }: { game: Game; onOpen: () => void }) {
  const { live, done } = useLiveGame(game.slug, true);
  return (
    <button
      type="button"
      onClick={() => {
        track("quiz_result_click", { product: game.slug, alternative: true });
        onOpen();
      }}
      className="group text-left"
    >
      <Cover game={game} live={live} done={done} w={320} />
      <span className="mt-2 line-clamp-2 block text-[12px] leading-snug text-mts-text">
        {game.short}
      </span>
    </button>
  );
}

const field =
  "h-12 w-full border border-mts-btn-border bg-mts-btn px-4 text-base text-mts-text outline-none transition-colors placeholder:text-mts-muted/70 focus:border-mts-ink";

/** WhatsApp dentro da conversa, depois da revelação. Sempre dá para pular. */
function LeadStep({
  name,
  questions,
  answers,
  resultSlug,
  onDone,
}: {
  name: string;
  questions: QuizQuestion[];
  answers: Record<string, string>;
  resultSlug: string;
  onDone: (sent: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    track("links_clique", { item_name: "Quiz: pedido de contato" });
  }, []);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const nm = String(f.get("name") ?? "").trim();
        const phone = String(f.get("whatsapp") ?? "").replace(/\D/g, "");
        if (String(f.get("empresa") ?? "")) return onDone(false);
        if (nm.length < 2) return setError("Digite seu nome.");
        if (phone.length < 10 || phone.length > 13) return setError("Confira o WhatsApp com DDD.");
        if (f.get("consent") !== "on") return setError("Marque o aceite para receber no WhatsApp.");
        setBusy(true);
        setError(null);
        const labeled: Record<string, string> = {};
        for (const qq of questions) {
          const opt = qq.options.find((o) => o.id === answers[qq.id]);
          if (opt) labeled[qq.id] = opt.label;
        }
        try {
          await insertRow("leads", {
            name: nm,
            whatsapp: phone,
            answers: labeled,
            result: resultSlug,
            source: new URLSearchParams(window.location.search).get("utm_source") ?? "bio",
            consent: true,
          });
          track("links_clique", { item_name: "Quiz: contato enviado" });
        } catch (err) {
          if (!(err instanceof InsertError && err.duplicate)) logInsertError("leads", err);
        }
        onDone(true);
      }}
    >
      <input
        type="text"
        name="empresa"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          name="name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={120}
          autoComplete="given-name"
          placeholder="Nome"
          aria-label="Nome"
          className={field}
        />
        <input
          name="whatsapp"
          required
          inputMode="tel"
          autoComplete="tel"
          placeholder="WhatsApp com DDD"
          aria-label="WhatsApp com DDD"
          className={field}
        />
      </div>
      <label className="mt-3 flex cursor-pointer items-start gap-3 text-[12px] leading-relaxed text-mts-muted">
        <input
          type="checkbox"
          name="consent"
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#c000ff]"
        />
        <span>
          Aceito receber mensagens da Soccer Games pelo WhatsApp. Posso sair quando quiser e pedir a
          exclusão dos meus dados pelo soccerg810@gmail.com.
        </span>
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={busy}
          className="flex h-12 flex-1 items-center justify-center gap-2 bg-mts-ink text-[15px] font-semibold text-mts-on-ink disabled:opacity-60"
        >
          {busy ? "Enviando..." : "Mandar no WhatsApp"}
        </button>
        <button
          type="button"
          onClick={() => {
            track("links_clique", { item_name: "Quiz: pulou contato" });
            onDone(false);
          }}
          className="h-12 px-2 text-[13px] text-mts-muted underline underline-offset-4"
        >
          Agora não
        </button>
      </div>
    </form>
  );
}
