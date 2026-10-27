import { createFileRoute } from "@tanstack/react-router";
import { BlackPage } from "@/features/black/BlackPage";
import { blackFaq } from "@/features/black/faq";
import { black } from "@/features/black/config";

const TITLE = `GTA 6 na Black da Soccer Games ${black.year} | Grupo VIP`;
const DESC =
  "O GTA 6 chega dia 19/11. O preço do fim de semana do lançamento e da Black Friday (27 a 30/11) sai primeiro no Grupo VIP da Soccer Games. É de graça.";

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
  name: `Black Soccer Games ${black.year}`,
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
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:image", content: "https://links.lojasoccergames.com.br/black/og.jpg" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
    ],
    links: [
      { rel: "canonical", href: "https://links.lojasoccergames.com.br/black" },
    ],
    scripts: [
      { type: "application/ld+json", children: JSON.stringify(faqLd) },
      { type: "application/ld+json", children: JSON.stringify(eventLd) },
    ],
  }),
  component: BlackPage,
});
