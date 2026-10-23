import { afterEach, describe, expect, it } from "vitest";
import { withMetaClick } from "@/lib/tracking";

const setUrl = (search: string) => window.history.replaceState(null, "", `/${search}`);

describe("withMetaClick", () => {
  afterEach(() => {
    sessionStorage.clear();
    setUrl("");
  });
  it("leva o fbclid da visita para a loja", () => {
    setUrl("?fbclid=AbC_123");
    expect(withMetaClick("https://lojasoccergames.com.br/produtos/x/?utm_medium=bio")).toBe(
      "https://lojasoccergames.com.br/produtos/x/?utm_medium=bio&fbclid=AbC_123",
    );
  });
  it("lembra o fbclid durante a visita e funciona com caminho relativo", () => {
    setUrl("?fbclid=XyZ");
    withMetaClick("https://lojasoccergames.com.br/");
    setUrl("?jogo=fc26");
    expect(withMetaClick("/comprar/?sg=1")).toBe("/comprar/?sg=1&fbclid=XyZ");
  });
  it("não inventa nem sobrescreve", () => {
    expect(withMetaClick("https://lojasoccergames.com.br/")).toBe("https://lojasoccergames.com.br/");
    setUrl("?fbclid=novo");
    expect(withMetaClick("https://lojasoccergames.com.br/?fbclid=antigo")).toBe(
      "https://lojasoccergames.com.br/?fbclid=antigo",
    );
    setUrl("?fbclid=<script>");
    sessionStorage.clear();
    expect(withMetaClick("https://lojasoccergames.com.br/")).toBe("https://lojasoccergames.com.br/");
  });
});
