/**
 * Sacola do links: a pessoa junta vários jogos aqui e manda todos de uma vez para o carrinho da
 * loja (onde o cross-sell da loja continua aparecendo). O script da loja (extras-checkout-direto.js)
 * lê ?sgadd=produto-licença,... e coloca cada um no carrinho.
 */
import { useSyncExternalStore } from "react";
import { STORE } from "./games";
import { visitOrigin } from "@/lib/tracking";
import { bioCoupon } from "./content";

export interface BagItem {
  slug: string;
  name: string;
  productId: number;
  variantId: number;
  license: string;
  /** Valor da opção na loja, para o carrinho escolher a licença certa. */
  option?: string;
  price: number | null;
  from: number | null;
  image: string;
}

const KEY = "sg:bag";
let items: BagItem[] = [];
let loaded = false;
const subs = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (Array.isArray(raw)) items = raw.filter((x) => x && x.variantId && x.productId);
  } catch {
    /* sem storage: sacola só na memória */
  }
}
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}

export const bag = {
  get: () => (load(), items),
  has: (slug: string) => (load(), items.some((i) => i.slug === slug)),
  /** Um item por jogo: escolher outra licença do mesmo jogo troca a anterior. */
  add(item: BagItem) {
    load();
    items = [...items.filter((i) => i.slug !== item.slug), item];
    save();
  },
  remove(slug: string) {
    load();
    items = items.filter((i) => i.slug !== slug);
    save();
  },
  clear() {
    items = [];
    save();
  },
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
};

const EMPTY: BagItem[] = [];
export function useBag(): BagItem[] {
  return useSyncExternalStore(bag.subscribe, bag.get, () => EMPTY);
}

export const bagTotals = (list: BagItem[]) => {
  const total = list.reduce((s, i) => s + (i.price ?? 0), 0);
  const save = list.reduce((s, i) => s + (i.from && i.price && i.from > i.price ? i.from - i.price : 0), 0);
  return { total, save };
};

/** Carrinho da loja com todos os itens da sacola. */
export function bagUrl(list: BagItem[], content: string) {
  const origin = visitOrigin();
  const q = new URLSearchParams({
    sg: "1",
    sgadd: list
      .map((i) => `${i.productId}-${i.variantId}-${encodeURIComponent(i.option ?? i.license)}`)
      .join(","),
    utm_source: origin.source,
    utm_medium: "bio",
    utm_campaign: origin.campaign ?? "sempre-ativo",
    utm_content: content,
  });
  return withCoupon(`/comprar/?${q.toString()}`);
}

/**
 * Link nativo de cupom da Nuvemshop: /discount/CODIGO?redirect_to=/caminho. O cupom fica salvo no
 * navegador e entra quando o produto vai para o carrinho.
 */
export function withCoupon(path: string) {
  if (!bioCoupon) return `${STORE}${path}`;
  return `${STORE}/discount/${encodeURIComponent(bioCoupon)}?redirect_to=${encodeURIComponent(path)}`;
}
