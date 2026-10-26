/**
 * Plano da Black 2026 da Soccer Games: fases, datas, mensagens do Grupo VIP e planilha.
 * Só funções puras, para dar para testar sem banco.
 *
 * Fases combinadas com o Geovane: aquecimento do Grupo VIP do fim de outubro até 18/11,
 * lançamento do GTA VI em 19/11, pré-Black do GTA VI de 20 a 22/11 (live na sexta 20/11),
 * reta final de 23 a 26/11, Black Friday de 27 a 29/11 e Cyber Monday em 30/11.
 */

export interface Oferta {
  id: number;
  data: string;
  hora: string | null;
  produto: string | null;
  slug: string | null;
  plataforma: string | null;
  licencas: string | null;
  preco_de: number | null;
  preco_por: number | null;
  link: string | null;
  resp: string | null;
  obs: string | null;
  ok_pagina: boolean;
  ok_arte: boolean;
  ok_envio: boolean;
  msg_custom: string | null;
  atualizado_por?: string | null;
  atualizado_em?: string | null;
}

export const D0 = "2026-10-26";
export const D1 = "2026-11-30";
export const FRI = "2026-11-27";
/** Desconto acima disso pede conferência antes de publicar. */
export const MAXD = 70;
export const TZ = "America/Sao_Paulo";
const MS = 86400000;

export interface Fase {
  k: "aquece" | "gta" | "pre" | "reta" | "black" | "cyber";
  n: string;
  a: string;
  b: string;
  /** Cor da fase (token do painel). */
  c: string;
  t: string;
}

export const PH: Fase[] = [
  {
    k: "aquece",
    n: "Aquecimento VIP",
    a: D0,
    b: "2026-11-18",
    c: "#8a5cf6",
    t: "Ofertas da semana liberadas primeiro no Grupo VIP",
  },
  {
    k: "gta",
    n: "Lançamento GTA VI",
    a: "2026-11-19",
    b: "2026-11-19",
    c: "#ff2d87",
    t: "Dia do lançamento do GTA VI",
  },
  {
    k: "pre",
    n: "Pré-Black GTA VI",
    a: "2026-11-20",
    b: "2026-11-22",
    c: "#e5194f",
    t: "Preços baixados na loja toda, live na sexta 20/11",
  },
  {
    k: "reta",
    n: "Reta final",
    a: "2026-11-23",
    b: "2026-11-26",
    c: "#d99000",
    t: "Esquenta para o dia 27, sempre no grupo antes",
  },
  {
    k: "black",
    n: "Black Friday",
    a: FRI,
    b: "2026-11-29",
    c: "#6b6480",
    t: "O grande dia, com o fim de semana",
  },
  { k: "cyber", n: "Cyber Monday", a: D1, b: D1, c: "#127a4a", t: "Fecha a campanha" },
];

const HEAD: Record<Fase["k"], string> = {
  aquece: "OFERTA DA SEMANA, PRIMEIRO NO GRUPO VIP",
  gta: "GTA VI CHEGOU, OFERTA DO GRUPO VIP",
  pre: "PRÉ-BLACK GTA VI, LIBERADO NO GRUPO VIP",
  reta: "ESQUENTA BLACK, LIBERADO NO GRUPO VIP",
  black: "BLACK FRIDAY SOCCER, LIBERADO NO GRUPO VIP",
  cyber: "CYBER MONDAY SOCCER, LIBERADO NO GRUPO VIP",
};

export const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
export const addDays = (i: string, n: number) =>
  new Date(Date.parse(`${i}T12:00:00Z`) + n * MS).toISOString().slice(0, 10);
export const dow = (i: string) => new Date(`${i}T12:00:00Z`).getUTCDay();
export const diff = (a: string, b: string) =>
  Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / MS);
