import { useEffect, useState } from "react";
import { Coins, PieChart, Receipt, Wallet } from "lucide-react";
import type { SalesReport } from "@/lib/sales";
import { loadSalesReport, sourceName, type SalesError } from "./data";
import { When } from "./when";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type State =
  { kind: "loading" } | { kind: "ok"; report: SalesReport } | { kind: "error"; reason: SalesError };

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
        setSt({
          kind: "error",
          reason: (["scope", "invalid", "token", "auth"].includes(m) ? m : "api") as SalesError,
        });
      },
    );
    return () => {
      alive = false;
    };
  }, [from, to]);

  if (st.kind === "loading")
    return (
      <div className="sg-skel" style={{ height: 180 }} aria-label="Lendo os pedidos da loja" />
    );
  if (st.kind === "error")
    return (
      <p
        className={`sg-inset ${st.reason === "scope" ? "" : "sg-inset--bad"}`}
        style={{ margin: 0 }}
      >
        {st.reason === "scope"
          ? "O app Soccer Links na Nuvemshop ainda não tem permissão para ler pedidos. No painel de parceiros, marque a permissão de pedidos (leitura), reinstale o app na loja e troque o NUVEMSHOP_TOKEN na Vercel."
          : st.reason === "invalid"
            ? 'A Nuvemshop recusou o token: ele não vale ou é de outra loja. Confira se o NUVEMSHOP_TOKEN e o NUVEMSHOP_STORE_ID na Vercel são os da página "Pronto" e faça Redeploy.'
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
    <div className="sg-stack" style={{ gap: 16 }}>
      <div className="sg-sales">
        {[
          { l: "Pedidos pagos", v: sales.length.toLocaleString("pt-BR"), icon: Receipt },
          { l: "Faturamento", v: brl(total), icon: Wallet, accent: true },
          { l: "Ticket médio", v: sales.length ? brl(total / sales.length) : "–", icon: Coins },
          {
            l: "Fatia da loja",
            v: storeOrders ? `${share.toLocaleString("pt-BR")}%` : "–",
            icon: PieChart,
          },
        ].map((k) => (
          <div key={k.l} className={`sg-sales__k ${k.accent ? "is-accent" : ""}`}>
            <span className="sg-sales__l">
              <k.icon aria-hidden /> {k.l}
            </span>
            <span className="sg-sales__v">{k.v}</span>
          </div>
        ))}
      </div>

      <p className="sg-card__hint" style={{ margin: 0 }}>
        Só pedidos com pagamento aprovado. Conta como venda do links quando a pessoa entrou na loja
        por um link daqui (<span className="sg-mono">utm_medium=bio</span>) ou usou o cupom BIO1.
        {storeOrders > 0 &&
          ` A loja teve ${storeOrders.toLocaleString("pt-BR")} pedidos pagos no período (${brl(storeRevenue)}).`}
        {multi > 0 &&
          ` ${multi} ${multi === 1 ? "pedido levou" : "pedidos levaram"} mais de um jogo.`}
        {truncated &&
          " Muitos pedidos no período: os totais da loja podem estar incompletos, escolha um período menor."}
      </p>

      {sales.length === 0 ? (
        <p className="sg-empty">
          <strong>Nenhuma venda paga do links neste período</strong>
          As vendas aparecem aqui assim que alguém que veio da bio paga o pedido.
        </p>
      ) : (
        <>
          {bySource.size > 0 && (
            <div className="sg-chips">
              {[...bySource.entries()]
                .sort((a, b) => b[1].v - a[1].v)
                .map(([k, x]) => (
                  <span key={k} className="sg-chip">
                    <b style={{ color: "var(--sg-ink)", fontWeight: 600 }}>{k}</b> {x.n}{" "}
                    {x.n === 1 ? "pedido" : "pedidos"} · {brl(x.v)}
                  </span>
                ))}
            </div>
          )}
          <ul className="sg-orders">
            {sales.slice(0, 100).map((s) => (
              <li key={String(s.number)}>
                <span className="sg-orders__n sg-mono">#{s.number}</span>
                <div className="sg-orders__main">
                  <p className="sg-orders__items">
                    {s.items.map((i) => `${i.qty > 1 ? `${i.qty}x ` : ""}${i.name}`).join(", ") ||
                      "Itens não informados"}
                  </p>
                  <p className="sg-orders__meta">
                    <When iso={s.createdAt} time />
                    {" · "}
                    {s.via === "cupom"
                      ? "identificada pelo cupom"
                      : sourceName(s.source ?? "direto")}
                    {s.campaign ? ` · ${s.campaign}` : ""}
                    {s.coupon ? ` · cupom ${s.coupon}` : ""}
                  </p>
                </div>
                <span className="sg-orders__v">{brl(s.total)}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
