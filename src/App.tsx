import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useMemo, useState } from 'react';
import { AccountSection } from './components/AccountSection';
import { AdminSheet } from './components/AdminSheet';
import { AuthSheet } from './components/AuthSheet';
import { CalendarView } from './components/CalendarView';
import { JournalView } from './components/JournalView';
import { LanguageMenu } from './components/LanguageMenu';
import { Onboarding } from './components/Onboarding';
import { ProfileView } from './components/ProfileView';
import { ShareSheet } from './components/ShareSheet';
import { TodayView } from './components/TodayView';
import { WeeklyView } from './components/WeeklyView';
import { useI18n } from './i18n';
import type { Dict } from './i18n/types';
import { copyText } from './lib/clipboard';
import { api } from './lib/api';
import { useAuth } from './lib/auth';
import { formatLongDate, todayISO } from './lib/date';
import { dayGanzhi } from './lib/ganzhi';
import type { Entry, Profile } from './lib/models';
import { elementOfLifeNumber, lifeNumber } from './lib/numerology';
import { applyUpdate, onUpdateAvailable } from './lib/pwa';
import { buildOutfits, buildRecommendation, primaryForDate, type Recommendation } from './lib/recommend';
import type { ShareCardData } from './lib/shareCard';
import { useStoredState } from './lib/storage';
import { COLORS_BY_ELEMENT, ELEMENT_COLORS, ELEMENT_SOFT } from './lib/wuxing';

type Tab = 'today' | 'week' | 'calendar' | 'journal' | 'profile';

const NAV_ICONS: Record<Tab, string> = {
  today: 'M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.9 5.9l1.6 1.6M16.5 16.5l1.6 1.6M18.1 5.9l-1.6 1.6M7.5 16.5l-1.6 1.6',
  week: 'M12 3.6l1.8 4.9 4.9 1.8-4.9 1.8L12 17l-1.8-4.9-4.9-1.8 4.9-1.8zM18.4 14.6l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z',
  calendar:
    'M4.5 6.5h15v13h-15zM4.5 10h15M8.5 3.8v4M15.5 3.8v4M8.5 14h2M13.5 14h2M8.5 17h2',
  journal: 'M6 3.8h9.5l2.5 2.5v13.9H6zM15 3.8V7h3M9 11h6M9 14.5h6M9 18h4',
  profile: 'M12 11.2a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM5 20.2c.6-3.4 3.4-5.4 7-5.4s6.4 2 7 5.4',
};

