import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { api, ApiError, formatMoney } from '../lib/api';
import { useAuth } from '../lib/auth';
import { iapAvailable, iapGetProduct } from '../lib/iap';
import { disablePush, enablePush, isPushEnabled, pushAvailable, syncPush } from '../lib/push';

export function AccountSection({ onAdmin }: { onAdmin: () => void }) {
  const { t, tag, format } = useI18n();
  const { user, config, openAuth, logout, subscribe, manage, restore, refresh } = useAuth();
  const [storePrice, setStorePrice] = useState<string | null>(null);
  const [pushOn, setPushOn] = useState(() => isPushEnabled());
  const [pushBusy, setPushBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordDone, setPasswordDone] = useState(false);
  const fallbackPrice = config ? formatMoney(config.priceCents, config.currency, tag) : '—';
  const price = storePrice ?? fallbackPrice;
  const priceLine = `${price}/${t.auth.perMonth}`;

  useEffect(() => {
    if (!iapAvailable) return;
    let active = true;
    void iapGetProduct().then((product) => {
      if (active && product) setStorePrice(product.displayPrice);
    });
    return () => {
      active = false;
    };
  }, []);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
      } else {
        const ok = await enablePush(tag);
        setPushOn(ok);
        if (ok) await syncPush(tag);
      }
    } finally {
      setPushBusy(false);
    }
  };

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

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingPassword(true);
    setPasswordError(null);
    setPasswordDone(false);
    try {
      await api.changePassword({ currentPassword, newPassword });
      await refresh();
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordDone(true);
    } catch (error) {
      const code = error instanceof ApiError ? error.code : '';
      setPasswordError(
        code === 'INVALID_CREDENTIALS'
          ? t.auth.errorInvalidCredentials
          : code === 'SAME_PASSWORD'
            ? t.auth.errorSamePassword
            : code === 'INVALID_INPUT'
              ? t.auth.errorInvalidInput
              : t.auth.errorGeneric,
      );
    } finally {
      setSavingPassword(false);
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
        {iapAvailable ? (
          <button type="button" className="link-btn" onClick={() => void restore()}>
            {t.auth.restore}
          </button>
        ) : null}
        {pushAvailable ? (
          <label className="push-toggle">
            <input
              type="checkbox"
              checked={pushOn}
              disabled={pushBusy}
              onChange={() => void togglePush()}
            />
            <span>{t.auth.pushToggle}</span>
          </label>
        ) : null}
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            setPasswordOpen(true);
            setPasswordDone(false);
            setPasswordError(null);
          }}
        >
          {t.auth.changePassword}
        </button>
        <button type="button" className="link-btn" onClick={() => void logout()}>
          {t.auth.logout}
        </button>
      </div>

      {passwordOpen ? (
        <form className="password-form" onSubmit={changePassword}>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            placeholder={t.auth.currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
          />
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={newPassword}
            placeholder={t.auth.newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <div className="password-actions">
            <button className="primary-btn compact" type="submit" disabled={savingPassword}>
              {t.auth.passwordSave}
            </button>
            <button
              className="link-btn"
              type="button"
              onClick={() => {
                setPasswordOpen(false);
                setCurrentPassword('');
                setNewPassword('');
                setPasswordError(null);
              }}
            >
              {t.common.cancel}
            </button>
          </div>
          {passwordError ? <p className="form-error">{passwordError}</p> : null}
        </form>
      ) : passwordDone ? (
        <p className="muted small">{t.auth.passwordUpdated}</p>
      ) : null}

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
