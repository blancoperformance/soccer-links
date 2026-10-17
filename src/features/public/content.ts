/**
 * Tudo o que aparece no links da Soccer Games e muda com frequência fica aqui:
 * perfil, redes, botões, campanha do topo, atendimento, quiz e o Grupo VIP.
 * Os jogos vêm de games.json (planilha da loja) e os preços, ao vivo da loja.
 *
 * Regra: só fato confirmado. Prazos, regras e horários são os mesmos da Central de Atendimento.
 */
export type ItemType = "link" | "feature" | "quiz" | "coupon" | "map";

export interface LinkItem {
  id: string;
  type: ItemType;
  title: string;
  subtitle?: string;
  url?: string;
  thumbnail?: string;
  images?: string[];
  couponCode?: string;
  slug: string;
  visible: boolean;
  startsAt?: string;
  endsAt?: string;
  mapQuery?: string;
  icon?: IconName;
  tags?: string[];
}

export type IconName =
  | "sparkles"
  | "store"
  | "handshake"
  | "map-pin"
  | "message-circle"
  | "mail"
  | "package-search"
  | "repeat"
  | "life-buoy"
  | "file-text"
  | "circle-help"
  | "ticket"
  | "gamepad"
  | "key"
  | "shield";

/** Mantido para o painel e o quiz: um "produto" é um jogo do catálogo. */
export interface Product {
  id: string;
  name: string;
  slug: string;
  url: string;
  image: string;
  price?: number;
  tags?: string[];
}
export interface Collection {
  id: string;
  name: string;
  slug: string;
  products: Product[];
}

const STORE = "https://lojasoccergames.com.br";
const CENTRAL = `${STORE}/central-de-atendimento/`;
const WA = "5518996366686";
const wa = (text: string) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;

export const profile = {
  name: "Soccer Games",
  tagline: "Jogos digitais de PS4 e PS5 com entrega por e-mail e garantia vitalícia.",
  /**
   * Logo da loja: coloque o PNG (fundo transparente) em public/logo-soccer.png e troque para "/logo-soccer.png".
   * Vazio = o nome "Soccer Games" escrito com a fonte da marca.
   */
  logo: "/logo-soccer.png",
  showPrices: true,
};

export const socials = [
  { platform: "instagram", label: "Instagram", url: "https://www.instagram.com/soccer.gamees/" },
  { platform: "youtube", label: "YouTube", url: "https://www.youtube.com/@soccergamesofc" },
] as const;

export const contact = {
  whatsapp: WA,
  email: "soccerg810@gmail.com",
  hours: "Segunda a sábado, das 9h às 21h. Domingo, das 9h às 15h.",
};

/** Botões do atendimento (seção "Atendimento"). visible: false esconde sem apagar. */
export const items: LinkItem[] = [
  {
    id: "central",
    type: "link",
    title: "Central de Atendimento",
    subtitle: "Entrega, ativação, licenças, pagamento e garantia",
    url: CENTRAL,
    slug: "central",
    icon: "life-buoy",
    tags: ["atendimento"],
    visible: true,
  },
  {
    id: "ativar",
    type: "link",
    title: "Como ativar o jogo",
    subtitle: "Passo a passo no PS4 e no PS5",
    url: `${STORE}/ajuda-ativar-e-jogar/`,
    slug: "ativar",
    icon: "gamepad",
    tags: ["atendimento", "ativacao"],
    visible: true,
  },
  {
    id: "licencas",
    type: "link",
    title: "Primária ou secundária?",
    subtitle: "Qual licença escolher",
    url: `${STORE}/ajuda-primaria-ou-secundaria/`,
    slug: "licencas",
    icon: "key",
    tags: ["atendimento", "licenca"],
    visible: true,
  },
  {
    id: "pedido",
    type: "link",
    title: "Meu pedido não chegou",
    subtitle: "Prazos de entrega por e-mail",
    url: `${STORE}/ajuda-pedidos-e-entrega/`,
    slug: "pedido",
    icon: "package-search",
    tags: ["atendimento", "pedido"],
    visible: true,
  },
  {
    id: "garantia",
    type: "link",
    title: "Garantia e suporte",
    subtitle: "Garantia vitalícia em todas as contas",
    url: `${STORE}/ajuda-garantia-e-suporte/`,
    slug: "garantia",
    icon: "shield",
    tags: ["atendimento", "garantia"],
    visible: true,
  },
  {
    id: "email",
    type: "link",
    title: "Atendimento por e-mail",
    subtitle: "soccerg810@gmail.com",
    url: "mailto:soccerg810@gmail.com?subject=Atendimento%20Soccer%20Games",
    slug: "email",
    icon: "mail",
    tags: ["atendimento"],
    visible: true,
  },
  {
    id: "loja",
    type: "link",
    title: "Ver a loja completa",
    url: `${STORE}/`,
    slug: "site",
    icon: "store",
    tags: ["loja"],
    visible: false,
  },
];

