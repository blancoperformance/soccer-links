import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Oferta } from "./logic";

/** As tabelas do plano não estão nos tipos gerados do banco: cliente sem tipos só aqui. */
export const sb = supabase as unknown as SupabaseClient;
export const SQL_PLANO = "supabase/migrations/20261026100000_soccer_black_plano.sql";

export type Papel = "editor" | "leitor" | null;
export interface Acesso {
  papel: Papel;
  dono: boolean;
  vip: boolean;
  links: boolean;
  /** As funções do plano ainda não existem no banco (SQL não rodado). */
  semSql: boolean;
}

const missing = (e: { code?: string } | null) =>
  !!e && ["PGRST202", "42883", "PGRST205", "42P01"].includes(e.code ?? "");

export async function loadAcesso(): Promise<Acesso> {
  const [p, d, v, l] = await Promise.all([
    Promise.resolve(sb.rpc("black_papel")).catch(() => ({ data: null, error: { code: "x" } })),
    Promise.resolve(sb.rpc("painel_eh_dono")).catch(() => ({ data: null, error: { code: "x" } })),
    Promise.resolve(sb.rpc("black_vip_is_admin")).catch(() => ({
      data: null,
      error: { code: "x" },
    })),
    Promise.resolve(sb.rpc("is_admin")).catch(() => ({ data: null, error: { code: "x" } })),
  ]);
  const papel = !p.error && (p.data === "editor" || p.data === "leitor") ? (p.data as Papel) : null;
  return {
    papel,
    dono: !d.error && d.data === true,
    vip: !v.error && v.data === true,
    links: !l.error && l.data === true,
    semSql: missing(p.error as { code?: string } | null),
  };
}

export async function loadOfertas(): Promise<Oferta[] | null> {
  const r = await sb.from("black_ofertas").select("*").order("data").order("hora");
  if (r.error) return null;
  return ((r.data ?? []) as Oferta[]).map((o) => ({
    ...o,
    preco_de: o.preco_de == null ? null : Number(o.preco_de),
    preco_por: o.preco_por == null ? null : Number(o.preco_por),
  }));
}

export async function loadPix(): Promise<number | null> {
  const r = await sb.from("black_config").select("valor").eq("chave", "pix_pct").maybeSingle();
  const v = Number((r.data as { valor?: unknown } | null)?.valor);
  return v > 0 ? v : null;
}
export async function savePix(v: number | null) {
  const r = await sb.from("black_config").upsert({ chave: "pix_pct", valor: v });
  return !r.error;
}
export async function criarOferta(data: string): Promise<Oferta | null> {
  const r = await sb.from("black_ofertas").insert({ data, hora: "10:00" }).select().single();
  return r.error ? null : (r.data as Oferta);
}
export async function salvarOferta(id: number, patch: Record<string, unknown>) {
  const r = await sb.from("black_ofertas").update(patch).eq("id", id);
  return !r.error;
}
export async function excluirOferta(id: number) {
  const r = await sb.from("black_ofertas").delete().eq("id", id);
  return !r.error;
}

/** Atualiza sozinho quando alguém mexe na tabela. Devolve a função que desliga. */
export function aoVivo(tabela: "black_ofertas" | "black_tarefas", fn: () => void) {
  const ch = sb
    .channel(`sg-${tabela}`)
    .on("postgres_changes", { event: "*", schema: "public", table: tabela }, fn)
    .subscribe();
  return () => void sb.removeChannel(ch);
}
