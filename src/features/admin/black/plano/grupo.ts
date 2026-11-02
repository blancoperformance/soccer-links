/**
 * Mensagens do Grupo VIP de novembro, uma por dia de envio, prontas para copiar.
 * Quem atualiza: a Blanco, toda quinta, com a lista da semana seguinte (é só editar este arquivo).
 * Ritmo: segunda (semana aberta), quarta (lembrete), sexta 19h (lista da próxima semana, antes
 * de todo mundo) e domingo (últimas horas). Mais que isso faz o povo silenciar o grupo.
 * Sem cupom: cada jogo tem preço próprio (primária e secundária), o preço já vem baixo no site.
 */

export type GrupoStatus = "pronta" | "blanco" | "preco";

export interface GrupoMsg {
  semana: string;
  /** AAAA-MM-DD */
  data: string;
  /** Hora ou período do envio. */
  quando: string;
  titulo: string;
  status: GrupoStatus;
  texto: string;
  /** O que vai na imagem (o Geovane faz no modelo dele). */
  arte: string;
}

export const GRUPO_STATUS: Record<GrupoStatus, { n: string; tone: "ok" | "info" | "warn" }> = {
  pronta: { n: "Pronta pra mandar", tone: "ok" },
  blanco: { n: "A Blanco completa na quinta", tone: "info" },
  preco: { n: "Falta o preço", tone: "warn" },
};

/** Os links são os mesmos em tudo: grupo, bio, stories e anúncio. Mudou a oferta, muda aqui. */
export const GRUPO_LINKS: { nome: string; url: string }[] = [
  {
    nome: "Oferta da semana (até 08/11)",
    url: "https://lojasoccergames.com.br/oferta-de-luta-e-futebol/",
  },
  {
    nome: "GTA 6 PS5, pré-venda",
    url: "https://lojasoccergames.com.br/produtos/gta-6-grand-theft-auto-vi-ps5-midia-digital/",
  },
  {
    nome: "GTA 6 Ultimate PS5",
    url: "https://lojasoccergames.com.br/produtos/gta-6-grand-theft-auto-vi-ultimate-edition-ps5-midia-digital/",
  },
  {
    nome: "Mais vendidos",
    url: "https://lojasoccergames.com.br/best-sellers/",
  },
  {
    nome: "Lançamentos",
    url: "https://lojasoccergames.com.br/lancamentos/",
  },
  {
    nome: "Entrar no Grupo VIP",
    url: "https://links.lojasoccergames.com.br/black",
  },
  {
    nome: "Link da bio",
    url: "https://links.lojasoccergames.com.br/",
  },
];

