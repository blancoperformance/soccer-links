import { ArrowRight, Zap } from "lucide-react";
import { withUtm } from "@/lib/utm";
import { track } from "@/lib/tracking";
import { Cover, useLiveGame } from "./GameCard";
import { getGame, STORE, type Game } from "./games";
import { weeklyPromotion } from "./promotion";

export const EXPRESS_URL = `${STORE}/produtos/entrega-expressa-ate-2-minutos-14f4c/`;

function HeroCover({ game, index }: { game: Game; index: number }) {
  const { live, done } = useLiveGame(game.slug, true);
  return (
    <span
      className="sg-cover-in absolute top-3 w-[36%] max-w-[150px] rounded-2xl shadow-[0_18px_32px_-10px_rgba(0,0,0,.65)] ring-1 ring-white/30"
      style={{
        left: `${14 + index * 18}%`,
        transform: `rotate(${(index - 1) * 12}deg)`,
        zIndex: index === 1 ? 3 : 2,
        animationDelay: `${120 + index * 110}ms`,
      }}
    >
      <Cover game={game} live={live} done={done} w={320} />
    </span>
  );
}

function ExpressCard() {
  return (
    <section
      className="mts-enter mt-5 rounded-[22px] bg-[#c000ff] p-5 text-white"
      style={{ animationDelay: "180ms" }}
      aria-label="Entrega Expressa"
    >
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#8a00c2]">
          <span
            aria-hidden
            className="sg-ring absolute inset-0 rounded-full border-2 border-white"
          />
          <Zap className="h-5 w-5" fill="currentColor" aria-hidden />
        </span>
        <p className="text-[13px] font-semibold text-white/90">Entrega Expressa</p>
      </div>
      <h3 className="font-display mt-3 text-[22px] font-extrabold leading-[1.1]">
        {"Seu jogo chega em até 2\u00a0minutos."}
      </h3>
      <p className="mt-2.5 max-w-[360px] text-[14px] leading-relaxed text-white/95">
        Os 2 minutos contam a partir do pagamento confirmado. A Entrega Expressa custa R$ 5 e aparece
        no carrinho: é só confirmar.
      </p>
      <a
        href={withUtm(EXPRESS_URL, { content: "topo-entrega-expressa" })}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          track("links_clique", { item_name: "Expressa: ver no topo", item_url: EXPRESS_URL })
        }
        className="group mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[14px] font-bold text-[#220034] transition active:scale-[.98] hover:bg-[#f3e1ff]"
      >
        Ver a Entrega Expressa
        <ArrowRight
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </a>
    </section>
  );
}

/**
 * Topo da página no mês da Black: sem datas no herói. Com a campanha da semana no ar, mostra o tema
 * dela como etiqueta e leva à escolha do jogo; sem campanha, leva ao Grupo VIP.
 */
export function BlackHero({ weekTheme, onBrowse }: { weekTheme: boolean; onBrowse: () => void }) {
  return (
    <div className="relative mt-6" aria-label="Black Friday da Soccer">
      <p className="flex flex-wrap items-center gap-2 text-[12px] font-semibold">
        <span className="rounded-full bg-[#d77bff] px-3 py-1.5 text-[#220034]">
          Black o mês todo
        </span>
        {weekTheme && (
          <span className="rounded-full border border-white/25 px-3 py-1.5 text-white/90">
            Semana de Luta e Futebol
          </span>
        )}
      </p>
      <h2 className="font-display mt-5 leading-[.86] text-white">
        <span className="block text-[clamp(70px,22vw,104px)] font-black uppercase tracking-[-.05em]">
          Black
        </span>
        <span className="mt-1.5 block text-[clamp(30px,9vw,40px)] font-semibold tracking-[-.03em] text-white/90">
          o mês todo.
        </span>
      </h2>
      <p className="mt-4 max-w-[330px] text-[14px] leading-relaxed text-white/80">
        {weekTheme
          ? "Novembro inteiro tem jogo de PS4 e PS5 em oferta. Cada semana ganha um tema, e esta é a de Luta e Futebol."
          : "Novembro inteiro tem jogo de PS4 e PS5 em oferta. No Grupo VIP você vê cada oferta antes do site."}
      </p>
      {weekTheme && (
        <div
          className="relative mx-auto mt-3 h-[165px] max-w-[390px] min-[400px]:h-[185px]"
          aria-label="Destaques da semana"
        >
          <span
            aria-hidden
            className="absolute bottom-2 left-1/2 h-20 w-3/4 -translate-x-1/2 rounded-full bg-[#c000ff]/35 blur-2xl"
          />
          {weeklyPromotion.highlights.map((slug, i) => {
            const game = getGame(slug);
            return game ? <HeroCover key={slug} game={game} index={i} /> : null;
          })}
        </div>
      )}
      {weekTheme ? (
        <>
          <button
            type="button"
            onClick={onBrowse}
            className="group flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-[#c000ff] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#a400db] active:scale-[.99]"
          >
            Escolher meu jogo da semana
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </button>
          <a
            href="/black"
            onClick={() =>
              track("links_clique", {
                item_name: "Destaque topo: Grupo VIP Black",
                item_url: "/black",
              })
            }
            className="mt-3 inline-block text-[13px] text-white/75 underline decoration-white/30 underline-offset-4 hover:text-white"
          >
            Entrar no Grupo VIP da Black
          </a>
        </>
      ) : (
        <a
          href="/black"
          onClick={() =>
            track("links_clique", {
              item_name: "Destaque topo: Grupo VIP Black",
              item_url: "/black",
            })
          }
          className="group mt-5 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-[#c000ff] px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-[#a400db] active:scale-[.99]"
        >
          Entrar no Grupo VIP da Black
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            aria-hidden
          />
        </a>
      )}
      <ExpressCard />
    </div>
  );
}
