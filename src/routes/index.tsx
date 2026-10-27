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
    ? "Semana dos Best Sellers | Soccer Games"
    : isBlackHighlightOn()
      ? "Soccer Games | Black Friday e Grupo VIP"
      : "Soccer Games | Links";
const pageDescription = () =>
  isWeeklyPromotionActive()
    ? "De 19 a 25 de outubro: FC 26, Hogwarts Legacy, Call of Duty e mais Best Sellers de PS4 e PS5 em oferta na Soccer Games. Escolha seu jogo e sua licença."
    : isBlackHighlightOn()
      ? "Black Friday da Soccer Games de 27 a 30/11 e GTA 6 em 19/11. Jogos digitais de PS4 e PS5, atendimento e o Grupo VIP com as ofertas antes do site."
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