export const fmtD = (i: string) => `${i.slice(8, 10)}/${i.slice(5, 7)}`;
export const phOf = (d: string) => PH.find((p) => d >= p.a && d <= p.b);
export const spDate = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(now);
export const brl = (n: number) =>
  `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
export const numv = (v: string | null | undefined) =>
  v === "" || v == null || Number.isNaN(Number(v)) ? null : Number(v);
export const pctOff = (de: number | null | undefined, por: number | null | undefined) =>
  de != null && por != null && de > 0 && por > 0 && por < de
    ? Math.round((1 - por / de) * 100)
    : null;
export const hora = (h: string | null | undefined) => (h ?? "").slice(0, 5);
export const steps = (o: Oferta) =>
  (o.ok_pagina ? 1 : 0) + (o.ok_arte ? 1 : 0) + (o.ok_envio ? 1 : 0);
export const hasPrice = (o: Oferta) => Number(o.preco_por ?? 0) > 0;

/** Pix: a loja dá o desconto em cima do "por". Sem % configurado, o "por" já é o valor final. */
export const precoPix = (por: number | null | undefined, pix?: number | null) =>
  Number(por ?? 0) > 0 && pix && pix > 0
    ? Math.round(Number(por) * (1 - pix / 100) * 100) / 100
    : Number(por ?? 0);

/** Link do grupo: leva a origem (grupo VIP) para aparecer nos relatórios da loja. */
export const linkDoGrupo = (link: string | null | undefined) => {
  const l = (link ?? "").trim();
  if (!/^https?:\/\//.test(l)) return "";
  try {
    const u = new URL(l);
    u.searchParams.set("utm_source", "whatsapp");
    u.searchParams.set("utm_medium", "grupo-vip");
    u.searchParams.set("utm_campaign", "black2026");
    return u.toString();
  } catch {
    return l;
  }
};

const nomeDe = (o: Oferta) =>
  (o.produto || "Nome do jogo").replace(/\s+(para|pra)\s+ps[45](\s*e\s*ps[45])?\s*$/i, "") +
  (o.plataforma ? ` para ${o.plataforma}` : "");
const precoLinha = (o: Oferta, pix?: number | null) => {
  const f = precoPix(o.preco_por, pix);
  if (f <= 0) return null;
  return Number(o.preco_de ?? 0) > f
    ? `De ~${brl(Number(o.preco_de))}~ por *${brl(f)}*${pix ? " no Pix" : ""}`
    : `Por *${brl(f)}*${pix ? " no Pix" : ""}`;
};
const linkLinha = (o: Oferta) => {
  const l = linkDoGrupo(o.link);
  return l ? `🎮 ${l}` : "🎮 [colar o link do jogo]";
};
const rodape = "_Valor exclusivo do Grupo VIP_";

/** Mensagem de liberação (a que fica salva na oferta e pode ser editada). */
export function genMsg(o: Oferta, pix?: number | null): string {
  const p = phOf(o.data);
  const dsc = pctOff(o.preco_de, precoPix(o.preco_por, pix));
  const L = [`> 🚨 ${HEAD[p ? p.k : "aquece"]}`, ""];
  L.push(`*${nomeDe(o)}*` + (dsc ? ` com *${dsc}% OFF*` : ""));
  const pl = precoLinha(o, pix);
  if (pl) L.push(pl);
  if (o.licencas?.trim()) L.push("", `Licença: ${o.licencas.trim()}`);
  L.push("", "Chega no seu e-mail e a gente ajuda a instalar", "", linkLinha(o), "", rodape);
  return L.join("\n");
}
export const msgOf = (o: Oferta, pix?: number | null) => o.msg_custom || genMsg(o, pix);

export interface PassoMsg {
  k: "alerta" | "liberacao" | "lembrete" | "ultima";
  nome: string;
  quando: string;
  arte: string;
  texto: string;
}
const hm = (h: string) => {
  const [a, b] = h.split(":").map(Number);
  return (a ?? 0) * 60 + (b ?? 0);
};
const fmtHm = (m: number) => {
  const x = Math.min(23 * 60 + 30, Math.max(8 * 60, Math.round(m / 5) * 5));
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
};

/** A sequência do dia de uma oferta no grupo, cada mensagem pronta para copiar. */
export function genSequencia(o: Oferta, pix?: number | null): PassoMsg[] {
  const h = hm(hora(o.hora) || "12:00");
  const nome = nomeDe(o);
  const mkt = [precoLinha(o, pix), "", linkLinha(o)].filter((x) => x !== null) as string[];
  const fase = phOf(o.data);
  const primeiro = fase && o.data === fase.a;
  const tLembrete = fmtHm(h + 180);
  const tUltima = fmtHm(Math.max(21 * 60, hm(tLembrete) + 90));
  const alerta =
    fase?.k === "pre" && primeiro
      ? [
          "> 🚨 COMEÇOU A PRÉ-BLACK DO GTA VI",
          "",
          "*Preços baixados na loja toda, e o grupo vê primeiro*",
          "",
          "Hoje tem live. Fica de olho aqui",
        ]
      : fase?.k === "black" && primeiro
        ? [
            "> 🚨 COMEÇOU A BLACK FRIDAY SOCCER",
            "",
            "*As ofertas saem aqui no grupo antes de qualquer lugar*",
            "",
            "Fica de olho",
          ]
        : [
            "> 🚨 ALERTA GRUPO VIP",
            "",
            "Em instantes sai uma oferta exclusiva para o grupo",
            "",
            "Fica de olho aqui",
          ];
  return (
    [
      {
        k: "alerta",
        nome: "Alerta",
        quando: fmtHm(h),
        arte: "Arte de alerta da campanha",
        texto: alerta.join("\n"),
      },
      {
        k: "liberacao",
        nome: "Liberação",
        quando: fmtHm(h + 30),
        arte: "Arte do jogo com o preço",
        texto: msgOf(o, pix),
      },
      {
        k: "lembrete",
        nome: "Lembrete",
        quando: tLembrete,
        arte: "Arte do jogo com o preço",
        texto: ["> 👀 AINDA DÁ TEMPO", "", `${nome} segue no valor do grupo`, ...mkt].join("\n"),
      },
      {
        k: "ultima",
        nome: "Última chamada",
        quando: tUltima,
        arte: "Arte do jogo com o preço",
        texto: [
          "> ⏰ ÚLTIMA CHAMADA",
          "",
          `${nome} no valor do grupo só até 23h59`,
          ...mkt,
          "",
          rodape,
        ].join("\n"),
      },
    ] as PassoMsg[]
  ).map((x) => ({ ...x, texto: x.texto.replace(/\n{3,}/g, "\n\n") }));
}

/** Data, depois hora, depois id. */
export const sortOfertas = (rows: Oferta[]) =>
  rows
    .slice()
    .sort((a, b) =>
      `${a.data}${a.hora || ""}${String(a.id).padStart(9, "0")}`.localeCompare(
        `${b.data}${b.hora || ""}${String(b.id).padStart(9, "0")}`,
      ),
    );

export type Cell = { d: string; inRange: boolean };
/** Grade começando na segunda: da segunda antes de D0 ao domingo depois de D1. */
export function calendarCells(): Cell[] {
  const out: Cell[] = [];
  let d = addDays(D0, -((dow(D0) + 6) % 7));
  const end = addDays(D1, (7 - dow(D1)) % 7);
  while (d <= end) {
    out.push({ d, inRange: d >= D0 && d <= D1 });
    d = addDays(d, 1);
  }
  return out;
}

export const OFERTAS_CSV_HEAD =
  "Data;Fase;Hora;Jogo;Plataforma;Licença;De;Por;Desconto %;Link;Responsável;Página;Arte;Enviado";
export function ofertasCsv(rows: Oferta[]): string {
  const q = (v: unknown) => {
    const s = String(v == null ? "" : v);
    return /[";,\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((o) =>
    [
      fmtD(o.data),
      phOf(o.data)?.n,
      hora(o.hora),
      o.produto,
      o.plataforma,
      o.licencas,
      o.preco_de,
      o.preco_por,
      pctOff(o.preco_de, o.preco_por),
      o.link,
      o.resp,
      o.ok_pagina ? "sim" : "não",
      o.ok_arte ? "sim" : "não",
      o.ok_envio ? "sim" : "não",
    ]
      .map(q)
      .join(";"),
  );
  return "﻿" + [OFERTAS_CSV_HEAD, ...lines].join("\r\n");
}

/** Campos numéricos vazios vão para o banco como null. */
export const NUM_KEYS = ["preco_de", "preco_por"] as const;
export function buildPatch(draft: Oferta, keys: string[]): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const d = draft as unknown as Record<string, unknown>;
  for (const k of keys) {
    const v = d[k];
    patch[k] =
      v === undefined || (v === "" && (NUM_KEYS as readonly string[]).includes(k))
        ? null
        : v === "" && k === "hora"
          ? null
          : v;
  }
  return patch;
}

export const FLOW: [string, string][] = [
  [
    "Escolher o jogo",
    "Um jogo por oferta. Escolha pelo nome na ficha: o link e a plataforma vêm da loja.",
  ],
  [
    "Definir o preço",
    `O preço é baixado direto no produto, sem cupom. Desconto acima de ${MAXD}% pede conferência. O Pix entra por cima, se estiver configurado.`,
  ],
  [
    "Deixar o jogo pronto na loja",
    "Preço novo salvo, licenças conferidas, página aberta em janela anônima antes de liberar.",
  ],
  [
    "Arte e mensagem",
    "A ficha monta a mensagem com preço, licença e link do grupo (com a origem do Grupo VIP). Dá para editar.",
  ],
  [
    "Liberar no grupo",
    'No horário da ficha: alerta, liberação, lembrete e última chamada. Marque "enviada" na ficha.',
  ],
  [
    "Acompanhar",
    "Ver as vendas do dia na loja e decidir a próxima oferta. Nada de urgência falsa: só o que é verdade.",
  ],
];
