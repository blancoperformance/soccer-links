/** Campanha conferida na categoria da loja em 19/10/2026. Preços continuam ao vivo. */
export const weeklyPromotion = {
  slug: "semana-best-sellers",
  title: "Semana dos Best Sellers",
  badge: "19 a 25 de outubro",
  subtitle: "FC 26, Hogwarts Legacy, Call of Duty e mais jogos para PS4 e PS5.",
  cta: "Ver Best Sellers",
  url: "https://lojasoccergames.com.br/semana-dos-best-sellers-kdrlf/",
  startsAt: "2026-10-19T00:00:00-03:00",
  endsAt: "2026-10-25T23:59:59-03:00",
  games: [
    "ea-sports-fc-26-para-ps4-midia-digital",
    "ea-sports-fc-26-para-ps5-midia-digital",
    "need-for-speed-heat-ps4-midia-digital",
    "efootball-pes-2020-ps4-vm7u5",
    "call-of-duty-modern-warfare-ii-para-ps4-midia-digital",
    "tom-clancys-ghost-recon-wildlands-ps4",
    "call-of-duty-wwii-edicao-ouro-para-ps4-midia-digital",
    "naruto-shippuden-ultimate-ninja-storm-4-para-ps4-midia-digital",
    "the-crew-2-ps4",
    "call-of-duty-modern-warfare-iii-ps4-midia-digital",
    "primaria-marvels-spider-man-miles-morales-ps4-midia-digital",
    "gran-turismo-7-ps4-midia-digital",
    "call-of-duty-modern-warfare-ii-para-ps5-midia-digital",
    "tom-clancys-ghost-recon-breakpoint-ps4-midia-digital",
    "efootball-pes-2020-para-ps5-midia-digital",
    "hogwarts-legacy-ps4-q9z7b",
    "mxgp3-the-official-motocross-videogame-para-ps4-midia-digital",
    "caixa-misteriosa-de-jogos-para-ps4-e-ps5",
    "truck-driver-ps4-1l4d7",
    "a-way-out-para-ps4-midia-digital",
    "call-of-duty-modern-warfare-iii-ps5-midia-digital",
    "gran-turismo-7-ps5-midia-digital",
    "need-for-speed-heat-ps5-midia-digital",
    "call-of-duty-vanguard-ps5-midia-digital",
    "call-of-duty-wwii-edicao-ouro-para-ps5-midia-digital",
    "naruto-shippuden-ultimate-ninja-storm-4-para-ps5-midia-digital",
    "call-of-duty-vanguard-ps4-midia-digital",
    "sniper-ghost-warrior-contracts-2-para-ps4-midia-digital",
    "hogwarts-legacy-ps5-midia-digital",
    "tom-clancys-ghost-recon-wildlands-ps5-midia-digital",
    "tom-clancys-ghost-recon-breakpoint-ps5-midia-digital",
    "marvels-spider-man-miles-morales-ps5midia-digital",
    "a-way-out-para-ps5-midia-digital",
    "truck-driver-para-ps5-midia-digital",
    "sniper-ghost-warrior-contracts-2-para-ps5-midia-digital",
    "mxgp3-the-official-motocross-videogame-para-ps5-midia-digital",
    "the-crew-2-ps5",
  ],
  highlights: [
    "ea-sports-fc-26-para-ps5-midia-digital",
    "hogwarts-legacy-ps5-midia-digital",
    "call-of-duty-modern-warfare-iii-ps5-midia-digital",
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
