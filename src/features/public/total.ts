/**
 * Total final mostrado embaixo dos botões de compra e enviado no checkout_click.
 * A conta é uma só: o texto na tela, o `value` e o `pix_total` do evento saem daqui.
 * O `value` do checkout_click é o total do carrinho (jogos + Expressa), não o preço de um jogo, e só
 * vai quando o total é conferido ao vivo. Ele segue só para o dataLayer (GTM): a tabela events do
 * Supabase não tem coluna de valor, então o painel do admin não lê nem soma esse número.
 * Conferido num carrinho real da loja em 05/11/2026 (6 jogos, subtotal R$ 389,40): o cupom do link
 * (BIO1, 1%) deu "Desconto do cupom: -R$ 3,89", "Total: R$ 385,51" e "Ou R$ 381,61 com Pix".
 * Ou seja: total = subtotal menos 1% (centavo arredondado) e Pix = subtotal menos 2%, sem somar os dois.
 * Se o cupom BIO1 mudar de % no admin da Nuvemshop, troque BIO_COUPON_PCT.
 */
import { useEffect, useReducer } from "react";
import { EXPRESS_PRICE, expressFits } from "./express";
import { bioCoupon } from "./content";
import { brl, liveSync, loadGame, type LiveGame } from "./store";

/** A loja dá 2% de desconto no Pix em todo produto (página do produto: "2% de desconto pagando com Pix"). */
export const PIX_DISCOUNT = 0.02;

/** Cupom do link (BIO1) no admin da Nuvemshop em 05/11/2026: 1%, ativo, sem limite. */
export const BIO_COUPON_PCT = bioCoupon ? 0.01 : 0;

/** Desconto em % sobre o subtotal, com o centavo do desconto arredondado como a loja faz. */
const off = (value: number, pct: number) => {
  const cents = Math.round(value * 100);
  return (cents - Math.round(cents * pct)) / 100;
};

/** Preço no Pix: subtotal menos 2% (389,40 -> 381,61; 79,90 -> 78,30). Não soma com o cupom. */
export const pixPrice = (value: number) => off(value, PIX_DISCOUNT);

/** Total no cartão ou boleto com o cupom do link: subtotal menos 1% (389,40 -> 385,51). */
export const linkPrice = (value: number) => off(value, BIO_COUPON_PCT);

export interface PricedItem {
  slug: string;
  price: number | null;
}

export interface CheckoutTotal {
  /** Jogos mais a Expressa, com o cupom do link (o que o checkout mostra no cartão). */
  total: number;
  pix: number;
  /** A Expressa vai junto neste carrinho. */
  express: boolean;
  /** Todos os jogos têm preço ao vivo. Sem isso o total é parcial e não deve aparecer. */
  complete: boolean;
  /** Linhas no carrinho (jogos + Expressa). Pix exato só com 1: com mais, o arredondamento da loja pode mudar o centavo. */
  lines: number;
}

/**
 * Total do carrinho que o clique vai montar.
 * - `bagItems`: o que já está na sacola.
 * - `adding`: jogo da ficha que entra agora (troca a licença anterior do mesmo jogo).
 * - `expressFlow`: o carrinho sai pelo fluxo sgadd (só nele a Expressa existe).
 */
export function checkoutTotal(
  bagItems: PricedItem[],
  adding: PricedItem | null,
  wantsExpress: boolean,
  expressFlow: boolean,
): CheckoutTotal {
  const items = adding ? [...bagItems.filter((i) => i.slug !== adding.slug), adding] : bagItems;
  const games = items.reduce((s, i) => s + (i.price ?? 0), 0);
  const express = expressFlow && wantsExpress && items.length > 0 && expressFits(items.length);
  const subtotal = Math.round((games + (express ? EXPRESS_PRICE : 0)) * 100) / 100;
  return {
    total: linkPrice(subtotal),
    pix: pixPrice(subtotal),
    express,
    complete: items.length > 0 && items.every((i) => i.price != null && i.price > 0),
    lines: items.length + (express ? 1 : 0),
  };
}

/** Pix exato em qualquer carrinho: a loja calcula sobre o subtotal (conferido com 6 itens). */
export const pixExact = (_t: Pick<CheckoutTotal, "lines">) => true;

/** "Total R$ 89,00 · no Pix R$ 88,10" (cartão já com o cupom do link). */
export const totalText = (t: Pick<CheckoutTotal, "total" | "pix" | "lines">) =>
  `Total ${brl(t.total)} · no Pix ${brl(t.pix)}`;

/**
 * Itens da sacola com o preço conferido na loja ao vivo. A sacola fica salva no aparelho e o preço
 * guardado pode ser de uma oferta que já acabou: se a licença não foi lida ao vivo nesta visita,
 * esgotou ou mudou de preço, o preço vira null e o total não aparece (o carrinho iria diferente).
 */
export function liveChecked<T extends PricedItem & { variantId: number }>(
  items: T[],
  lookup: (slug: string) => LiveGame | null = liveSync,
): PricedItem[] {
  return items.map((i) => {
    const v = lookup(i.slug)?.variants.find((x) => x.id === i.variantId);
    const ok =
      !!v &&
      v.available &&
      v.price != null &&
      i.price != null &&
      Math.abs(v.price - i.price) < 0.005;
    return { slug: i.slug, price: ok ? i.price : null };
  });
}

/** Lê ao vivo os jogos da sacola e redesenha quando chegam (para o total poder aparecer). */
export function useLiveChecks(slugs: string[]) {
  const [, bump] = useReducer((n: number) => n + 1, 0);
  const key = slugs.join(",");
  useEffect(() => {
    let alive = true;
    const missing = key ? key.split(",").filter((s) => !liveSync(s)) : [];
    if (missing.length)
      void Promise.all(missing.map((s) => loadGame(s))).then(() => alive && bump());
    return () => {
      alive = false;
    };
  }, [key]);
}

export const PIX_HINT = "No Pix, 2% a menos";

/**
 * "Mais escolhida" na primária: só em jogo com as duas licenças à venda.
 * Dado do painel do Links: 282 de 350 escolhas de licença (size_select), de 07/10 a 05/11/2026,
 * ou 80,6%, que vira "8 em cada 10". É dado de escolha, não de venda. Nada vem pré-selecionado.
 */
export const POPULAR_KEY = "primaria";
export const POPULAR_LINE = "8 em cada 10 escolhem a primária aqui.";
export const POPULAR_BADGE = "Mais escolhida";

export function showPopular(options: { key: string; out: boolean }[]): boolean {
  return (
    options.length === 2 &&
    options.some((o) => o.key === POPULAR_KEY) &&
    options.some((o) => o.key !== POPULAR_KEY) &&
    options.every((o) => !o.out)
  );
}
