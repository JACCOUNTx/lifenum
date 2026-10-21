import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { formatLongDate, formatShortDate, shiftISO, todayISO, weekdayLabels } from '../lib/date';
import { dayGanzhi } from '../lib/ganzhi';
import { buildRecommendation, pickDailyColors, primaryForDate } from '../lib/recommend';
import { weekStartISO, weekdayIndex } from '../lib/weekly';
import type { Element } from '../lib/wuxing';

interface CalendarViewProps {
  selectedDate: string;
  personalElement: Element;
  entries: { date: string }[];
  onSelectDate: (iso: string) => void;
}

export function CalendarView({
  selectedDate,
  personalElement,
  entries,
  onSelectDate,
}: CalendarViewProps) {
  const { t, tag, locale } = useI18n();
  const today = todayISO();
  const currentWeekStart = weekStartISO(today);
  const [start, setStart] = useState(() => weekStartISO(selectedDate));
  const labels = useMemo(() => weekdayLabels(tag), [tag]);
  const roles = [t.today.primaryBadge, t.today.secondaryBadge, t.today.accentBadge];

  const days = useMemo(() => {
    const recordDates = new Set(entries.map((entry) => entry.date));
    return Array.from({ length: 7 }, (_, index) => {
      const date = shiftISO(start, index);
      const info = dayGanzhi(date);
      const recommendation = buildRecommendation(
        info.stemElement,
        personalElement,
        info.branchElement,
        info.stemIndex % 2 === 0,
      );
      const primary = primaryForDate(date, personalElement);
      const colors = pickDailyColors(recommendation, date, primary);
      const relation =
        recommendation.combined.find((row) => row.element === primary)?.dayRelation ?? 'same';
      return { date, info, colors, relation, recorded: recordDates.has(date) };
    });
  }, [start, personalElement, entries]);

  const move = (delta: number) => setStart((current) => shiftISO(current, delta * 7));

  return (
    <div className="view calendar-view">
      <div className="view-head">
        <h1>{t.calendar.title}</h1>
        {start !== currentWeekStart ? (
          <button type="button" className="link-btn" onClick={() => setStart(currentWeekStart)}>
            {t.calendar.thisWeek}
          </button>
        ) : null}
      </div>
      <p className="muted small">{t.calendar.hint}</p>

      <section className="card week-cal">
        <div className="week-nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() => move(-1)}
            aria-label="previous week"
          >
            ‹
          </button>
          <strong>
            {formatShortDate(start, tag)} – {formatShortDate(shiftISO(start, 6), tag)}
          </strong>
          <button
            type="button"
            className="icon-btn"
            onClick={() => move(1)}
            aria-label="next week"
          >
            ›
          </button>
        </div>

        <div className="week-cal-list">
          {days.map((day) => {
            const isToday = day.date === today;
            const isSelected = day.date === selectedDate;
            const colorNames = day.colors.map((color) => t.colors[color.key]).join('、');
            return (
              <button
                type="button"
                key={day.date}
                className={`week-cal-row${isToday ? ' is-today' : ''}${
                  isSelected ? ' is-selected' : ''
                }`}
                onClick={() => onSelectDate(day.date)}
                aria-label={`${formatLongDate(day.date, tag)} · ${colorNames}${
                  day.recorded ? ` · ${t.calendar.recordMark}` : ''
                }`}
              >
                <span className="week-cal-head">
                  <span className="week-cal-weekday">{labels[weekdayIndex(day.date)]}</span>
                  <span className="week-cal-date">{formatShortDate(day.date, tag)}</span>
                  {isToday ? <span className="week-cal-today">{t.common.today}</span> : null}
                  {day.recorded ? <span className="week-cal-record" aria-hidden="true" /> : null}
                  <span className="week-cal-ganzhi">
                    {locale === 'en' ? day.info.pinyin : `${day.info.label}日`}
                  </span>
                </span>

                <span className="week-cal-colors">
                  {day.colors.map((color, index) => (
                    <span className="week-cal-color" key={color.key}>
                      <span className="week-cal-role">{roles[index]}</span>
                      <span className="week-cal-color-line">
                        <i
                          className="week-cal-swatch"
                          style={{
                            background: color.hex,
                            boxShadow: color.light
                              ? 'inset 0 0 0 1px rgba(33,29,26,0.16)'
                              : 'none',
                          }}
                          aria-hidden="true"
                        />
                        <span className="week-cal-name">{t.colors[color.key]}</span>
                      </span>
                    </span>
                  ))}
                </span>

                <span className="week-cal-desc">
                  <b>{t.relations[day.relation].name}</b>
                  {t.relations[day.relation].desc}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
