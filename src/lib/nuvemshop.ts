/**
 * Leitura dos dados da loja Nuvemshop, no servidor.
 *
 * 1. API oficial (quando há token): catálogo inteiro em poucas chamadas.
 *    Variáveis na Vercel: NUVEMSHOP_STORE_ID e NUVEMSHOP_TOKEN (permissão só de leitura de produtos).
 * 2. Página do produto (sem token): lê a foto (og:image e galeria) e o JSON de variações
 *    (data-variants) que o tema da loja coloca na página.
 */
import type { LiveGame, LiveVariant } from "@/features/public/store";

const fold = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export const licenseKey = (label: string) => {
  const f = fold(label);
  if (f.startsWith("prim")) return "primaria";
  if (f.startsWith("secund")) return "secundaria";
  return f.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "unica";
};

const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
};

const pick = (v: unknown): string => {
  if (typeof v === "string") return v;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return String(o["pt"] ?? o["es"] ?? Object.values(o)[0] ?? "");
  }
  return "";
};

/* ---------- 1. API oficial ---------- */

interface ApiVariant {
  id: number;
  price?: string | null;
  promotional_price?: string | null;
  stock_management?: boolean;
  stock?: number | null;
  values?: unknown[];
}
interface ApiProduct {
  id: number;
  handle?: unknown;
  published?: boolean;
  images?: { src?: string; position?: number }[];
  variants?: ApiVariant[];
}

export function fromApiProduct(p: ApiProduct): [string, LiveGame] | null {
  const handle = pick(p.handle);
  if (!handle) return null;
  const variants: LiveVariant[] = (p.variants ?? []).map((v) => {
    const label = pick(v.values?.[0]) || "Única";
    const price = num(v.price);
    const promo = num(v.promotional_price);
    const final = promo && price && promo < price ? promo : (price ?? promo);
    const available = !(v.stock_management && (v.stock ?? 0) <= 0) && v.stock !== 0;
    return {
      id: v.id,
      key: licenseKey(label),
      label: label.charAt(0) + label.slice(1).toLowerCase(),
      value: label,
      price: final,
      from: promo && price && promo < price ? price : null,
      available,
    };
  });
  const images = [...(p.images ?? [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .map((i) => (i.src ?? "").replace(/^\/\//, "https://"))
    .filter(Boolean);
  return [handle, { id: p.id, images, variants }];
}

export async function fetchCatalogFromApi(
  storeId: string,
  token: string,
  fetcher: typeof fetch = fetch,
): Promise<Record<string, LiveGame>> {
  const out: Record<string, LiveGame> = {};
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.nuvemshop.com.br/v1/${encodeURIComponent(storeId)}/products?per_page=200&page=${page}&published=true&fields=id,handle,published,images,variants`;
    const r = await fetcher(url, {
      headers: {
        Authentication: `bearer ${token}`,
        "User-Agent": "Soccer Games Links (links.lojasoccergames.com.br)",
        Accept: "application/json",
      },
    });
    if (r.status === 404 && page > 1) break; // passou da última página
    if (!r.ok) throw new Error(`api ${r.status}`);
    const list = (await r.json()) as ApiProduct[];
    for (const p of list) {
      if (p.published === false) continue;
      const row = fromApiProduct(p);
      if (row) out[row[0]] = row[1];
    }
    if (list.length < 200) break;
  }
  return out;
}

/* ---------- 2. Página do produto ---------- */

const decode = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x2F;|&#47;/g, "/")
    .replace(/&amp;/g, "&");

interface PageVariant {
  id?: number;
  variant_id?: number;
  option0?: string | null;
  price_number?: number | null;
  compare_at_price_number?: number | null;
  price_short?: string;
  available?: boolean;
  stock?: number | null;
}

/** Lê fotos e licenças do HTML da página do produto. */
export function parseProductPage(html: string): LiveGame | null {
  let variants: LiveVariant[] = [];
  const m = /data-variants=(["'])([\s\S]*?)\1/.exec(html);
  if (m) {
    try {
      const list = JSON.parse(decode(m[2]!)) as PageVariant[];
      variants = list
        .map((v) => {
          const id = Number(v.id ?? v.variant_id);
          const label = String(v.option0 ?? "Única");
          const price = num(v.price_number) ?? num((v.price_short ?? "").replace(/[^\d,]/g, ""));
          const from = num(v.compare_at_price_number);
          return {
            id,
            key: licenseKey(label),
            label: label.charAt(0) + label.slice(1).toLowerCase(),
            value: label,
            price,
            from: from && price && from > price ? from : null,
            available: v.available !== false && v.stock !== 0,
          };
        })
        .filter((v) => Number.isFinite(v.id) && v.id > 0);
    } catch {
      variants = [];
    }
  }
  const pid =
    /data-product-id=["'](\d+)["']/.exec(html)?.[1] ??
    /"product_id"\s*:\s*(\d+)/.exec(decode(html))?.[1];
  const og =
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i.exec(
      html,
    )?.[1];
  const gallery = Array.from(
    html.matchAll(
      /(?:https?:)?\/\/[a-z0-9.-]*mitiendanube\.com\/stores\/[^"'\s)]+?\/products\/[^"'\s)]+?-(?:1024|2048|1920)-(?:1024|0)\.(?:webp|jpe?g|png)/gi,
    ),
  ).map((x) => x[0].replace(/^\/\//, "https://"));
  const images: string[] = [];
  const seen = new Set<string>();
  for (const src of [og, ...gallery]) {
    if (!src) continue;
    const key = src.replace(/-\d+-\d+\.(webp|jpe?g|png).*$/i, "");
    if (seen.has(key)) continue;
    seen.add(key);
    images.push(src.startsWith("//") ? `https:${src}` : src);
  }
  if (!variants.length && !images.length) return null;
  return { id: pid ? Number(pid) : null, images: images.slice(0, 8), variants };
}
