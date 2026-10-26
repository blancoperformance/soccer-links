import { useEffect } from "react";

/**
 * Pontinho de aviso no ícone da aba do painel: aparece quando há algo esperando (contatos a
 * chamar, cadastros novos). O número também vai no título da aba. Some quando zera.
 */
let base: HTMLImageElement | null = null;
const loadBase = () =>
  new Promise<HTMLImageElement>((ok, fail) => {
    if (base?.complete) return ok(base);
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = "/favicon.png?v=2";
    base = img;
  });

function links(): HTMLLinkElement[] {
  const l = [...document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')];
  if (l.length) return l;
  const n = document.createElement("link");
  n.rel = "icon";
  document.head.appendChild(n);
  return [n];
}

export function useFaviconBadge(count: number) {
  useEffect(() => {
    let alive = true;
    const title = document.title.replace(/^\(\d+\+?\)\s*/, "");
    document.title = count > 0 ? `(${count > 99 ? "99+" : count}) ${title}` : title;
    const original = links().map((l) => l.href);
    if (count > 0)
      void loadBase()
        .then((img) => {
          if (!alive) return;
          const c = document.createElement("canvas");
          c.width = c.height = 64;
          const g = c.getContext("2d");
          if (!g) return;
          g.drawImage(img, 0, 0, 64, 64);
          g.beginPath();
          g.arc(50, 14, 13, 0, Math.PI * 2);
          g.fillStyle = "#ff2d87";
          g.fill();
          g.lineWidth = 4;
          g.strokeStyle = "#130f1f";
          g.stroke();
          const url = c.toDataURL("image/png");
          for (const l of links()) l.href = url;
        })
        .catch(() => {});
    return () => {
      alive = false;
      document.title = document.title.replace(/^\(\d+\+?\)\s*/, "");
      links().forEach((l, i) => {
        if (original[i]) l.href = original[i]!;
      });
    };
  }, [count]);
}
