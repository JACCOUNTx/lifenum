import { useState } from 'react';
import { DICTS, LOCALES, useI18n } from '../i18n';

export function LanguageMenu() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div className="lang">
      <button
        type="button"
        className="lang-btn"
        onClick={() => setOpen((value) => !value)}
        aria-label={t.common.language}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M3.5 12h17M12 3.2c2.6 2.4 4 5.4 4 8.8s-1.4 6.4-4 8.8c-2.6-2.4-4-5.4-4-8.8s1.4-6.4 4-8.8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        </svg>
        <span>{DICTS[locale].localeName}</span>
      </button>
      {open ? (
        <>
          <div className="lang-backdrop" onClick={() => setOpen(false)} />
          <div className="lang-menu" role="menu">
            {LOCALES.map((code) => (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={code === locale}
                className={code === locale ? 'active' : ''}
                onClick={() => {
                  setLocale(code);
                  setOpen(false);
                }}
              >
                <span>{DICTS[code].localeName}</span>
                {code === locale ? <span className="check">✓</span> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
