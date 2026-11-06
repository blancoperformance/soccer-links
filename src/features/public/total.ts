/**
 * Total final mostrado embaixo dos botões de compra e enviado no checkout_click.
 * A conta é uma só: o texto na tela, o `value` e o `pix_total` do evento saem daqui.
 */
import { EXPRESS_PRICE, expressFits } from "./express";
import { brl } from "./store";

/** A loja dá 2% de desconto no Pix em todo produto (página do produto: "2% de desconto pagando com Pix"). */
export const PIX_DISCOUNT = 0.02;

/** Preço no Pix, arredondado ao centavo como a loja faz: 79,90 x 0,98 = 78,302 -> 78,30. */
export const pixPrice = (value: number) =>
  Math.round((Math.round(value * 100) * (100 - PIX_DISCOUNT * 100)) / 100) / 100;

export interface PricedItem {
  slug: string;
  price: number | null;
}

export interface CheckoutTotal {
  /** Jogos mais a Expressa, se ela entra no carrinho. */
  total: number;
  pix: number;
  /** A Expressa vai junto neste carrinho. */
  express: boolean;
  /** Todos os jogos têm preço ao vivo. Sem isso o total é parcial e não deve aparecer. */
  complete: boolean;
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
  const total = Math.round((games + (express ? EXPRESS_PRICE : 0)) * 100) / 100;
  return {
    total,
    pix: pixPrice(total),
    express,
    complete: items.length > 0 && items.every((i) => i.price != null && i.price > 0),
  };
}

/** "Total R$ 94,90 · no Pix R$ 93,00" */
export const totalText = (t: Pick<CheckoutTotal, "total" | "pix">) =>
  `Total ${brl(t.total)} · no Pix ${brl(t.pix)}`;

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
