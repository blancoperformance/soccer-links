import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DualBuy, type BuyOption } from "@/features/public/DualBuy";
import { SGADD_MAX } from "@/features/public/express";
import {
  checkoutTotal,
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

describe("total final", () => {
  it("um jogo, sem Expressa", () => {
    const t = checkoutTotal([], g("a", 89.9), false, true);
    expect(t).toMatchObject({ total: 89.9, pix: 88.1, express: false, complete: true });
    expect(nbsp(totalText(t))).toBe("Total R$ 89,90 · no Pix R$ 88,10");
  });
  it("um jogo com Expressa soma R$ 5 e o Pix vem sobre o total", () => {
    const t = checkoutTotal([], g("a", 89.9), true, true);
    expect(t).toMatchObject({ total: 94.9, pix: 93, express: true });
    expect(nbsp(totalText(t))).toBe("Total R$ 94,90 · no Pix R$ 93,00");
  });
  it("3 dígitos com Expressa", () => {
    const t = checkoutTotal([], g("a", 189.9), true, true);
    expect(nbsp(totalText(t))).toBe("Total R$ 194,90 · no Pix R$ 191,00");
  });
  it("sacola com vários jogos soma tudo; o jogo da ficha troca a licença anterior", () => {
    const bag = [g("a", 50), g("b", 79.9)];
    expect(checkoutTotal(bag, g("c", 30), false, true).total).toBe(159.9);
    expect(checkoutTotal(bag, g("a", 40), false, true).total).toBe(119.9);
    const t = checkoutTotal(bag, null, true, true);
    expect(t).toMatchObject({ total: 134.9, express: true });
    expect(t.pix).toBe(132.2);
  });
  it("sem o fluxo sgadd não há Expressa", () => {
    expect(checkoutTotal([], g("a", 50), true, false)).toMatchObject({ total: 50, express: false });
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
  it("sem licença escolhida o texto é a dica do Pix", () => expect(PIX_HINT).toBe("No Pix, 2% a menos"));
});

const prim: BuyOption = { key: "primaria", label: "Primária", out: false, price: 89.9 };
const sec: BuyOption = { key: "secundaria", label: "Secundária", out: false, price: 49.9 };

describe("selo Mais escolhida", () => {
  it("duas licenças à venda: sim", () => {
    expect(showPopular([sec, prim])).toBe(true);
    render(<DualBuy options={[sec, prim]} onBuy={() => {}} popular />);
    expect(screen.getAllByText(POPULAR_BADGE)).toHaveLength(1);
    // nenhum botão vem pré-selecionado
    expect(screen.getAllByRole("button").every((b) => b.getAttribute("aria-pressed") === null)).toBe(true);
  });
  it("uma licença só: não", () => expect(showPopular([prim])).toBe(false));
  it("uma das duas esgotada: não", () => {
    expect(showPopular([prim, { ...sec, out: true }])).toBe(false);
  });
  it("outro par de licenças: não", () => {
    expect(showPopular([{ ...prim, key: "x" }, { ...sec, key: "y" }])).toBe(false);
  });
  it("sem popular, DualBuy não mostra o selo", () => {
    render(<DualBuy options={[prim, sec]} onBuy={() => {}} />);
    expect(screen.queryByText(POPULAR_BADGE)).toBeNull();
  });
});
