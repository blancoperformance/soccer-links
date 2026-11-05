/**
 * Mensagens do Grupo VIP de novembro, prontas para copiar: a mensagem, a ideia da foto e o prompt
 * da imagem (o Geovane cola no ChatGPT junto com a capa do jogo, baixada da página do produto).
 * Quem atualiza: a Blanco, toda quinta, com a lista da semana seguinte (é só editar este arquivo).
 *
 * Ritmo: 1 mensagem por dia, às 19h, a partir de 05/11. Os dias 03 e 04/11 já saíram com 3 por dia.
 *   2 por dia (10h e 19h) só nos dias fortes: 19/11 (lançamento do GTA 6), 26/11 (véspera, lista da Black),
 *   27/11 e 28/11 (Black).
 *   Cada dia tem a mensagem que mais vende ou mais faz voltar ao grupo. Primeiro, oferta ou jogo com preço
 *   real e link. Depois, a peça da história que outra mensagem prometeu (lista da sexta às 19h, resultado de
 *   enquete, lista da Black na quinta 26/11 às 19h). Enquete ou dica só no dia sem oferta.
 *   Sexta 19h: a lista da semana seguinte, 3 dias antes do site. Quinta 26/11, 19h: a lista da Black.
 * Por quê: reduzir o volume pra não cansar o grupo. A pesquisa Opini 2025 diz que 73% dos usuários já saíram
 * de grupo por volume alto de mensagens (referência de mercado, não é dado do próprio grupo). Se mesmo assim
 * o grupo silenciar ou sair gente, a Blanco reduz mais.
 * O gancho do fim de cada mensagem aponta pra próxima mensagem real (ex.: "Amanhã 19h: ...").
 * Cada mensagem é curta, tem uma ação só e a primeira linha é a que aparece na notificação.
 *
 * Escrita: sem emoji (o Geovane pode pôr os que ele já usa no grupo), sem travessão, sem cupom,
 * sem escassez inventada e sem subir preço "de". Os prazos são os reais. "A partir de" é o preço
 * da secundária. Primária e secundária seguem o texto da loja (store.ts e a página de ajuda).
 * [ENTRE COLCHETES] é o que falta. Status "blanco": a Blanco completa (jogos e links da semana).
 * "preco": falta o preço. "completar": o Geovane confere e completa na hora (placar, prints, live).
 * Preços da semana 1 (Luta ou Futebol) lidos no site em 03/11.
 */

export type GrupoStatus = "pronta" | "blanco" | "preco" | "completar";

export interface GrupoMsg {
  semana: string;
  /** AAAA-MM-DD */
  data: string;
  /** Hora ou período do envio. */
  quando: string;
  titulo: string;
  status: GrupoStatus;
  texto: string;
  /** Ideia da foto: o que aparece na imagem, qual capa e o que vai grande. */
  arte: string;
  /** Prompt pronto pro ChatGPT, colado junto com a capa oficial do jogo. */
  prompt: string;
}

export const GRUPO_STATUS: Record<GrupoStatus, { n: string; tone: "ok" | "info" | "warn" }> = {
  pronta: { n: "Pronta pra mandar", tone: "ok" },
  blanco: { n: "A Blanco completa na quinta", tone: "info" },
  preco: { n: "Falta o preço", tone: "warn" },
  completar: { n: "Confira e complete antes de mandar", tone: "warn" },
};

const OFERTA_S1 = "https://lojasoccergames.com.br/oferta-de-luta-e-futebol/";
const GTA6 = "https://lojasoccergames.com.br/produtos/gta-6-grand-theft-auto-vi-ps5-midia-digital/";
const GTA6_ULT =
  "https://lojasoccergames.com.br/produtos/gta-6-grand-theft-auto-vi-ultimate-edition-ps5-midia-digital/";
const MAIS_VENDIDOS = "https://lojasoccergames.com.br/best-sellers/";
const AJUDA_LICENCA = "https://lojasoccergames.com.br/ajuda-primaria-ou-secundaria/";
const VIP = "https://links.lojasoccergames.com.br/black";
const LINK_TIRO = "[LINK DA SEMANA DE TIRO]";
const LINK_AVENTURA = "[LINK DA SEMANA DE AVENTURA]";
const LINK_GTA = "[LINK DO FIM DE SEMANA DO GTA]";
const LINK_BLACK = "[LINK DA BLACK]";

/** Os links são os mesmos em tudo: grupo, bio, stories e anúncio. Mudou a oferta, muda aqui. */
export const GRUPO_LINKS: { nome: string; url: string }[] = [
  { nome: "Oferta da semana (até 08/11)", url: OFERTA_S1 },
  { nome: "GTA 6 PS5, pré-venda", url: GTA6 },
  { nome: "GTA 6 Ultimate PS5", url: GTA6_ULT },
  { nome: "Mais vendidos", url: MAIS_VENDIDOS },
  { nome: "Lançamentos", url: "https://lojasoccergames.com.br/lancamentos/" },
  { nome: "Primária ou secundária? (ajuda)", url: AJUDA_LICENCA },
  { nome: "Entrar no Grupo VIP", url: VIP },
  { nome: "Link da bio", url: "https://links.lojasoccergames.com.br/" },
];

/* ------------------------------------------------------------------ como o texto é montado */

const t = (...linhas: string[]) => linhas.join("\n");

/** A contagem diária do jogo do dia. */
const conta = (gta: number, black: number) =>
  `Faltam *${gta} dias* pro GTA 6 e *${black}* pra Black.`;

/* ------------------------------------------------------------------ como o prompt é montado */

interface Img {
  /** Sem capa = imagem só de texto. Com capa: "a capa oficial do ..." ou "as capas oficiais ...". */
  capa?: string;
  layout: string;
  /** O elemento 3 vezes maior que o resto. */
  principal: string;
  /** Tudo que pode estar escrito na imagem, exatamente assim. */
  textos: string[];
}

const L_CAPA =
  "a capa fica no alto, centralizada, ocupando cerca de metade da altura, com cantos levemente arredondados. Logo abaixo, no fundo claro, o nome do jogo em quase preto. Depois, uma faixa roxa de ponta a ponta com o preço em branco. O prazo vai pequeno no rodapé.";
const L_GRADE =
  "o título vai no alto, numa faixa roxa com texto branco. Embaixo, as capas em grade de 2 colunas, todas do mesmo tamanho (se sobrar uma, ela fica centralizada), com o nome e o preço logo abaixo de cada capa, em quase preto. O prazo vai pequeno no rodapé.";
const L_LADO =
  "o título vai no alto, numa faixa roxa com texto branco. Embaixo, as capas lado a lado, com a mesma altura, e o nome e o preço logo abaixo de cada uma, em quase preto. O prazo vai pequeno no rodapé.";
const L_NUM =
  "fundo roxo inteiro. O elemento principal fica no centro, enorme, em branco. As frases de apoio vêm logo acima e logo abaixo dele, em branco e bem menores. A última linha vai num retângulo claro (#F5F5F5) no rodapé, com texto quase preto.";
const L_FRASE =
  "fundo claro. A frase principal fica no centro, em quase preto, quebrada em até 3 linhas. As outras linhas vão numa faixa roxa no rodapé, em branco.";
const L_VS =
  "imagem dividida ao meio na horizontal: metade de cima roxa, com a primeira opção em branco; metade de baixo clara, com a segunda opção em quase preto. No meio da divisa, um círculo branco com o x em roxo. A última linha vai pequena no rodapé.";
const L_LISTA =
  "fundo claro. O título vai no alto, numa faixa roxa com texto branco. Embaixo, as linhas empilhadas e alinhadas à esquerda, em quase preto, com bastante espaço entre elas. A última linha vai pequena no rodapé.";

