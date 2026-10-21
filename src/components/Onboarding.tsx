import { useState } from 'react';
import { useI18n } from '../i18n';
import { isValidISO, todayISO } from '../lib/date';
import { elementOfLifeNumber, lifeNumber } from '../lib/numerology';
import { COLORS_BY_ELEMENT, ELEMENT_COLORS, ELEMENTS, type Element } from '../lib/wuxing';
import { LanguageMenu } from './LanguageMenu';
import { ColorDot } from './ui';

export interface Profile {
  birthDate: string;
  name: string;
}

const RING_POSITIONS: { left: string; top: string }[] = [
  { left: '50%', top: '4%' },
  { left: '94%', top: '38%' },
  { left: '77%', top: '91%' },
  { left: '23%', top: '91%' },
  { left: '6%', top: '38%' },
];

export function Onboarding({ onDone }: { onDone: (profile: Profile) => void }) {
  const { t, format } = useI18n();
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const valid = isValidISO(birthDate) && Number(birthDate.slice(0, 4)) >= 1900;
  const number = valid ? lifeNumber(birthDate) : null;
  const element: Element | null = valid ? elementOfLifeNumber(birthDate) : null;

  return (
    <div className="onboarding">
      <div className="onboarding-top">
        <div className="brand">
          <span className="brand-mark">命</span>
          <div>
            <div className="brand-name">{t.appName}</div>
            <div className="brand-sub">{t.appSub}</div>
          </div>
        </div>
        <LanguageMenu />
      </div>

      <div className="onboarding-art" aria-hidden="true">
        <div className="art-ring" />
        {ELEMENTS.map((item, index) => (
          <span
            key={item}
            className="art-dot"
            style={{
              left: RING_POSITIONS[index].left,
              top: RING_POSITIONS[index].top,
              background: ELEMENT_COLORS[item],
            }}
          />
        ))}
        <span className="art-glyph">命</span>
      </div>

      <div className="onboarding-copy">
        <h1>{t.onboarding.title}</h1>
        <p>{t.onboarding.desc}</p>
      </div>

      <form
        className="onboarding-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          onDone({ birthDate, name: name.trim() });
        }}
      >
        <label className="field">
          <span>{t.onboarding.name}</span>
          <input
            type="text"
            value={name}
            maxLength={24}
            placeholder={t.onboarding.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{t.onboarding.birth}</span>
          <input
            type="date"
            required
            min="1900-01-01"
            max={todayISO()}
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
          />
        </label>

        {valid && number && element ? (
          <div className="onboarding-preview" style={{ borderColor: ELEMENT_COLORS[element] }}>
            <div className="preview-number" style={{ color: ELEMENT_COLORS[element] }}>
              {number}
            </div>
            <div className="preview-copy">
              <strong>{t.numbers[number].title}</strong>
              <span>
                {format(t.hero.lifeLine, { number, element: t.elements[element].name })}
              </span>
              <div className="preview-swatches">
                {COLORS_BY_ELEMENT[element]
                  .slice(0, 3)
                  .map((color) => (
                    <ColorDot key={color.key} color={color} size={18} />
                  ))}
              </div>
            </div>
          </div>
        ) : null}

        <button type="submit" className="primary-btn" disabled={!valid}>
          {t.onboarding.start}
        </button>
        <p className="privacy-note">{t.onboarding.privacy}</p>
      </form>
    </div>
  );
}
