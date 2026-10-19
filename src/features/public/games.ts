/**
 * Catálogo de jogos da Soccer Games.
 *
 * games.json é gerado da planilha da Nuvemshop (scripts/build-catalog.py): nomes, plataformas,
 * gêneros (das categorias da loja), coleções, tags, licenças e o resumo do texto de cada jogo.
 * Foto, preço, estoque e o código de cada licença (para o botão Comprar) vêm ao vivo da loja
 * (store.ts), nunca daqui. O preço da planilha só serve para ordenar.
 */
import raw from "./games.json";
import { isSeasonalPromotionActive, isWeeklyPromotionActive, weeklyPromotion } from "./promotion";

export const STORE = "https://lojasoccergames.com.br";

export type LicenseKey = "primaria" | "secundaria" | string;

export interface GameLicense {
  key: LicenseKey;
  label: string;
  /** Preço da planilha (referência para ordenar). O preço mostrado é o da loja, ao vivo. */
  price: number | null;
  from: number | null;
  out: boolean;
}

export interface Game {
  slug: string;
  kind: "jogo" | "assinatura" | "combo";
  name: string;
  short: string;
  platforms: ("PS5" | "PS4")[];
  genres: string[];
  collections: string[];
  tags: string[];
  brand: string;
  licenses: GameLicense[];
  summary: string;
  specs: Record<string, string>;
  /** false = produto criado por cópia na loja; tags e marca foram ignoradas. */
  checked: boolean;
}

const data = raw as unknown as { syncedAt: string; count: number; games: Game[] };

export const catalogSyncedAt = data.syncedAt;
export const games: Game[] = data.games;
const bySlug = new Map(games.map((g) => [g.slug, g]));
export const getGame = (slug: string) => bySlug.get(slug) ?? null;

export const productUrl = (g: Pick<Game, "slug">) => `${STORE}/produtos/${g.slug}/`;

export const fold = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Menor preço de referência (planilha). */
export const refPrice = (g: Game) =>
  Math.min(
    ...g.licenses.map((l) => l.price ?? Infinity).filter((n) => Number.isFinite(n)),
    Infinity,
  );

export const isGame = (g: Game) => g.kind === "jogo";

/* ---------- coleções (abas da loja) ---------- */

export interface Shelf {
  id: string;
  name: string;
  /** Página da loja com a coleção completa. */
  url: string;
  games: Game[];
}

const inColl = (c: string) => (g: Game) => g.collections.includes(c);
const hasGenre = (n: string) => (g: Game) => g.genres.includes(n);
const onPlat = (p: "PS5" | "PS4") => (g: Game) => g.platforms.includes(p);

function shelf(
  id: string,
  name: string,
  url: string,
  filter: (g: Game) => boolean,
  limit = 40,
): Shelf {
  return { id, name, url: `${STORE}${url}`, games: games.filter(filter).slice(0, limit) };
}

export const getShelves = (at = new Date()): Shelf[] =>
  [
    ...(isWeeklyPromotionActive(at)
      ? [
          {
            id: "best-sellers-semana",
            name: "Best Sellers da semana",
            url: weeklyPromotion.url,
            games: weeklyPromotion.games.flatMap((slug) => bySlug.get(slug) ?? []),
          },
        ]
      : []),
    // Ordem pensada para venda: o que mais sai e o que está em oferta primeiro.
    shelf("mais-vendidos", "Mais vendidos", "/best-sellers/", inColl("mais-vendidos")),
    ...(isSeasonalPromotionActive(at)
      ? [shelf("ofertas", "Sazonal PSN", "/ofertas/", inColl("sazonal"))]
      : []),
    shelf(
      "lancamentos",
      "Lançamentos",
      "/lancamentos/",
      (g) => inColl("lancamentos")(g) || inColl("pre-venda")(g),
    ),
    shelf("ps5", "PS5", "/playstation-5/", (g) => isGame(g) && onPlat("PS5")(g), 60),
    shelf("ps4", "PS4", "/playstation-4/", (g) => isGame(g) && onPlat("PS4")(g), 60),
    shelf("infantis", "Infantis", "/playstation-5/infantis/", hasGenre("Infantil")),
  ].filter((s) => s.games.length > 0);

export const shelves = getShelves();

/** Atalhos de gênero ("O que você quer jogar?"). */
export const genreChips: { id: string; label: string; genre?: string; tag?: string }[] = [
  { id: "futebol", label: "Futebol", tag: "futebol" },
  { id: "tiro", label: "Tiro", genre: "Tiro" },
  { id: "acao", label: "Ação e aventura", genre: "Ação" },
  { id: "mundo-aberto", label: "Mundo aberto", tag: "mundo-aberto" },
  { id: "corrida", label: "Corrida", genre: "Corrida" },
  { id: "luta", label: "Luta", genre: "Luta" },
  { id: "terror", label: "Terror", genre: "Terror" },
  { id: "rpg", label: "RPG", genre: "RPG" },
  { id: "infantil", label: "Para crianças", genre: "Infantil" },
];

export function gamesForChip(id: string): Game[] {
  const c = genreChips.find((x) => x.id === id);
  if (!c) return [];
  return games.filter(
    (g) =>
      isGame(g) && ((c.genre && g.genres.includes(c.genre)) || (c.tag && g.tags.includes(c.tag))),
  );
}

/* ---------- busca ---------- */

