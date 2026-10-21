const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function isValidISO(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return toISO(fromISO(iso)) === iso;
}

export function addMonths(year: number, monthIndex: number, delta: number): { year: number; month: number } {
  const total = year * 12 + monthIndex + delta;
  return { year: Math.floor(total / 12), month: ((total % 12) + 12) % 12 };
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/** Monday-first grid of ISO dates, padded with null outside the month. */
export function monthGrid(year: number, monthIndex: number): (string | null)[] {
  const offset = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const total = daysInMonth(year, monthIndex);
  const cells: (string | null)[] = Array.from({ length: offset }, () => null);
  for (let day = 1; day <= total; day += 1) {
    cells.push(`${year}-${pad(monthIndex + 1)}-${pad(day)}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function weekdayLabels(tag: string): string[] {
  const monday = new Date(2024, 0, 1);
  const formatter = new Intl.DateTimeFormat(tag, { weekday: 'short' });
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return formatter.format(date);
  });
}

export function formatLongDate(iso: string, tag: string): string {
  return new Intl.DateTimeFormat(tag, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(fromISO(iso));
}

export function formatShortDate(iso: string, tag: string): string {
  return new Intl.DateTimeFormat(tag, { month: 'short', day: 'numeric' }).format(fromISO(iso));
}

export function formatMonth(year: number, monthIndex: number, tag: string): string {
  return new Intl.DateTimeFormat(tag, { year: 'numeric', month: 'long' }).format(
    new Date(year, monthIndex, 1),
  );
}

export function diffCalendarDays(from: string, to: string): number {
  const a = fromISO(from).getTime();
  const b = fromISO(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

export function shiftISO(iso: string, delta: number): string {
  const date = fromISO(iso);
  date.setDate(date.getDate() + delta);
  return toISO(date);
}
