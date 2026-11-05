import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlackHero, EXPRESS_URL } from "@/features/public/BlackHero";
import { getGame, getShelves, GTA6_STANDARD, GTA6_ULTIMATE } from "@/features/public/games";

describe("Topo da Black", () => {
  const html = renderToStaticMarkup(<BlackHero weekTheme onBrowse={() => {}} />);

  it("fala do mês todo e do tema da semana, sem datas nem preço da semana", () => {
    expect(html).toContain("Black o mês todo");
    expect(html).toContain("Semana de Luta e Futebol");
    expect(html).not.toMatch(/\d{2}\/\d{2}|\d{2} a \d{2}|Best Sellers|Preço da semana/);
  });

  it("explica a Entrega Expressa sem escassez nem cupom", () => {
    expect(html).toMatch(/até 2(\u00a0| )minutos/);
    expect(html).toContain("na hora de comprar, marque");
    expect(html).not.toContain(EXPRESS_URL);
    expect(html).not.toMatch(/alta demanda|cupom|últimas|restam/i);
    expect(html).not.toMatch(/[—–]/);
    expect(html).toMatch(/Seu jogo chega em até 2(\u00a0|&nbsp;| )minutos\./);
    expect(html).not.toContain("Quer o seu primeiro");
  });

  it("não tem contagem de dias no topo", () => {
    expect(html).not.toMatch(/chega em\s*<|Black Friday em|Contagem/);
  });

  it("sem campanha da semana, o botão leva ao Grupo VIP", () => {
    const off = renderToStaticMarkup(<BlackHero weekTheme={false} onBrowse={() => {}} />);
    expect(off).not.toContain("Semana de Luta");
    expect(off).toContain("Entrar no Grupo VIP da Black");
  });
});

describe("GTA 6 como categoria", () => {
  it("tem prateleira com as duas versões, depois da oferta da semana", () => {
    expect(getGame(GTA6_STANDARD)).not.toBeNull();
    expect(getGame(GTA6_ULTIMATE)).not.toBeNull();
    const ids = getShelves(new Date("2026-11-04T12:00:00-03:00")).map((s) => s.id);
    expect(ids.slice(0, 2)).toEqual(["oferta-da-semana", "gta-6"]);
    const gta = getShelves().find((s) => s.id === "gta-6")!;
    expect(gta.games.map((g) => g.slug)).toEqual([GTA6_STANDARD, GTA6_ULTIMATE]);
  });
});
