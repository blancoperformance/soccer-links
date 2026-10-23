import { createFileRoute } from "@tanstack/react-router";
import { fetchLinkSales } from "@/lib/sales";
import { bioCoupon } from "@/features/public/content";

/**
 * Vendas do links para o painel. Só para administradores logados:
 *   GET /api/vendas?from=<ISO>&to=<ISO>   com  Authorization: Bearer <token da sessão do painel>
 * O token do painel é conferido no Supabase (is_admin) antes de qualquer leitura na Nuvemshop.
 */
const env = (k: string) => {
  try {
    return (process.env[k] ?? "").trim();
  } catch {
    return "";
  }
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" },
  });

async function isAdmin(jwt: string): Promise<boolean> {
  const url = env("SUPABASE_URL") || env("VITE_SUPABASE_URL");
  const key = env("SUPABASE_PUBLISHABLE_KEY") || env("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key || !jwt) return false;
  try {
    const r = await fetch(`${url.replace(/\/+$/, "")}/rest/v1/rpc/is_admin`, {
      method: "POST",
      headers: { apikey: key, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!r.ok) return false;
    return (await r.json()) === true;
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/vendas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const jwt = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!(await isAdmin(jwt))) return json({ error: "auth" }, 401);

        const storeId = env("NUVEMSHOP_STORE_ID");
        const token = env("NUVEMSHOP_TOKEN");
        if (!storeId || !token) return json({ error: "token" }, 200);

        const q = new URL(request.url).searchParams;
        const to = new Date(q.get("to") ?? Date.now());
        const from = new Date(q.get("from") ?? to.getTime() - 30 * 864e5);
        if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to)
          return json({ error: "bad request" }, 400);
        // Até 120 dias por consulta, para não estourar o limite da API da loja.
        const min = new Date(Math.max(from.getTime(), to.getTime() - 120 * 864e5));
        try {
          return json(await fetchLinkSales(storeId, token, min, to, bioCoupon));
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (msg === "scope") return json({ error: "scope" });
          console.error("[api/vendas] Nuvemshop:", msg);
          return json({ error: "api" });
        }
      },
    },
  },
});
