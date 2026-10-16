import type { QuizQuestion } from "./content";
import { games as allGames, isGame, refPrice, versionsOf, fold, type Game } from "./games";

export interface QuizResult {
  best: Game;
  alternatives: Game[];
  gift: boolean;
  kids: boolean;
  /** Licença indicada: a escolhida no quiz, ou null para mostrar as duas. */
  license: "primaria" | "secundaria" | null;
  signals: string[];
}

/** Perguntas e opções que valem para as respostas dadas até agora. */
export function activeQuestions(questions: QuizQuestion[], answers: Record<string, string>) {
  const ok = (cond?: Record<string, string[]>) =>
    !cond || Object.entries(cond).every(([q, ids]) => !answers[q] || ids.includes(answers[q]!));
  return questions
    .filter((q) => ok(q.onlyIf))
    .map((q) => ({ ...q, options: q.options.filter((o) => ok(o.onlyIf)) }))
    .filter((q) => q.options.length > 1);
}

/** Jogos que não são indicados para criança, mesmo que a criança peça. */
const NOT_FOR_KIDS = [
  "violencia",
  "zumbis",
  "survival-horror",
  "horror",
  "crime",
  "gta",
  "grand-theft-auto",
  "guerra",
  "demonios",
  "terror",
  "sniper",
  "mafia",
];
const isKidSafe = (g: Game) =>
  !g.genres.includes("Terror") &&
  !g.tags.some((t) => NOT_FOR_KIDS.includes(t)) &&
  !/mortal kombat|resident evil|call of duty|gta|the last of us|dead|evil|horror/i.test(g.name);

/**
 * Pontua cada jogo pelos sinais das respostas:
 * plataforma filtra; gênero da loja vale 4; tag vale 2; coleção (lançamento, mais vendido, oferta) vale 3;
 * "cheap" favorece o menor preço de referência; criança tira os jogos com violência ou terror.
 */
export function scoreQuiz(
  questions: QuizQuestion[],
  answers: Record<string, string>,
  catalog: Game[] = allGames,
): QuizResult | null {
  const signals: string[] = [];
  let gift = false;
  for (const q of activeQuestions(questions, answers)) {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    if (!opt) continue;
    signals.push(...opt.tags);
    if (opt.giftFlag) gift = true;
  }
  const kids = answers["para-quem"] === "crianca";
  const plat = signals.find((s) => s.startsWith("plat:"))?.slice(5);
  const lic = signals.find((s) => s.startsWith("lic:"))?.slice(4) as
    "primaria" | "secundaria" | undefined;
  const cheap = signals.includes("cheap");

  let pool = catalog.filter(
    (g) => isGame(g) && (!plat || g.platforms.includes(plat as "PS5" | "PS4")),
  );
  if (kids) pool = pool.filter(isKidSafe);
  if (pool.length === 0) return null;

  const prices = pool.map(refPrice).filter((n) => Number.isFinite(n));
  const maxP = Math.max(...prices, 1);

  const score = (g: Game) => {
    let s = 0;
    for (const sig of signals) {
      const [kind, value = ""] = sig.split(":", 2) as [string, string];
      if (kind === "genre" && g.genres.includes(value)) s += 4;
      else if (kind === "tag" && g.tags.includes(value)) s += 2;
      else if (kind === "coll" && g.collections.includes(value)) s += 3;
      else if (kind === "lic" && g.licenses.some((l) => l.key === value && !l.out)) s += 1;
    }
    if (cheap) {
      const p = refPrice(g);
      if (Number.isFinite(p)) s += 2 * (1 - p / maxP);
    }
    if (g.collections.includes("mais-vendidos")) s += 0.5; // desempate: o que mais sai
    if (!g.checked) s -= 0.5; // cadastro copiado: dados menos confiáveis
    return s;
  };

  const ranked = pool.map((g, i) => ({ g, i, s: score(g) })).sort((a, b) => b.s - a.s || a.i - b.i);
  const best = ranked[0]!.g;
  // Alternativas sem repetir versões do mesmo jogo (PS4/PS5, edições).
  const used = new Set(versionsOf(best).map((x) => fold(x.short)));
  const alternatives: Game[] = [];
  for (const r of ranked.slice(1)) {
    const key = fold(r.g.short);
    if (used.has(key)) continue;
    used.add(key);
    alternatives.push(r.g);
    if (alternatives.length === 3) break;
  }
  return { best, alternatives, gift, kids, license: lic ?? null, signals };
}
