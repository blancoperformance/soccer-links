import { useEffect, useRef } from "react";
import { callRpc, readRpc } from "@/lib/backend";
import { loadClarity, loadGtm, loadPixel, track } from "@/lib/tracking";
import { loadGame, sized } from "@/features/public/store";
import { black } from "./config";
import { icsText, landingHtml, nextMark, runEngine, startReel } from "./landing";

type Lead = {
  nome: string;
  whatsapp: string;
  email: string | null;
  utm: Record<string, string>;
  empresa: string;
  started: number;
  event_id: string;
  page: string;
};

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    MTS_BLACK_VIP?: { registerLead?: (d: Lead) => Promise<unknown>; groupUrl?: string };
    SOCCER_BLACK?: {
      groupUrl: string;
      next: typeof nextMark;
      ics: typeof icsText;
      reel: (root: HTMLElement) => void;
      lead: (eid: string) => void;
    };
  }
}

export function BlackPage() {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const host = ref.current;
    const root = host?.querySelector<HTMLElement>("#bfm-vip");
    if (!host || !root || started.current) return;
    started.current = true;

    loadGtm();
    loadPixel();
    loadClarity();
    track("page_view");

    window.SOCCER_BLACK = {
      groupUrl: black.groupUrl,
      next: nextMark,
      ics: icsText,
      reel: startReel,
      lead: () => track("black_lead", { form: "topo" }),
    };
    window.MTS_BLACK_VIP = {
      groupUrl: black.groupUrl,
      registerLead: (d) =>
        callRpc("black_vip_signup", {
          p_nome: d.nome,
          p_whatsapp: d.whatsapp,
          p_email: d.email,
          p_consent: true,
          p_consent_text: black.consentText,
          p_utm: Object.keys(d.utm).length ? d.utm : null,
          p_page: d.page,
          p_event_id: d.event_id,
          p_started: d.started,
          p_empresa: d.empresa,
        }).catch(() => null),
    };
    runEngine();

    // capas reais dos jogos, puxadas da loja
    host.querySelectorAll<HTMLAnchorElement>(".bfm-cc[data-slug]").forEach((a) => {
      const img = a.querySelector("img");
      void loadGame(a.dataset["slug"]!).then((g) => {
        const src = g?.images[0];
        if (img && src) img.src = sized(src, 900);
      });
    });

    // prova social real, só a partir do mínimo
    void readRpc<number>("black_vip_total").then((n) => {
      if (typeof n !== "number" || n < black.socialMin) return;
      const el = host.querySelector("#bfm-social");
      const b = host.querySelector("#bfm-social-n");
      if (el && b) {
        b.textContent = n.toLocaleString("pt-BR");
        el.classList.remove("bfm-off");
      }
    });

    // cliques que interessam no painel
    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-t], a[href='#bfm-access'], #bfm-ics, .bfm-q",
      );
      if (!t) return;
      const name = t.dataset["t"]
        ? t.dataset["t"]
        : t.id === "bfm-ics"
          ? "Black: salvar na agenda"
          : t.classList.contains("bfm-q")
            ? `Black FAQ: ${t.textContent?.trim() ?? ""}`
            : "Black: ir para o cadastro";
      track("links_clique", { item_name: name, item_url: (t as HTMLAnchorElement).href ?? "" });
    };
    host.addEventListener("click", onClick);
    return () => host.removeEventListener("click", onClick);
  }, []);

  return (
    <div
      ref={ref}
      className="min-h-screen bg-[#0b0b0b]"
      data-theme="escuro"
      dangerouslySetInnerHTML={{ __html: landingHtml }}
    />
  );
}