/** "claro" (identidade da loja: branco, roxo #C000FF e preto) ou "escuro" (para uma campanha). */
export const theme: "claro" | "escuro" = "claro";

/**
 * Banner do topo. Pode apontar para a página da Black (/black) ou para uma oferta da loja.
 * Contagem só aparece quando endsAt é uma data real.
 */
export const campaign: {
  enabled: boolean;
  badge?: string;
  title: string;
  subtitle?: string;
  cta: string;
  url: string;
  slug: string;
  image?: string;
  endsAt?: string;
} = {
  enabled: false,
  badge: "Black November",
  title: "Grupo VIP da Black",
  subtitle: "As ofertas da Black chegam primeiro no grupo.",
  cta: "Entrar no grupo",
  url: "/black",
  slug: "black-vip",
};

/** Respostas que mais chegam no WhatsApp, resolvidas aqui. Mesmos fatos da Central. */
export const quickAnswers: { q: string; a: string; action?: { label: string; url: string } }[] = [
  {
    q: "Em quanto tempo recebo o jogo?",
    a: "Pix: em geral menos de 30 minutos. Cartão: até 1 hora após a aprovação. Boleto: até 3 dias úteis para compensar. Os envios acontecem no horário de atendimento. Pedido pago fora desse horário é enviado assim que o atendimento abre.",
    action: { label: "Ver prazos de entrega", url: `${STORE}/ajuda-pedidos-e-entrega/` },
  },
  {
    q: "Qual a diferença entre primária e secundária?",
    a: "A primária joga offline e em qualquer perfil do console. A secundária é mais barata e funciona com conexão ativa e com a conta fornecida pela Soccer Games logada no console.",
    action: { label: "Entender as licenças", url: `${STORE}/ajuda-primaria-ou-secundaria/` },
  },
  {
    q: "Como ativo o jogo no console?",
    a: "Os dados de acesso chegam no seu e-mail. No PS5, a ativação é por Compartilhamento de console e jogo offline. No PS4, por Ativar como seu PS4 principal. Na secundária, você entra na conta, baixa o jogo e joga com ela logada e online.",
    action: { label: "Ver o passo a passo", url: `${STORE}/ajuda-ativar-e-jogar/` },
  },
  {
    q: "O jogo é original? Tem garantia?",
    a: "Sim. São licenças digitais de jogos originais da PlayStation Store, com garantia vitalícia em todas as contas, seguindo as regras de utilização.",
    action: { label: "Ver garantia e regras", url: `${STORE}/ajuda-garantia-e-suporte/` },
  },
  {
    q: "Posso trocar de console depois?",
    a: "A conta não pode ser removida nem migrada para outro console. Ao trocar de aparelho, é preciso uma nova compra. Em caso de dúvida, fale com o atendimento antes de trocar.",
    action: { label: "Ler as regras da conta", url: `${STORE}/ajuda-regras-da-conta/` },
  },
];

/** Garantias mostradas embaixo dos botões principais. */
export const trust: { icon: "mail" | "shield" | "clock"; title: string; text: string }[] = [
  { icon: "mail", title: "Chega no e-mail", text: "Pix em geral em menos de 30 min" },
  { icon: "shield", title: "Garantia vitalícia", text: "Em todas as contas" },
  { icon: "clock", title: "Atendimento", text: "Todos os dias" },
];

/** Bloco "Comunidade" no fim da página. */
export const community = {
  creator: {
    enabled: false,
    title: "Seja creator Soccer",
    sub: "Crie conteúdo com a gente",
  },
  vip: {
    enabled: false,
    title: "Grupo VIP",
    sub: "Ofertas e lançamentos antes de todo mundo",
    url: "/black",
  },
  playlist: { enabled: false, title: "", sub: "", url: "" },
};

/**
 * Cupom em troca do WhatsApp no fim do quiz. Vazio = sem cupom (a Soccer trabalha com preço
 * baixo direto no site, sem cupom). O passo de contato continua, oferecendo as indicações no WhatsApp.
 */
export const quizReward = {
  coupon: "",
  headline: "",
  short: "",
};

/* ---------- quiz ---------- */

export interface QuizOption {
  id: string;
  label: string;
  /** Sinais que pontuam os jogos (gênero, tag, plataforma, coleção). */
  tags: string[];
  hint?: string;
  giftFlag?: boolean;
  /** Mostra a opção só quando outra resposta for uma destas. Ex.: { genero: ["tiro"] }. */
  onlyIf?: Record<string, string[]>;
}
export interface QuizQuestion {
  id: string;
  question: string;
  sub?: string;
  options: QuizOption[];
  onlyIf?: Record<string, string[]>;
}

