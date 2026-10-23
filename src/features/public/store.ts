/**
 * Dados ao vivo da loja (Nuvemshop): fotos, preço, estoque e o código de cada licença.
 * Tudo passa pelo nosso servidor (/api/loja), que guarda em cache por alguns minutos.
 *
 * - Com o token da Nuvemshop configurado na Vercel, uma chamada traz o catálogo inteiro.
 * - Sem token, cada jogo é lido da própria página do produto na loja, quando aparece na tela.
 */
import { STORE, type Game } from "./games";
import { storeLink } from "@/lib/tracking";
import { visitOrigin } from "@/lib/tracking";

export interface LiveVariant {
  id: number;
  /** "primaria", "secundaria" ou o nome da opção sem acento. */
  key: string;
  label: string;
  /** Valor original da opção na loja (o formulário do carrinho usa este texto). */
  value?: string;
  price: number | null;
  from: number | null;
  available: boolean;
}
export interface LiveGame {
  id: number | null;
  images: string[];
  variants: LiveVariant[];
}

type Catalog = Record<string, LiveGame>;

let catalogPromise: Promise<Catalog | null> | null = null;
const one = new Map<string, Promise<LiveGame | null>>();
const sync = new Map<string, LiveGame>();

/** Catálogo inteiro (só quando o servidor tem o token). null = modo página por página. */
export function loadCatalog(): Promise<Catalog | null> {
  if (!catalogPromise) {
    catalogPromise = fetch("/api/loja")
      .then((r) => (r.ok ? (r.json() as Promise<{ mode: string; products?: Catalog }>) : null))
      .then((j) => {
        if (j?.mode !== "api" || !j.products) return null;
        for (const [k, v] of Object.entries(j.products)) sync.set(k, v);
        return j.products;
      })
      .catch(() => null);
  }
  return catalogPromise;
}

export const liveSync = (slug: string) => sync.get(slug) ?? null;

export function loadGame(slug: string): Promise<LiveGame | null> {
  const hit = one.get(slug);
  if (hit) return hit;
  const p = loadCatalog().then((cat) => {
    if (cat) return cat[slug] ?? null;
    return fetch(`/api/loja?slug=${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ product?: LiveGame | null }>) : null))
      .then((j) => {
        const g = j?.product ?? null;
        if (g) sync.set(slug, g);
        return g;
      })
      .catch(() => null);
  });
  one.set(slug, p);
  p.then((g) => {
    if (!g) one.delete(slug); // tenta de novo na próxima vez
  });
  return p;
}

/** Foto em tamanho menor pelo próprio CDN da Nuvemshop (…-1024-1024.webp -> …-480-0.webp). */
export const sized = (src: string, w: number) =>
  src.replace(/-(\d+)-(\d+)\.(webp|jpe?g|png)(\?.*)?$/i, `-${w}-0.$3`);

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Parcelamento que a loja mostra nos produtos ("5 x de R$ 15,98 sem juros"). */
export const INSTALLMENTS = 5;
export const parcel = (price: number) => `${INSTALLMENTS}x de ${brl(price / INSTALLMENTS)} sem juros`;

/** Licença da loja que corresponde à licença do catálogo. */
export const variantFor = (live: LiveGame | null, key: string) =>
  live?.variants.find((v) => v.key === key) ?? null;

/** Menor preço ao vivo entre as licenças disponíveis. */
export function livePriceFrom(live: LiveGame | null): number | null {
  const prices = (live?.variants ?? [])
    .filter((v) => v.available && v.price != null)
    .map((v) => v.price as number);
  return prices.length ? Math.min(...prices) : null;
}

/**
 * Link de carrinho da Nuvemshop (/comprar/<código da licença>): coloca a licença no carrinho e
 * abre o carrinho da loja. As UTMs dizem de onde a visita veio, para o Analytics separar as
 * vendas da bio por canal (utm_medium=bio).
 */
/** A loja não aceita adicionar ao carrinho por link (/comprar/ID/ dá 404): abre o produto com a licença escolhida. */
export function cartUrl(variantId: number, content: string, slug?: string) {
  const origin = visitOrigin();
  const q = new URLSearchParams({
    utm_source: origin.source,
    utm_medium: "bio",
    utm_campaign: origin.campaign ?? "sempre-ativo",
    utm_content: content,
  });
  q.set("variant", String(variantId));
  q.set("sg", "1");
  return storeLink(slug ? `${STORE}/produtos/${slug}/?${q.toString()}` : `${STORE}/?${q.toString()}`);
}

export const licenseHint: Record<string, string> = {
  primaria: "Fica no seu console: joga no seu perfil e em qualquer outro, até sem internet.",
  secundaria: "Mais barata: para jogar, o console precisa estar com internet e com a conta da Soccer Games logada.",
};

export const gameHasStock = (g: Game, live: LiveGame | null) =>
  live ? live.variants.some((v) => v.available) : g.licenses.some((l) => !l.out);
