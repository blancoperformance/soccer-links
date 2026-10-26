import { createFileRoute } from "@tanstack/react-router";
import { BlackPage } from "@/features/black/BlackPage";
import { blackFaq } from "@/features/black/faq";
import { black } from "@/features/black/config";

const TITLE = `Black November Soccer Games ${black.year} | Grupo VIP`;
const DESC =
  "Pré-Black no fim de semana do GTA VI e Black Friday em 27 de novembro. Entre no Grupo VIP da Soccer Games e receba as ofertas de jogos de PS4 e PS5 antes de todo mundo.";

const faqLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: blackFaq.flatMap((g) =>
    g.items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  ),
};
const eventLd = {
  "@context": "https://schema.org",
  "@type": "SaleEvent",
  name: `Black November Soccer Games ${black.year}`,
  startDate: black.preStart,
  endDate: black.bigEnd,
  eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  location: { "@type": "VirtualLocation", url: "https://lojasoccergames.com.br" },
  organizer: {
    "@type": "Organization",
    name: "Soccer Games",
    url: "https://lojasoccergames.com.br",
  },
};

export const Route = createFileRoute("/black")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://links.lojasoccergames.com.br/black" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://links.lojasoccergames.com.br/black" }],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(faqLd) },
      { type: "application/ld+json", children: JSON.stringify(eventLd) },
    ],
  }),
  component: BlackPage,
});
