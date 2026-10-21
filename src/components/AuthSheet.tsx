import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import type { Profile } from '../lib/models';
import { loadJSON } from '../lib/storage';
import { Sheet } from './ui';

export function AuthSheet() {
  const { t } = useI18n();
  const { authOpen, closeAuth, login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authOpen) return;
    const profile = loadJSON<Profile | null>('profile', null);
    setName((current) => current || profile?.name || '');
    setBirthDate((current) => current || profile?.birthDate || '');
    setError(null);
  }, [authOpen]);

  if (!authOpen) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'register') await register({ email, password, name, birthDate });
      else await login({ email, password });
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : '';
      setError(
        code === 'EMAIL_EXISTS'
          ? t.auth.errorEmailExists
          : code === 'INVALID_CREDENTIALS'
            ? t.auth.errorInvalidCredentials
            : code === 'INVALID_INPUT'
              ? t.auth.errorInvalidInput
              : t.auth.errorGeneric,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={authOpen} title={t.auth.account} closeLabel={t.common.close} onClose={closeAuth}>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === 'login' ? 'is-active' : ''}
          onClick={() => setMode('login')}
        >
          {t.auth.login}
        </button>
        <button
          type="button"
          className={mode === 'register' ? 'is-active' : ''}
          onClick={() => setMode('register')}
        >
          {t.auth.register}
        </button>
      </div>

      <form className="auth-form" onSubmit={submit}>
        <label className="field">
          <span>{t.auth.email}</span>
          <input
            type="email"
            required
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="field">
          <span>{t.auth.password}</span>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {mode === 'register' ? (
          <>
            <label className="field">
              <span>{t.auth.name}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              <span>{t.auth.birthDate}</span>
              <input
                type="date"
                required
                value={birthDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setBirthDate(event.target.value)}
              />
            </label>
          </>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
        <button className="primary-btn" type="submit" disabled={busy}>
          {busy ? '…' : mode === 'login' ? t.auth.submitLogin : t.auth.submitRegister}
        </button>
      </form>

      <p className="muted small">{t.auth.subtitle}</p>
    </Sheet>
  );
}