function img(a: Img): string {
  const gta = a.textos.some((x) => x.includes("GTA"));
  const ps = a.textos.some((x) => /PS[45]/.test(x));
  const cuidado = [
    "Não escreva mais nada: nada de slogan, site, selo, preço riscado ou palavra em inglês além do nome dos jogos.",
    gta
      ? 'Escreva "GTA 6" na mesma fonte dos outros textos, sem imitar o logo oficial do jogo.'
      : "",
    ps ? "Escreva PS4 e PS5 na mesma fonte, sem imitar o logo do PlayStation." : "",
  ]
    .filter(Boolean)
    .join(" ");
  return t(
    "Crie a imagem de um post para o grupo VIP de WhatsApp da Soccer Games, loja de jogos digitais de PS4 e PS5.",
    "",
    a.capa
      ? `Capa: anexei ${a.capa}, que eu baixei da página do produto no site lojasoccergames.com.br. Use cada capa exatamente como está: não redesenhe nem altere personagens, não mexa no logo do jogo e não invente logo nenhum. Só pode redimensionar e arredondar os cantos.`
      : "Esta imagem é só de texto, não precisa anexar capa. Sem personagem, sem pessoa, sem foto, sem capa de jogo e sem logo de jogo ou de marca. Pode usar formas simples: faixas, círculos e cantos arredondados.",
    "",
    "Formato: 1080 x 1350 pixels, vertical.",
    "Cores da Soccer Games: roxo #B500D7, fundo claro #F5F5F5, texto quase preto #0F0F0F e texto branco sempre que estiver em cima do roxo.",
    "Fonte: sem serifa, bem grossa, no estilo Red Hat Display, a mesma em todos os textos.",
    `Layout: ${a.layout}`,
    `Elemento principal, 3 vezes maior que qualquer outro texto: ${a.principal}. Visual limpo, com espaço vazio, sem enfeite, sem ícone e sem emoji.`,
    "",
    "Escreva na imagem só estes textos, exatamente assim, em português e com acento, um por linha:",
    ...a.textos.map((x) => `"${x}"`),
    "",
    cuidado,
    "Se eu anexar o logo da Soccer Games, coloque pequeno no rodapé. Se não anexar, não coloque logo nenhum.",
    "Antes de entregar, confira letra por letra se os textos estão iguais aos de cima. Se algum sair diferente, gere de novo.",
  );
}

/* ------------------------------------------------------------------ as semanas */

const S1 = "Semana 1 · Luta ou Futebol (02 a 08/11)";
const S2 = "Semana 2 · Tiro (09 a 15/11)";
const S3 = "Aventura e contagem pro GTA 6 (16 a 18/11)";
const S4 = "Dia do GTA 6 (19/11)";
const S5 = "Fim de semana do GTA (20 a 22/11)";
const S6 = "A Black vem aí (23 a 26/11)";
const S7 = "Black (27 a 30/11)";

const ATE_DOM_S1 = "até domingo, 08/11, 23h59";
const ATE_DOM_S2 = "até domingo, 15/11, 23h59";
const ATE_AVENTURA = "até quarta, 18/11, 23h59";
const ATE_GTA = "até domingo, 22/11, 23h59";
const ATE_BLACK = "até segunda, 30/11, 23h59";

const CAPAS_S1 =
  "as capas oficiais dos 7 jogos da semana, uma por jogo: EA Sports FC 26, eFootball PES 2020, EA Sports UFC 6, EA Sports UFC 5, Tekken 7, Naruto Shippuden Ultimate Ninja Storm 4 e Dragon Ball FighterZ";
const CAPAS_LUTA_39 =
  "as capas oficiais do Tekken 7, do Naruto Shippuden Ultimate Ninja Storm 4 e do Dragon Ball FighterZ, uma por jogo";

