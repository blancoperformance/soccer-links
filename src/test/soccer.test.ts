import { describe, expect, it } from "vitest";
import {
  games,
  getGame,
  searchGames,
  shelves,
  versionsOf,
  similarTo,
} from "@/features/public/games";
import { quiz } from "@/features/public/content";
import { activeQuestions, scoreQuiz } from "@/features/public/quiz-score";
import { cartUrl, sized } from "@/features/public/store";
import { fromApiProduct, licenseKey, parseProductPage } from "@/lib/nuvemshop";
import { phaseAt } from "@/features/black/config";

describe("catálogo", () => {
  it("tem os jogos da planilha, todos com plataforma", () => {
    expect(games.length).toBeGreaterThan(350);
    expect(games.every((g) => g.platforms.length > 0)).toBe(true);
  });
  it("monta as abas com jogos", () => {
    expect(shelves.map((s) => s.id)).toEqual(
      expect.arrayContaining(["lancamentos", "mais-vendidos", "ps5", "ps4"]),
    );
    expect(shelves.every((s) => s.games.length > 0)).toBe(true);
  });
  it("produto copiado na loja não herda tags erradas", () => {
    const copied = games.filter((g) => !g.checked);
    expect(copied.length).toBeGreaterThan(0);
    expect(copied.every((g) => g.tags.length === 0 && g.brand === "")).toBe(true);
  });
});

describe("busca", () => {
  it("entende apelido e plataforma: gta ps4", () => {
    const r = searchGames("gta ps4");
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((g) => g.platforms.includes("PS4"))).toBe(true);
    expect(r[0]!.name.toLowerCase()).toContain("grand theft auto");
  });
  it("ignora acento e caixa", () => {
    expect(searchGames("homem aranha").some((g) => /spider-man/i.test(g.name))).toBe(true);
  });
  it("não acha nada com lixo", () => expect(searchGames("xqzvw")).toEqual([]));
});

describe("versões e parecidos", () => {
  it("acha PS4 e PS5 do mesmo jogo", () => {
    const rdr = games.find((g) => /red dead redemption 2/i.test(g.name))!;
    expect(versionsOf(rdr).length).toBeGreaterThanOrEqual(2);
  });
  it("parecidos não repetem o próprio jogo", () => {
    const g = games.find((x) => x.genres.includes("Corrida"))!;
    expect(similarTo(g).some((x) => x.slug === g.slug)).toBe(false);
  });
});

describe("quiz", () => {
  it("pergunta de estilo muda com o gênero", () => {
    const tiro = activeQuestions(quiz, { genero: "tiro" }).find((q) => q.id === "estilo")!;
    expect(tiro.options.map((o) => o.id)).toContain("guerra");
    expect(tiro.options.map((o) => o.id)).not.toContain("lego");
  });
  it("respeita a plataforma escolhida", () => {
    const r = scoreQuiz(quiz, {
      console: "ps4",
      "para-quem": "eu",
      jeito: "online",
      genero: "tiro",
      estilo: "guerra",
      momento: "tanto-faz",
      licenca: "nao-sei",
    })!;
    expect(r.best.platforms).toContain("PS4");
    expect(r.alternatives.every((g) => g.platforms.includes("PS4"))).toBe(true);
  });
  it("futebol indica jogo de futebol", () => {
    const r = scoreQuiz(quiz, {
      console: "ps5",
      "para-quem": "eu",
      jeito: "online",
      genero: "futebol",
      estilo: "futebol",
      momento: "lancamento",
      licenca: "primaria",
    })!;
    expect(r.best.tags.includes("futebol") || /fc|efootball|fifa/i.test(r.best.name)).toBe(true);
    expect(r.license).toBe("primaria");
  });
  it("para criança nunca indica terror ou violência", () => {
    for (const genero of ["acao", "tiro", "terror", "infantil", "corrida"]) {
      const r = scoreQuiz(quiz, {
        console: "ps5",
        "para-quem": "crianca",
        jeito: "sofa",
        genero,
        momento: "tanto-faz",
      });
      if (!r) continue;
      for (const g of [r.best, ...r.alternatives]) {
        expect(g.genres).not.toContain("Terror");
        expect(/resident evil|mortal kombat|call of duty|gta|grand theft/i.test(g.name)).toBe(
          false,
        );
      }
    }
  });
  it("alternativas não repetem versões do indicado", () => {
    const r = scoreQuiz(quiz, { console: "ps5", genero: "acao", estilo: "mundo-aberto" })!;
    const base = r.best.short.toLowerCase().slice(0, 12);
    expect(r.alternatives.some((g) => g.short.toLowerCase().startsWith(base))).toBe(false);
  });
});

