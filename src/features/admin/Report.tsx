import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import { BarList, C, Columns, Funnel, TrendChart } from "./charts";
import {
  categoryName,
  deviceName,
  fmt,
  highlights,
  pctLabel,
  productName,
  quizGroups,
  QUIZ_QUESTION_LABEL,
  rankedProducts,
  sourceName,
  WEEKDAYS_SHORT,
  delta,
  type DashboardData,
} from "./data";

/* A4 landscape at 96 dpi. Slides are laid out at this size and scaled on screen. */
const SLIDE_W = 1122;
const SLIDE_H = 792;

function Logo({ className = "" }: { className?: string }) {
  return (
    <span
      aria-label="Soccer Games"
      className={`block whitespace-nowrap font-bold uppercase leading-none tracking-[0.06em] text-neutral-950 ${className}`}
      style={{ fontFamily: "Montserrat, sans-serif" }}
    >
      Soccer<span style={{ color: "#8a00c2" }}> Games</span>
    </span>
  );
}

function Slide({
  n,
  total,
  kicker,
  title,
  period,
  children,
}: {
  n: number;
  total: number;
  kicker?: string;
  title?: string;
  period: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="mts-slide relative flex flex-col bg-white text-neutral-900"
      style={{ width: SLIDE_W, height: SLIDE_H, padding: "56px 64px 44px" }}
    >
      {title && (
        <header className="mb-8">
          {kicker && (
            <p className="text-sm font-medium" style={{ color: C.accent }}>
              {kicker}
            </p>
          )}
          <h2 className="mt-2 text-[34px] font-semibold leading-tight tracking-tight">{title}</h2>
        </header>
      )}
      <div className="min-h-0 flex-1">{children}</div>
      <footer className="mt-6 flex items-center justify-between border-t border-neutral-200 pt-4 text-xs text-neutral-400">
        <span className="flex items-center gap-3">
          <Logo className="text-[13px]" />
          <span>Links Soccer Games · {period}</span>
        </span>
        <span className="tabular-nums">
          {n} / {total}
        </span>
      </footer>
    </section>
  );
}

function Big({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="border-t-2 border-neutral-900 pt-4">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-2 text-[56px] font-semibold leading-none tracking-tight tabular-nums">
        {value}
      </p>
      {note && <p className="mt-3 text-sm text-neutral-500">{note}</p>}
    </div>
  );
}

