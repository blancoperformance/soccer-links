/**
 * Falas do assistente do quiz. Toda frase com número ou nome de jogo é calculada do catálogo
 * (games.json), então nunca promete o que a loja não tem. O assistente não diz que é IA: a
 * indicação é por regras (quiz-score.ts).
 */
import { games, isGame, fold, type Game } from "./games";
import type { QuizQuestion } from "./content";

const pool = games.filter(isGame);
const plural = (n: number, one: string, many: string) =>
  `${n.toLocaleString("pt-BR")} ${n === 1 ? one : many}`;

/** Até 2 nomes curtos de exemplo, dos mais vendidos primeiro. */
function examples(list: Game[], n = 2): string {
  const seen = new Set<string>();
  const out: string[] = [];
  const ordered = [...list].sort(
    (a, b) =>
      Number(b.collections.includes("mais-vendidos")) -
      Number(a.collections.includes("mais-vendidos")),
  );
  for (const g of ordered) {
    const base = fold(g.short)
      .split(/[:\-–]/)[0]!
      .trim();
    if (seen.has(base)) continue;
    seen.add(base);
    out.push(g.short);
    if (out.length === n) break;
  }
  return out.length === 2 ? `${out[0]} e ${out[1]}` : (out[0] ?? "");
}

const genreFilter: Record<string, (g: Game) => boolean> = {
  futebol: (g) => g.genres.includes("Esportes") || g.tags.includes("futebol"),
  tiro: (g) => g.genres.includes("Tiro"),
  acao: (g) => g.genres.includes("Ação") || g.genres.includes("Aventura"),
  corrida: (g) => g.genres.includes("Corrida"),
  luta: (g) => g.genres.includes("Luta"),
  terror: (g) => g.genres.includes("Terror"),
  rpg: (g) => g.genres.includes("RPG"),
  infantil: (g) => g.genres.includes("Infantil"),
};

/** Resposta do assistente logo depois de cada escolha. */
export function replyFor(qid: string, oid: string, answers: Record<string, string>): string {
  const plat = answers["console"] === "ps4" ? "PS4" : answers["console"] === "ps5" ? "PS5" : null;
  const onPlat = (g: Game) => !plat || g.platforms.includes(plat);
  if (qid === "console") {
    const n = pool.filter(onPlat).length;
    return `Boa. Tem ${plural(n, "jogo", "jogos")} de ${plat} aqui na loja.`;
  }
  if (qid === "para-quem") {
    if (oid === "crianca") return "Combinado. Vou deixar de fora jogo de terror e de violência.";
    if (oid === "presente") return "Presente é com a gente. Vou priorizar os que mais saem.";
    return "Então é para você. Vamos achar o seu.";
  }
  if (qid === "jeito") {
    if (oid === "online") return "Online com a galera. Vou olhar os jogos com multiplayer.";
    if (oid === "sofa")
      return "Jogar junto no mesmo sofá é outra coisa. Vou procurar os com cooperativo e versus.";
    if (oid === "historia") return "Uma boa campanha para jogar no seu tempo. Anotado.";
    return "Um pouco de tudo, sem problema.";
  }
  if (qid === "genero") {
    const f = genreFilter[oid];
    if (!f) return "Anotado.";
    const list = pool.filter((g) => onPlat(g) && f(g));
    if (!list.length) return "Anotado.";
    const ex = examples(list);
    return `${plural(list.length, "jogo", "jogos")} nessa linha${plat ? ` para ${plat}` : ""}${ex ? `, como ${ex}` : ""}.`;
  }
  if (qid === "estilo")
    return oid === "qualquer"
      ? "Então deixo a surpresa comigo."
      : "Isso já fecha bastante a busca.";
  if (qid === "momento") {
    if (oid === "lancamento") {
      const n = pool.filter(
        (g) =>
          onPlat(g) &&
          (g.collections.includes("lancamentos") || g.collections.includes("pre-venda")),
      ).length;
      return n
        ? `Tem ${plural(n, "lançamento", "lançamentos")} na loja agora, contando pré-venda.`
        : "Vou olhar os mais novos.";
    }
    if (oid === "classico") return "Os clássicos que todo mundo joga. Boa escolha.";
    if (oid === "oferta") return "Vou dar preferência ao que estiver com preço mais baixo.";
    return "Anotado.";
  }
  if (qid === "licenca") {
    if (oid === "primaria") return "Primária: joga offline e em qualquer perfil do console.";
    if (oid === "secundaria")
      return "Secundária: mais barata, joga com internet e a conta da Soccer Games logada.";
    return "Sem problema. Mostro as duas licenças no resultado.";
  }
  return "Anotado.";
}

/** "PS5, para você, online com os amigos, tiro..." para o resultado. */
export function summaryOf(questions: QuizQuestion[], answers: Record<string, string>): string {
  const parts: string[] = [];
  for (const q of questions) {
    const opt = q.options.find((o) => o.id === answers[q.id]);
    if (!opt || ["tanto-faz", "qualquer", "nao-sei"].includes(opt.id)) continue;
    if (q.id === "console") parts.push(opt.label);
    else if (q.id === "licenca") parts.push(`licença ${opt.label.toLowerCase()}`);
    else parts.push(opt.label.charAt(0).toLowerCase() + opt.label.slice(1));
  }
  return parts.join(", ");
}

export const poolSize = (plat: string | null) =>
  pool.filter((g) => !plat || g.platforms.includes(plat as "PS5" | "PS4")).length;
