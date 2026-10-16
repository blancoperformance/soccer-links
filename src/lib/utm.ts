export interface UtmContext {
  source?: string;
  medium?: string;
  campaign?: string;
  content: string;
}

const isStoreHost = (host: string) =>
  host === "lojasoccergames.com.br" || host.endsWith(".lojasoccergames.com.br");

/** Adds bio UTMs to lojasoccergames.com.br links only. Never overwrites existing utm_* params. */
export function withUtm(url: string, ctx: UtmContext): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  if (!/^https?:$/.test(parsed.protocol) || !isStoreHost(parsed.hostname)) return url;
  const values: Record<string, string> = {
    utm_source: ctx.source ?? "instagram",
    utm_medium: ctx.medium ?? "bio",
    utm_campaign: ctx.campaign ?? "sempre-ativo",
    utm_content: ctx.content,
  };
  for (const [k, v] of Object.entries(values)) {
    if (!parsed.searchParams.has(k)) parsed.searchParams.set(k, v);
  }
  return parsed.toString();
}