function H({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 text-sm font-medium text-neutral-500">{children}</p>;
}

export function Report({
  data: d,
  prev,
  period,
  onClose,
}: {
  data: DashboardData;
  prev: DashboardData | null;
  period: string;
  onClose: () => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const fit = () => {
      const w = wrap.current?.clientWidth ?? SLIDE_W;
      setZoom(Math.min(1, (w - 32) / SLIDE_W));
    };
    fit();
    window.addEventListener("resize", fit);
    const prevTitle = document.title;
    document.title = `Links Soccer Games - Relatório - ${period}`;
    return () => {
      window.removeEventListener("resize", fit);
      document.title = prevTitle;
    };
  }, [period]);

  const t = d.totals;
  const products = rankedProducts(d);
  const notes = highlights(d, prev);
  const groups = quizGroups(d);
  const fmtDay = (s: string) => {
    const [, m, day] = s.split("-");
    return `${day}/${m}`;
  };

  const slides: { kicker?: string; title?: string; body: React.ReactNode; show: boolean }[] = [
    {
      show: true,
      body: (
        <div className="flex h-full flex-col justify-between">
          <Logo className="text-[34px]" />
          <div>
            <p className="text-lg font-medium" style={{ color: C.accent }}>
              Relatório da página de links
            </p>
            <h1 className="mt-4 max-w-3xl text-[64px] font-semibold leading-[1.02] tracking-tight">
              O que o público procura na bio da Soccer Games
            </h1>
            <p className="mt-8 text-xl text-neutral-500">{period}</p>
          </div>
          <p className="text-sm text-neutral-400">links.lojasoccergames.com.br</p>
        </div>
      ),
    },
    {
      show: true,
      kicker: "Resumo",
      title: "Os números do período",
      body: (
        <div className="grid h-full grid-cols-[1.25fr_1fr] gap-14">
          <div className="grid grid-cols-2 content-start gap-x-10 gap-y-10">
            <Big
              label="Visitas"
              value={fmt(t.visits)}
              {...(prev && delta(t.visits, prev.totals.visits) !== null
                ? {
                    note: `${(delta(t.visits, prev.totals.visits) ?? 0) >= 0 ? "+" : ""}${delta(t.visits, prev.totals.visits)}% vs. período anterior`,
                  }
                : {})}
            />
            <Big
              label="Interagiram"
              value={pctLabel(t.engaged, t.visits)}
              note={`${fmt(t.engaged)} visitas`}
            />
            <Big
              label="Foram ao site"
              value={pctLabel(t.to_site, t.visits)}
              note={`${fmt(t.to_site)} visitas`}
            />
            <Big
              label="Cliques em produtos"
              value={fmt(t.product_clicks)}
              note={`${fmt(t.clicks)} cliques no total`}
            />
          </div>
          <div>
            <H>Destaques</H>
            <ul className="space-y-4">
              {notes.slice(0, 6).map((s) => (
                <li key={s} className="flex gap-3 text-[15px] leading-relaxed text-neutral-800">
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0" style={{ background: C.accent }} />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ),
    },
    {
      show: t.visits > 0,
      kicker: "Audiência",
      title: "Quando as pessoas chegam",
      body: (
        <div className="flex h-full flex-col gap-10">
          <div>
            <H>Visitas por dia{prev ? " (tracejado: período anterior)" : ""}</H>
            <TrendChart
              hover={false}
              height={205}
              points={d.daily.map((r) => ({ label: fmtDay(r.day), value: r.visits }))}
              {...(prev ? { prev: prev.daily.map((r) => r.visits) } : {})}
            />
          </div>
          <div className="grid grid-cols-[2fr_1fr] gap-12">
            <div>
              <H>Por horário</H>
              <Columns
                height={120}
                data={d.hours.map((r) => ({
                  label: `${r.hour}h`,
                  value: r.visits,
                  title: `${r.hour}h: ${fmt(r.visits)}`,
                }))}
              />
            </div>
            <div>
              <H>Por dia da semana</H>
              <Columns
                height={120}
                data={d.weekdays.map((r) => ({
                  label: WEEKDAYS_SHORT[r.dow] ?? "",
                  value: r.visits,
                  title: fmt(r.visits),
                }))}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      show: t.clicks > 0 || d.categories.length > 0,
      kicker: "Interesse",
      title: "O que mais chama atenção",
      body: (
        <div className="grid h-full grid-cols-2 gap-14">
          <div>
            <H>Produtos mais clicados</H>
            <BarList rows={products} max={8} accent />
          </div>
          <div className="space-y-10">
            <div>
              <H>Botões e links</H>
              <BarList
                rows={d.top_links.map((r) => ({ label: r.item, n: r.n }))}
                max={5}
                total={t.clicks}
              />
            </div>
            <div>
              <H>Categorias abertas</H>
              <BarList
                rows={d.categories.map((r) => ({ label: categoryName(r.item), n: r.n }))}
                max={4}
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      show: d.searches.length > 0,
      kicker: "Busca",
      title: "O que digitaram para encontrar",
      body: (
        <div className="grid h-full grid-cols-2 gap-14">
          <div>
            <H>Termos mais buscados</H>
            <BarList
              rows={d.searches.filter((s) => !s.no_result).map((s) => ({ label: s.term, n: s.n }))}
              max={8}
            />
          </div>
          <div>
            <H>Buscaram e não encontraram</H>
            {d.searches.some((s) => s.no_result) ? (
              <>
                <BarList
                  rows={d.searches
                    .filter((s) => s.no_result)
                    .map((s) => ({ label: s.term, n: s.n }))}
                  max={6}
                />
                <p className="mt-6 text-sm leading-relaxed text-neutral-500">
                  Cada termo aqui é uma oportunidade: produto que falta, nome diferente do que o
                  cliente usa ou tag que precisa entrar na busca.
                </p>
              </>
            ) : (
              <p className="text-sm text-neutral-500">Todas as buscas encontraram algum produto.</p>
            )}
          </div>
        </div>
      ),
    },
    {
      show: t.quiz_start > 0,
      kicker: "Quiz",
      title: "Descubra seu próximo jogo",
      body: (
        <div className="grid h-full grid-cols-[1fr_1.4fr] gap-14">
          <div className="space-y-10">
            <div>
              <H>Funil do quiz</H>
              <Funnel
                steps={[
                  { label: "Começaram", value: t.quiz_start },
                  { label: "Chegaram ao resultado", value: t.quiz_complete },
                  { label: "Clicaram no produto", value: t.quiz_result_click },
                ]}
              />
            </div>
            <div>
              <H>Mais indicados</H>
              <BarList
                rows={d.quiz_results.map((r) => ({ label: productName(r.product), n: r.n }))}
                max={4}
                accent
              />
            </div>
          </div>
          <div className="grid grid-cols-2 content-start gap-x-10 gap-y-8">
            {groups.slice(0, 4).map(([q, rows]) => (
              <div key={q}>
                <H>{QUIZ_QUESTION_LABEL[q] ?? q}</H>
                <BarList rows={rows} max={3} total={rows.reduce((a, r) => a + r.n, 0)} />
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      show: t.visits > 0,
      kicker: "Origem",
      title: "De onde vêm e como acessam",
      body: (
        <div className="grid h-full grid-cols-3 gap-12">
          <div>
            <H>Origem</H>
            <BarList
              rows={d.sources.map((r) => ({ label: sourceName(r.source), n: r.n }))}
              max={6}
              total={t.visits}
            />
          </div>
          <div>
            <H>Aparelho</H>
            <BarList
              rows={d.devices.map((r) => ({ label: deviceName(r.device), n: r.n }))}
              max={4}
              total={t.visits}
            />
          </div>
          <div>
            <H>Funil da página</H>
            <Funnel
              steps={[
                { label: "Visitaram", value: t.visits },
                { label: "Interagiram", value: t.engaged },
                { label: "Foram ao site", value: t.to_site },
              ]}
            />
          </div>
        </div>
      ),
    },
  ];
  const visible = slides.filter((s) => s.show);

  return (
    <div ref={wrap} className="mts-report min-h-screen bg-neutral-200">
      <style>{`
        @page { size: A4 landscape; margin: 0; }
        @media print {
          html, body { background: #fff !important; }
          .mts-report { background: #fff !important; }
          .mts-report-bar { display: none !important; }
          .mts-report-stack { zoom: 1 !important; padding: 0 !important; gap: 0 !important; }
          .mts-slide-wrap { break-after: page; box-shadow: none !important; }
          .mts-slide-wrap:last-child { break-after: auto; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <div className="mts-report-bar sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-neutral-300 bg-white/95 px-5 py-3 backdrop-blur">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-sm text-neutral-700 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </button>
        <span className="hidden text-sm text-neutral-500 sm:block">
          {visible.length} slides · {period}
        </span>
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          <Download className="h-4 w-4" /> Baixar PDF
        </button>
      </div>
      <p className="mts-report-bar px-5 pt-4 text-center text-xs text-neutral-500">
        Na janela de impressão, escolha "Salvar como PDF", layout Paisagem, margens Nenhuma e marque
        "Gráficos de plano de fundo".
      </p>
      <div className="mts-report-stack flex flex-col items-center gap-6 px-4 py-6" style={{ zoom }}>
        {visible.map((s, i) => (
          <div key={i} className="mts-slide-wrap shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
            <Slide
              n={i + 1}
              total={visible.length}
              period={period}
              {...(s.kicker ? { kicker: s.kicker } : {})}
              {...(s.title ? { title: s.title } : {})}
            >
              {s.body}
            </Slide>
          </div>
        ))}
      </div>
    </div>
  );
}
