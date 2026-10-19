import { describe, expect, it } from "vitest";
import { games, getGame, getShelves } from "@/features/public/games";
import { dealsFrom } from "@/features/public/Offers";
import {
  isWeeklyPromotionActive,
  weeklyGameSlugs,
  weeklyPromotion,
} from "@/features/public/promotion";

describe("Semana dos Best Sellers", () => {
  it("inclui os 37 produtos da categoria sem duplicatas nem jogos ausentes", () => {
    expect(weeklyGameSlugs.size).toBe(37);
    expect(weeklyPromotion.games.every((slug) => getGame(slug))).toBe(true);
    expect(weeklyPromotion.highlights.every((slug) => weeklyGameSlugs.has(slug))).toBe(true);
    const first = getShelves(new Date("2026-10-19T12:00:00-03:00"))[0]!;
    expect(first.id).toBe("best-sellers-semana");
    expect(first.url).toBe(weeklyPromotion.url);
    expect(new Set(first.games.map((game) => game.slug))).toEqual(weeklyGameSlugs);
  });

  it("não mistura ofertas da loja com o ranking da campanha", () => {
    const selected = getGame(weeklyPromotion.highlights[0])!;
    const outside = games.find((game) => !weeklyGameSlugs.has(game.slug) && game.kind === "jogo")!;
    const product = {
      id: 1,
      images: [],
      variants: [
        { id: 1, key: "primaria", label: "Primária", price: 30, from: 100, available: true },
      ],
    };
    const cat = { [selected.slug]: product, [outside.slug]: product };
    expect(dealsFrom(cat, weeklyGameSlugs).map((deal) => deal.game.slug)).toEqual([selected.slug]);
    expect(dealsFrom(cat)).toHaveLength(2);
  });

  it("encerra cada campanha na sua própria data, no fuso de Brasília", () => {
    expect(isWeeklyPromotionActive(new Date("2026-10-18T23:59:59-03:00"))).toBe(false);
    expect(isWeeklyPromotionActive(new Date("2026-10-19T00:00:00-03:00"))).toBe(true);
    const afterSeasonal = getShelves(new Date("2026-10-22T03:59:00-03:00"));
    expect(afterSeasonal.some((shelf) => shelf.id === "ofertas")).toBe(false);
    expect(afterSeasonal[0]!.id).toBe("best-sellers-semana");
    expect(isWeeklyPromotionActive(new Date("2026-10-26T00:00:00-03:00"))).toBe(false);
    expect(
      getShelves(new Date("2026-10-26T00:00:00-03:00")).some(
        (shelf) => shelf.id === "best-sellers-semana",
      ),
    ).toBe(false);
  });
});
