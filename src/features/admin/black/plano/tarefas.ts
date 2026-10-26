import { sb } from "./data";

/** Um card do quadro do time (tabela public.black_tarefas). */
export interface Tarefa {
  id: number;
  titulo: string;
  tipo: Tipo;
  status: Status;
  prioridade: Prioridade;
  resp: string;
  prazo: string | null;
  oferta_id: string | null;
  obs: string;
  ordem: number;
  criado_por: string | null;
  atualizado_por: string | null;
  atualizado_em: string;
}
export type Status = "fazer" | "andamento" | "revisao" | "pronto";
export type Tipo =
  "arte" | "video" | "mensagem" | "pagina" | "banner" | "post" | "live" | "anuncio" | "outro";
export type Prioridade = "urgente" | "alta" | "normal" | "baixa";

export const COLUNAS: { k: Status; n: string; tone: "muted" | "brand" | "warn" | "ok" }[] = [
  { k: "fazer", n: "A fazer", tone: "muted" },
  { k: "andamento", n: "Em produção", tone: "brand" },
  { k: "revisao", n: "Em revisão", tone: "warn" },
  { k: "pronto", n: "Pronto", tone: "ok" },
];
export const TIPOS: { k: Tipo; n: string }[] = [
  { k: "arte", n: "Arte" },
  { k: "video", n: "Vídeo" },
  { k: "mensagem", n: "Mensagem do grupo" },
  { k: "pagina", n: "Preço e página na loja" },
  { k: "banner", n: "Banner do site" },
  { k: "post", n: "Post / Story" },
  { k: "live", n: "Live" },
  { k: "anuncio", n: "Anúncio" },
  { k: "outro", n: "Outro" },
];
export const PRIORIDADES: { k: Prioridade; n: string; tone: "bad" | "warn" | "muted" | "ok" }[] = [
  { k: "urgente", n: "Urgente", tone: "bad" },
  { k: "alta", n: "Alta", tone: "warn" },
  { k: "normal", n: "Normal", tone: "muted" },
  { k: "baixa", n: "Baixa", tone: "ok" },
];
export const tipoNome = (k: Tipo) => TIPOS.find((t) => t.k === k)?.n ?? "Outro";
export const pesoPrio = (p: Prioridade | undefined) =>
  ({ urgente: 0, alta: 1, normal: 2, baixa: 3 })[p ?? "normal"];

export type LoadResult = { ok: true; rows: Tarefa[] } | { ok: false; missing: boolean };
export async function loadTarefas(): Promise<LoadResult> {
  const r = await sb.from("black_tarefas").select("*").order("ordem");
  if (r.error) {
    const code = (r.error as { code?: string }).code ?? "";
    return { ok: false, missing: code === "42P01" || code === "PGRST205" };
  }
  return { ok: true, rows: (r.data ?? []) as Tarefa[] };
}
export async function criarTarefas(rows: Partial<Tarefa>[]): Promise<Tarefa[] | null> {
  const r = await sb.from("black_tarefas").insert(rows).select();
  return r.error ? null : ((r.data ?? []) as Tarefa[]);
}
export async function salvarTarefa(id: number, patch: Partial<Tarefa>) {
  const r = await sb.from("black_tarefas").update(patch).eq("id", id);
  return !r.error;
}
export async function excluirTarefa(id: number) {
  const r = await sb.from("black_tarefas").delete().eq("id", id);
  return !r.error;
}

/** Os cards que toda oferta precisa, ligados a ela. */
export const cardsDaOferta = (o: {
  id: number;
  produto: string | null;
  resp: string | null;
  data: string;
}): Partial<Tarefa>[] => {
  const nome = o.produto || "Oferta";
  return (
    [
      { titulo: `Arte do jogo com o preço: ${nome}`, tipo: "arte" },
      { titulo: `Baixar o preço e conferir a página na loja: ${nome}`, tipo: "pagina" },
      {
        titulo: `Mensagens do dia no grupo (alerta, liberação, lembrete, última chamada): ${nome}`,
        tipo: "mensagem",
      },
    ] as { titulo: string; tipo: Tipo }[]
  ).map((c, i) => ({
    ...c,
    status: "fazer" as Status,
    prioridade: "normal" as Prioridade,
    resp: o.resp ?? "",
    prazo: o.data,
    oferta_id: String(o.id),
    ordem: Date.now() / 1000 + i / 100,
  }));
};

/** Atrasada = tem prazo antes de hoje e não está pronta. */
export const atrasada = (t: Tarefa, hoje: string) =>
  t.status !== "pronto" && Boolean(t.prazo) && (t.prazo as string) < hoje;
