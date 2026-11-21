import { type Env } from './api';

export type DailyLocale = 'zh-TW' | 'zh-CN' | 'en';

const LOCALES: DailyLocale[] = ['zh-TW', 'zh-CN', 'en'];

export interface DailyContent {
  headline: string | null;
  summary: string | null;
  colors: string[];
  note: string | null;
}

export interface DailyEntry {
  date: string;
  published: boolean;
  content: Partial<Record<DailyLocale, DailyContent>>;
  updatedAt: string | null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

export function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value);
}

export function sanitizeContent(input: unknown): DailyContent {
  const record = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const colors = Array.isArray(record.colors)
    ? record.colors
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().slice(0, 40))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  return {
    headline: text(record.headline, 120),
    summary: text(record.summary, 3000),
    colors,
    note: text(record.note, 1000),
  };
}

export function sanitizeEntry(input: unknown): DailyEntry | null {
  if (typeof input !== 'object' || input === null) return null;
  const record = input as Record<string, unknown>;
  if (!isValidDate(record.date)) return null;
  const content: Partial<Record<DailyLocale, DailyContent>> = {};
  const rawContent =
    typeof record.content === 'object' && record.content !== null
      ? (record.content as Record<string, unknown>)
      : {};
  for (const locale of LOCALES) {
    if (!(locale in rawContent)) continue;
    const clean = sanitizeContent(rawContent[locale]);
    if (clean.headline || clean.summary || clean.note || clean.colors.length > 0) {
      content[locale] = clean;
    }
  }
  if (Object.keys(content).length === 0) return null;
  return {
    date: record.date,
    published: record.published === true,
    content,
    updatedAt: null,
  };
}

function rowToEntry(row: { date: string; published: number; payload: string; updated_at: string }): DailyEntry | null {
  try {
    const parsed = JSON.parse(row.payload) as Record<string, unknown>;
    const content: Partial<Record<DailyLocale, DailyContent>> = {};
    const raw = (parsed.content ?? {}) as Record<string, unknown>;
    for (const locale of LOCALES) {
      if (!(locale in raw)) continue;
      content[locale] = sanitizeContent(raw[locale]);
    }
    return {
      date: row.date,
      published: row.published === 1,
      content,
      updatedAt: row.updated_at,
    };
  } catch {
    return null;
  }
}

export async function saveDailyEntry(env: Env, entry: DailyEntry): Promise<DailyEntry> {
  const now = new Date().toISOString();
  await env.DB.prepare(
    `INSERT INTO daily_content (date, published, payload, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       published = excluded.published,
       payload = excluded.payload,
       updated_at = excluded.updated_at`,
  )
    .bind(entry.date, entry.published ? 1 : 0, JSON.stringify({ content: entry.content }), now)
    .run();
  return { ...entry, updatedAt: now };
}

export async function readDailyEntry(
  env: Env,
  date: string,
  includeDrafts: boolean,
): Promise<DailyEntry | null> {
  const row = await env.DB.prepare(
    'SELECT date, published, payload, updated_at FROM daily_content WHERE date = ?',
  )
    .bind(date)
    .first<{ date: string; published: number; payload: string; updated_at: string }>();
  if (!row) return null;
  const entry = rowToEntry(row);
  if (!entry) return null;
  if (!entry.published && !includeDrafts) return null;
  return entry;
}

export async function listDailyEntries(
  env: Env,
  from: string,
  days: number,
  includeDrafts: boolean,
): Promise<DailyEntry[]> {
  const limit = Math.max(1, Math.min(31, Math.floor(days) || 7));
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(start.getTime() + (limit - 1) * 86_400_000);
  const endDate = end.toISOString().slice(0, 10);
  const rows = await env.DB.prepare(
    `SELECT date, published, payload, updated_at FROM daily_content
      WHERE date >= ? AND date <= ?${includeDrafts ? '' : ' AND published = 1'}
      ORDER BY date ASC`,
  )
    .bind(from, endDate)
    .all<{ date: string; published: number; payload: string; updated_at: string }>();
  return (rows.results ?? [])
    .map(rowToEntry)
    .filter((entry): entry is DailyEntry => Boolean(entry));
}

export async function recentDailyEntries(env: Env, limit = 20): Promise<DailyEntry[]> {
  const rows = await env.DB.prepare(
    'SELECT date, published, payload, updated_at FROM daily_content ORDER BY date DESC LIMIT ?',
  )
    .bind(Math.max(1, Math.min(60, limit)))
    .all<{ date: string; published: number; payload: string; updated_at: string }>();
  return (rows.results ?? [])
    .map(rowToEntry)
    .filter((entry): entry is DailyEntry => Boolean(entry));
}

export async function deleteDailyEntry(env: Env, date: string): Promise<void> {
  await env.DB.prepare('DELETE FROM daily_content WHERE date = ?').bind(date).run();
}
