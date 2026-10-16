import { createFileRoute } from "@tanstack/react-router";
import { fetchCatalogFromApi, parseProductPage } from "@/lib/nuvemshop";
import { STORE } from "@/features/public/games";

/**
 * Dados ao vivo da loja, com cache na borda da Vercel.
 *   GET /api/loja            -> { mode: "api", products: { <endereço>: {...} } } com token, senão { mode: "none" }
 *   GET /api/loja?slug=<endereço do produto> -> { product } lido da página do produto
 *   GET /api/loja?status=1   -> diz se o token está configurado e quantos produtos a API trouxe (sem dados)
 */
const json = (body: unknown, sMaxAge: number) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=60, s-maxage=${sMaxAge}, stale-while-revalidate=3600`,
    },
  });

const env = (k: string) => {
  try {
    return (process.env[k] ?? "").trim();
  } catch {
    return "";
  }
};

export const Route = createFileRoute("/api/loja")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams;
        const storeId = env("NUVEMSHOP_STORE_ID");
        const token = env("NUVEMSHOP_TOKEN");

        const slug = q.get("slug");
        if (slug) {
          if (!/^[a-z0-9-]{2,160}$/.test(slug)) return json({ error: "bad request" }, 60);
          try {
            const r = await fetch(`${STORE}/produtos/${slug}/`, {
              headers: { Accept: "text/html", "User-Agent": "Mozilla/5.0 (Soccer Games Links)" },
            });
            if (!r.ok) return json({ product: null }, r.status === 404 ? 600 : 30);
            return json({ product: parseProductPage(await r.text()) }, 600);
          } catch {
            return json({ product: null }, 30);
          }
        }

        if (!storeId || !token) return json({ mode: "none", configured: false }, 300);
        try {
          const products = await fetchCatalogFromApi(storeId, token);
          if (q.get("status") === "1")
            return json({ mode: "api", configured: true, count: Object.keys(products).length }, 60);
          return json({ mode: "api", products }, 600);
        } catch (e) {
          console.error("[api/loja] Nuvemshop:", e instanceof Error ? e.message : e);
          return json({ mode: "none", configured: true, error: "api" }, 60);
        }
      },
    },
  },
});