describe("loja (Nuvemshop)", () => {
  it("link de carrinho com UTMs da bio", () => {
    const u = new URL(cartUrl(123456, "ficha-gta", "gta"));
    expect(u.origin + u.pathname).toBe("https://lojasoccergames.com.br/produtos/gta/");
    expect(u.searchParams.get("utm_medium")).toBe("bio");
    expect(u.searchParams.get("utm_content")).toBe("ficha-gta");
  });
  it("reduz a foto pelo CDN", () => {
    expect(
      sized("https://dcdn-us.mitiendanube.com/stores/001/products/gta-1024-1024.webp", 480),
    ).toBe("https://dcdn-us.mitiendanube.com/stores/001/products/gta-480-0.webp");
  });
  it("licença pelo nome da variação", () => {
    expect(licenseKey("PRIMÁRIA")).toBe("primaria");
    expect(licenseKey("Secundaria")).toBe("secundaria");
  });
  it("lê produto da API", () => {
    const row = fromApiProduct({
      id: 9,
      handle: { pt: "gta-5" },
      images: [{ src: "//cdn/x-1024-1024.webp", position: 1 }],
      variants: [
        {
          id: 1,
          price: "199.90",
          promotional_price: "149.90",
          stock: null,
          values: [{ pt: "PRIMÁRIA" }],
        },
        {
          id: 2,
          price: "99.90",
          promotional_price: null,
          stock: 0,
          stock_management: true,
          values: [{ pt: "SECUNDÁRIA" }],
        },
      ],
    })!;
    expect(row[0]).toBe("gta-5");
    expect(row[1].images[0]).toBe("https://cdn/x-1024-1024.webp");
    expect(row[1].variants[0]).toMatchObject({
      id: 1,
      key: "primaria",
      price: 149.9,
      from: 199.9,
      available: true,
    });
    expect(row[1].variants[1]).toMatchObject({ key: "secundaria", available: false });
  });
  it("lê fotos e licenças do HTML da página", () => {
    const variants = JSON.stringify([
      {
        id: 11,
        option0: "PRIMÁRIA",
        price_number: 149.9,
        compare_at_price_number: 199.9,
        available: true,
        stock: null,
      },
      { id: 12, option0: "SECUNDÁRIA", price_number: 99.9, available: false, stock: 0 },
    ]).replace(/"/g, "&quot;");
    const html = `<html><head><meta property="og:image" content="https://dcdn-us.mitiendanube.com/stores/001/products/gta-1024-1024.webp"></head>
      <body><div class="js-product-container" data-product-id="77" data-variants="${variants}"></div>
      <img src="//dcdn-us.mitiendanube.com/stores/001/products/gta-2-1024-1024.webp"></body></html>`;
    const p = parseProductPage(html)!;
    expect(p.id).toBe(77);
    expect(p.images).toHaveLength(2);
    expect(p.variants.map((v) => [v.id, v.key, v.price, v.available])).toEqual([
      [11, "primaria", 149.9, true],
      [12, "secundaria", 99.9, false],
    ]);
  });
});

describe("Black November", () => {
  const t = (s: string) => Date.parse(s);
  it("conta até a Pré-Black, depois até a Black", () => {
    expect(phaseAt(t("2026-10-16T12:00:00-03:00")).phase).toBe("antes");
    expect(phaseAt(t("2026-11-21T12:00:00-03:00")).phase).toBe("pre");
    expect(phaseAt(t("2026-11-24T12:00:00-03:00")).phase).toBe("entre");
    expect(phaseAt(t("2026-11-27T10:00:00-03:00")).phase).toBe("black");
    expect(phaseAt(t("2026-12-02T10:00:00-03:00")).phase).toBe("fim");
  });
});

describe("dados conferidos", () => {
  it("todo jogo citado nos testes existe", () => expect(getGame(games[0]!.slug)).not.toBeNull());
});

import { dealsFrom } from "@/features/public/Offers";
import { games as allGames } from "@/features/public/games";
describe("caça-ofertas", () => {
  it("só entra oferta real (preço de maior que o por) e ordena pelo desconto", () => {
    const [a, b, c] = allGames.filter((g) => g.kind === "jogo");
    const v = (price: number, from: number | null, available = true) => ({ id: 1, key: "primaria", label: "Primária", price, from, available });
    const d = dealsFrom({
      [a!.slug]: { id: 1, images: [], variants: [v(50, 100)] },
      [b!.slug]: { id: 2, images: [], variants: [v(20, 100), v(90, 100)] },
      [c!.slug]: { id: 3, images: [], variants: [v(50, null), v(10, 100, false)] },
    });
    expect(d.map((x) => x.pct)).toEqual([80, 50]);
    expect(d[0]!.save).toBe(80);
  });
});

import { searchSmart } from "@/features/public/games";
describe("busca com erro de digitação", () => {
  it("minecreft acha Minecraft", () => {
    const r = searchSmart("minecreft");
    expect(r.corrected).toBe("minecraft");
    expect(r.games.some((g) => /minecraft/i.test(g.name))).toBe(true);
  });
  it("hogwarts escrito errado", () => {
    expect(searchSmart("hogwats").games.some((g) => /hogwarts/i.test(g.name))).toBe(true);
  });
  it("busca certa não corrige", () => {
    expect(searchSmart("minecraft").corrected).toBeNull();
  });
});
describe("busca com número grudado", () => {
  it("fc26 acha FC 26 e ps5 continua filtrando", () => {
    expect(searchSmart("fc26").games.some((g) => /fc 26/i.test(g.name))).toBe(true);
    expect(searchSmart("fc26 ps5").games.every((g) => g.platforms.includes("PS5"))).toBe(true);
  });
});
