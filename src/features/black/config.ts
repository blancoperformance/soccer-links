/**
 * Black November Soccer Games: o que muda de um ano para o outro fica aqui.
 * Datas no horário de Brasília (-03:00). Só fato combinado com o Geovane.
 */
export const black = {
  year: 2026,
  /** Link do Grupo VIP no WhatsApp (chat.whatsapp.com/...). Vazio = a página grava o cadastro e avisa que o link sai em breve. */
  groupUrl: "https://chat.whatsapp.com/Fk0DYxKtWbaCGr2ZVCSYPI",
  /** Mostra o total real de inscritos só a partir deste número. */
  socialMin: 150,
  /** Pré-Black: fim de semana de lançamento do GTA VI, com live na sexta. */
  preStart: "2026-11-20T00:00:00-03:00",
  preEnd: "2026-11-22T23:59:00-03:00",
  liveDay: "sexta, 20 de novembro",
  /** Black Friday, no mesmo grupo. */
  bigDay: "2026-11-27T00:00:00-03:00",
  bigEnd: "2026-11-27T23:59:00-03:00",
  consentText: "Aceito receber as ofertas da Soccer Games por WhatsApp e e-mail.",
  privacyUrl: "https://lojasoccergames.com.br/central-de-atendimento/",
};

export type Phase = "antes" | "pre" | "entre" | "black" | "fim";

/** Em que momento da campanha estamos, e para quando a contagem aponta. */
export function phaseAt(now: number): { phase: Phase; target: number | null } {
  const pre = Date.parse(black.preStart);
  const preEnd = Date.parse(black.preEnd);
  const big = Date.parse(black.bigDay);
  const end = Date.parse(black.bigEnd);
  if (now < pre) return { phase: "antes", target: pre };
  if (now <= preEnd) return { phase: "pre", target: big };
  if (now < big) return { phase: "entre", target: big };
  if (now <= end) return { phase: "black", target: end };
  return { phase: "fim", target: null };
}
