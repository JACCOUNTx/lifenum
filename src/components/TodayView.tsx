import { useMemo } from 'react';
import { useI18n } from '../i18n';
import { formatMoney } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatLongDate } from '../lib/date';
import type { GanzhiInfo } from '../lib/ganzhi';
import type { NumberKey } from '../lib/numerology';
import { buildOutfits, pickDailyColors, type Recommendation } from '../lib/recommend';
import {
  COLORS_BY_ELEMENT,
  ELEMENT_COLORS,
  ELEMENT_SOFT,
  ELEMENT_TEXT_COLORS,
  type Element,
} from '../lib/wuxing';
import { ColorPill, ElementBadge } from './ui';

interface TodayViewProps {
  date: string;
  isToday: boolean;
  lifeNumber: NumberKey;
  ganzhi: GanzhiInfo;
  recommendation: Recommendation;
  primary: Element;
  locked: boolean;
  onBackToToday: () => void;
  onShare: () => void;
  onCopy: () => void;
}

export function TodayView({
  date,
  isToday,
  lifeNumber,
  ganzhi,
  recommendation,
  primary,
  locked,
  onBackToToday,
  onShare,
  onCopy,
}: TodayViewProps) {
  const { t, locale, tag, format } = useI18n();
  const { user, config, openAuth, subscribe } = useAuth();
  const price = config ? formatMoney(config.priceCents, config.currency, tag) : '—';
  const handleUnlock = () => {
    if (user) void subscribe();
    else openAuth();
  };
  const dayElement = recommendation.dayElement;
  const personalElement = recommendation.personalElement;
  const outfits = useMemo(() => buildOutfits(recommendation, date), [recommendation, date]);
  const isMaster = lifeNumber === '11' || lifeNumber === '22' || lifeNumber === '33';
  const top = recommendation.combined[0];
  const dailyColors = pickDailyColors(recommendation, date, primary);
  const dailyElements = dailyColors.map((color) => color.element);
  const avoidColors = recommendation.avoid.flatMap((element) =>
    COLORS_BY_ELEMENT[element].slice(0, 1).map((color) => ({ element, color })),
  );

  const elementName = (element: Element) => t.elements[element].name;

  return (
    <div className="view today-view">
      {!isToday ? (
        <button type="button" className="back-today" onClick={onBackToToday}>
          ← {t.common.backToday}
        </button>
      ) : null}

      <section
        className="hero-card"
        style={{
          borderColor: ELEMENT_COLORS[dayElement],
          backgroundImage: `radial-gradient(circle at 88% 8%, ${ELEMENT_SOFT[dayElement]} 0%, rgba(255,255,255,0) 62%)`,
        }}
      >
        <div className="hero-meta">
          <span>{formatLongDate(date, tag)}</span>
          <span className="ganzhi-pill">
            {t.hero.ganzhi} ·{' '}
            {locale === 'en' ? ganzhi.pinyin : `${ganzhi.label}日`}
          </span>
        </div>

        <div className="hero-body">
          <div className="hero-symbol" style={{ color: ELEMENT_COLORS[dayElement] }}>
            {elementName(dayElement)}
          </div>
          <div className="hero-copy">
            <span className="hero-kicker">{t.hero.dayElement}</span>
            <h1>{format(t.hero.phrase, { element: elementName(dayElement) })}</h1>
            <p>{t.elements[dayElement].nature}</p>
          </div>
        </div>

        <div className="hero-foot">
          <span className="hero-life">
            {format(t.hero.lifeLine, { number: lifeNumber, element: elementName(personalElement) })}
          </span>
          {isMaster ? <span className="master-badge">{t.hero.masterBadge}</span> : null}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{t.today.scoreTitle}</h2>
          <span className="muted small">{t.today.scoreHint}</span>
        </div>

        <div className="score-list">
          {recommendation.combined.map((row) => {
            const isBest = dailyElements.includes(row.element);
            const isAvoid = recommendation.avoid.includes(row.element);
            return (
              <div
                key={row.element}
                className={`score-row${isBest ? ' is-best' : ''}${isAvoid ? ' is-avoid' : ''}`}
              >
                <span className="score-element" style={{ color: ELEMENT_TEXT_COLORS[row.element] }}>
                  {elementName(row.element)}
                </span>
                <div className="score-main">
                  <div className="score-bar">
                    <i
                      style={{
                        width: `${row.score}%`,
                        background: ELEMENT_COLORS[row.element],
                      }}
                    />
                  </div>
                  <div className="score-meta">
                    <span>
                      {t.today.dayRelation} · {t.relations[row.dayRelation].name}
                    </span>
                    <span>
                      {t.today.branchRelation} · {t.relations[row.branchRelation].name}
                    </span>
                    <span>
                      {t.today.selfRelation} · {t.relations[row.selfRelation].name}
                    </span>
                  </div>
                </div>
                <span className="score-value">{row.score}</span>
                {isBest ? (
                  <span className={`flag ${row.element === primary ? 'primary' : 'best'}`}>
                    {row.element === primary ? t.today.primaryBadge : t.today.bestBadge}
                  </span>
                ) : null}
                {isAvoid ? <span className="flag avoid">{t.today.avoidBadge}</span> : null}
              </div>
            );
          })}
        </div>

        <div className="palette-block">
          <div className="palette-group">
            <span className="palette-label">{t.today.best}</span>
            <div className="chip-row">
              {dailyColors.map((color) => (
                <ColorPill key={color.key} color={color} name={t.colors[color.key]} />
              ))}
            </div>
          </div>
          {avoidColors.length ? (
            <div className="palette-group">
              <span className="palette-label">{t.today.avoidBadge}</span>
              <div className="chip-row">
                {avoidColors.map(({ color }) => (
                  <ColorPill key={color.key} color={color} name={t.colors[color.key]} muted />
                ))}
              </div>
            </div>
          ) : null}
          <p className="relation-note">
            <ElementBadge element={top.element}>{elementName(top.element)}</ElementBadge>
            {t.relations[top.dayRelation].desc}
          </p>
        </div>
      </section>

      {locked ? (
        <section className="card locked-card">
          <h2>{t.auth.lockedTitle}</h2>
          <p className="muted small">{t.auth.lockedDesc}</p>
          <button type="button" className="primary-btn" onClick={handleUnlock}>
            {user
              ? format(t.auth.subscribe, { price: `${price}/${t.auth.perMonth}` })
              : t.auth.loginToSubscribe}
          </button>
          {user && config && !config.stripeConfigured ? (
            <p className="muted small">{t.auth.stripeMissing}</p>
          ) : null}
        </section>
      ) : null}

      {!locked ? (
        <>
          <section className="card">
            <div className="card-head">
              <h2>{t.today.outfits}</h2>
              <span className="muted small">{t.today.outfitHint}</span>
            </div>
            <div className="outfit-rows">
              {outfits.map((outfit) => (
                <article className="outfit-row" key={outfit.scene}>
                  <header className="outfit-row-head">
                    <h3>{t.scenes[outfit.scene]}</h3>
                  </header>
                  <div className="outfit-items">
                    {outfit.picks.map((pick) => (
                      <div className="outfit-item" key={pick.role}>
                        <span
                          className="outfit-dot"
                          style={{
                            background: pick.color.hex,
                            boxShadow: pick.color.light
                              ? 'inset 0 0 0 1px rgba(33,29,26,0.16)'
                              : 'none',
                          }}
                        />
                        <span className="outfit-item-text">
                          <span className="outfit-role">{t.roles[pick.role]}</span>
                          <span className="outfit-color">{t.colors[pick.color.key]}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="outfit-material">
                    {t.today.material} · {t.elements[outfit.materialElement].material}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <div className="action-row">
            <button type="button" className="primary-btn" onClick={onShare}>
              {t.today.share}
            </button>
            <button type="button" className="ghost-btn" onClick={onCopy}>
              {t.today.copy}
            </button>
          </div>

          <details className="card rules">
            <summary>{t.today.rules}</summary>
            <ol>
              {t.today.rulesBody.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ol>
          </details>
        </>
      ) : null}

      <p className="disclaimer">{t.today.disclaimer}</p>
    </div>
  );
}
