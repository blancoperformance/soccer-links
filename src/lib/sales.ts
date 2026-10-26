/**
 * Vendas confirmadas que vieram do links, lidas direto da Nuvemshop (sem script na loja).
 *
 * A Nuvemshop guarda em cada pedido o endereço da primeira página que a pessoa abriu na loja
 * (landing_url) e os cupons usados. Uma venda é do links quando:
 * - a primeira página tem utm_medium=bio ou sg=1 (todo link que sai daqui leva isso), ou
 * - usou o cupom exclusivo do links (BIO1).
 * Nenhum dado pessoal sai daqui: nada de nome, e-mail, telefone, CPF ou endereço.
 */

export interface LinkSale {
  number: number | string;
  createdAt: string;
  total: number;
  coupon: string | null;
  via: "link" | "cupom";
  source: string | null;
  campaign: string | null;
  content: string | null;
  /** Código anônimo da visita que levou à loja (sgs), para cruzar com os contatos. */
  sid: string | null;
  items: { name: string; qty: number; price: number | null }[];
}

export interface SalesReport {
  sales: LinkSale[];
  /** Todos os pedidos pagos da loja no período, para mostrar a fatia do links. */
  storeOrders: number;
  storeRevenue: number;
  /** A leitura parou no limite de páginas: os totais da loja podem estar incompletos. */
  truncated: boolean;
}

export interface ApiOrder {
  id?: number;
  number?: number | string;
  created_at?: string;
  total?: string | number;
  landing_url?: string | null;
  coupon?: { code?: string | null }[] | null;
  payment_status?: string;
  status?: string;
  products?: { name?: string; quantity?: number | string; price?: string | number }[];
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** UTMs da primeira página, incluindo as que estão dentro do redirect_to do link de cupom. */
export function landingParams(landing: string | null | undefined): URLSearchParams | null {
  if (!landing) return null;
  try {
    const u = new URL(landing, "https://lojasoccergames.com.br");
    const out = new URLSearchParams(u.search);
    const inner = u.searchParams.get("redirect_to");
    if (inner) {
      const iu = new URL(inner, "https://lojasoccergames.com.br");
      iu.searchParams.forEach((v, k) => {
        if (!out.has(k)) out.set(k, v);
      });
    }
    return out;
  } catch {
    return null;
  }
}

export function toLinkSale(o: ApiOrder, bioCoupon: string): LinkSale | null {
  const p = landingParams(o.landing_url);
  const fromLink = !!p && (p.get("utm_medium") === "bio" || p.get("sg") === "1");
  const codes = (o.coupon ?? []).map((c) => (c?.code ?? "").trim()).filter(Boolean);
  const usedBio = codes.some((c) => c.toUpperCase() === bioCoupon.toUpperCase());
  if (!fromLink && !usedBio) return null;
  const cut = (v: string | null | undefined, n: number) => (v ? v.slice(0, n) : null);
  return {
    number: o.number ?? o.id ?? "",
    createdAt: o.created_at ?? "",
    total: num(o.total),
    coupon: codes[0] ? codes[0].slice(0, 40) : null,
    via: fromLink ? "link" : "cupom",
    source: fromLink ? cut(p?.get("utm_source"), 60) : null,
    campaign: fromLink ? cut(p?.get("utm_campaign"), 80) : null,
    content: fromLink ? cut(p?.get("utm_content"), 120) : null,
    sid: cut(p?.get("sgs"), 64),
    items: (o.products ?? []).slice(0, 20).map((it) => ({
      name: String(it.name ?? "").slice(0, 140),
      qty: Math.max(1, Math.round(num(it.quantity)) || 1),
      price: it.price == null ? null : num(it.price),
    })),
  };
}

const MAX_PAGES = 15;

export async function fetchLinkSales(
  storeId: string,
  token: string,
  from: Date,
  to: Date,
  bioCoupon: string,
  fetcher: typeof fetch = fetch,
): Promise<SalesReport> {
  const sales: LinkSale[] = [];
  let storeOrders = 0;
  let storeRevenue = 0;
  let truncated = false;
  for (let page = 1; page <= MAX_PAGES; page++) {
    const q = new URLSearchParams({
      payment_status: "paid",
      created_at_min: from.toISOString(),
      created_at_max: to.toISOString(),
      per_page: "200",
      page: String(page),
      fields: "id,number,created_at,total,landing_url,coupon,payment_status,status,products",
    });
    const r = await fetcher(
      `https://api.nuvemshop.com.br/v1/${encodeURIComponent(storeId)}/orders?${q.toString()}`,
      {
        headers: {
          Authentication: `bearer ${token}`,
          "User-Agent": "Soccer Games Links (links.lojasoccergames.com.br)",
          Accept: "application/json",
        },
      },
    );
    if (r.status === 404) break; // sem pedidos, ou passou da última página
    // 401 = token inválido ou de outra loja; 403 = token certo, mas sem a permissão de ler pedidos.
    if (r.status === 401) throw new Error("invalid");
    if (r.status === 403) throw new Error("scope");
    if (!r.ok) throw new Error(`api ${r.status}`);
    const list = (await r.json()) as ApiOrder[];
    for (const o of list) {
      if (o.status === "cancelled") continue;
      storeOrders++;
      storeRevenue += num(o.total);
      const s = toLinkSale(o, bioCoupon);
      if (s) sales.push(s);
    }
    if (list.length < 200) break;
    if (page === MAX_PAGES) truncated = true;
  }
  sales.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return { sales, storeOrders, storeRevenue, truncated };
}
