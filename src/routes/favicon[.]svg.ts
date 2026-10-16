import { createFileRoute } from "@tanstack/react-router";

/** Ícone da aba: "SG" em roxo da Soccer Games sobre círculo preto. Troque quando tiver a logo oficial. */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<circle cx="32" cy="32" r="32" fill="#060608"/>
<circle cx="32" cy="32" r="30.5" fill="none" stroke="#c000ff" stroke-width="3"/>
<text x="32" y="41" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="26" fill="#ffffff" letter-spacing="-1">S<tspan fill="#c000ff">G</tspan></text>
</svg>`;

export const Route = createFileRoute("/favicon.svg")({
  server: {
    handlers: {
      GET: async () =>
        new Response(SVG, {
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "public, max-age=86400, s-maxage=604800",
          },
        }),
    },
  },
});
