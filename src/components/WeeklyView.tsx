import { useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { formatLongDate, formatShortDate, shiftISO, todayISO, weekdayLabels } from '../lib/date';
import {
  COLORS_BY_ELEMENT,
  ELEMENT_COLORS,
  ELEMENT_TEXT_COLORS,
  withAlpha,
  type Element,
} from '../lib/wuxing';
import { buildWeeklyForecast, weekStartISO, weekdayIndex } from '../lib/weekly';
import { ColorPill, ElementBadge } from './ui';

interface WeeklyViewProps {
  personalElement: Element;
  onSelectDate: (iso: string) => void;
}

const TINT_ALPHA = 0.16;

export function WeeklyView({ personalElement, onSelectDate }: WeeklyViewProps) {
  const { t, tag } = useI18n();
  const today = todayISO();
  const currentWeekStart = weekStartISO(today);
  const [start, setStart] = useState(currentWeekStart);

  const forecast = useMemo(
    () => buildWeeklyForecast(start, personalElement),
    [start, personalElement],
  );
  const labels = useMemo(() => weekdayLabels(tag), [tag]);

  const luckyColors = forecast.luckyElements.flatMap((element) =>
    COLORS_BY_ELEMENT[element].slice(0, 2),
  );

  const moveWeek = (delta: number) => setStart((current) => shiftISO(current, delta * 7));
  const elementName = (element: Element) => t.elements[element].name;

  return (
    <div className="view weekly-view">
      <div className="view-head">
        <h1>{t.week.title}</h1>
        {start !== currentWeekStart ? (
          <button type="button" className="link-btn" onClick={() => setStart(currentWeekStart)}>
            {t.week.thisWeek}
          </button>
        ) : null}
      </div>
      <p className="muted small">{t.week.hint}</p>

      <section className="card week-hero">
        <div className="week-nav">
          <button
            type="button"
            className="icon-btn"
            onClick={() => moveWeek(-1)}
            aria-label="previous week"
          >
            ‹
          </button>
          <strong>
            {formatShortDate(forecast.start, tag)} – {formatShortDate(forecast.end, tag)}
          </strong>
          <button
            type="button"
            className="icon-btn"
            onClick={() => moveWeek(1)}
            aria-label="next week"
          >
            ›
          </button>
        </div>

        <div className="week-overview">
          <div
            className="week-score"
            style={{
              background: withAlpha(ELEMENT_COLORS[forecast.element], TINT_ALPHA),
              borderColor: withAlpha(ELEMENT_COLORS[forecast.element], 0.35),
            }}
          >
            <span className="week-score-value">{forecast.average}</span>
            <span className="week-score-label">{t.week.average}</span>
          </div>

          <div className="week-facts">
            <button
              type="button"
              className="week-fact"
              onClick={() => onSelectDate(forecast.best.date)}
              aria-label={`${t.week.bestDay} ${formatLongDate(forecast.best.date, tag)}`}
            >
              <span className="week-fact-label">{t.week.bestDay}</span>
              <span className="week-fact-day">
                {labels[weekdayIndex(forecast.best.date)]} ·{' '}
                <span style={{ color: ELEMENT_TEXT_COLORS[forecast.best.element] }}>
                  {elementName(forecast.best.element)}
                </span>
              </span>
              <span
                className="week-fact-score"
                style={{ color: ELEMENT_TEXT_COLORS[forecast.best.element] }}
              >
                {forecast.best.score}
              </span>
            </button>
            <button
              type="button"
              className="week-fact"
              onClick={() => onSelectDate(forecast.watch.date)}
              aria-label={`${t.week.watchDay} ${formatLongDate(forecast.watch.date, tag)}`}
            >
              <span className="week-fact-label">{t.week.watchDay}</span>
              <span className="week-fact-day">
                {labels[weekdayIndex(forecast.watch.date)]} ·{' '}
                <span style={{ color: ELEMENT_TEXT_COLORS[forecast.watch.element] }}>
                  {elementName(forecast.watch.element)}
                </span>
              </span>
              <span
                className="week-fact-score"
                style={{ color: ELEMENT_TEXT_COLORS[forecast.watch.element] }}
              >
                {forecast.watch.score}
              </span>
            </button>
          </div>
        </div>

        <p className="week-guide">
          <ElementBadge element={forecast.element}>{elementName(forecast.element)}</ElementBadge>
          <span>{t.week.guide[forecast.relation]}</span>
        </p>

        <div className="palette-block week-palette">
          <div className="palette-group">
            <span className="palette-label">{t.week.luckyColors}</span>
            <div className="chip-row">
              {luckyColors.map((color) => (
                <ColorPill key={color.key} color={color} name={t.colors[color.key]} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{t.week.days}</h2>
          <span className="muted small">{t.week.daysHint}</span>
        </div>

        <div className="week-list">
          {forecast.days.map((day) => {
            const isToday = day.date === today;
            const swatches = COLORS_BY_ELEMENT[day.recommendation.best[0]].slice(0, 2);
            return (
              <button
                type="button"
                key={day.date}
                className={`week-row${isToday ? ' is-today' : ''}`}
                onClick={() => onSelectDate(day.date)}
                aria-label={`${formatLongDate(day.date, tag)} · ${elementName(day.element)} · ${day.score}`}
              >
                <span className="week-day">
                  <span className="week-weekday">
                    {labels[weekdayIndex(day.date)]}
                    {isToday ? ` · ${t.common.today}` : ''}
                  </span>
                  <span className="week-date">{formatShortDate(day.date, tag)}</span>
                </span>
                <span
                  className="week-el"
                  style={{
                    color: ELEMENT_TEXT_COLORS[day.element],
                    background: withAlpha(ELEMENT_COLORS[day.element], TINT_ALPHA),
                  }}
                >
                  {elementName(day.element)}
                </span>
                <span className="week-bar" aria-hidden="true">
                  <i
                    style={{ width: `${day.score}%`, background: ELEMENT_COLORS[day.element] }}
                  />
                </span>
                <span className="week-row-score">{day.score}</span>
                <span className="week-swatches" aria-hidden="true">
                  {swatches.map((color) => (
                    <i key={color.key} style={{ background: color.hex }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