export const GRUPO_MSGS: GrupoMsg[] = [
  {
    semana: "Semana 1 · Luta ou Futebol (02 a 08/11)",
    data: "2026-11-02",
    quando: "à noite",
    titulo: "Boas-vindas a novembro e a oferta da semana",
    status: "pronta",
    texto:
      "Chegou novembro, o mês mais forte do ano aqui na Soccer.\nDia 19 tem GTA 6. Dia 27 começa a Black.\nQuem tá aqui no VIP fica sabendo de tudo antes.\n\nEssa semana é LUTA ou FUTEBOL:\nFC 26 de PS5 a partir de R$ 79,90\nUFC 6 de PS5 a partir de R$ 119,90\nTekken 7, Naruto e Dragon Ball a partir de R$ 39,90\nAté domingo, 23h59: https://lojasoccergames.com.br/oferta-de-luta-e-futebol/\n\nE a partir dessa sexta, às 19h, vocês recebem aqui a lista da semana seguinte 3 dias antes do site.",
    arte: "Abertura de novembro. Texto na imagem: NOVEMBRO NA SOCCER · GTA 6 DIA 19 · BLACK DIA 27. Controle de PS5, sem personagem de jogo.",
  },
  {
    semana: "Semana 1 · Luta ou Futebol (02 a 08/11)",
    data: "2026-11-04",
    quando: "fim da tarde",
    titulo: "Lembrete: os 2 mais fortes",
    status: "pronta",
    texto:
      "Time LUTA ou time FUTEBOL?\nFC 26 de PS5 por R$ 79,90 ou UFC 6 de PS5 por R$ 119,90.\nOs dois até domingo: https://lojasoccergames.com.br/oferta-de-luta-e-futebol/",
    arte: "Cartão dividido no meio: LUTA de um lado, FUTEBOL do outro, os 2 preços grandes.",
  },
  {
    semana: "Semana 1 · Luta ou Futebol (02 a 08/11)",
    data: "2026-11-06",
    quando: "19h",
    titulo: "Lista da semana 09 a 15/11, antes de todo mundo",
    status: "blanco",
    texto:
      "LISTA DA SEMANA QUE VEM, PRIMEIRO AQUI\nEsses jogos já estão com preço de oferta no site. Só quem tá aqui sabe até segunda:\n(a lista e o link chegam na quinta 05/11)\n\nE dia 19 tem GTA 6. Quem tá aqui fica sabendo antes.",
    arte: "Lista com os jogos e preços da semana. Texto na imagem: PRIMEIRO AQUI · SÓ PRO VIP.",
  },
  {
    semana: "Semana 1 · Luta ou Futebol (02 a 08/11)",
    data: "2026-11-08",
    quando: "fim da tarde",
    titulo: "Últimas horas da semana",
    status: "pronta",
    texto:
      "Últimas horas da semana LUTA ou FUTEBOL.\nTermina hoje às 23h59: https://lojasoccergames.com.br/oferta-de-luta-e-futebol/\nAmanhã a semana que vocês viram aqui na sexta abre pra todo mundo.",
    arte: "Relógio ou contagem. Texto na imagem: ÚLTIMAS HORAS · ATÉ 23H59.",
  },
  {
    semana: "Semana 2 (09 a 15/11)",
    data: "2026-11-09",
    quando: "manhã",
    titulo: "Semana 2 aberta pra todos e faltam 10 dias pro GTA 6",
    status: "blanco",
    texto: "(a Blanco completa na quinta 05/11, junto com a lista)",
    arte: "(chega com a lista)",
  },
  {
    semana: "Semana 2 (09 a 15/11)",
    data: "2026-11-11",
    quando: "fim da tarde",
    titulo: "Lembrete da semana 2",
    status: "blanco",
    texto: "(a Blanco completa na quinta 05/11)",
    arte: "(chega com a lista)",
  },
  {
    semana: "Semana 2 (09 a 15/11)",
    data: "2026-11-13",
    quando: "19h",
    titulo: "Lista do fim de semana do GTA, antes de todo mundo",
    status: "preco",
    texto:
      "LISTA DO FIM DE SEMANA DO GTA, PRIMEIRO AQUI\nDe sexta 20/11 a domingo 22/11, todos esses jogos baixam:\n[JOGO]: [PREÇO]\n[JOGO]: [PREÇO]\n[JOGO]: [PREÇO]\nO preço do GTA 6 do fim de semana sai aqui na quarta, 18/11.\nFaltam 6 dias pro GTA 6.",
    arte: "Fundo preto, texto: FIM DE SEMANA DO GTA · 20 A 22/11 · PRIMEIRO AQUI.",
  },
  {
    semana: "Semana 2 (09 a 15/11)",
    data: "2026-11-15",
    quando: "fim da tarde",
    titulo: "Últimas horas da semana 2",
    status: "blanco",
    texto: "(a Blanco completa na quinta 12/11)",
    arte: "(chega com a lista)",
  },
  {
    semana: "GTA 6 (16 a 22/11)",
    data: "2026-11-18",
    quando: "fim da tarde",
    titulo: "Preço do GTA 6 do fim de semana, só pro VIP",
    status: "preco",
    texto:
      "CHEGOU A LISTA, SÓ PRA VOCÊS\nDe sexta a domingo, 20 a 22/11, todos os jogos baixam. Os destaques:\nGTA 6 PS5: [PREÇO]\n[JOGO]: [PREÇO]\n[JOGO]: [PREÇO]\nAmanhã é dia de GTA 6.",
    arte: "Preço do GTA 6 bem grande, capinha oficial do jogo (a foto do produto no site).",
  },
  {
    semana: "GTA 6 (16 a 22/11)",
    data: "2026-11-19",
    quando: "manhã",
    titulo: "GTA 6 chegou",
    status: "pronta",
    texto:
      "O GTA 6 chegou.\nE amanhã começa o fim de semana do GTA aqui na Soccer: todos os jogos mais baratos até domingo.\nVocês já sabem os preços, viram aqui primeiro.",
    arte: "Capinha oficial do GTA 6. Texto na imagem: CHEGOU · FIM DE SEMANA DO GTA COMEÇA AMANHÃ.",
  },
  {
    semana: "GTA 6 (16 a 22/11)",
    data: "2026-11-20",
    quando: "manhã",
    titulo: "Começou o fim de semana do GTA",
    status: "preco",
    texto:
      "Começou o fim de semana do GTA 6.\nTodos os jogos mais baratos até domingo, 22/11.\nGTA 6 PS5 por [PREÇO].\nLoja: [LINK DA OFERTA]",
    arte: "Fundo preto, texto: COMEÇOU · ATÉ DOMINGO.",
  },
  {
    semana: "GTA 6 (16 a 22/11)",
    data: "2026-11-22",
    quando: "fim da tarde",
    titulo: "Últimas horas do fim de semana do GTA",
    status: "pronta",
    texto:
      "Últimas horas do fim de semana do GTA.\nTermina hoje às 23h59.\nE segura a ansiedade: dia 27 começa a Black.",
    arte: "Contagem. Texto na imagem: ÚLTIMAS HORAS · BLACK DIA 27.",
  },
  {
    semana: "Black (23 a 30/11)",
    data: "2026-11-23",
    quando: "manhã",
    titulo: "A Black vem aí",
    status: "pronta",
    texto:
      "A Black da Soccer começa sexta, 27/11, e vai até segunda, 30/11.\nNa quinta a lista sai aqui primeiro, um dia antes do site.\nJá vai separando os jogos que você quer.",
    arte: "Fundo preto, texto: BLACK SOCCER · SEXTA 27/11 · LISTA NA QUINTA, AQUI.",
  },
  {
    semana: "Black (23 a 30/11)",
    data: "2026-11-26",
    quando: "19h",
    titulo: "A lista da Black, só pro VIP",
    status: "preco",
    texto:
      "A LISTA DA BLACK SAIU, PRIMEIRO AQUI\nAmanhã, sexta 27/11, começa a Black da Soccer. Vai até segunda, 30/11.\nDestaques:\nGTA 6 PS5: [PREÇO]\n[JOGO]: [PREÇO]\n[JOGO]: [PREÇO]\n[JOGO]: [PREÇO]",
    arte: "Lista dos destaques com preço grande. Texto na imagem: LISTA DA BLACK · SÓ PRO VIP.",
  },
  {
    semana: "Black (23 a 30/11)",
    data: "2026-11-27",
    quando: "manhã",
    titulo: "Começou a Black",
    status: "preco",
    texto:
      "Começou a Black da Soccer.\nTodos os jogos com desconto até segunda, 30/11.\nLoja: [LINK DA BLACK]",
    arte: "Fundo preto, texto: BLACK FRIDAY · ATÉ SEGUNDA 30/11.",
  },
  {
    semana: "Black (23 a 30/11)",
    data: "2026-11-30",
    quando: "manhã",
    titulo: "Último dia da Black",
    status: "preco",
    texto:
      "Último dia da Black da Soccer.\nHoje à meia-noite os preços voltam ao normal.\nLoja: [LINK DA BLACK]",
    arte: "Relógio. Texto na imagem: ÚLTIMO DIA · ATÉ MEIA-NOITE.",
  },
];

export const msgsDoDia = (d: string) => GRUPO_MSGS.filter((m) => m.data === d);
export const proximaMsg = (d: string) => GRUPO_MSGS.find((m) => m.data > d) ?? null;