export const GRUPO_MSGS: GrupoMsg[] = [
  /* ================================================================ semana 1 · luta ou futebol */
  {
    semana: S1,
    data: "2026-11-02",
    quando: "à noite",
    titulo: "Boas-vindas a novembro e a oferta da semana (já enviada, ficou como foi)",
    status: "pronta",
    texto:
      "Chegou novembro, o mês mais forte do ano aqui na Soccer.\nDia 19 tem GTA 6. Dia 27 começa a Black.\nQuem tá aqui no VIP fica sabendo de tudo antes.\n\nEssa semana é LUTA ou FUTEBOL:\nFC 26 de PS5 a partir de R$ 79,90\nUFC 6 de PS5 a partir de R$ 119,90\nTekken 7, Naruto e Dragon Ball a partir de R$ 39,90\nAté domingo, 23h59: https://lojasoccergames.com.br/oferta-de-luta-e-futebol/\n\nE a partir dessa sexta, às 19h, vocês recebem aqui a lista da semana seguinte 3 dias antes do site.",
    arte: "Imagem só de texto, fundo roxo: NOVEMBRO NA SOCCER bem grande em branco no centro; embaixo, menor, GTA 6: DIA 19 e BLACK: DIA 27 numa caixa clara.",
    prompt: img({
      layout: L_NUM,
      principal: 'o texto "NOVEMBRO NA SOCCER"',
      textos: ["NOVEMBRO NA SOCCER", "GTA 6: dia 19", "Black: dia 27"],
    }),
  },
  {
    semana: S1,
    data: "2026-11-03",
    quando: "10h",
    titulo: "Jogo do dia: FC 26 a partir de R$ 79,90",
    status: "pronta",
    texto: t(
      "*JOGO DO DIA: EA Sports FC 26*",
      "PS4 e PS5, a partir de *R$ 79,90*",
      "",
      "Secundária R$ 79,90. Primária R$ 109,90.",
      "O futebol da temporada, com Ultimate Team e modo carreira.",
      "Até domingo, 08/11, 23h59:",
      OFERTA_S1,
      "",
      conta(16, 24),
      "Às 15h: primária ou secundária, qual compensa pra você.",
    ),
    arte: "Capa oficial do FC 26 no alto, ocupando metade da imagem. Embaixo, R$ 79,90 enorme em branco numa faixa roxa, com JOGO DO DIA pequeno em cima e o prazo no rodapé.",
    prompt: img({
      capa: "a capa oficial do EA Sports FC 26",
      layout: L_CAPA + ' O texto "JOGO DO DIA" vai pequeno, em roxo, acima da capa.',
      principal: 'o preço "R$ 79,90"',
      textos: [
        "JOGO DO DIA",
        "EA Sports FC 26",
        "PS4 e PS5",
        "a partir de",
        "R$ 79,90",
        ATE_DOM_S1,
      ],
    }),
  },
  {
    semana: S1,
    data: "2026-11-03",
    quando: "15h",
    titulo: "Primária ou secundária, em 2 linhas",
    status: "pronta",
    texto: t(
      "*Primária ou secundária? Em 2 linhas:*",
      "",
      "*Primária:* o jogo fica no seu console, joga no seu perfil e até sem internet.",
      "*Secundária:* mais barata, joga com internet e com a conta da Soccer logada.",
      "",
      "No FC 26 a diferença é R$ 30: R$ 109,90 na primária, R$ 79,90 na secundária.",
      "Ficou dúvida? Tá tudo explicado aqui:",
      AJUDA_LICENCA,
      "",
      "Às 19h: a semana inteira de luta e futebol numa mensagem só.",
    ),
    arte: "Imagem só de texto em dois blocos empilhados: PRIMÁRIA grande em preto no bloco claro de cima, SECUNDÁRIA grande em branco no bloco roxo de baixo, cada uma com uma frase curta embaixo.",
    prompt: img({
      layout:
        "dois blocos empilhados, do mesmo tamanho. Em cima, fundo claro, a palavra PRIMÁRIA em quase preto e a frase dela logo abaixo. Embaixo, fundo roxo, a palavra SECUNDÁRIA em branco e a frase dela logo abaixo.",
      principal: 'as palavras "PRIMÁRIA" e "SECUNDÁRIA"',
      textos: [
        "PRIMÁRIA",
        "fica no seu console, joga até sem internet",
        "SECUNDÁRIA",
        "mais barata, joga com internet e a conta da Soccer",
      ],
    }),
  },
  {
    semana: S1,
    data: "2026-11-03",
    quando: "19h",
    titulo: "Os 7 jogos da semana numa mensagem",
    status: "pronta",
    texto: t(
      "*LUTA ou FUTEBOL: os 7 jogos da semana, na secundária*",
      "",
      "FC 26: R$ 79,90",
      "PES 2020: R$ 109,90",
      "UFC 6: R$ 119,90",
      "UFC 5: R$ 49,90",
      "Tekken 7, Naruto Storm 4 e Dragon Ball FighterZ: R$ 39,90",
      "",
      "Até domingo, 08/11, 23h59:",
      OFERTA_S1,
      "",
      "Amanhã 10h: o combinado novo do VIP pra novembro.",
    ),
    arte: "As 7 capas pequenas em grade de 2 colunas, com o preço embaixo de cada uma. No alto, LUTA OU FUTEBOL grande numa faixa roxa.",
    prompt: img({
      capa: CAPAS_S1,
      layout: L_GRADE,
      principal: 'o título "LUTA OU FUTEBOL"',
      textos: [
        "LUTA OU FUTEBOL",
        "FC 26: a partir de R$ 79,90",
        "PES 2020: a partir de R$ 109,90",
        "UFC 6: a partir de R$ 119,90",
        "UFC 5: a partir de R$ 49,90",
        "Tekken 7: a partir de R$ 39,90",
        "Naruto Storm 4: a partir de R$ 39,90",
        "Dragon Ball FighterZ: a partir de R$ 39,90",
        ATE_DOM_S1,
      ],
    }),
  },
  {
    semana: S1,
    data: "2026-11-04",
    quando: "10h",
    titulo: "O combinado do VIP pra novembro e o jogo do dia: UFC 6",
    status: "pronta",
    texto: t(
      "*Combinado novo do VIP até o fim de novembro:*",
      "",
      "*10h:* jogo do dia, com preço.",
      "*15h:* enquete, spoiler ou dica rápida.",
      "*19h:* o próximo passo até o GTA 6 e a Black.",
      "*Sexta 19h:* a lista da semana seguinte, antes do site.",
      "",
      "Hoje o jogo do dia é o *UFC 6* de PS5, a partir de *R$ 119,90*:",
      OFERTA_S1,
      "",
      conta(15, 23),
      "Às 15h: time LUTA ou time FUTEBOL?",
    ),
    arte: "Imagem só de texto, fundo claro: O COMBINADO DO VIP grande numa faixa roxa no alto e, embaixo, os 4 horários empilhados (10h, 15h, 19h, sexta 19h) em roxo, cada um com uma frase curta em preto.",
    prompt: img({
      layout:
        "fundo claro. O título vai no alto, numa faixa roxa com texto branco. Embaixo, 4 linhas empilhadas: o horário à esquerda, grande e roxo, e a frase curta à direita, em quase preto. A última linha vai pequena no rodapé.",
      principal: 'o título "O COMBINADO DO VIP"',
      textos: [
        "O COMBINADO DO VIP",
        "10h: jogo do dia",
        "15h: enquete, spoiler ou dica",
        "19h: o próximo passo",
        "sexta 19h: a lista antes do site",
        "até 30/11",
      ],
    }),
  },
  {
    semana: S1,
    data: "2026-11-04",
    quando: "15h",
    titulo:
      "Abre a votação: time LUTA x time FUTEBOL (logo depois, crie a enquete do WhatsApp com as opções LUTA e FUTEBOL)",
    status: "pronta",
    texto: t(
      "*Time LUTA ou time FUTEBOL?*",
      "Vota na enquete logo abaixo.",
      "",
      "*Futebol:* FC 26 e PES 2020, a partir de R$ 79,90.",
      "*Luta:* UFC 6, UFC 5, Tekken 7, Naruto e Dragon Ball, a partir de R$ 39,90.",
      "",
      "Amanhã 15h: placar parcial.",
      "Sábado 10h: placar final e a dupla de cada time.",
    ),
    arte: "Imagem só de texto dividida ao meio: TIME LUTA em branco na metade roxa de cima, TIME FUTEBOL em preto na metade clara de baixo, e um círculo com x no meio.",
    prompt: img({
      layout: L_VS,
      principal: 'as palavras "TIME LUTA" e "TIME FUTEBOL"',
      textos: ["TIME LUTA", "x", "TIME FUTEBOL", "vota na enquete do grupo"],
    }),
  },
  {
    semana: S1,
    data: "2026-11-04",
    quando: "19h",
    titulo: "FC 26 ou PES 2020: qual futebol pegar",
    status: "pronta",
    texto: t(
      "*FC 26 ou PES 2020? Os dois tão na semana:*",
      "",
      "*FC 26:* o da temporada, com Ultimate Team. A partir de R$ 79,90.",
      "*PES 2020:* o clássico, com Master League. A partir de R$ 109,90.",
      "Os dois rodam no PS4 e no PS5.",
      "",
      "Até domingo, 08/11, 23h59:",
      OFERTA_S1,
      "",
      "Amanhã 10h: 3 jogos de luta pelo mesmo preço.",
    ),
    arte: "As capas do FC 26 e do PES 2020 lado a lado, com um círculo roxo escrito OU entre elas e o preço grande embaixo de cada capa.",
    prompt: img({
      capa: "as capas oficiais do EA Sports FC 26 e do eFootball PES 2020, uma por jogo",
      layout:
        "as duas capas lado a lado na metade de cima, com a mesma altura. Entre elas, um círculo roxo com a palavra ou em branco. Embaixo de cada capa, o nome e o preço em quase preto. O prazo vai pequeno no rodapé.",
      principal: 'os dois preços "R$ 79,90" e "R$ 109,90"',
      textos: [
        "FC 26",
        "a partir de R$ 79,90",
        "ou",
        "PES 2020",
        "a partir de R$ 109,90",
        ATE_DOM_S1,
      ],
    }),
  },
  {
    semana: S1,
    data: "2026-11-05",
    quando: "19h",
    titulo: "Jogo do dia: 3 de luta por R$ 39,90",
    status: "pronta",
    texto: t(
      "*JOGO DO DIA: 3 de luta por R$ 39,90*",
      "",
      "Tekken 7, Naruto Storm 4 e Dragon Ball FighterZ.",
      "Todos de PS4 e PS5, R$ 39,90 na secundária.",
      "Até domingo, 08/11, 23h59:",
      OFERTA_S1,
      "",
      "A enquete LUTA x FUTEBOL fecha sábado, e o placar final sai aqui às 19h.",
      "Amanhã 19h: a lista da semana de TIRO, antes do site.",
    ),
    arte: "As capas do Tekken 7, do Naruto Storm 4 e do Dragon Ball FighterZ lado a lado no alto. Embaixo, R$ 39,90 enorme em branco numa faixa roxa, com CADA UM menor.",
    prompt: img({
      capa: CAPAS_LUTA_39,
      layout:
        "as 3 capas lado a lado no alto, com a mesma altura, e o nome de cada jogo pequeno embaixo. Depois, uma faixa roxa de ponta a ponta com o preço em branco. O prazo vai pequeno no rodapé.",
      principal: 'o preço "R$ 39,90"',
      textos: [
        "JOGO DO DIA",
        "Tekken 7",
        "Naruto Storm 4",
        "Dragon Ball FighterZ",
        "a partir de",
        "R$ 39,90",
        "cada um",
        ATE_DOM_S1,
      ],
    }),
  },
  {
    semana: S1,
    data: "2026-11-06",
    quando: "19h",
    titulo: "Lista da semana de TIRO, antes de todo mundo",
    status: "blanco",
    texto: t(
      "*LISTA DA SEMANA DE TIRO. SÓ PRO VIP.*",
      "O site só abre segunda, 09/11. Vocês já compram hoje.",
      "",
      "*[JOGO 1]:* a partir de [PREÇO]",
      "*[JOGO 2]:* a partir de [PREÇO]",
      "*[JOGO 3]:* a partir de [PREÇO]",
      "*[JOGO 4]:* a partir de [PREÇO]",
      "*[JOGO 5]:* a partir de [PREÇO]",
      "",
      "Vale até domingo, 15/11, 23h59:",
      LINK_TIRO,
      "",
      "Amanhã 19h: o placar final de LUTA x FUTEBOL.",
    ),
    arte: "As capas dos 5 jogos de tiro em grade de 2 colunas, com o preço embaixo de cada uma. No alto, LISTA DE TIRO grande na faixa roxa e SÓ PRO VIP menor.",
    prompt: img({
      capa: "as capas oficiais dos 5 jogos da lista de tiro, uma por jogo: [JOGO 1], [JOGO 2], [JOGO 3], [JOGO 4] e [JOGO 5]",
      layout: L_GRADE,
      principal: 'o título "LISTA DE TIRO"',
      textos: [
        "LISTA DE TIRO",
        "só pro VIP",
        "[JOGO 1]: a partir de [PREÇO]",
        "[JOGO 2]: a partir de [PREÇO]",
        "[JOGO 3]: a partir de [PREÇO]",
        "[JOGO 4]: a partir de [PREÇO]",
        "[JOGO 5]: a partir de [PREÇO]",
        ATE_DOM_S2,
      ],
    }),
  },
  {
    semana: S1,
    data: "2026-11-07",
    quando: "19h",
    titulo: "Placar final e a dupla de cada time (troque o vencedor e a % pelo que deu na enquete)",
    status: "completar",
    texto: t(
      "*Placar final: deu [LUTA ou FUTEBOL], com [X]%.*",
      "",
      "A dupla de cada time, levando os dois:",
      "*Futebol:* FC 26 + PES 2020 por R$ 189,80",
      "*Luta:* UFC 5 + Tekken 7 por R$ 89,80",
      "É a soma dos dois na secundária. Até amanhã, 23h59:",
      OFERTA_S1,
      "",
      "Amanhã 19h: o último aviso de LUTA ou FUTEBOL, com a lista completa.",
    ),
    arte: "No alto, DEU [VENCEDOR] grande numa faixa roxa. Embaixo, as capas do FC 26 e do PES 2020 lado a lado com R$ 189,80, e as do UFC 5 e do Tekken 7 com R$ 89,80.",
    prompt: img({
      capa: "as capas oficiais do EA Sports FC 26, do eFootball PES 2020, do EA Sports UFC 5 e do Tekken 7, uma por jogo",
      layout:
        "o título vai no alto, numa faixa roxa com texto branco. Embaixo, duas linhas de capas: na primeira, FC 26 e PES 2020 lado a lado, com o preço da dupla logo abaixo; na segunda, UFC 5 e Tekken 7, com o preço da dupla logo abaixo. O prazo vai pequeno no rodapé.",
      principal: 'o título "DEU [LUTA ou FUTEBOL]"',
      textos: [
        "DEU [LUTA ou FUTEBOL]",
        "FC 26 + PES 2020: R$ 189,80",
        "UFC 5 + Tekken 7: R$ 89,80",
        ATE_DOM_S1,
      ],
    }),
  },
  {
    semana: S1,
    data: "2026-11-08",
    quando: "19h",
    titulo: "Menos de 5 horas: a lista completa de LUTA ou FUTEBOL",
    status: "pronta",
    texto: t(
      "*Menos de 5 horas pra acabar LUTA ou FUTEBOL. Às 23h59 sai do ar.*",
      "",
      "FC 26: R$ 79,90. PES 2020: R$ 109,90.",
      "UFC 6: R$ 119,90. UFC 5: R$ 49,90.",
      "Tekken 7, Naruto Storm 4 e Dragon Ball FighterZ: R$ 39,90.",
      "(preços da secundária)",
      OFERTA_S1,
      "",
      "Amanhã 19h: o jogo do dia da semana de TIRO.",
    ),
    arte: "Imagem só de texto, fundo roxo: 23H59 gigante em branco no centro, ÚLTIMAS HORAS em cima e, no rodapé, LUTA OU FUTEBOL, A PARTIR DE R$ 39,90 numa caixa clara.",
    prompt: img({
      layout: L_NUM,
      principal: 'o horário "23H59"',
      textos: ["ÚLTIMAS HORAS", "23H59", "LUTA OU FUTEBOL", "a partir de R$ 39,90"],
    }),
  },
  {
    semana: S2,
    data: "2026-11-09",
    quando: "19h",
    titulo: "Jogo do dia (tiro) e a semana de TIRO aberta pro site",
    status: "blanco",
    texto: t(
      "*JOGO DO DIA: [JOGO 1]*",
      "[PS4 / PS5], a partir de *[PREÇO]*",
      "[MOTIVO REAL PRA JOGAR, EM 1 LINHA]",
      "A semana de TIRO abriu hoje pro site. Vocês tão nela desde sexta:",
      LINK_TIRO,
      "",
      conta(10, 18),
      "Amanhã 19h: a dupla de tiro da semana.",
    ),
    arte: "Capa oficial do [JOGO 1] no alto, ocupando metade da imagem. Embaixo, o preço enorme em branco na faixa roxa, JOGO DO DIA pequeno em cima e o prazo no rodapé.",
    prompt: img({
      capa: "a capa oficial do [JOGO 1]",
      layout: L_CAPA + ' O texto "JOGO DO DIA" vai pequeno, em roxo, acima da capa.',
      principal: 'o preço "[PREÇO]"',
      textos: ["JOGO DO DIA", "[JOGO 1]", "[PS4 e PS5]", "a partir de", "[PREÇO]", ATE_DOM_S2],
    }),
  },
  {
    semana: S2,
    data: "2026-11-10",
    quando: "19h",
    titulo: "A dupla de tiro da semana",
    status: "blanco",
    texto: t(
      "*A dupla de tiro da semana: [JOGO] + [JOGO].*",
      "",
      "Os dois juntos saem por [SOMA DOS DOIS NA SECUNDÁRIA].",
      "[POR QUE ESSES DOIS COMBINAM, EM 1 LINHA: UM PRA JOGAR SOZINHO, OUTRO ONLINE]",
      "É a soma dos dois preços da semana.",
      "",
      LINK_TIRO,
      "Amanhã 19h: um de tiro pra jogar online com a galera.",
    ),
    arte: "As capas dos 2 jogos lado a lado, com um + roxo entre elas. Embaixo, a soma dos dois enorme em branco na faixa roxa e A DUPLA DE TIRO pequeno no alto.",
    prompt: img({
      capa: "as capas oficiais do [JOGO] e do [JOGO], uma por jogo",
      layout:
        "o título vai pequeno no alto, em roxo. As duas capas ficam lado a lado, com a mesma altura, e um sinal de mais roxo entre elas. Embaixo, uma faixa roxa de ponta a ponta com o preço da dupla em branco. O prazo vai pequeno no rodapé.",
      principal: 'o preço "[SOMA DOS DOIS]"',
      textos: ["A DUPLA DE TIRO", "[JOGO] + [JOGO]", "[SOMA DOS DOIS]", ATE_DOM_S2],
    }),
  },
  {
    semana: S2,
    data: "2026-11-11",
    quando: "19h",
    titulo: "Jogo do dia (tiro com multiplayer online)",
    status: "blanco",
    texto: t(
      "*Joga online com a galera? JOGO DO DIA: [JOGO 3]*",
      "",
      "[PS4 / PS5], a partir de *[PREÇO]*",
      "[COMO É O ONLINE DELE, EM 1 LINHA]",
      LINK_TIRO,
      "",
      conta(8, 16),
      "Amanhã 19h: mais um de tiro, e falta 1 semana pro GTA 6.",
    ),
    arte: "Capa oficial do [JOGO 3] no alto, ocupando metade da imagem. Embaixo, o preço enorme em branco na faixa roxa, ONLINE COM A GALERA pequeno em cima e o prazo no rodapé.",
    prompt: img({
      capa: "a capa oficial do [JOGO 3]",
      layout: L_CAPA + ' O texto "JOGO DO DIA" vai pequeno, em roxo, acima da capa.',
      principal: 'o preço "[PREÇO]"',
      textos: [
        "JOGO DO DIA",
        "online com a galera",
        "[JOGO 3]",
        "a partir de",
        "[PREÇO]",
        ATE_DOM_S2,
      ],
    }),
  },
  {
    semana: S2,
    data: "2026-11-12",
    quando: "19h",
    titulo: "Jogo do dia (tiro), uma semana pro GTA 6 e o aviso do PS5",
    status: "blanco",
    texto: t(
      "*JOGO DO DIA: [JOGO 4] a partir de [PREÇO]*",
      "[PS4 / PS5]",
      "[MOTIVO REAL PRA JOGAR, EM 1 LINHA]",
      LINK_TIRO,
      "",
      "Faltam *7 dias* pro GTA 6, uma semana. E *15* pra Black.",
      "Quem tá no PS4: o GTA 6 sai só pra PS5. Os preços das 2 versões saem aqui quarta, 18/11, 19h.",
      "Amanhã 19h: a lista de AVENTURA, antes do site.",
    ),
    arte: "Capa oficial do [JOGO 4] no alto, ocupando metade da imagem. Embaixo, o preço enorme em branco na faixa roxa, JOGO DO DIA pequeno em cima e o prazo no rodapé.",
    prompt: img({
      capa: "a capa oficial do [JOGO 4]",
      layout: L_CAPA + ' O texto "JOGO DO DIA" vai pequeno, em roxo, acima da capa.',
      principal: 'o preço "[PREÇO]"',
      textos: ["JOGO DO DIA", "[JOGO 4]", "[PS4 e PS5]", "a partir de", "[PREÇO]", ATE_DOM_S2],
    }),
  },
  {
    semana: S2,
    data: "2026-11-13",
    quando: "19h",
    titulo: "Lista de AVENTURA, antes de todo mundo",
    status: "blanco",
    texto: t(
      "*LISTA DE AVENTURA. SÓ PRO VIP.*",
      "O site só abre segunda, 16/11. Vocês já compram hoje.",
      "",
      "*[JOGO 1]:* a partir de [PREÇO]",
      "*[JOGO 2]:* a partir de [PREÇO]",
      "*[JOGO 3]:* a partir de [PREÇO]",
      "*[JOGO 4]:* a partir de [PREÇO]",
      "*[JOGO 5]:* a partir de [PREÇO]",
      "",
      "Vale até quarta, 18/11, 23h59. Pra jogar até o GTA 6 chegar:",
      LINK_AVENTURA,
      "",
      "Amanhã 19h: a escolha do Geovane pra jogar antes do GTA 6.",
    ),
    arte: "As capas dos 5 jogos de aventura em grade de 2 colunas, com o preço embaixo de cada uma. No alto, LISTA DE AVENTURA grande na faixa roxa e SÓ PRO VIP menor.",
    prompt: img({
      capa: "as capas oficiais dos 5 jogos da lista de aventura, uma por jogo: [JOGO 1], [JOGO 2], [JOGO 3], [JOGO 4] e [JOGO 5]",
      layout: L_GRADE,
      principal: 'o título "LISTA DE AVENTURA"',
      textos: [
        "LISTA DE AVENTURA",
        "só pro VIP",
        "[JOGO 1]: a partir de [PREÇO]",
        "[JOGO 2]: a partir de [PREÇO]",
        "[JOGO 3]: a partir de [PREÇO]",
        "[JOGO 4]: a partir de [PREÇO]",
        "[JOGO 5]: a partir de [PREÇO]",
        ATE_AVENTURA,
      ],
    }),
  },
  {
    semana: S2,
    data: "2026-11-14",
    quando: "19h",
    titulo: "A escolha do Geovane: o de aventura antes do GTA 6",
    status: "blanco",
    texto: t(
      "*Se eu tivesse 5 dias até o GTA 6, eu jogava esse:*",
      "*[JOGO DE AVENTURA]*, a partir de [PREÇO].",
      "",
      "[POR QUE O GEOVANE ESCOLHEU, EM 1 OU 2 LINHAS, DO JEITO DELE]",
      "",
      "Já liberado pra vocês, até quarta, 18/11, 23h59:",
      LINK_AVENTURA,
      "",
      "Amanhã 19h: o último dia da semana de TIRO.",
    ),
    arte: "Capa oficial do [JOGO DE AVENTURA] no alto, ocupando metade da imagem. Embaixo, A ESCOLHA DO GEOVANE em roxo e o preço enorme em branco na faixa roxa.",
    prompt: img({
      capa: "a capa oficial do [JOGO DE AVENTURA]",
      layout: L_CAPA + ' O texto "A ESCOLHA DO GEOVANE" vai pequeno, em roxo, acima da capa.',
      principal: 'o preço "[PREÇO]"',
      textos: [
        "A ESCOLHA DO GEOVANE",
        "[JOGO DE AVENTURA]",
        "a partir de",
        "[PREÇO]",
        ATE_AVENTURA,
      ],
    }),
  },
  {
    semana: S2,
    data: "2026-11-15",
    quando: "19h",
    titulo: "Menos de 5 horas de tiro (troque pelo jogo que mais vendeu na semana)",
    status: "blanco",
    texto: t(
      "*Menos de 5 horas pra acabar a semana de TIRO.*",
      "Às 23h59 a oferta sai do ar.",
      "",
      "O que mais saiu essa semana: *[JOGO MAIS VENDIDO DA SEMANA]*, a partir de [PREÇO].",
      LINK_TIRO,
      "",
      "Amanhã 19h: faltam 3 dias pro GTA 6, e a AVENTURA abre pro site.",
    ),
    arte: "Capa oficial do [JOGO MAIS VENDIDO DA SEMANA] no alto. Embaixo, 23H59 enorme em branco na faixa roxa e O QUE MAIS SAIU pequeno em cima da capa.",
    prompt: img({
      capa: "a capa oficial do [JOGO MAIS VENDIDO DA SEMANA]",
      layout: L_CAPA + ' O texto "O QUE MAIS SAIU" vai pequeno, em roxo, acima da capa.',
      principal: 'o horário "23H59"',
      textos: [
        "O QUE MAIS SAIU",
        "[JOGO MAIS VENDIDO DA SEMANA]",
        "a partir de [PREÇO]",
        "23H59",
        "acaba hoje",
      ],
    }),
  },
  {
    semana: S3,
    data: "2026-11-16",
    quando: "19h",
    titulo: "Faltam 3 dias pro GTA 6 e a aventura abre pro site",
    status: "blanco",
    texto: t(
      "*Faltam 3 dias pro GTA 6.*",
      "E hoje a AVENTURA abriu pro site. Vocês tão nela desde sexta.",
      "",
      "*JOGO DO DIA: [JOGO 1]* a partir de *[PREÇO]*",
      "[MOTIVO REAL PRA JOGAR, EM 1 LINHA]",
      LINK_AVENTURA,
      "",
      "Black: faltam *11 dias*.",
      "Amanhã 19h: mais um de aventura e um spoiler do fim de semana do GTA.",
    ),
    arte: "Imagem só de texto, fundo roxo: o número 3 gigante em branco no centro, DIAS PRO GTA 6 logo abaixo e JOGO DO DIA: [JOGO 1] numa caixa clara no rodapé.",
    prompt: img({
      layout: L_NUM,
      principal: 'o número "3"',
      textos: ["faltam", "3", "dias pro GTA 6", "jogo do dia: [JOGO 1] a partir de [PREÇO]"],
    }),
  },
  {
    semana: S3,
    data: "2026-11-17",
    quando: "19h",
    titulo: "Faltam 2 dias pro GTA 6, o jogo do dia e um spoiler do fim de semana do GTA",
    status: "blanco",
    texto: t(
      "*Faltam 2 dias pro GTA 6.*",
      "",
      "*JOGO DO DIA: [JOGO 2]* a partir de *[PREÇO]*",
      "[MOTIVO REAL PRA JOGAR, EM 1 LINHA]",
      "A AVENTURA vai até amanhã, 23h59:",
      LINK_AVENTURA,
      "",
      "Spoiler do fim de semana do GTA, só pra quem tá aqui: *[JOGO]* por *[PREÇO]*, de sexta 20 a domingo 22/11.",
      "Amanhã 19h: a lista inteira, com o preço do GTA 6. Só aqui.",
    ),
    arte: "Imagem só de texto, fundo roxo: o número 2 gigante em branco no centro, DIAS PRO GTA 6 logo abaixo e JOGO DO DIA: [JOGO 2] numa caixa clara no rodapé.",
    prompt: img({
      layout: L_NUM,
      principal: 'o número "2"',
      textos: ["faltam", "2", "dias pro GTA 6", "jogo do dia: [JOGO 2] a partir de [PREÇO]"],
    }),
  },
  {
    semana: S3,
    data: "2026-11-18",
    quando: "19h",
    titulo: "Lista do fim de semana do GTA, com o preço do GTA 6, só pro VIP",
    status: "blanco",
    texto: t(
      "*LISTA DO FIM DE SEMANA DO GTA. SÓ PRO VIP.*",
      "Sexta 20 a domingo 22/11, até 23h59.",
      "",
      "*GTA 6 PS5:* a partir de *[PREÇO]*",
      "*GTA 6 Ultimate PS5:* a partir de *[PREÇO]*",
      "*[JOGO]:* [PREÇO]",
      "*[JOGO]:* [PREÇO]",
      "*[JOGO]:* [PREÇO]",
      "",
      "O site só mostra na sexta, dia 20, dia de vale.",
      "Salva essa mensagem: ela é sua lista de compras.",
      "",
      "Amanhã 10h: é dia de GTA 6.",
    ),
    arte: "Capa oficial do GTA 6 grande no alto e, embaixo, as capas menores dos outros jogos em fila. O preço do GTA 6 vai enorme em branco na faixa roxa e SÓ PRO VIP pequeno em cima.",
    prompt: img({
      capa: "a capa oficial do GTA 6 e as capas oficiais do [JOGO], do [JOGO] e do [JOGO], uma por jogo",
      layout:
        "a capa do GTA 6 fica no alto, centralizada e maior que as outras. Logo abaixo, uma faixa roxa de ponta a ponta com o preço do GTA 6 em branco. Embaixo, as outras 3 capas pequenas em fila, com o nome e o preço embaixo de cada uma, em quase preto. O prazo vai pequeno no rodapé.",
      principal: 'o preço do GTA 6 "a partir de [PREÇO]"',
      textos: [
        "SÓ PRO VIP",
        "GTA 6 PS5",
        "a partir de [PREÇO]",
        "Ultimate: a partir de [PREÇO]",
        "[JOGO]: [PREÇO]",
        "[JOGO]: [PREÇO]",
        "[JOGO]: [PREÇO]",
        "sexta 20 a domingo 22/11",
      ],
    }),
  },
  {
    semana: S4,
    data: "2026-11-19",
    quando: "10h",
    titulo: "Hoje é dia de GTA 6 (confira o preço de hoje no site)",
    status: "preco",
    texto: t(
      "*Hoje é dia de GTA 6.*",
      "",
      "Quer jogar hoje? Tá no site, a partir de *[PREÇO DE HOJE]*:",
      GTA6,
      "",
      "Prefere esperar? Amanhã começa o fim de semana do GTA, com o preço que vocês viram aqui ontem.",
      "",
      "Black: faltam *8 dias*.",
      "Às 19h: o aviso da live de amanhã.",
    ),
    arte: "Capa oficial do GTA 6 grande, ocupando quase toda a metade de cima. Embaixo, HOJE enorme em branco na faixa roxa e o preço de hoje menor no rodapé.",
    prompt: img({
      capa: "a capa oficial do GTA 6",
      layout:
        "a capa fica no alto, centralizada, ocupando cerca de 60% da altura, com cantos levemente arredondados. Logo abaixo, uma faixa roxa de ponta a ponta com a palavra principal em branco. O preço vai no rodapé, em quase preto, menor.",
      principal: 'a palavra "HOJE"',
      textos: ["GTA 6", "HOJE", "PS5 a partir de [PREÇO DE HOJE]"],
    }),
  },
  {
    semana: S4,
    data: "2026-11-19",
    quando: "19h",
    titulo: "Amanhã tem live do GTA 6 (complete horário, onde e o que vai rolar)",
    status: "completar",
    texto: t(
      "*Amanhã tem live do GTA 6: [HORA], [ONDE].*",
      "",
      "O que vai rolar: [O QUE O GEOVANE VAI FAZER NA LIVE, EX.: JOGAR E TIRAR DÚVIDA DE ATIVAÇÃO].",
      "E amanhã começa o fim de semana do GTA, com a lista que vocês viram ontem.",
      "Responde aqui com a pergunta que você quer que eu responda na live.",
      "",
      "Amanhã 19h: o link do fim de semana do GTA, aqui no grupo.",
    ),
    arte: "Imagem só de texto, fundo roxo: LIVE gigante em branco no centro, AMANHÃ, 20/11 em cima e o horário numa caixa clara no rodapé.",
    prompt: img({
      layout: L_NUM,
      principal: 'a palavra "LIVE"',
      textos: ["AMANHÃ, 20/11", "LIVE", "do GTA 6", "[HORA], [ONDE]"],
    }),
  },
  {
    semana: S5,
    data: "2026-11-20",
    quando: "19h",
    titulo: "Começou o fim de semana do GTA (complete a live se ela ainda não passou)",
    status: "blanco",
    texto: t(
      "*Começou o fim de semana do GTA. Hoje é dia 20, dia de vale.*",
      "",
      "*GTA 6 PS5:* a partir de *[PREÇO]*",
      "*GTA 6 Ultimate PS5:* a partir de *[PREÇO]*",
      "E a lista toda mais barata até domingo, 23h59:",
      LINK_GTA,
      "",
      "Live do GTA 6 hoje: [HORA], [ONDE].",
      "Amanhã 19h: o destaque do dia 2.",
    ),
    arte: "Capa oficial do GTA 6 no alto, ocupando metade da imagem. Embaixo, COMEÇOU grande em roxo e o preço enorme em branco na faixa roxa, com ATÉ DOMINGO no rodapé.",
    prompt: img({
      capa: "a capa oficial do GTA 6",
      layout: L_CAPA + ' A palavra "COMEÇOU" vai em roxo, entre a capa e a faixa.',
      principal: 'o preço "a partir de [PREÇO]"',
      textos: [
        "COMEÇOU",
        "GTA 6 PS5",
        "a partir de [PREÇO]",
        "Ultimate: a partir de [PREÇO]",
        ATE_GTA,
      ],
    }),
  },
  {
    semana: S5,
    data: "2026-11-21",
    quando: "19h",
    titulo: "Fim de semana do GTA, dia 2: o destaque de hoje",
    status: "blanco",
    texto: t(
      "*Fim de semana do GTA, dia 2. Destaque de hoje:*",
      "*[JOGO]* a partir de *[PREÇO]*",
      "",
      "[PS4 / PS5]",
      "[MOTIVO REAL PRA JOGAR, EM 1 LINHA]",
      "Vale até amanhã, 23h59:",
      LINK_GTA,
      "",
      "Black: faltam *6 dias*.",
      "Amanhã 19h: o último aviso do fim de semana do GTA.",
    ),
    arte: "Capa oficial do [JOGO] no alto, ocupando metade da imagem. Embaixo, o preço enorme em branco na faixa roxa, DESTAQUE DE HOJE pequeno em cima e o prazo no rodapé.",
    prompt: img({
      capa: "a capa oficial do [JOGO]",
      layout: L_CAPA + ' O texto "DESTAQUE DE HOJE" vai pequeno, em roxo, acima da capa.',
      principal: 'o preço "[PREÇO]"',
      textos: ["DESTAQUE DE HOJE", "[JOGO]", "a partir de", "[PREÇO]", ATE_GTA],
    }),
  },
  {
    semana: S5,
    data: "2026-11-22",
    quando: "19h",
    titulo: "Menos de 5 horas do fim de semana do GTA e a Black vem aí",
    status: "blanco",
    texto: t(
      "*Menos de 5 horas pro fim de semana do GTA acabar.*",
      "Às 23h59 os preços voltam.",
      "",
      "GTA 6 PS5: [PREÇO]",
      "GTA 6 Ultimate PS5: [PREÇO]",
      LINK_GTA,
      "",
      "Sexta, 27/11, começa a Black. A lista sai aqui quinta, 26/11, 19h, um dia antes do site.",
      "Amanhã 19h: me fala qual jogo você quer na Black.",
    ),
    arte: "Imagem só de texto, fundo roxo: 23H59 gigante em branco no centro, ÚLTIMAS HORAS em cima e BLACK: SEXTA, 27/11 numa caixa clara no rodapé.",
    prompt: img({
      layout: L_NUM,
      principal: 'o horário "23H59"',
      textos: ["ÚLTIMAS HORAS", "23H59", "fim de semana do GTA", "Black: sexta, 27/11"],
    }),
  },
  {
    semana: S6,
    data: "2026-11-23",
    quando: "19h",
    titulo: "Faltam 4 dias pra Black: qual jogo você quer na lista",
    status: "pronta",
    texto: t(
      "*Faltam 4 dias pra Black da Soccer.*",
      "Sexta 27 a segunda 30/11, até 23h59.",
      "",
      "Qual jogo você quer ver na lista?",
      "Responde aqui, só o nome do jogo.",
      "",
      "Terça 19h: os 5 mais pedidos.",
      "Quinta 19h: a lista da Black, um dia antes do site.",
    ),
    arte: "Imagem só de texto, fundo roxo: o número 4 gigante em branco no centro, DIAS PRA BLACK logo abaixo e QUAL JOGO VOCÊ QUER? numa caixa clara no rodapé.",
    prompt: img({
      layout: L_NUM,
      principal: 'o número "4"',
      textos: ["faltam", "4", "dias pra Black", "qual jogo você quer? responde no grupo"],
    }),
  },
  {
    semana: S6,
    data: "2026-11-24",
    quando: "19h",
    titulo: "Placar final dos pedidos pra Black (troque pelos 5 mais pedidos de verdade)",
    status: "completar",
    texto: t(
      "*Placar final: os 5 mais pedidos pra Black.*",
      "",
      "1. [JOGO]",
      "2. [JOGO]",
      "3. [JOGO]",
      "4. [JOGO]",
      "5. [JOGO]",
      "",
      "Esses pedidos entraram na conta. Quinta 19h sai a lista.",
      "Amanhã 19h: o primeiro spoiler da Black.",
    ),
    arte: "Imagem só de texto, fundo claro: PLACAR FINAL DOS PEDIDOS numa faixa roxa no alto e os 5 jogos numerados embaixo, com o número 1 bem maior que os outros.",
    prompt: img({
      layout: L_LISTA + " O primeiro da lista fica bem maior que os outros.",
      principal: 'a linha "1. [JOGO]"',
      textos: [
        "PLACAR FINAL DOS PEDIDOS",
        "1. [JOGO]",
        "2. [JOGO]",
        "3. [JOGO]",
        "4. [JOGO]",
        "5. [JOGO]",
        "lista da Black: quinta, 19h",
      ],
    }),
  },
  {
    semana: S6,
    data: "2026-11-25",
    quando: "19h",
    titulo: "Spoiler 1 da Black",
    status: "blanco",
    texto: t(
      "*Spoiler da Black, só pra quem tá aqui:*",
      "*[JOGO]* vai estar na lista, a partir de *[PREÇO]*.",
      "",
      "[1 LINHA: FOI PEDIDO AQUI NO GRUPO? É UM DOS MAIS VENDIDOS?]",
      "",
      "Amanhã 10h: spoiler 2.",
      "Amanhã 19h: a lista inteira.",
    ),
    arte: "Capa oficial do [JOGO] no alto, com SPOILER DA BLACK grande numa faixa roxa em cima. Embaixo, o preço enorme e SEXTA, 27/11 no rodapé.",
    prompt: img({
      capa: "a capa oficial do [JOGO]",
      layout: L_CAPA + ' O texto "SPOILER DA BLACK" vai numa faixa roxa acima da capa.',
      principal: 'o preço "[PREÇO]"',
      textos: ["SPOILER DA BLACK", "[JOGO]", "a partir de", "[PREÇO]", "Black: sexta, 27/11"],
    }),
  },
  {
    semana: S6,
    data: "2026-11-26",
    quando: "10h",
    titulo: "Hoje 19h, a lista. E o spoiler 2",
    status: "blanco",
    texto: t(
      "*Hoje, 19h: a lista da Black. Só aqui.*",
      "",
      "Spoiler 2 pra segurar até lá:",
      "*[JOGO]:* a partir de *[PREÇO]*",
      "Junta com o de ontem: *[JOGO DO SPOILER 1]*.",
      "",
      "A Black começa *amanhã*, sexta 27/11.",
      "Às 19h: a lista inteira.",
    ),
    arte: "Capa oficial do [JOGO] no alto, com SPOILER 2 grande numa faixa roxa em cima. Embaixo, o preço enorme e LISTA HOJE, 19H no rodapé.",
    prompt: img({
      capa: "a capa oficial do [JOGO]",
      layout: L_CAPA + ' O texto "SPOILER 2" vai numa faixa roxa acima da capa.',
      principal: 'o preço "[PREÇO]"',
      textos: ["SPOILER 2", "[JOGO]", "a partir de", "[PREÇO]", "lista da Black: hoje, 19h"],
    }),
  },
  {
    semana: S6,
    data: "2026-11-26",
    quando: "19h",
    titulo: "A lista da Black, só pro VIP",
    status: "blanco",
    texto: t(
      "*A LISTA DA BLACK SAIU. PRIMEIRO AQUI.*",
      "Começa amanhã, sexta 27/11, e vai até segunda 30/11, 23h59.",
      "",
      "*GTA 6 PS5:* a partir de [PREÇO]",
      "*[JOGO 1]:* a partir de [PREÇO]",
      "*[JOGO 2]:* a partir de [PREÇO]",
      "*[JOGO 3]:* a partir de [PREÇO]",
      "*[JOGO 4]:* a partir de [PREÇO]",
      "Vocês pediram e entrou: *[JOGO MAIS PEDIDO QUE ENTROU]*.",
      "",
      "Salva essa mensagem: amanhã ela é sua lista de compras.",
      "Amanhã 10h: começa a Black.",
    ),
    arte: "As capas do GTA 6 e dos outros 4 jogos em grade de 2 colunas, com o preço embaixo de cada uma. No alto, LISTA DA BLACK enorme na faixa roxa e SÓ PRO VIP menor.",
    prompt: img({
      capa: "as capas oficiais do GTA 6, do [JOGO 1], do [JOGO 2], do [JOGO 3] e do [JOGO 4], uma por jogo",
      layout: L_GRADE,
      principal: 'o título "LISTA DA BLACK"',
      textos: [
        "LISTA DA BLACK",
        "só pro VIP",
        "GTA 6 PS5: a partir de [PREÇO]",
        "[JOGO 1]: a partir de [PREÇO]",
        "[JOGO 2]: a partir de [PREÇO]",
        "[JOGO 3]: a partir de [PREÇO]",
        "[JOGO 4]: a partir de [PREÇO]",
        "sexta 27 a segunda 30/11",
      ],
    }),
  },
  {
    semana: S7,
    data: "2026-11-27",
    quando: "10h",
    titulo: "Começou a Black",
    status: "blanco",
    texto: t(
      "*Começou a Black da Soccer.*",
      "Até segunda, 30/11, 23h59.",
      "",
      "Os preços que vocês viram ontem já tão no site:",
      "*GTA 6 PS5:* a partir de [PREÇO]",
      "*[JOGO]:* a partir de [PREÇO]",
      "*[JOGO]:* a partir de [PREÇO]",
      LINK_BLACK,
      "",
      "Às 19h: a Black pro seu bolso.",
    ),
    arte: "Imagem só de texto, fundo roxo: COMEÇOU gigante em branco no centro, BLACK DA SOCCER em cima e ATÉ SEGUNDA, 30/11, 23H59 numa caixa clara no rodapé.",
    prompt: img({
      layout: L_NUM,
      principal: 'a palavra "COMEÇOU"',
      textos: ["BLACK DA SOCCER", "COMEÇOU", "a partir de [PREÇO MAIS BAIXO]", ATE_BLACK],
    }),
  },
  {
    semana: S7,
    data: "2026-11-27",
    quando: "19h",
    titulo: "A Black pro seu bolso",
    status: "blanco",
    texto: t(
      "*A Black pro seu bolso: o que dá pra levar em cada faixa.*",
      "",
      "*Até R$ 100:* [JOGO] + [JOGO] por [SOMA]",
      "*De R$ 100 a R$ 200:* [JOGO] + [JOGO] por [SOMA]",
      "*Mais de R$ 200:* [JOGO] + [JOGO] por [SOMA]",
      "(soma dos preços da Black na secundária)",
      "",
      LINK_BLACK,
      "Amanhã 10h: o destaque do dia 2.",
    ),
    arte: "Imagem só de texto, fundo claro: A BLACK PRO SEU BOLSO numa faixa roxa no alto e as 3 faixas de preço empilhadas, cada uma com os 2 jogos e a soma em roxo.",
    prompt: img({
      layout: L_LISTA,
      principal: 'o título "A BLACK PRO SEU BOLSO"',
      textos: [
        "A BLACK PRO SEU BOLSO",
        "até R$ 100: [JOGO] + [JOGO]",
        "de R$ 100 a R$ 200: [JOGO] + [JOGO]",
        "mais de R$ 200: [JOGO] + [JOGO]",
        ATE_BLACK,
      ],
    }),
  },
  {
    semana: S7,
    data: "2026-11-28",
    quando: "10h",
    titulo: "Black, dia 2: o destaque de hoje",
    status: "blanco",
    texto: t(
      "*Black, dia 2. Destaque de hoje: [JOGO] a partir de [PREÇO].*",
      "",
      "[PS4 / PS5]",
      "[MOTIVO REAL PRA JOGAR, EM 1 LINHA]",
      LINK_BLACK,
      "",
      "Faltam *3 dias* de Black, até segunda 23h59.",
      "Às 19h: as duplas pra jogar com amigo.",
    ),
    arte: "Capa oficial do [JOGO] no alto, ocupando metade da imagem. Embaixo, o preço enorme em branco na faixa roxa, DESTAQUE DA BLACK pequeno em cima e o prazo no rodapé.",
    prompt: img({
      capa: "a capa oficial do [JOGO]",
      layout: L_CAPA + ' O texto "DESTAQUE DA BLACK" vai pequeno, em roxo, acima da capa.',
      principal: 'o preço "[PREÇO]"',
      textos: ["DESTAQUE DA BLACK", "[JOGO]", "a partir de", "[PREÇO]", ATE_BLACK],
    }),
  },
  {
    semana: S7,
    data: "2026-11-28",
    quando: "19h",
    titulo: "Duplas da Black pra jogar com amigo",
    status: "blanco",
    texto: t(
      "*Sábado com a galera? 2 duplas da Black pra jogar junto:*",
      "",
      "*[JOGO] + [JOGO]:* [SOMA]",
      "*[JOGO] + [JOGO]:* [SOMA]",
      "[1 LINHA: ONLINE OU NO MESMO CONSOLE]",
      "",
      LINK_BLACK,
      "Amanhã 19h: o GTA 6 na Black.",
    ),
    arte: "As 4 capas em 2 linhas, cada dupla lado a lado com um + roxo entre elas e a soma embaixo. No alto, PRA JOGAR COM AMIGO grande na faixa roxa.",
    prompt: img({
      capa: "as capas oficiais dos 4 jogos das duplas, uma por jogo: [JOGO], [JOGO], [JOGO] e [JOGO]",
      layout:
        "o título vai no alto, numa faixa roxa com texto branco. Embaixo, duas linhas: em cada uma, duas capas lado a lado com um sinal de mais roxo entre elas e a soma da dupla logo abaixo, em quase preto. O prazo vai pequeno no rodapé.",
      principal: 'o título "PRA JOGAR COM AMIGO"',
      textos: [
        "PRA JOGAR COM AMIGO",
        "[JOGO] + [JOGO]: [SOMA]",
        "[JOGO] + [JOGO]: [SOMA]",
        ATE_BLACK,
      ],
    }),
  },
  {
    semana: S7,
    data: "2026-11-29",
    quando: "19h",
    titulo: "Amanhã é o último dia, e o GTA 6 na Black",
    status: "blanco",
    texto: t(
      "*Amanhã é o último dia da Black, até 23h59.*",
      "",
      "Quem esperou o GTA 6 baixar: na Black ele tá a partir de *[PREÇO]* no PS5.",
      "Ultimate a partir de [PREÇO].",
      LINK_BLACK,
      "",
      "Amanhã 19h: o último aviso, com o que vocês mais levaram.",
    ),
    arte: "Capa oficial do GTA 6 no alto. Embaixo, o preço da Black enorme em branco na faixa roxa e AMANHÃ É O ÚLTIMO DIA no rodapé.",
    prompt: img({
      capa: "a capa oficial do GTA 6",
      layout: L_CAPA,
      principal: 'o preço "a partir de [PREÇO]"',
      textos: ["GTA 6 PS5 na Black", "a partir de [PREÇO]", "amanhã é o último dia"],
    }),
  },
  {
    semana: S7,
    data: "2026-11-30",
    quando: "19h",
    titulo:
      "Menos de 5 horas de Black: o que vocês mais levaram (troque pelos que mais venderam de verdade)",
    status: "blanco",
    texto: t(
      "*Menos de 5 horas pra acabar a Black. Às 23h59 os preços voltam ao normal.*",
      "",
      "O que vocês mais levaram:",
      "1. [JOGO], a partir de [PREÇO]",
      "2. [JOGO], a partir de [PREÇO]",
      "3. [JOGO], a partir de [PREÇO]",
      "",
      "Se um deles tava na sua lista, é hoje:",
      LINK_BLACK,
      "",
      "Valeu por esse mês aqui no grupo.",
    ),
    arte: "As 3 capas lado a lado, com 1, 2 e 3 grandes em roxo em cima de cada uma, O QUE VOCÊS MAIS LEVARAM no alto e MENOS DE 5 HORAS no rodapé.",
    prompt: img({
      capa: "as capas oficiais dos 3 jogos que mais saíram na Black, uma por jogo: [JOGO], [JOGO] e [JOGO]",
      layout: L_LADO + " Em cima de cada capa, a posição (1, 2 e 3) grande em roxo.",
      principal: 'o título "O QUE VOCÊS MAIS LEVARAM"',
      textos: [
        "O QUE VOCÊS MAIS LEVARAM",
        "1",
        "2",
        "3",
        "[JOGO]",
        "[JOGO]",
        "[JOGO]",
        "menos de 5 horas",
      ],
    }),
  },
];

export const msgsDoDia = (d: string) => GRUPO_MSGS.filter((m) => m.data === d);
export const proximaMsg = (d: string) => GRUPO_MSGS.find((m) => m.data > d) ?? null;
