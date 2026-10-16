import { createFileRoute } from "@tanstack/react-router";
import { PublicPage } from "@/features/public/PublicPage";
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

const TITLE = "Soccer Games | Links";
const DESC =
  "Jogos digitais de PS4 e PS5, quiz para escolher o próximo jogo, atendimento e o Grupo VIP da Soccer Games.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
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
