import { useEffect, useState } from "react";
import type { SalesReport } from "@/lib/sales";
import { loadSalesReport, sourceName, type SalesError } from "./data";
import { When } from "./when";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type State =
  | { kind: "loading" }
  | { kind: "ok"; report: SalesReport }
  | { kind: "error"; reason: SalesError };

/**
 * Vendas pagas na Nuvemshop que vieram do links (primeira página com utm_medium=bio, ou cupom
 * BIO1). Lidas pelo servidor (/api/vendas), nunca pelo navegador, para o token da loja não vazar.
 */
export function Sales({ from, to }: { from: Date; to: Date }) {
  const [st, setSt] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    setSt({ kind: "loading" });
    loadSalesReport(from, to).then(
      (report) => alive && setSt({ kind: "ok", report }),
      (e: unknown) => {
        if (!alive) return;
        const m = e instanceof Error ? e.message : "";
        setSt({ kind: "error", reason: (["scope", "token", "auth"].includes(m) ? m : "api") as SalesError });
      },
    );
    return () => {
      alive = false;
    };
  }, [from, to]);

  if (st.kind === "loading") return <p className="text-sm text-neutral-400">Lendo os pedidos da loja...</p>;
  if (st.kind === "error")
    return (
      <p className="text-sm leading-relaxed text-neutral-500">
        {st.reason === "scope"
          ? "O app Soccer Links na Nuvemshop ainda não tem permissão para ler pedidos. No painel de parceiros, marque a permissão de pedidos (leitura), reinstale o app na loja e troque o NUVEMSHOP_TOKEN na Vercel."
          : st.reason === "token"
            ? "O token da Nuvemshop não está configurado na Vercel."
            : st.reason === "auth"
              ? "Sua sessão expirou. Entre de novo no painel."
              : "Não deu para ler os pedidos da loja agora. Tente de novo em alguns minutos."}
      </p>
    );

  const { sales, storeOrders, storeRevenue, truncated } = st.report;
  const total = sales.reduce((a, s) => a + s.total, 0);
  const share = storeRevenue > 0 ? Math.round((total / storeRevenue) * 1000) / 10 : 0;
  const multi = sales.filter((s) => s.items.reduce((a, i) => a + i.qty, 0) > 1).length;
  const bySource = new Map<string, { n: number; v: number }>();
  for (const s of sales) {
    const k = s.via === "cupom" ? "Só pelo cupom" : sourceName(s.source ?? "direto");
    const cur = bySource.get(k) ?? { n: 0, v: 0 };
    bySource.set(k, { n: cur.n + 1, v: cur.v + s.total });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 md:grid-cols-4">
        {[
          { l: "Pedidos pagos", v: sales.length.toLocaleString("pt-BR") },
          { l: "Faturamento", v: brl(total) },
          { l: "Ticket médio", v: sales.length ? brl(total / sales.length) : "–" },
          {
            l: "Fatia da loja",
            v: storeOrders ? `${share.toLocaleString("pt-BR")}%` : "–",
          },
        ].map((k) => (
          <div key={k.l} className="bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">{k.l}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-neutral-950">{k.v}</p>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-neutral-500">
        Só pedidos com pagamento aprovado. Conta como venda do links quando a pessoa entrou na loja
        por um link daqui (utm_medium=bio) ou usou o cupom BIO1.
        {storeOrders > 0 &&
          ` A loja teve ${storeOrders.toLocaleString("pt-BR")} pedidos pagos no período (${brl(storeRevenue)}).`}
        {multi > 0 && ` ${multi} ${multi === 1 ? "pedido levou" : "pedidos levaram"} mais de um jogo.`}
        {truncated && " Muitos pedidos no período: os totais da loja podem estar incompletos, escolha um período menor."}
      </p>

      {sales.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">
          Nenhuma venda paga do links neste período.
        </p>
      ) : (
        <>
          {bySource.size > 0 && (
            <p className="mt-4 text-sm text-neutral-600">
              {[...bySource.entries()]
                .sort((a, b) => b[1].v - a[1].v)
                .map(([k, x]) => `${k}: ${x.n} ${x.n === 1 ? "pedido" : "pedidos"} (${brl(x.v)})`)
                .join(" · ")}
            </p>
          )}
          <ul className="mt-4 divide-y divide-neutral-100">
            {sales.slice(0, 100).map((s) => (
              <li
                key={String(s.number)}
                className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3 text-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">
                    Pedido #{s.number}
                    <span className="ml-2 text-xs font-normal text-neutral-400">
                      <When iso={s.createdAt} time />
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {s.items.map((i) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.name}`).join(", ") ||
                      "Itens não informados"}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {s.via === "cupom"
                      ? "Identificada pelo cupom"
                      : `Origem: ${sourceName(s.source ?? "direto")}`}
                    {s.campaign ? ` · ${s.campaign}` : ""}
                    {s.content ? ` · ${s.content}` : ""}
                    {s.coupon ? ` · cupom ${s.coupon}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-base font-semibold tabular-nums text-neutral-950">
                  {brl(s.total)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
