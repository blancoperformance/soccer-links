/**
 * Black 2026 da Soccer Games, no Grupo VIP (aprovado pelo Geovane):
 * aquecimento do grupo até 18/11, GTA VI chega em 19/11, fim de semana do GTA VI de 20 a 22/11
 * (live na sexta, 20) e Black Friday de 27 a 30/11 (até a Cyber Monday), tudo no mesmo grupo.
 */
export const black = {
  year: 2026,
  /** Link do Grupo VIP no WhatsApp (chat.whatsapp.com/...). Vazio = a página grava o cadastro e avisa que o link sai em breve. */
  groupUrl: "https://chat.whatsapp.com/Fk0DYxKtWbaCGr2ZVCSYPI",
  /** Mostra o total real de inscritos só a partir deste número. */
  socialMin: 150,
  /** Lançamento do GTA VI. */
  launch: "2026-11-19T00:00:00-03:00",
  /** Fim de semana do lançamento do GTA VI, com live na sexta. */
  preStart: "2026-11-20T00:00:00-03:00",
  preEnd: "2026-11-22T23:59:00-03:00",
  liveDay: "sexta, 20 de novembro",
  /** Black Friday, no mesmo grupo, até a Cyber Monday. */
  bigDay: "2026-11-27T00:00:00-03:00",
  bigEnd: "2026-11-30T23:59:00-03:00",
  consentText: "Aceito receber as ofertas da Soccer Games por WhatsApp e e-mail.",
  privacyUrl: "https://lojasoccergames.com.br/central-de-atendimento/",
  /** Trailer oficial do GTA VI no canal da Rockstar (só incorporado, nunca copiado). */
  trailerId: "VQRLujxTm3c",
  /** Foto do Geovane com o mascote (em /public/black/). Vazio = a seção não aparece. */
  ownerPhoto: "",
};

export type Phase = "antes" | "lancamento" | "pre" | "entre" | "black" | "fim";

/** Em que momento da campanha estamos, e para quando a contagem aponta. */
export function phaseAt(now: number): { phase: Phase; target: number | null } {
  const launch = Date.parse(black.launch);
  const pre = Date.parse(black.preStart);
  const preEnd = Date.parse(black.preEnd);
  const big = Date.parse(black.bigDay);
  const end = Date.parse(black.bigEnd);
  if (now < launch) return { phase: "antes", target: launch };
  if (now < pre) return { phase: "lancamento", target: pre };
  if (now <= preEnd) return { phase: "pre", target: big };
  if (now < big) return { phase: "entre", target: big };
  if (now <= end) return { phase: "black", target: end };
  return { phase: "fim", target: null };
}