export const quiz: QuizQuestion[] = [
  {
    id: "console",
    question: "Qual é o seu console?",
    options: [
      { id: "ps5", label: "PlayStation 5", tags: ["plat:PS5"] },
      { id: "ps4", label: "PlayStation 4", tags: ["plat:PS4"] },
    ],
  },
  {
    id: "para-quem",
    question: "O jogo é para quem?",
    options: [
      { id: "eu", label: "Para mim", tags: [] },
      { id: "crianca", label: "Para uma criança", tags: ["genre:Infantil", "tag:familia"] },
      {
        id: "presente",
        label: "Para dar de presente",
        tags: ["coll:mais-vendidos"],
        giftFlag: true,
      },
    ],
  },
  {
    id: "jeito",
    question: "Como você mais gosta de jogar?",
    options: [
      {
        id: "historia",
        label: "Sozinho, com uma boa história",
        tags: ["tag:singleplayer", "tag:historia", "tag:narrativa", "tag:campanha"],
      },
      { id: "online", label: "Online com os amigos", tags: ["tag:online", "tag:multiplayer"] },
      {
        id: "sofa",
        label: "Junto, no mesmo sofá",
        tags: ["tag:coop-local", "tag:cooperativo", "tag:coop", "tag:party-game", "tag:versus"],
      },
      { id: "tanto-faz", label: "Um pouco de tudo", tags: [] },
    ],
  },
  {
    id: "genero",
    question: "Que tipo de jogo combina com você?",
    options: [
      {
        id: "futebol",
        label: "Futebol e esportes",
        tags: ["genre:Esportes", "tag:futebol", "tag:esportes"],
      },
      { id: "tiro", label: "Tiro", tags: ["genre:Tiro", "tag:fps", "tag:tiro"] },
      {
        id: "acao",
        label: "Ação e aventura",
        tags: ["genre:Ação", "genre:Aventura", "tag:acao-e-aventura"],
      },
      { id: "corrida", label: "Corrida", tags: ["genre:Corrida", "tag:corrida"] },
      { id: "luta", label: "Luta", tags: ["genre:Luta", "tag:luta", "tag:fighting-game"] },
      {
        id: "terror",
        label: "Terror",
        tags: ["genre:Terror", "tag:terror", "tag:survival-horror"],
      },
      { id: "rpg", label: "RPG", tags: ["genre:RPG", "tag:rpg"] },
      {
        id: "infantil",
        label: "Aventura para a família",
        tags: ["genre:Infantil", "tag:familia", "tag:plataforma"],
        onlyIf: { "para-quem": ["crianca", "presente"] },
      },
    ],
  },
  {
    id: "estilo",
    question: "E dentro disso, o que você curte mais?",
    onlyIf: { genero: ["futebol", "tiro", "acao", "corrida", "luta", "terror", "rpg", "infantil"] },
    options: [
      // futebol e esportes
      {
        id: "futebol",
        label: "Futebol",
        tags: ["tag:futebol", "tag:ultimate-team", "tag:carreira"],
        onlyIf: { genero: ["futebol"] },
      },
      {
        id: "basquete",
        label: "Basquete",
        tags: ["tag:basquete"],
        onlyIf: { genero: ["futebol"] },
      },
      {
        id: "combate",
        label: "UFC e luta livre",
        tags: ["tag:mma", "tag:wrestling", "tag:wwe"],
        onlyIf: { genero: ["futebol"] },
      },
      // tiro
      {
        id: "guerra",
        label: "Guerra e campanha",
        tags: ["tag:guerra", "tag:campanha", "tag:call-of-duty"],
        onlyIf: { genero: ["tiro"] },
      },
      {
        id: "online-tiro",
        label: "Partidas online rápidas",
        tags: ["tag:online", "tag:multiplayer", "tag:fps"],
        onlyIf: { genero: ["tiro"] },
      },
      {
        id: "zumbi",
        label: "Zumbis e sobrevivência",
        tags: ["tag:zumbis", "tag:sobrevivencia", "tag:cooperativo"],
        onlyIf: { genero: ["tiro", "terror"] },
      },
      {
        id: "sniper",
        label: "Furtividade e sniper",
        tags: ["tag:sniper", "tag:stealth", "tag:tatico"],
        onlyIf: { genero: ["tiro"] },
      },
      // ação e aventura
      {
        id: "mundo-aberto",
        label: "Mundo aberto para explorar",
        tags: ["tag:mundo-aberto", "tag:exploracao"],
        onlyIf: { genero: ["acao", "rpg", "corrida"] },
      },
      {
        id: "heroi",
        label: "Super-heróis",
        tags: ["tag:super-heroi", "tag:marvel", "tag:spider-man"],
        onlyIf: { genero: ["acao"] },
      },
      {
        id: "espada",
        label: "Espadas e combate",
        tags: ["tag:hack-and-slash", "tag:samurai", "tag:combate", "tag:soulslike"],
        onlyIf: { genero: ["acao", "rpg"] },
      },
      {
        id: "crime",
        label: "Crime e perseguição",
        tags: ["tag:crime", "tag:gta", "tag:grand-theft-auto", "tag:perseguicao-policial"],
        onlyIf: { genero: ["acao", "corrida"] },
      },
      // corrida
      {
        id: "arcade",
        label: "Arcade e tuning",
        tags: ["tag:arcade", "tag:tuning", "tag:need-for-speed"],
        onlyIf: { genero: ["corrida"] },
      },
      {
        id: "simulacao",
        label: "Simulação e Fórmula 1",
        tags: ["tag:simulacao", "tag:motorsport", "tag:pilotagem"],
        onlyIf: { genero: ["corrida"] },
      },
      { id: "motos", label: "Motos", tags: ["tag:motos"], onlyIf: { genero: ["corrida"] } },
      // luta
      {
        id: "anime",
        label: "Anime",
        tags: ["tag:anime", "tag:dragon-ball", "tag:arena-fighter"],
        onlyIf: { genero: ["luta", "rpg"] },
      },
      {
        id: "classico-luta",
        label: "Luta clássica de versus",
        tags: ["tag:versus", "tag:fighting-game", "tag:combos", "tag:arcade"],
        onlyIf: { genero: ["luta"] },
      },
      // terror
      {
        id: "suspense",
        label: "Suspense e história",
        tags: ["tag:suspense", "tag:narrativa", "tag:atmosfera", "tag:escolhas"],
        onlyIf: { genero: ["terror"] },
      },
      // RPG
      {
        id: "fantasia",
        label: "Fantasia e magia",
        tags: ["tag:fantasia", "tag:rpg-de-acao"],
        onlyIf: { genero: ["rpg"] },
      },
      // família
      {
        id: "lego",
        label: "LEGO e personagens",
        tags: ["tag:lego", "tag:pixar", "tag:sonic", "tag:crash-bandicoot"],
        onlyIf: { genero: ["infantil"] },
      },
      {
        id: "festa",
        label: "Jogos de festa em grupo",
        tags: ["tag:party-game", "tag:coop-local", "tag:humor"],
        onlyIf: { genero: ["infantil"] },
      },
      { id: "qualquer", label: "Tanto faz, me surpreenda", tags: [] },
    ],
  },
  {
    id: "momento",
    question: "Prefere um lançamento ou um clássico com preço baixo?",
    options: [
      { id: "lancamento", label: "Lançamento", tags: ["coll:lancamentos", "coll:pre-venda"] },
      {
        id: "classico",
        label: "Clássico que todo mundo joga",
        tags: ["coll:mais-vendidos", "coll:classicos"],
      },
      {
        id: "oferta",
        label: "O que estiver em oferta",
        tags: ["coll:sazonal", "coll:classicos", "cheap"],
      },
      { id: "tanto-faz", label: "Tanto faz", tags: [] },
    ],
  },
  {
    id: "licenca",
    question: "Qual licença faz mais sentido para você?",
    sub: "A gente indica a licença junto com o jogo.",
    options: [
      {
        id: "primaria",
        label: "Primária",
        hint: "Joga offline e em qualquer perfil do console.",
        tags: ["lic:primaria"],
      },
      {
        id: "secundaria",
        label: "Secundária",
        hint: "Mais barata. Joga com internet e a conta da Soccer Games logada.",
        tags: ["lic:secundaria", "cheap"],
      },
      { id: "nao-sei", label: "Ainda não sei", hint: "Mostramos as duas no resultado.", tags: [] },
    ],
  },
];

/**
 * Caça-ofertas (roleta e ranking): usa só os preços reais da loja.
 * endsAt = fim da campanha que está no ar na loja (deixe "" quando não houver). Atualize a cada campanha.
 */
export const offers: { label: string; endsAt?: string } = {
  label: "A semana dos clássicos",
  endsAt: "2026-10-18T23:59:00-03:00",
};

/**
 * Sacola (vários jogos de uma vez). Só ligue depois que o script da sacola estiver no GTM da loja
 * e testado: sem ele, o carrinho abre vazio. Desligada, o Comprar abre o produto na loja.
 */
export const bagEnabled = false;
