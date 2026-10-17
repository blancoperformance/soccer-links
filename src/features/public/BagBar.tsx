import { useEffect, useRef, useState } from "react";
import { ChevronUp, Trash2 } from "lucide-react";
import { track } from "@/lib/tracking";
import { bag, bagTotals, bagUrl, useBag } from "./bag";
import { brl, INSTALLMENTS } from "./store";
import { bagEnabled } from "./content";

/** Barra fixa da sacola: capas empilhadas, total com o "de" riscado, economia e Finalizar. */
export function BagBar() {
  const list = useBag();
  const [open, setOpen] = useState(false);
  const [bump, setBump] = useState(false);
  const prev = useRef(list.length);
  useEffect(() => {
    if (list.length > prev.current) {
      setBump(true);
      const t = window.setTimeout(() => setBump(false), 450);
      prev.current = list.length;
      return () => clearTimeout(t);
    }
    prev.current = list.length;
    if (list.length === 0) setOpen(false);
    return undefined;
  }, [list.length]);

  if (!bagEnabled || list.length === 0) return null;
  const { total, save } = bagTotals(list);
  const n = list.length;
  const go = () => {
    const url = bagUrl(list, "sacola");
    track("checkout_click", {
      product: list.map((i) => i.slug).join(","),
      detail: `sacola ${n}`,
      value: total,
      currency: "BRL",
    });
    track("links_clique", { item_name: `Sacola: finalizar ${n}`, item_url: url });
    window.location.href = url;
  };

  return (
    <>
      <div aria-hidden className="h-28" />
      {open && (
        <button
          type="button"
          aria-label="Fechar a sacola"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[520px] animate-[sg-up_.35s_cubic-bezier(.2,.9,.3,1.2)] overflow-hidden rounded-[24px] bg-white/95 shadow-[0_10px_40px_-12px_rgba(40,0,70,.35)] ring-1 ring-black/5 backdrop-blur-md">
          {open && (
            <div className="border-b border-black/5 px-4 pb-1 pt-4">
              <p className="text-[13px] font-bold text-mts-text">Sua sacola</p>
              <ul className="mt-1 max-h-[42vh] overflow-y-auto">
                {list.map((i) => (
                  <li key={i.slug} className="flex items-center gap-3 py-2.5">
                    {i.image ? (
                      <img src={i.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                    ) : (
                      <span className="h-12 w-12 shrink-0 rounded-xl bg-mts-column" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-1 text-[13px] font-semibold text-mts-text">{i.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-xs">
                        <span className="rounded-full bg-mts-column px-1.5 py-px text-[10px] font-semibold text-mts-muted">
                          {i.license}
                        </span>
                        {i.from && i.price != null && i.from > i.price && (
                          <span className="text-mts-muted line-through">{brl(i.from)}</span>
                        )}
                        {i.price != null && <span className="font-bold text-mts-text">{brl(i.price)}</span>}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => bag.remove(i.slug)}
                      aria-label={`Tirar ${i.name} da sacola`}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mts-muted hover:bg-mts-column hover:text-mts-text"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center gap-2.5 p-2.5 pl-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Fechar a lista da sacola" : "Ver os jogos da sacola"}
              className="flex min-w-0 flex-1 items-center gap-4 text-left"
            >
              <span className={`relative flex shrink-0 pl-1 ${bump ? "animate-[sg-pop_.45s_ease-out]" : ""}`}>
                {list.slice(-3).map((i, k, arr) => (
                  <span
                    key={i.slug}
                    className="-ml-5 block h-10 w-10 overflow-hidden rounded-[11px] bg-gradient-to-br from-[#8a00c2] to-[#ff2d87] shadow-[0_2px_6px_rgba(0,0,0,.18)] ring-2 ring-white first:ml-0"
                    style={{ transform: `rotate(${(k - (arr.length - 1) / 2) * 7}deg)`, zIndex: k }}
                  >
                    {i.image && <img src={i.image} alt="" className="h-full w-full object-cover" />}
                  </span>
                ))}
                <span className="absolute -right-2 -top-2 z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0f0f0f] px-1 text-[10px] font-black text-white ring-2 ring-white">
                  {n}
                </span>
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="flex items-center gap-1 whitespace-nowrap text-[11px] font-semibold text-mts-muted">
                  {save > 0 ? (
                    <span className="text-[#178a4c]">Economia de {brl(save)}</span>
                  ) : (
                    <>{n} {n === 1 ? "jogo" : "jogos"}</>
                  )}
                  <ChevronUp className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "" : "rotate-180"}`} aria-hidden />
                </span>
                <span className="mt-0.5 block whitespace-nowrap text-[18px] font-extrabold tracking-tight text-mts-text">
                  {brl(total)}
                </span>
                <span className="block truncate text-[10.5px] text-mts-muted">ou {INSTALLMENTS}x de {brl(total / INSTALLMENTS)} s/ juros</span>
              </span>
            </button>
            <button
              type="button"
              onClick={go}
              className="flex h-12 shrink-0 items-center gap-1 rounded-[16px] bg-[#8a00c2] px-4 text-[14px] font-bold text-white transition active:scale-[.97]"
            >
              Finalizar <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
