import { useState } from 'react';
import { DICTS, LOCALES, useI18n } from '../i18n';
import { formatLongDate, isValidISO, todayISO } from '../lib/date';
import type { Profile } from '../lib/models';
import { birthdayNumber, elementOfLifeNumber, lifeNumber, personalYearNumber } from '../lib/numerology';
import {
  COLORS_BY_ELEMENT,
  ELEMENT_COLORS,
  controlledBy,
  generatedBy,
  type ColorKey,
  type Element,
} from '../lib/wuxing';
import { ColorPill } from './ui';

const VERSION = '1.0.0';

interface ProfileViewProps {
  profile: Profile;
  onUpdate: (profile: Profile) => void;
  onReset: () => void;
}

function ColorGroup({
  title,
  element,
  nameOf,
}: {
  title: string;
  element: Element;
  nameOf: (key: ColorKey) => string;
}) {
  return (
    <div className="color-group-view">
      <span className="palette-label" style={{ color: ELEMENT_COLORS[element] }}>
        {title}
      </span>
      <div className="chip-row">
        {COLORS_BY_ELEMENT[element].slice(0, 3).map((color) => (
          <ColorPill key={color.key} color={color} name={nameOf(color.key)} />
        ))}
      </div>
    </div>
  );
}

export function ProfileView({ profile, onUpdate, onReset }: ProfileViewProps) {
  const { t, locale, setLocale, tag, format } = useI18n();
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);
  const [draftBirth, setDraftBirth] = useState(profile.birthDate);

  const number = lifeNumber(profile.birthDate);
  const element = elementOfLifeNumber(profile.birthDate);
  const year = new Date().getFullYear();
  const personalYear = personalYearNumber(profile.birthDate, year);
  const isMaster = number === '11' || number === '22' || number === '33';
  const colorName = (key: ColorKey) => t.colors[key];
  const birthDayNumber = birthdayNumber(profile.birthDate);

  return (
    <div className="view profile-view">
      <div className="view-head">
        <h1>{t.profile.title}</h1>
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setDraftName(profile.name);
            setDraftBirth(profile.birthDate);
            setEditing((value) => !value);
          }}
        >
          {editing ? t.common.cancel : t.profile.edit}
        </button>
      </div>

      {editing ? (
        <form
          className="card edit-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isValidISO(draftBirth)) return;
            onUpdate({ name: draftName.trim(), birthDate: draftBirth });
            setEditing(false);
          }}
        >
          <label className="field">
            <span>{t.profile.name}</span>
            <input
              type="text"
              maxLength={24}
              value={draftName}
              placeholder={t.onboarding.namePlaceholder}
              onChange={(event) => setDraftName(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t.profile.birth}</span>
            <input
              type="date"
              required
              min="1900-01-01"
              max={todayISO()}
              value={draftBirth}
              onChange={(event) => setDraftBirth(event.target.value)}
            />
          </label>
          <button type="submit" className="primary-btn">
            {t.profile.save}
          </button>
        </form>
      ) : (
        <section className="identity">
          <div className="avatar" style={{ borderColor: ELEMENT_COLORS[element] }}>
            <span style={{ color: ELEMENT_COLORS[element] }}>{number}</span>
          </div>
          <div>
            <h2>{profile.name || t.numbers[number].title}</h2>
            <p className="muted">
              {formatLongDate(profile.birthDate, tag)} · {t.profile.birthdayNumber} {birthDayNumber}
            </p>
            <span className="element-tag" style={{ background: ELEMENT_COLORS[element] }}>
              {t.profile.element} · {t.elements[element].name}
            </span>
          </div>
        </section>
      )}

      <section className="card number-card">
        <div className="number-head">
          <div>
            <span className="hero-kicker">{t.profile.lifeNumber}</span>
            <h2>
              {number} · {t.numbers[number].title}
            </h2>
          </div>
          {isMaster ? <span className="master-badge">{t.hero.masterBadge}</span> : null}
        </div>
        <p>{t.numbers[number].desc}</p>
        <div className="lesson">
          <span>{t.profile.lesson}</span>
          <p>{t.numbers[number].lesson}</p>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>{t.profile.colorGuide}</h2>
        </div>
        <div className="color-group-view">
          <ColorGroup
            title={t.profile.luckyColors}
            element={generatedBy(element)}
            nameOf={colorName}
          />
          <ColorGroup title={t.profile.element} element={element} nameOf={colorName} />
          <ColorGroup title={t.profile.avoidColors} element={controlledBy(element)} nameOf={colorName} />
        </div>
        <p className="muted small">{t.relations.support.desc}</p>
      </section>

      <section className="card year-card">
        <div className="card-head">
          <h2>{format(t.profile.yearTitle, { year })}</h2>
          <span className="muted small">{format(t.profile.yearSub, { number: personalYear })}</span>
        </div>
        <p>{t.yearThemes[personalYear]}</p>
      </section>

      <section className="card settings-card">
        <div className="setting-row">
          <span>{t.common.language}</span>
          <div className="segmented">
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                className={code === locale ? 'active' : ''}
                onClick={() => setLocale(code)}
              >
                {DICTS[code].localeName}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span>{t.profile.reset}</span>
          <button
            type="button"
            className="danger-btn"
            onClick={() => {
              if (window.confirm(t.profile.resetConfirm)) onReset();
            }}
          >
            {t.common.delete}
          </button>
        </div>
      </section>

      <section className="about">
        <h3>{t.profile.about}</h3>
        <p>{t.profile.aboutText}</p>
        <p className="muted small about-links">
          <a href="https://lifenum.pages.dev/privacy" target="_blank" rel="noopener">
            {t.profile.privacyPolicy}
          </a>
          <span>·</span>
          <a href="https://lifenum.pages.dev/delete-account" target="_blank" rel="noopener">
            {t.profile.deleteInfo}
          </a>
        </p>
        <p className="muted small">
          {t.profile.version} {VERSION}
        </p>
      </section>
    </div>
  );
}
