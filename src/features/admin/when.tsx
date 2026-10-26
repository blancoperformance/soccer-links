/** Data dos contatos: "16/10/2026 · há 2 h", horário exato ao passar o mouse e etiqueta NOVO só nos do dia. */
const TZ = "America/Sao_Paulo";

const day = (d: Date) => d.toLocaleDateString("sv-SE", { timeZone: TZ });

export const isToday = (iso: string, now = Date.now()) => day(new Date(iso)) === day(new Date(now));

export function relative(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "agora";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 30) return d === 1 ? "há 1 dia" : `há ${d} dias`;
  const mo = Math.floor(d / 30);
  return mo === 1 ? "há 1 mês" : `há ${mo} meses`;
}

export function When({ iso, time = false, now }: { iso: string; time?: boolean; now?: number }) {
  const d = new Date(iso);
  const date = d.toLocaleDateString("pt-BR", { timeZone: TZ });
  const hour = d.toLocaleTimeString("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
  const exact = d.toLocaleString("pt-BR", { timeZone: TZ, dateStyle: "full", timeStyle: "medium" });
  return (
    <time dateTime={iso} title={exact} className="whitespace-nowrap tabular-nums">
      {date}
      {time ? ` ${hour}` : ""} · {relative(iso, now)}
    </time>
  );
}

export function NewTag({ iso, now }: { iso: string; now?: number }) {
  if (!isToday(iso, now)) return null;
  return (
    <span className="sg-chip sg-chip--new" style={{ marginLeft: 6, height: 20 }}>
      novo
    </span>
  );
}
