import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import {
  api,
  type AdminUser,
  type AppRemoteConfig,
  type DailyContent,
  type DailyEntry,
  type PublicConfig,
} from '../lib/api';
import { todayISO } from '../lib/date';
import { Sheet } from './ui';

type DailyLocale = 'zh-TW' | 'zh-CN' | 'en';

interface DailyDraft {
  published: boolean;
  headline: string;
  colors: string;
  summary: string;
  note: string;
}

const EMPTY_DRAFT: DailyDraft = { published: false, headline: '', colors: '', summary: '', note: '' };

function draftFrom(content: DailyContent | undefined): DailyDraft {
  if (!content) return { ...EMPTY_DRAFT };
  return {
    published: true,
    headline: content.headline ?? '',
    colors: content.colors.join(', '),
    summary: content.summary ?? '',
    note: content.note ?? '',
  };
}

function contentFrom(draft: DailyDraft): DailyContent {
  return {
    headline: draft.headline.trim() || null,
    colors: draft.colors
      .split(/[,，、\n]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6),
    summary: draft.summary.trim() || null,
    note: draft.note.trim() || null,
  };
}

export function AdminSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, tag } = useI18n();
  const [settings, setSettings] = useState<PublicConfig | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [price, setPrice] = useState('88');
  const [currency, setCurrency] = useState('HKD');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentJson, setContentJson] = useState('');
  const [contentSaved, setContentSaved] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [dailyDate, setDailyDate] = useState(todayISO());
  const [dailyLocale, setDailyLocale] = useState<DailyLocale>('zh-TW');
  const [dailyEntry, setDailyEntry] = useState<DailyEntry | null>(null);
  const [dailyDraft, setDailyDraft] = useState<DailyDraft>({ ...EMPTY_DRAFT });
  const [dailyStatus, setDailyStatus] = useState<string | null>(null);
  const [dailyError, setDailyError] = useState<string | null>(null);

  const loadDaily = useCallback(
    async (date: string, locale: DailyLocale) => {
      try {
        const entry = await api.adminDaily(date);
        setDailyEntry(entry);
        setDailyDraft(draftFrom(entry?.content[locale]));
        setDailyError(null);
      } catch {
        setDailyError(t.auth.errorGeneric);
      }
    },
    [t],
  );

  useEffect(() => {
    if (!open) return;
    void loadDaily(dailyDate, dailyLocale);
  }, [open, dailyDate, dailyLocale, loadDaily]);

  const saveDaily = async (event: React.FormEvent) => {
    event.preventDefault();
    setDailyStatus(null);
    setDailyError(null);
    try {
      const content = { ...(dailyEntry?.content ?? {}) };
      const next = contentFrom(dailyDraft);
      const empty = !next.headline && !next.summary && !next.note && next.colors.length === 0;
      if (empty) delete content[dailyLocale];
      else content[dailyLocale] = next;
      if (Object.keys(content).length === 0) {
        setDailyError(t.auth.dailyEmpty);
        return;
      }
      const saved = await api.saveDaily({
        date: dailyDate,
        published: dailyDraft.published,
        content,
      });
      setDailyEntry(saved);
      setDailyDraft(draftFrom(saved.content[dailyLocale]));
      setDailyStatus(t.auth.dailySaved);
    } catch {
      setDailyError(t.auth.errorGeneric);
    }
  };

  const deleteDaily = async () => {
    try {
      await api.deleteDaily(dailyDate);
      setDailyEntry(null);
      setDailyDraft({ ...EMPTY_DRAFT });
      setDailyStatus(null);
    } catch {
      setDailyError(t.auth.errorGeneric);
    }
  };

  const load = async () => {
    try {
      const [nextSettings, nextUsers, nextContent] = await Promise.all([
        api.adminSettings(),
        api.adminUsers(),
        api.adminContent(),
      ]);
      setSettings(nextSettings);
      setPrice(String(nextSettings.priceCents / 100));
      setCurrency(nextSettings.currency);
      setUsers(nextUsers);
      setContentJson(JSON.stringify(nextContent, null, 2));
      setError(null);
    } catch {
      setError(t.auth.errorGeneric);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    try {
      const next = await api.saveSettings({ price: Number(price), currency });
      setSettings(next);
      setPrice(String(next.priceCents / 100));
      setSaved(true);
    } catch {
      setError(t.auth.errorInvalidInput);
    }
  };

  const saveContent = async (event: React.FormEvent) => {
    event.preventDefault();
    setContentSaved(false);
    setContentError(null);
    try {
      const parsed = JSON.parse(contentJson) as AppRemoteConfig;
      const next = await api.saveContent(parsed);
      setContentJson(JSON.stringify(next, null, 2));
      setContentSaved(true);
    } catch {
      setContentError(t.auth.contentError);
    }
  };

  const toggle = async (user: AdminUser) => {
    const active =
      user.role === 'admin' ||
      (user.status === 'active' && (user.current_period_end ?? 0) > Date.now() / 1000);
    try {
      await api.setMembership(user.id, !active);
      setUsers(await api.adminUsers());
    } catch {
      setError(t.auth.errorGeneric);
    }
  };

  return (
    <Sheet open={open} title={t.auth.adminTitle} closeLabel={t.common.close} onClose={onClose} wide>
      <form className="admin-form" onSubmit={save}>
        <div className="admin-row">
          <label className="field">
            <span>{t.auth.price}</span>
            <input
              type="number"
              min="1"
              max="100000"
              step="1"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t.auth.currency}</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {['HKD', 'TWD', 'CNY', 'USD'].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="primary-btn compact" type="submit">
          {t.auth.save}
        </button>
        {saved ? <span className="muted small">{t.auth.saved}</span> : null}
        {settings && !settings.stripeConfigured ? (
          <p className="muted small">{t.auth.stripeMissing}</p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
      </form>

      <h3 className="admin-heading">{t.auth.dailyTitle}</h3>
      <form className="admin-form" onSubmit={saveDaily}>
        <p className="muted small">{t.auth.dailyHint}</p>
        <div className="admin-row">
          <label className="field">
            <span>{t.auth.dailyDate}</span>
            <input
              type="date"
              value={dailyDate}
              onChange={(event) => {
                setDailyDate(event.target.value);
                setDailyStatus(null);
              }}
            />
          </label>
          <label className="field">
            <span>{t.auth.dailyPublished}</span>
            <input
              type="checkbox"
              checked={dailyDraft.published}
              onChange={(event) =>
                setDailyDraft({ ...dailyDraft, published: event.target.checked })
              }
            />
          </label>
        </div>
        <div className="admin-row">
          {(['zh-TW', 'zh-CN', 'en'] as DailyLocale[]).map((code) => (
            <button
              key={code}
              type="button"
              className={`ghost-btn compact${dailyLocale === code ? ' is-active' : ''}`}
              onClick={() => setDailyLocale(code)}
            >
              {code === 'zh-TW' ? '繁' : code === 'zh-CN' ? '简' : 'EN'}
            </button>
          ))}
        </div>
        <label className="field">
          <span>{t.auth.dailyHeadline}</span>
          <input
            value={dailyDraft.headline}
            maxLength={120}
            onChange={(event) => setDailyDraft({ ...dailyDraft, headline: event.target.value })}
          />
        </label>
        <label className="field">
          <span>{t.auth.dailyColors}</span>
          <input
            value={dailyDraft.colors}
            onChange={(event) => setDailyDraft({ ...dailyDraft, colors: event.target.value })}
          />
        </label>
        <label className="field">
          <span>{t.auth.dailySummary}</span>
          <textarea
            rows={5}
            maxLength={3000}
            value={dailyDraft.summary}
            onChange={(event) => setDailyDraft({ ...dailyDraft, summary: event.target.value })}
          />
        </label>
        <label className="field">
          <span>{t.auth.dailyNote}</span>
          <input
            value={dailyDraft.note}
            maxLength={1000}
            onChange={(event) => setDailyDraft({ ...dailyDraft, note: event.target.value })}
          />
        </label>
        <div className="admin-row">
          <button className="primary-btn compact" type="submit">
            {t.auth.save}
          </button>
          {dailyEntry ? (
            <button className="link-btn danger-link" type="button" onClick={() => void deleteDaily()}>
              {t.auth.dailyDelete}
            </button>
          ) : null}
          {dailyStatus ? <span className="muted small">{dailyStatus}</span> : null}
        </div>
        {dailyError ? <p className="form-error">{dailyError}</p> : null}
      </form>

      <h3 className="admin-heading">{t.auth.contentTitle}</h3>
      <form className="admin-form" onSubmit={saveContent}>
        <p className="muted small">{t.auth.contentHint}</p>
        <textarea
          className="admin-content"
          value={contentJson}
          onChange={(event) => {
            setContentJson(event.target.value);
            setContentSaved(false);
          }}
          rows={16}
          spellCheck={false}
        />
        <button className="primary-btn compact" type="submit">
          {t.auth.save}
        </button>
        {contentSaved ? <span className="muted small">{t.auth.saved}</span> : null}
        {contentError ? <p className="form-error">{contentError}</p> : null}
      </form>

      <h3 className="admin-heading">{t.auth.users}</h3>
      {users.length === 0 ? <p className="muted small">{t.auth.noUsers}</p> : null}
      <div className="admin-users">
        {users.map((user) => {
          const active =
            user.role === 'admin' ||
            (user.status === 'active' && (user.current_period_end ?? 0) > Date.now() / 1000);
          return (
            <div className="admin-user" key={user.id}>
              <div className="admin-user-main">
                <strong>{user.email}</strong>
                <span className="muted small">
                  {user.name || '—'} · {user.role} · {user.status ?? '—'}
                  {user.current_period_end
                    ? ` · ${new Date(user.current_period_end * 1000).toLocaleDateString(tag)}`
                    : ''}
                </span>
              </div>
              <button
                type="button"
                className={`ghost-btn compact${active ? ' is-danger' : ''}`}
                onClick={() => void toggle(user)}
                disabled={user.role === 'admin'}
              >
                {active ? t.auth.revoke : t.auth.grant}
              </button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
