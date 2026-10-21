import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { api, type AdminUser, type PublicConfig } from '../lib/api';
import { Sheet } from './ui';

export function AdminSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, tag } = useI18n();
  const [settings, setSettings] = useState<PublicConfig | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [price, setPrice] = useState('88');
  const [currency, setCurrency] = useState('HKD');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [nextSettings, nextUsers] = await Promise.all([api.adminSettings(), api.adminUsers()]);
      setSettings(nextSettings);
      setPrice(String(nextSettings.priceCents / 100));
      setCurrency(nextSettings.currency);
      setUsers(nextUsers);
      setError(null);
    } catch {
      setError(t.auth.errorGeneric);
    }
  };

  useEffect(() => {
    if (open) void load();
  }, [open]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaved(false);
    try {
      const next = await api.saveSettings({ price: Number(price), currency });
      setSettings(next);
      setPrice(String(next.priceCents / 100));
      setSaved(true);
    } catch {
      setError(t.auth.errorInvalidInput);
    }
  };

  const toggle = async (user: AdminUser) => {
    const active =
      user.role === 'admin' ||
      (user.status === 'active' && (user.current_period_end ?? 0) > Date.now() / 1000);
    try {
      await api.setMembership(user.id, !active);
      setUsers(await api.adminUsers());
    } catch {
      setError(t.auth.errorGeneric);
    }
  };

  return (
    <Sheet open={open} title={t.auth.adminTitle} closeLabel={t.common.close} onClose={onClose} wide>
      <form className="admin-form" onSubmit={save}>
        <div className="admin-row">
          <label className="field">
            <span>{t.auth.price}</span>
            <input
              type="number"
              min="1"
              max="100000"
              step="1"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
            />
          </label>
          <label className="field">
            <span>{t.auth.currency}</span>
            <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {['HKD', 'TWD', 'CNY', 'USD'].map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button className="primary-btn compact" type="submit">
          {t.auth.save}
        </button>
        {saved ? <span className="muted small">{t.auth.saved}</span> : null}
        {settings && !settings.stripeConfigured ? (
          <p className="muted small">{t.auth.stripeMissing}</p>
        ) : null}
        {error ? <p className="form-error">{error}</p> : null}
      </form>

      <h3 className="admin-heading">{t.auth.users}</h3>
      {users.length === 0 ? <p className="muted small">{t.auth.noUsers}</p> : null}
      <div className="admin-users">
        {users.map((user) => {
          const active =
            user.role === 'admin' ||
            (user.status === 'active' && (user.current_period_end ?? 0) > Date.now() / 1000);
          return (
            <div className="admin-user" key={user.id}>
              <div className="admin-user-main">
                <strong>{user.email}</strong>
                <span className="muted small">
                  {user.name || '—'} · {user.role} · {user.status ?? '—'}
                  {user.current_period_end
                    ? ` · ${new Date(user.current_period_end * 1000).toLocaleDateString(tag)}`
                    : ''}
                </span>
              </div>
              <button
                type="button"
                className={`ghost-btn compact${active ? ' is-danger' : ''}`}
                onClick={() => void toggle(user)}
                disabled={user.role === 'admin'}
              >
                {active ? t.auth.revoke : t.auth.grant}
              </button>
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
