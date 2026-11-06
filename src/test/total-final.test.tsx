import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DualBuy, type BuyOption } from "@/features/public/DualBuy";
import { SGADD_MAX } from "@/features/public/express";
import {
  checkoutTotal,
  liveChecked,
  pixExact,
  PIX_HINT,
  pixPrice,
  POPULAR_BADGE,
  showPopular,
  totalText,
} from "@/features/public/total";

const nbsp = (s: string) => s.replace(/ /g, " ");
const g = (slug: string, price: number | null) => ({ slug, price });

describe("pixPrice (2% da loja, centavo arredondado)", () => {
  it("79,90 vira 78,30", () => expect(pixPrice(79.9)).toBe(78.3));
  it("89,90 vira 88,10 e 94,90 vira 93,00", () => {
    expect(pixPrice(89.9)).toBe(88.1);
    expect(pixPrice(94.9)).toBe(93);
  });
  it("preço de 3 dígitos", () => expect(pixPrice(189.9)).toBe(186.1));
});

describe("total final (cartão com o cupom do link de 1%, Pix com 2%, os dois sobre o subtotal)", () => {
  it("bate com o carrinho real da loja de 05/11: subtotal 389,40 vira 385,51 e 381,61 no Pix", () => {
    const bag = [
      g("a", 89.9),
      g("b", 59.9),
      g("c", 49.9),
      g("d", 49.9),
      g("e", 59.9),
      g("f", 79.9),
    ];
    const t = checkoutTotal(bag, null, false, true);
    expect(t).toMatchObject({ total: 385.51, pix: 381.61, lines: 6 });
    expect(nbsp(totalText(t))).toBe("Total R$ 385,51 · no Pix R$ 381,61");
  });
  it("um jogo, sem Expressa", () => {
    const t = checkoutTotal([], g("a", 89.9), false, true);
    expect(t).toMatchObject({ total: 89, pix: 88.1, express: false, complete: true });
    expect(nbsp(totalText(t))).toBe("Total R$ 89,00 · no Pix R$ 88,10");
  });
  it("um jogo com Expressa soma R$ 5 antes dos descontos", () => {
    const t = checkoutTotal([], g("a", 89.9), true, true);
    expect(t).toMatchObject({ total: 93.95, pix: 93, express: true, lines: 2 });
    expect(pixExact(t)).toBe(true);
    expect(nbsp(totalText(t))).toBe("Total R$ 93,95 · no Pix R$ 93,00");
  });
  it("3 dígitos com Expressa", () => {
    expect(nbsp(totalText(checkoutTotal([], g("a", 189.9), true, true)))).toBe(
      "Total R$ 192,95 · no Pix R$ 191,00",
    );
    expect(nbsp(totalText(checkoutTotal([], g("a", 189.9), false, true)))).toBe(
      "Total R$ 188,00 · no Pix R$ 186,10",
    );
  });
  it("sacola com vários jogos soma tudo; o jogo da ficha troca a licença anterior", () => {
    const bag = [g("a", 50), g("b", 79.9)];
    expect(checkoutTotal(bag, g("c", 30), false, true).total).toBe(158.3);
    expect(checkoutTotal(bag, g("a", 40), false, true).total).toBe(118.7);
    const t = checkoutTotal(bag, null, true, true);
    expect(t).toMatchObject({ total: 133.55, pix: 132.2, express: true, lines: 3 });
  });
  it("sem o fluxo sgadd não há Expressa", () => {
    expect(checkoutTotal([], g("a", 50), true, false)).toMatchObject({
      total: 49.5,
      express: false,
    });
  });
  it("Expressa não entra quando a sacola já enche o sgadd", () => {
    const full = Array.from({ length: SGADD_MAX }, (_, i) => g(`j${i}`, 10));
    expect(checkoutTotal(full, null, true, true).express).toBe(false);
  });
  it("preço ao vivo ausente: total incompleto, a linha não aparece", () => {
    expect(checkoutTotal([], g("a", null), false, true).complete).toBe(false);
    expect(checkoutTotal([g("b", 50)], g("a", null), false, true).complete).toBe(false);
    expect(checkoutTotal([], null, true, true).complete).toBe(false);
  });
  it("sacola: preço guardado só vale se bater com a loja ao vivo", () => {
    const live =
      (price: number | null, available = true) =>
      () => ({
        id: 1,
        images: [],
        variants: [{ id: 7, key: "primaria", label: "Primária", price, from: null, available }],
      });
    const item = { slug: "a", price: 39.9, variantId: 7 };
    expect(liveChecked([item], live(39.9))).toEqual([{ slug: "a", price: 39.9 }]);
    // oferta da semana passada acabou: a loja cobra outro preço
    expect(liveChecked([item], live(59.9))[0]!.price).toBeNull();
    expect(liveChecked([item], live(39.9, false))[0]!.price).toBeNull();
    expect(liveChecked([item], () => null)[0]!.price).toBeNull();
    expect(
      checkoutTotal(
        liveChecked([item], () => null),
        null,
        false,
        true,
      ).complete,
    ).toBe(false);
  });
  it("sem licença escolhida o texto é a dica do Pix", () =>
    expect(PIX_HINT).toBe("No Pix, 2% a menos"));
});

const prim: BuyOption = { key: "primaria", label: "Primária", out: false, price: 89.9 };
const sec: BuyOption = { key: "secundaria", label: "Secundária", out: false, price: 49.9 };

describe("selo Mais escolhida", () => {
  it("duas licenças à venda: sim", () => {
    expect(showPopular([sec, prim])).toBe(true);
    render(<DualBuy options={[sec, prim]} onBuy={() => {}} popular />);
    expect(screen.getAllByText(POPULAR_BADGE)).toHaveLength(1);
    // nenhum botão vem pré-selecionado
    expect(
      screen.getAllByRole("button").every((b) => b.getAttribute("aria-pressed") === null),
    ).toBe(true);
  });
  it("uma licença só: não", () => expect(showPopular([prim])).toBe(false));
  it("uma das duas esgotada: não", () => {
    expect(showPopular([prim, { ...sec, out: true }])).toBe(false);
  });
  it("outro par de licenças: não", () => {
    expect(
      showPopular([
        { ...prim, key: "x" },
        { ...sec, key: "y" },
      ]),
    ).toBe(false);
  });
  it("sem popular, DualBuy não mostra o selo", () => {
    render(<DualBuy options={[prim, sec]} onBuy={() => {}} />);
    expect(screen.queryByText(POPULAR_BADGE)).toBeNull();
  });
});
