/** Campanha conferida na categoria da loja em 04/11/2026 (12 produtos). Preços continuam ao vivo. */
export const weeklyPromotion = {
  slug: "oferta-luta-e-futebol",
  title: "Oferta de Luta e Futebol",
  /** Nome da prateleira na página de links. */
  shelfName: "Oferta da semana: Luta e Futebol",
  badge: "02 a 08 de novembro",
  subtitle: "FC 26, UFC, Tekken 7, Naruto e Dragon Ball para PS4 e PS5.",
  cta: "Ver ofertas da semana",
  url: "https://lojasoccergames.com.br/oferta-de-luta-e-futebol/",
  startsAt: "2026-11-02T00:00:00-03:00",
  endsAt: "2026-11-08T23:59:59-03:00",
  games: [
    "ea-sports-fc-26-para-ps4-midia-digital",
    "ea-sports-fc-26-para-ps5-midia-digital",
    "efootball-pes-2020-ps4-vm7u5",
    "naruto-shippuden-ultimate-ninja-storm-4-para-ps4-midia-digital",
    "efootball-pes-2020-para-ps5-midia-digital",
    "007-first-light-para-ps5-midia-digital-copia-ff4ok",
    "ufc-5-arte-de-destaque-ea-sports-ufc-5-midia-digital",
    "tekken-7-ps4-17icu",
    "naruto-shippuden-ultimate-ninja-storm-4-para-ps5-midia-digital",
    "dragon-ball-fighterz-para-ps4-midia-digital",
    "tekken-7-para-ps5-midia-digital",
    "dragon-ball-fighterz-para-ps5-midia-digital",
  ],
  highlights: [
    "ea-sports-fc-26-para-ps5-midia-digital",
    "007-first-light-para-ps5-midia-digital-copia-ff4ok",
    "tekken-7-para-ps5-midia-digital",
  ],
} as const;

export const weeklyGameSlugs: ReadonlySet<string> = new Set(weeklyPromotion.games);
export const seasonalEndsAt = "2026-10-22T03:59:00-03:00";

export function isWeeklyPromotionActive(at = new Date()): boolean {
  const time = at.getTime();
  return time >= Date.parse(weeklyPromotion.startsAt) && time < Date.parse(weeklyPromotion.endsAt);
}

export function isSeasonalPromotionActive(at = new Date()): boolean {
  return at.getTime() < Date.parse(seasonalEndsAt);
}