const ALIASES: Record<string, string> = {
  gta: "grand theft auto",
  fifa: "ea sports fc",
  fc: "ea sports fc",
  cod: "call of duty",
  re: "resident evil",
  rdr: "red dead redemption",
  rdr2: "red dead redemption 2",
  gow: "god of war",
  tlou: "the last of us",
  nfs: "need for speed",
  "homem aranha": "spider-man",
  "homem-aranha": "spider-man",
  ufc: "ufc",
  pes: "efootball",
  minecraft: "minecraft",
};

const haystack = new Map(
  games.map((g) => [
    g.slug,
    fold(
      `${g.name} ${g.short} ${g.genres.join(" ")} ${g.tags.join(" ").replace(/-/g, " ")} ${g.brand} ${g.platforms.join(" ")}`,
    ),
  ]),
);

/** Busca tolerante: sem acento, por palavra, com apelidos (gta, cod, fifa...). PS4/PS5 filtram. */
export function searchGames(query: string): Game[] {
  let q = fold(query)
    .replace(/[^a-z0-9 -]/g, " ")
    // "fc26" -> "fc 26", "re4" -> "re 4" (sem quebrar ps4/ps5)
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .replace(/\bps (4|5)\b/g, "ps$1")
    .trim();
  if (q.length < 2) return [];
  for (const [k, v] of Object.entries(ALIASES)) q = q.replace(new RegExp(`\\b${k}\\b`, "g"), v);
  const words = q.split(/\s+/).filter(Boolean);
  const plat = words.find((w) => w === "ps5" || w === "ps4")?.toUpperCase() as
    "PS5" | "PS4" | undefined;
  const rest = words.filter((w) => w !== "ps5" && w !== "ps4");
  const scored = games
    .map((g) => {
      const h = haystack.get(g.slug)!;
      const n = fold(g.name);
      if (plat && !g.platforms.includes(plat)) return null;
      if (rest.length && !rest.every((w) => h.includes(w))) return null;
      const score =
        (rest.length && n.startsWith(rest.join(" ")) ? 10 : 0) +
        (rest.length && n.includes(rest.join(" ")) ? 5 : 0) +
        (g.collections.includes("mais-vendidos") ? 2 : 0) +
        (isGame(g) ? 1 : 0);
      return { g, score };
    })
    .filter((x): x is { g: Game; score: number } => Boolean(x))
    .sort((a, b) => b.score - a.score);
  return scored.map((x) => x.g).slice(0, 48);
}

/* ---------- busca tolerante a erro de digitação ---------- */

/** Distância de edição (com troca de letras vizinhas): "minecreft" -> "minecraft" = 1. */
function dist(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  if (Math.abs(m - n) > 2) return 9;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0]![j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1])
        v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  return d[m]![n]!;
}

/** Palavras dos nomes dos jogos (o "dicionário" da correção). */
const vocab = Array.from(
  new Set(
    games.flatMap((g) =>
      fold(`${g.name} ${g.short}`)
        .replace(/[^a-z0-9 ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !/^\d+$/.test(w)),
    ),
  ),
);

/** Corrige cada palavra que não existe no catálogo pela mais parecida. */
function correct(word: string): string {
  if (word.length < 3 || /^\d+$/.test(word) || vocab.includes(word) || word in ALIASES) return word;
  const max = word.length <= 4 ? 1 : 2;
  let best = word;
  let bestScore = Infinity;
  for (const v of vocab) {
    const dd = dist(word, v);
    if (dd > max) continue;
    // desempate: mesma primeira letra e tamanho parecido ("ded" -> "dead", não "red")
    const score = dd * 10 + (v[0] === word[0] ? 0 : 5) + Math.abs(v.length - word.length);
    if (score < bestScore) {
      bestScore = score;
      best = v;
    }
  }
  return best;
}

/**
 * Busca que entende erro de digitação: tenta exato; se não achar nada, corrige as palavras
 * ("minecreft" -> "minecraft", "spiderman" já tem apelido) e busca de novo.
 */
export function searchSmart(query: string): { games: Game[]; corrected: string | null } {
  const exact = searchGames(query);
  if (exact.length || fold(query).trim().length < 3) return { games: exact, corrected: null };
  const words = fold(query)
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const fixed = words.map(correct).join(" ");
  if (fixed === words.join(" ")) return { games: [], corrected: null };
  const again = searchGames(fixed);
  return { games: again, corrected: again.length ? fixed : null };
}

/** Outras versões do mesmo jogo (PS4/PS5, edições), pelo nome curto. */
export function versionsOf(g: Game): Game[] {
  const base = fold(g.short)
    .replace(
      /\b(edicao|edition|standard|standart|deluxe|ultimate|gold|complete|definitive|remastered)\b.*$/,
      "",
    )
    .trim();
  if (base.length < 4) return [g];
  return games.filter((x) => fold(x.short).startsWith(base));
}

/** Parecidos: mesmo gênero e plataforma, sem repetir versões do mesmo jogo. */
export function similarTo(g: Game, n = 4): Game[] {
  const own = new Set(versionsOf(g).map((x) => x.slug));
  const plat = g.platforms[0];
  return games
    .filter((x) => !own.has(x.slug) && isGame(x) && (!plat || x.platforms.includes(plat)))
    .map((x) => ({
      x,
      s:
        x.genres.filter((y) => g.genres.includes(y)).length * 3 +
        x.tags.filter((t) => g.tags.includes(t)).length,
    }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, n)
    .map((r) => r.x);
}
