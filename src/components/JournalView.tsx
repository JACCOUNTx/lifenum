import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { formatLongDate, shiftISO, todayISO } from '../lib/date';
import type { Entry } from '../lib/models';
import {
  COLOR_BY_KEY,
  COLORS_BY_ELEMENT,
  ELEMENT_COLORS,
  ELEMENT_TEXT_COLORS,
  ELEMENTS,
  type ColorKey,
  type Element,
} from '../lib/wuxing';
import { ColorDot, Sheet } from './ui';

const MOOD_ICONS = ['😔', '😮\u200d💨', '😌', '🙂', '✨'];

interface JournalViewProps {
  entries: Entry[];
  onSave: (entry: Entry) => void;
  onDelete: (id: string) => void;
}

interface Draft {
  date: string;
  colors: ColorKey[];
  mood: number;
  note: string;
}

export function JournalView({ entries, onSave, onDelete }: JournalViewProps) {
  const { t, tag } = useI18n();
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>({ date: today, colors: [], mood: 3, note: '' });

  const sorted = useMemo(
    () =>
      [...entries].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : b.date.localeCompare(a.date))),
    [entries],
  );

  const stats = useMemo(() => {
    const dates = new Set(entries.map((entry) => entry.date));
    let cursor = dates.has(today)
      ? today
      : dates.has(shiftISO(today, -1))
        ? shiftISO(today, -1)
        : null;
    let streak = 0;
    while (cursor && dates.has(cursor)) {
      streak += 1;
      cursor = shiftISO(cursor, -1);
    }

    const prefix = today.slice(0, 7);
    const monthEntries = entries.filter((entry) => entry.date.startsWith(prefix));
    const distribution: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
    monthEntries.forEach((entry) => {
      entry.colors.forEach((key) => {
        distribution[COLOR_BY_KEY[key].element] += 1;
      });
    });
    const max = Math.max(1, ...Object.values(distribution));
    return { streak, monthCount: monthEntries.length, distribution, max };
  }, [entries, today]);

  const toggleColor = (key: ColorKey) => {
    setDraft((current) => ({
      ...current,
      colors: current.colors.includes(key)
        ? current.colors.filter((item) => item !== key)
        : [...current.colors, key],
    }));
  };

  const openNew = () => {
    setDraft({ date: today, colors: [], mood: 3, note: '' });
    setOpen(true);
  };

  const submit = () => {
    if (!draft.date) return;
    onSave({
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      date: draft.date,
      colors: draft.colors,
      mood: draft.mood,
      note: draft.note.trim(),
      createdAt: Date.now(),
    });
    setOpen(false);
  };

  return (
    <div className="view journal-view">
      <div className="view-head">
        <h1>{t.journal.title}</h1>
        <button type="button" className="primary-btn compact" onClick={openNew}>
          + {t.journal.add}
        </button>
      </div>

      <section className="card stats-card">
        <div className="stat">
          <span className="stat-value">{stats.streak}</span>
          <span className="stat-label">{t.journal.streak}</span>
        </div>
        <div className="stat">
          <span className="stat-value">{stats.monthCount}</span>
          <span className="stat-label">{t.journal.monthCount}</span>
        </div>
        <div className="stat-distribution">
          <span className="stat-label">{t.journal.distribution}</span>
          <div className="dist-rows">
            {ELEMENTS.map((element) => (
              <div className="dist-row" key={element}>
                <span className="dist-name" style={{ color: ELEMENT_TEXT_COLORS[element] }}>
                  {t.elements[element].name}
                </span>
                <span className="dist-bar">
                  <i
                    style={{
                      width: `${(stats.distribution[element] / stats.max) * 100}%`,
                      background: ELEMENT_COLORS[element],
                    }}
                  />
                </span>
                <span className="dist-count">{stats.distribution[element]}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {sorted.length === 0 ? (
        <div className="empty">
          <span className="empty-mark">✦</span>
          <h3>{t.journal.empty}</h3>
          <p>{t.journal.emptyHint}</p>
        </div>
      ) : (
        <ul className="entry-list">
          {sorted.map((entry) => (
            <li key={entry.id} className="card entry">
              <div className="entry-head">
                <span className="entry-date">{formatLongDate(entry.date, tag)}</span>
                <span className="entry-mood" title={t.journal.moodLabels[entry.mood - 1]}>
                  {MOOD_ICONS[entry.mood - 1]}
                  <em>{t.journal.moodLabels[entry.mood - 1]}</em>
                </span>
              </div>
              {entry.colors.length ? (
                <div className="chip-row">
                  {entry.colors.map((key) => (
                    <span key={key} className="color-pill">
                      <ColorDot color={COLOR_BY_KEY[key]} size={16} />
                      {t.colors[key]}
                    </span>
                  ))}
                </div>
              ) : null}
              {entry.note ? <p className="entry-note">{entry.note}</p> : null}
              <button
                type="button"
                className="entry-delete"
                onClick={() => {
                  if (window.confirm(t.journal.deleteConfirm)) onDelete(entry.id);
                }}
              >
                {t.common.delete}
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={open}
        title={t.journal.addTitle}
        closeLabel={t.common.close}
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="ghost-btn" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </button>
            <button type="button" className="primary-btn" onClick={submit}>
              {t.common.save}
            </button>
          </>
        }
      >
        <label className="field">
          <span>{t.journal.date}</span>
          <input
            type="date"
            value={draft.date}
            max={today}
            onChange={(event) => setDraft({ ...draft, date: event.target.value })}
          />
        </label>

        <div className="field">
          <span>
            {t.journal.colors} <em className="muted">· {t.journal.colorHint}</em>
          </span>
          <div className="color-groups">
            {ELEMENTS.map((element) => (
              <div className="color-group" key={element}>
                <span className="group-label" style={{ color: ELEMENT_TEXT_COLORS[element] }}>
                  {t.elements[element].name}
                </span>
                <div className="color-options">
                  {COLORS_BY_ELEMENT[element].map((color) => {
                    const active = draft.colors.includes(color.key);
                    return (
                      <button
                        type="button"
                        key={color.key}
                        className={`color-option${active ? ' is-active' : ''}`}
                        onClick={() => toggleColor(color.key)}
                        aria-pressed={active}
                        style={active ? { borderColor: color.hex } : undefined}
                      >
                        <ColorDot color={color} size={18} />
                        <span>{t.colors[color.key]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="field">
          <span>{t.journal.mood}</span>
          <div className="mood-row">
            {MOOD_ICONS.map((icon, index) => {
              const value = index + 1;
              return (
                <button
                  type="button"
                  key={icon}
                  className={`mood-btn${draft.mood === value ? ' is-active' : ''}`}
                  onClick={() => setDraft({ ...draft, mood: value })}
                  aria-pressed={draft.mood === value}
                >
                  <span>{icon}</span>
                  <em>{t.journal.moodLabels[index]}</em>
                </button>
              );
            })}
          </div>
        </div>

        <label className="field">
          <span>{t.journal.note}</span>
          <textarea
            rows={3}
            maxLength={280}
            placeholder={t.journal.notePlaceholder}
            value={draft.note}
            onChange={(event) => setDraft({ ...draft, note: event.target.value })}
          />
        </label>
      </Sheet>
    </div>
  );
}
