/**
 * /black da Soccer: o mesmo motor da landing da Black da MTS (selo animado, contagem que rola,
 * blocos animados, trilho, dúvidas), portado por scripts/port-black.py, com o conteúdo da Soccer
 * e a montagem dos trailers oficiais do GTA VI no fundo.
 */
import markup from "./landing.html?raw";
import engine from "./landing-engine.txt?raw";
import { black } from "./config";
import { blackFaq } from "./faq";

const esc = (t: string) =>
  t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function faqHtml() {
  const qi = (q: string, a: string) =>
    `<div class="bfm-qi"><button class="bfm-q" type="button" aria-expanded="false"><span>${esc(q)}</span><span class="bfm-q-ico" aria-hidden="true">&nbsp;</span></button><div class="bfm-qa"><p>${esc(a)}</p></div></div>`;
  const group = (g: (typeof blackFaq)[number]) =>
    `<div class="bfm-fg"><span class="bfm-fg-l">${esc(g.group)}</span><div class="bfm-fg-list">${g.items.map((i) => qi(i.q, i.a)).join("")}</div></div>`;
  const [first, ...rest] = blackFaq;
  const total = blackFaq.reduce((n, g) => n + g.items.length, 0);
  return (
    `<div class="bfm-faq-b">${first ? group(first) : ""}` +
    (rest.length
      ? `<div class="bfm-fg-more" id="bfm-fg-more"><div class="bfm-fg-in">${rest.map(group).join("")}</div></div>` +
        `<button class="bfm-more-b" type="button" aria-controls="bfm-fg-more" aria-expanded="false" data-n="${total}"><span>Ver todas as dúvidas (${total})</span><span class="bfm-q-ico" aria-hidden="true">&nbsp;</span></button>`
      : "") +
    `</div>`
  );
}

export const landingHtml = markup.replace("<!--FAQ-->", faqHtml());

/** Próximo marco da campanha: para onde a contagem aponta. */
export function nextMark(now = Date.now()) {
  const marks = [
    { t: Date.parse(black.launch), when: "O GTA 6 chega em 19 de novembro", bar: "para o GTA 6" },
    {
      t: Date.parse(black.bigDay),
      when: "Black Friday de 27 a 30 de novembro",
      bar: "para a Black Friday",
    },
    {
      t: Date.parse(black.bigEnd),
      when: "Black Friday até segunda, 30/11, 23h59",
      bar: "para o fim da Black",
    },
  ];
  return marks.find((m) => m.t > now) ?? { ...marks[2]!, when: "A Black 2026 terminou" };
}

export function icsText() {
  const ev = (uid: string, a: string, b: string, t: string, d: string) => [
    "BEGIN:VEVENT",
    `UID:${uid}-${black.year}@lojasoccergames.com.br`,
    `DTSTART:${a}`,
    `DTEND:${b}`,
    `SUMMARY:${t}`,
    `DESCRIPTION:${d}`,
    "URL:https://links.lojasoccergames.com.br/black",
    "END:VEVENT",
  ];
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Soccer Games//Black 2026//PT",
    ...ev(
      "gta-vi",
      "20261119T030000Z",
      "20261119T040000Z",
      "GTA 6 chega (Soccer Games)",
      "O preço sai primeiro no Grupo VIP.",
    ),
    ...ev(
      "fim-de-semana-gta",
      "20261120T030000Z",
      "20261123T025900Z",
      "Fim de semana do GTA 6 na Soccer",
      "Ofertas na loja e live na sexta, 20/11.",
    ),
    ...ev(
      "black-friday",
      "20261127T030000Z",
      "20261201T025900Z",
      "Black Friday Soccer Games",
      "De 27 a 30/11, até a Cyber Monday.",
    ),
    "END:VCALENDAR",
  ].join("\r\n");
}

/**
 * Montagem do fundo: trechos dos trailers oficiais do GTA VI (canal da Rockstar), tocados em
 * sequência pelo player oficial do YouTube. Nada é baixado nem reeditado.
 * Trechos escolhidos assistindo aos vídeos: sem letreiros, logos ou telas de rede social.
 */
const SEGMENTS: [string, number, number][] = [
  ["VQRLujxTm3c", 13, 47],
  ["QdBZY2fkU-0", 3, 17],
  ["VQRLujxTm3c", 47, 92],
  ["QdBZY2fkU-0", 19, 42],
  ["VQRLujxTm3c", 92, 154],
  ["QdBZY2fkU-0", 59, 81],
];

type YTPlayer = {
  loadVideoById: (o: { videoId: string; startSeconds: number; endSeconds: number }) => void;
  mute: () => void;
  playVideo: () => void;
};
type YTNs = {
  Player: new (
    el: HTMLElement,
    o: {
      videoId: string;
      host?: string;
      playerVars: Record<string, string | number>;
      events: Record<string, (e: { target: YTPlayer; data: number }) => void>;
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNs;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function startReel(root: HTMLElement) {
  const wrap = root.querySelector<HTMLElement>(".bfm-bg-full");
  const el = root.querySelector<HTMLElement>("#bfm-yt");
  if (!wrap || !el) return;
  const cn = (
    navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }
  ).connection;
  if (cn?.saveData || /(^|-)2g$/.test(cn?.effectiveType ?? "")) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let i = 0;
  const go = () => {
    const YT = window.YT;
    if (!YT?.Player) return;
    const [videoId, start, end] = SEGMENTS[0]!;
    const player = new YT.Player(el, {
      videoId,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        autoplay: 1,
        mute: 1,
        controls: 0,
        start,
        end,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        disablekb: 1,
        iv_load_policy: 3,
        fs: 0,
      },
      events: {
        onReady: (e) => {
          e.target.mute();
          e.target.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === 1) wrap.classList.remove("bfm-wait");
          if (e.data === 0) {
            wrap.classList.add("bfm-wait");
            i = (i + 1) % SEGMENTS.length;
            const [v, s, f] = SEGMENTS[i]!;
            player.loadVideoById({ videoId: v, startSeconds: s, endSeconds: f });
          }
        },
      },
    });
  };
  if (window.YT?.Player) go();
  else {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      go();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      s.async = true;
      document.head.appendChild(s);
    }
  }
}

/** Liga o motor da página (os scripts portados da MTS). Roda uma vez por montagem. */
export function runEngine() {
  new Function(engine)();
}
