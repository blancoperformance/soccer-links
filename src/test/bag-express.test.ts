import { afterEach, describe, expect, it } from "vitest";
import { bagUrl, type BagItem } from "@/features/public/bag";
import { EXPRESS_ITEM, express, SGADD_MAX } from "@/features/public/express";

const game = (n: number, option = "Primária"): BagItem => ({
  slug: `jogo-${n}`,
  name: `Jogo ${n}`,
  productId: 1000 + n,
  variantId: 2000 + n,
  license: option,
  option,
  price: 50,
  from: 100,
  image: "",
});
// com cupom o /comprar/ vem dentro do redirect_to; sem cupom é o próprio caminho
const sgadd = (url: string) => {
  const u = new URL(url, "https://x.test");
  const inner = u.searchParams.get("redirect_to") ?? `${u.pathname}${u.search}`;
  return new URL(inner, "https://x.test").searchParams.get("sgadd")?.split(",") ?? [];
};

describe("bagUrl com Entrega Expressa", () => {
  it("sem Expressa: só os jogos", () => {
    expect(sgadd(bagUrl([game(1)], "sacola"))).toEqual(["1001-2001-Prim%C3%A1ria"]);
  });
  it("com Expressa e 1 jogo: entra no fim, sem opção", () => {
    expect(sgadd(bagUrl([game(1)], "sacola", true))).toEqual(["1001-2001-Prim%C3%A1ria", EXPRESS_ITEM]);
    expect(EXPRESS_ITEM).toBe("378787215-1632559625");
  });
  it("com vários jogos: uma Expressa só, no fim", () => {
    const parts = sgadd(bagUrl([game(1), game(2), game(3)], "sacola", true));
    expect(parts).toHaveLength(4);
    expect(parts.at(-1)).toBe(EXPRESS_ITEM);
    expect(parts.filter((p) => p === EXPRESS_ITEM)).toHaveLength(1);
  });
  it("passa no filtro do script da loja (só dígitos em produto e variante)", () => {
    const last = sgadd(bagUrl([game(1)], "sacola", true)).at(-1)!.split("-");
    expect(last).toHaveLength(2);
    expect(last.every((x) => /^\d+$/.test(x))).toBe(true);
  });
  it("sem espaço no limite de 12 itens do script, a Expressa não entra", () => {
    const full = Array.from({ length: SGADD_MAX }, (_, i) => game(i + 1));
    expect(sgadd(bagUrl(full, "sacola", true))).toHaveLength(SGADD_MAX);
  });
});

describe("escolha da Expressa", () => {
  afterEach(() => {
    express.set(false);
    sessionStorage.clear();
  });
  it("nunca vem marcada e fica na sessão", () => {
    expect(express.get()).toBe(false);
    express.set(true);
    expect(sessionStorage.getItem("sg:express")).toBe("1");
  });
});
