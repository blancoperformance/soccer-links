import { createFileRoute } from "@tanstack/react-router";
import { isWeeklyPromotionActive } from "@/features/public/promotion";
import { isBlackHighlightOn, PublicPage } from "@/features/public/PublicPage";
import {
  campaign,
  community,
  contact,
  items,
  profile,
  quiz,
  quickAnswers,
  socials,
  theme,
  trust,
} from "@/features/public/content";

const pageTitle = () =>
  isWeeklyPromotionActive()
    ? "Black o mês todo | Soccer Games"
    : isBlackHighlightOn()
      ? "Soccer Games | Black Friday e Grupo VIP"
      : "Soccer Games | Links";
const pageDescription = () =>
  isWeeklyPromotionActive()
    ? "Novembro inteiro é Black na Soccer Games. Jogos digitais de PS4 e PS5 em oferta, Entrega Expressa e GTA 6 em pré-venda. Escolha seu jogo e sua licença."
    : isBlackHighlightOn()
      ? "Novembro inteiro é Black na Soccer Games. Jogos digitais de PS4 e PS5, GTA 6 em pré-venda, atendimento e o Grupo VIP com as ofertas antes do site."
      : "Jogos digitais de PS4 e PS5, quiz para escolher o próximo jogo, atendimento e o Grupo VIP da Soccer Games.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: pageTitle() },
      { name: "description", content: pageDescription() },
      { property: "og:title", content: pageTitle() },
      { property: "og:description", content: pageDescription() },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <PublicPage
      profile={profile}
      socials={socials}
      items={items}
      campaign={campaign}
      quiz={quiz}
      whatsapp={contact.whatsapp}
      hours={contact.hours}
      theme={theme}
      trust={trust}
      quickAnswers={quickAnswers}
      community={community}
    />
  );
}
