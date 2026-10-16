import { createFileRoute } from "@tanstack/react-router";

/**
 * Retorno da instalação do app da Nuvemshop (URL de redirecionamento do app).
 * Troca o código pelo token e mostra o token e o ID da loja uma vez, para colar na Vercel.
 * Precisa de NUVEMSHOP_CLIENT_ID e NUVEMSHOP_CLIENT_SECRET na Vercel. Depois de pegar o token,
 * apague o NUVEMSHOP_CLIENT_SECRET da Vercel e esta página para de funcionar.
 */
const env = (k: string) => {
  try {
    return (process.env[k] ?? "").trim();
  } catch {
    return "";
  }
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const page = (body: string, status = 200) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Nuvemshop</title><body style="font:16px/1.5 system-ui;max-width:640px;margin:40px auto;padding:0 16px">${body}</body>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  );

export const Route = createFileRoute("/api/nuvemshop")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const code = new URL(request.url).searchParams.get("code") ?? "";
        const id = env("NUVEMSHOP_CLIENT_ID");
        const secret = env("NUVEMSHOP_CLIENT_SECRET");
        if (!id || !secret)
          return page("<h1>Desligado</h1><p>Faltam NUVEMSHOP_CLIENT_ID e NUVEMSHOP_CLIENT_SECRET na Vercel.</p>", 404);
        if (!code) return page("<h1>Sem código</h1><p>Instale o app pela Nuvemshop de novo.</p>", 400);
        let data: { access_token?: string; user_id?: number | string; error?: string; error_description?: string } = {};
        try {
          const r = await fetch("https://www.tiendanube.com/apps/authorize/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: "authorization_code", code }),
          });
          data = await r.json();
        } catch {
          return page("<h1>Erro</h1><p>A Nuvemshop não respondeu. Instale o app de novo.</p>", 502);
        }
        if (!data.access_token)
          return page(
            `<h1>Não deu certo</h1><p>${esc(data.error_description ?? data.error ?? "Código expirado ou inválido.")}</p><p>O código vale poucos minutos: instale o app de novo.</p>`,
            400,
          );
        return page(
          `<h1>Pronto</h1><p>Cole na Vercel (Settings &gt; Environment Variables) e depois faça Redeploy:</p>
<p><b>NUVEMSHOP_STORE_ID</b><br><code style="font-size:18px">${esc(String(data.user_id ?? ""))}</code></p>
<p><b>NUVEMSHOP_TOKEN</b><br><code style="word-break:break-all;font-size:18px">${esc(data.access_token)}</code></p>
<p>Depois apague a variável NUVEMSHOP_CLIENT_SECRET da Vercel. Não mande este token por chat.</p>`,
        );
      },
    },
  },
});
