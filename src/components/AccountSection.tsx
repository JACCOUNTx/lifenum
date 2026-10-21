import { useState } from 'react';
import { useI18n } from '../i18n';
import { api, ApiError, formatMoney } from '../lib/api';
import { useAuth } from '../lib/auth';

export function AccountSection({ onAdmin }: { onAdmin: () => void }) {
  const { t, tag, format } = useI18n();
  const { user, config, openAuth, logout, subscribe, manage } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const price = config ? formatMoney(config.priceCents, config.currency, tag) : '—';
  const priceLine = `${price}/${t.auth.perMonth}`;

  const removeAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.deleteAccount(password);
      Object.keys(localStorage)
        .filter((key) => key.startsWith('lifenum.') && key !== 'lifenum.locale')
        .forEach((key) => localStorage.removeItem(key));
      window.location.reload();
    } catch (error) {
      setDeleteError(
        error instanceof ApiError && error.code === 'INVALID_CREDENTIALS'
          ? t.auth.errorInvalidCredentials
          : t.auth.errorGeneric,
      );
    } finally {
      setDeleting(false);
    }
  };

  if (!user) {
    return (
      <section className="card account-card">
        <div className="card-head">
          <h2>{t.auth.account}</h2>
          <span className="account-badge">{t.auth.guest}</span>
        </div>
        <p className="muted small">{t.auth.subtitle}</p>
        <div className="account-actions">
          <button type="button" className="primary-btn" onClick={openAuth}>
            {t.auth.login} / {t.auth.register}
          </button>
        </div>
      </section>
    );
  }

  const active = user.role === 'admin' || user.membership.active;
  const periodEnd = user.membership.currentPeriodEnd
    ? new Date(user.membership.currentPeriodEnd * 1000).toLocaleDateString(tag)
    : null;

  return (
    <section className="card account-card">
      <div className="card-head">
        <h2>{t.auth.account}</h2>
        <span className={`account-badge${active ? ' is-member' : ''}`}>
          {active ? t.auth.member : t.auth.free}
        </span>
      </div>
      <p className="account-email">{user.email}</p>
      {user.name || user.birthDate ? (
        <p className="muted small">{[user.name, user.birthDate].filter(Boolean).join(' · ')}</p>
      ) : null}
      {active && periodEnd ? (
        <p className="muted small">{format(t.auth.activeUntil, { date: periodEnd })}</p>
      ) : null}

      <div className="account-actions">
        {!active ? (
          <button type="button" className="primary-btn" onClick={() => void subscribe()}>
            {format(t.auth.subscribe, { price: priceLine })}
          </button>
        ) : null}
        {active && user.role !== 'admin' ? (
          <button type="button" className="ghost-btn" onClick={() => void manage()}>
            {t.auth.manage}
          </button>
        ) : null}
        {user.role === 'admin' ? (
          <button type="button" className="ghost-btn" onClick={onAdmin}>
            {t.auth.admin}
          </button>
        ) : null}
        <button type="button" className="link-btn" onClick={() => void logout()}>
          {t.auth.logout}
        </button>
      </div>

      {!active && config && !config.stripeConfigured ? (
        <p className="muted small">{t.auth.stripeMissing}</p>
      ) : null}

      <div className="account-danger">
        {deleteOpen ? (
          <form className="delete-form" onSubmit={removeAccount}>
            <p className="muted small">{t.auth.deleteAccountDesc}</p>
            <input
              type="password"
              required
              value={password}
              placeholder={t.auth.password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <div className="delete-actions">
              <button className="danger-btn compact" type="submit" disabled={deleting}>
                {t.auth.deleteConfirm}
              </button>
              <button
                className="link-btn"
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setPassword('');
                  setDeleteError(null);
                }}
              >
                {t.common.cancel}
              </button>
            </div>
            {deleteError ? <p className="form-error">{deleteError}</p> : null}
          </form>
        ) : (
          <button className="link-btn danger-link" type="button" onClick={() => setDeleteOpen(true)}>
            {t.auth.deleteAccount}
          </button>
        )}
      </div>
    </section>
  );
}