function NavIcon({ tab }: { tab: Tab }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path
        d={NAV_ICONS[tab]}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function App() {
  const { t, locale, tag, format } = useI18n();
  const { user, loading: authLoading, notice, clearNotice, refresh } = useAuth();
  const [profile, setProfile] = useStoredState<Profile | null>('profile', null);
  const [entries, setEntries] = useStoredState<Entry[]>('journal', []);
  const [tab, setTab] = useState<Tab>('today');
  const [selectedDate, setSelectedDate] = useState(todayISO());
  const [shareOpen, setShareOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [updateReady, setUpdateReady] = useState(false);

  const isMember = user?.role === 'admin' || Boolean(user?.membership.active);
  const visibleTabs = useMemo<Tab[]>(
    () => (isMember ? ['today', 'week', 'calendar', 'journal', 'profile'] : ['today', 'profile']),
    [isMember],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!visibleTabs.includes(tab)) setTab('today');
  }, [authLoading, tab, visibleTabs]);

  useEffect(() => {
    if (!user) return;
    if (user.birthDate) {
      setProfile((current) =>
        current &&
        current.birthDate === user.birthDate &&
        (current.name ?? '') === (user.name ?? '')
          ? current
          : { birthDate: user.birthDate!, name: user.name ?? '' },
      );
    } else if (profile) {
      void api.updateMe({ name: profile.name, birthDate: profile.birthDate }).then(() => refresh());
    }
  }, [user, profile, setProfile, refresh]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(clearNotice, 4000);
    return () => clearTimeout(timer);
  }, [notice, clearNotice]);

  const ganzhi = useMemo(() => dayGanzhi(selectedDate), [selectedDate]);

  const recommendation = useMemo(() => {
    const personal = profile ? elementOfLifeNumber(profile.birthDate) : 'earth';
    return buildRecommendation(
      ganzhi.stemElement,
      personal,
      ganzhi.branchElement,
      ganzhi.stemIndex % 2 === 0,
    );
  }, [profile, ganzhi]);

  const number = useMemo(() => (profile ? lifeNumber(profile.birthDate) : '9'), [profile]);
  const isToday = selectedDate === todayISO();

  const primary = useMemo(
    () => primaryForDate(selectedDate, recommendation.personalElement),
    [selectedDate, recommendation.personalElement],
  );

  const caption = useMemo(() => {
    const best = recommendation.best
      .map((element) => {
        const colors = COLORS_BY_ELEMENT[element]
          .slice(0, 2)
          .map((color) => t.colors[color.key])
          .join(' / ');
        return `${t.elements[element].name} ${colors}`;
      })
      .join(' · ');
    return [
      `${t.appName} · ${formatLongDate(selectedDate, tag)}`,
      `${locale === 'en' ? ganzhi.pinyin : ganzhi.label} · ${t.elements[recommendation.dayElement].name}`,
      `${t.today.best}: ${best}`,
      format(t.hero.lifeLine, {
        number,
        element: t.elements[recommendation.personalElement].name,
      }),
      t.today.disclaimer,
    ].join('\n');
  }, [recommendation, selectedDate, t, tag, locale, ganzhi, format, number]);

  const shareData = useMemo<ShareCardData>(() => {
    const accent = ELEMENT_COLORS[recommendation.dayElement];
    return {
      appName: t.appName,
      appSub: t.appSub,
      dateISO: selectedDate,
      dateText: formatLongDate(selectedDate, tag),
      ganzhiText: locale === 'en' ? ganzhi.pinyin : `${ganzhi.label}日`,
      elementName: t.elements[recommendation.dayElement].name,
      elementLabel: t.hero.dayElement,
      accent,
      accentSoft: ELEMENT_SOFT[recommendation.dayElement],
      phrase: format(t.hero.phrase, { element: t.elements[recommendation.dayElement].name }),
      lifeLine: format(t.hero.lifeLine, {
        number,
        element: t.elements[recommendation.personalElement].name,
      }),
      paletteTitle: t.today.best,
      palette: recommendation.best.flatMap((element) =>
        COLORS_BY_ELEMENT[element].slice(0, 2).map((color) => ({
          name: t.colors[color.key],
          hex: color.hex,
          light: color.light,
        })),
      ),
      outfitTitle: t.today.outfits,
      outfits: buildOutfitLines(recommendation, selectedDate, t),
      footerTitle: t.today.rules,
      footer: t.today.disclaimer,
    };
  }, [recommendation, selectedDate, t, tag, locale, ganzhi, format, number]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => onUpdateAvailable(setUpdateReady), []);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [tab, selectedDate, profile]);

  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let disposed = false;
    let handle: { remove: () => Promise<void> } | undefined;
    void CapacitorApp.addListener('backButton', () => {
      if (shareOpen) {
        setShareOpen(false);
        return;
      }
      if (tab !== 'today') {
        setTab('today');
        return;
      }
      void CapacitorApp.exitApp();
    }).then((listener) => {
      if (disposed) void listener.remove();
      else handle = listener;
    });
    return () => {
      disposed = true;
      void handle?.remove();
    };
  }, [tab, shareOpen]);

  if (authLoading) {
    return <div className="app-shell" />;
  }

  if (!profile) {
    return (
      <div className="app-shell">
        <Onboarding
          onDone={(next) => {
            setProfile(next);
            if (user) {
              void api
                .updateMe({ name: next.name, birthDate: next.birthDate })
                .then(() => refresh());
            }
          }}
        />
        <UpdateNotice ready={updateReady} />
        <AuthSheet />
      </div>
    );
  }

  const handleCopy = async () => {
    const ok = await copyText(caption);
    if (ok) setToast(t.today.copied);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">命</span>
          <div>
            <div className="brand-name">{t.appName}</div>
            <div className="brand-sub">{t.appSub}</div>
          </div>
        </div>
        <LanguageMenu />
      </header>

      <main className="content">
        {tab === 'today' ? (
          <TodayView
            date={selectedDate}
            isToday={isToday}
            lifeNumber={number}
            ganzhi={ganzhi}
            recommendation={recommendation}
            primary={primary}
            locked={!isMember}
            onBackToToday={() => setSelectedDate(todayISO())}
            onShare={() => setShareOpen(true)}
            onCopy={handleCopy}
          />
        ) : null}

        {tab === 'week' ? (
          <WeeklyView
            personalElement={recommendation.personalElement}
            onSelectDate={(iso) => {
              setSelectedDate(iso);
              setTab('today');
            }}
          />
        ) : null}

        {tab === 'calendar' ? (
          <CalendarView
            selectedDate={selectedDate}
            personalElement={recommendation.personalElement}
            entries={entries}
            onSelectDate={(iso) => {
              setSelectedDate(iso);
              setTab('today');
            }}
          />
        ) : null}

        {tab === 'journal' ? (
          <JournalView
            entries={entries}
            onSave={(entry) => {
              setEntries((current) => [entry, ...current]);
              setToast(t.journal.saved);
            }}
            onDelete={(id) => setEntries((current) => current.filter((entry) => entry.id !== id))}
          />
        ) : null}

        {tab === 'profile' ? (
          <>
            <AccountSection onAdmin={() => setAdminOpen(true)} />
            {isMember ? (
              <ProfileView
                profile={profile}
                onUpdate={(next) => {
                  setProfile(next);
                  if (user) {
                    void api
                      .updateMe({ name: next.name, birthDate: next.birthDate })
                      .then(() => refresh());
                  }
                }}
                onReset={() => {
                  setProfile(null);
                  setEntries([]);
                  setSelectedDate(todayISO());
                  setTab('today');
                }}
              />
            ) : null}
          </>
        ) : null}
      </main>

      <nav
        className="tabbar"
        style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)` }}
        aria-label={t.appName}
      >
        {visibleTabs.map((item) => (
          <button
            key={item}
            type="button"
            className={tab === item ? 'active' : ''}
            onClick={() => setTab(item)}
            aria-current={tab === item ? 'page' : undefined}
          >
            <NavIcon tab={item} />
            <span>{t.nav[item]}</span>
          </button>
        ))}
      </nav>

      <ShareSheet
        open={shareOpen}
        data={shareData}
        caption={caption}
        onClose={() => setShareOpen(false)}
      />

      <UpdateNotice ready={updateReady} />

      <AuthSheet />
      <AdminSheet open={adminOpen} onClose={() => setAdminOpen(false)} />

      {toast ? <div className="toast">{toast}</div> : null}
      {notice ? <div className="toast">{notice}</div> : null}
    </div>
  );
}

function UpdateNotice({ ready }: { ready: boolean }) {
  const { t } = useI18n();
  if (!ready) return null;
  return (
    <div className="pwa-update" role="status">
      <span>{t.common.updateAvailable}</span>
      <button type="button" onClick={applyUpdate}>
        {t.common.updateNow}
      </button>
    </div>
  );
}

function buildOutfitLines(recommendation: Recommendation, dateISO: string, t: Dict) {
  return buildOutfits(recommendation, dateISO).map((outfit) => ({
    scene: t.scenes[outfit.scene],
    items: outfit.picks.map((pick) => ({
      role: t.roles[pick.role],
      name: t.colors[pick.color.key],
      hex: pick.color.hex,
      light: pick.color.light,
    })),
  }));
}
