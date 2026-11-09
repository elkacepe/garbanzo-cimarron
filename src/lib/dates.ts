/* Fechas locales en formato AAAA-MM-DD, sin librerías. Se usan las 12:00 para evitar saltos de horario. */

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export const pad = (n: number, len = 2) => String(n).padStart(len, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseISO = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const isValidISO = (s: string | null | undefined): s is string =>
  !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(parseISO(s).getTime());
export const addDays = (s: string, n: number) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return toISO(d);
};
export const todayISO = () => toISO(new Date());
export const weekday = (s: string) => parseISO(s).getDay();
export const isMonday = (s: string) => weekday(s) === 1;

/** Próximo día de la semana `wd` estrictamente después de `from`. */
export const nextWeekday = (from: string, wd: number) => addDays(from, ((wd - weekday(from) + 7) % 7) || 7);

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fechaLarga = (s: string) => {
  const d = parseISO(s);
  return `${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};
export const fechaCorta = (s: string) => {
  const d = parseISO(s);
  return `${cap(DIAS[d.getDay()].slice(0, 3))} ${d.getDate()}/${d.getMonth() + 1}`;
};

export const monthOf = (s: string) => s.slice(0, 7);
export const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number);
  return toISO(new Date(y, m - 1 + n, 1, 12)).slice(0, 7);
};

/**
 * Celdas del mes con lunes como primer día. `null` = relleno fuera del mes.
 * La cantidad total siempre es múltiplo de 7.
 */
export function monthGrid(ym: string): (string | null)[] {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1, 12);
  const days = new Date(y, m, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  const cells: (string | null)[] = Array(offset).fill(null);
  for (let d = 1; d <= days; d++) cells.push(`${y}-${pad(m)}-${pad(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export const toMinutes = (t: string) => {
  const [a, b] = t.split(':').map(Number);
  return a * 60 + b;
};
export const toHHMM = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
