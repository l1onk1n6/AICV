import { useEffect, useState, useMemo } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { initRevenueCat, logOutRevenueCat } from './lib/revenuecat';
import { Loader2, Cloud, Loader, ShieldAlert } from 'lucide-react';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import { useGlobalShortcuts, type Shortcut } from './hooks/useGlobalShortcuts';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './pages/Dashboard';
import Editor from './pages/Editor';
import Preview from './pages/Preview';
import AuthPage from './pages/AuthPage';
import LandingPage from './pages/LandingPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import SharedResumePage from './pages/SharedResumePage';
import AccountPage from './pages/AccountPage';
import Tracker from './pages/Tracker';
import { useAuthStore } from './store/authStore';
import { useResumeStore } from './store/resumeStore';
import { useTrackerStore } from './store/trackerStore';
import { isSupabaseConfigured, getSupabase } from './lib/supabase';
import { useIsMobile } from './hooks/useBreakpoint';
import OnboardingModal from './components/ui/OnboardingModal';
import { isOnboardingDone } from './lib/onboarding';
import UndoToaster from './components/ui/UndoToaster';
import ShortcutsHelp from './components/ui/ShortcutsHelp';
import { useT } from './lib/i18n';

const APP_VERSION = '1.8.0';

function AppShell() {
  const t = useT();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone());
  const [showShortcuts, setShowShortcuts] = useState(false);
  const { savePending, syncing } = useResumeStore();
  const { signOut } = useAuthStore();
  const { countdown, stayLoggedIn } = useSessionTimeout(signOut);

  // Close drawer on resize to desktop (Adjusting State on Prop Change)
  const [prevIsMobile, setPrevIsMobile] = useState(isMobile);
  if (isMobile !== prevIsMobile) {
    setPrevIsMobile(isMobile);
    if (!isMobile) setDrawerOpen(false);
  }

  // Allow triggering onboarding from anywhere via custom event
  useEffect(() => {
    const handler = () => setShowOnboarding(true);
    window.addEventListener('start-onboarding', handler);
    return () => window.removeEventListener('start-onboarding', handler);
  }, []);

  const shortcuts: Shortcut[] = useMemo(() => [
    { combo: 'd', description: 'Dashboard', handler: () => navigate('/') },
    { combo: 'e', description: 'Editor', handler: () => navigate('/editor') },
    { combo: 'p', description: 'Vorschau', handler: () => navigate('/preview') },
    { combo: 't', description: 'Tracker', handler: () => navigate('/tracker') },
    { combo: 'a', description: 'Konto', handler: () => navigate('/account') },
    { combo: 'mod+b', description: 'Sidebar einklappen / ausklappen', handler: () => setSidebarCollapsed(v => !v) },
    { combo: '?', description: 'Diese Hilfe anzeigen', handler: () => setShowShortcuts(true) },
    { combo: 'escape', description: 'Schliessen', handler: () => setShowShortcuts(false) },
  ], [navigate]);

  useGlobalShortcuts(shortcuts);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden',
      paddingTop: 'env(safe-area-inset-top)',
      paddingBottom: 'env(safe-area-inset-bottom)',
      paddingLeft: 'env(safe-area-inset-left)',
      paddingRight: 'env(safe-area-inset-right)',
    }}>

      {/* ── Mobile: backdrop ───────────────────────────────── */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          }}
        />
      )}

      {/* ── Mobile: slide-in drawer ────────────────────────── */}
      {isMobile && (
        <div style={{
          position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 50,
          transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.32s cubic-bezier(0.34, 1.2, 0.64, 1)',
          willChange: 'transform',
        }}>
          <div
            className="glass"
            style={{ height: '100%', borderRadius: '0 var(--radius-xl) var(--radius-xl) 0', overflow: 'hidden' }}
          >
            <Sidebar onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main area ──────────────────────────────────────── */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        padding: isMobile ? '8px 8px 0' : '12px 12px 0',
        gap: 12,
      }}>
        {/* Desktop sidebar (always visible, collapsible) */}
        {!isMobile && (
          <div
            className="glass"
            style={{
              borderRadius: 'var(--radius-xl)', overflow: 'hidden', flexShrink: 0,
              width: sidebarCollapsed ? 60 : 240,
              transition: 'width 0.28s cubic-bezier(0.34, 1.2, 0.64, 1)',
            }}
          >
            <Sidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(v => !v)}
            />
          </div>
        )}

        {/* Content column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
          <Header
            isMobile={isMobile}
            onMenuToggle={() => setDrawerOpen(v => !v)}
          />
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/preview" element={<Preview />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/tracker" element={<Tracker />} />
              <Route path="/shared" element={<SharedResumePage />} />
            </Routes>
          </div>
        </div>
      </div>

      {/* ── Onboarding ────────────────────────────────────── */}
      {showOnboarding && (
        <OnboardingModal onClose={() => setShowOnboarding(false)} />
      )}

      {/* ── Shortcuts-Hilfe ──────────────────────────────── */}
      {showShortcuts && (
        <ShortcutsHelp shortcuts={shortcuts.filter(s => s.combo !== 'escape')} onClose={() => setShowShortcuts(false)} />
      )}

      {/* ── Undo-Toaster (global) ─────────────────────────── */}
      <UndoToaster />

      {/* ── Session timeout warning ───────────────────────── */}
      {countdown !== null && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: 360, padding: '28px 24px', textAlign: 'center' }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,149,0,0.15)', border: '1px solid rgba(255,149,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <ShieldAlert size={22} style={{ color: '#FF9500' }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{t('Sitzung läuft ab')}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-4)', margin: '0 0 20px', lineHeight: 1.5 }}>
              {t('Du wirst in {n} Sekunden automatisch abgemeldet.').split('{n}').map((part, i) => i === 0
                ? <span key={i}>{part}</span>
                : <span key={i}><strong style={{ color: '#FF9500' }}>{countdown}</strong>{part}</span>)}
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                className="btn-glass btn-primary"
                onClick={stayLoggedIn}
                style={{ flex: 1, justifyContent: 'center', padding: '11px 16px', fontWeight: 600 }}
              >
                {t('Angemeldet bleiben')}
              </button>
              <button
                className="btn-glass btn-danger"
                onClick={signOut}
                style={{ padding: '11px 16px' }}
              >
                {t('Abmelden')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ────────────────────────────────────────── */}
      <footer style={{
        padding: isMobile ? '4px 14px' : '6px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 11,
        color: 'var(--text-4)',
        flexShrink: 0,
        userSelect: 'none',
      }}>
        <span>by pixmatic · v{APP_VERSION}</span>
        {(savePending || syncing) ? (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-4)' }}>
            <Loader data-motion="essential" size={11} style={{ animation: 'spin 1s linear infinite' }} />
            Speichert…
          </span>
        ) : (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Cloud size={11} />
            Gespeichert
          </span>
        )}
      </footer>
    </div>
  );
}

// Detect auth type from URL params (set by Supabase email links)
function getAuthTypeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#\/?/, ''));
  const type = params.get('type') || hash.get('type');
  const hasToken = params.get('token_hash') || params.get('code') || hash.get('access_token');
  if (!hasToken && !type) return null;
  if (type === 'signup') return 'signup' as const;
  if (type === 'magiclink') return 'magiclink' as const;
  if (type === 'recovery') return 'recovery' as const;
  if (type === 'invite') return 'invite' as const;
  if (hasToken) return 'unknown' as const;
  return null;
}

export default function App() {
  const t = useT();
  const { user, loading, initialize, passwordRecovery } = useAuthStore();
  const { syncFromCloud } = useResumeStore();
  const syncTracker = useTrackerStore(s => s.syncFromCloud);
  const [authType] = useState(() => getAuthTypeFromUrl());

  // Pre-Rendering-Modus (scripts/prerender.mjs setzt ?prerender=1):
  // direkt LandingPage statisch ausliefern, ohne Auth-Init oder Supabase-
  // Aufrufe. Google bekommt so volles HTML beim ersten Crawl.
  const isPrerender = typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('prerender') === '1';

  // Public shared CV route — accessible without login
  const isSharedRoute = window.location.hash.startsWith('#/shared');

  useEffect(() => {
    if (isPrerender) return;
    initialize();
  }, [initialize, isPrerender]);

  useEffect(() => {
    if (user && !passwordRecovery) {
      syncFromCloud();
      syncTracker();
    }
  }, [user, passwordRecovery, syncFromCloud, syncTracker]);

  // RevenueCat auf der nativen App mit Supabase-User-ID verknuepfen, damit
  // Pro-Entitlements pro User getrackt werden und nach (Re-)Login der Status
  // korrekt geladen wird. Web nutzt weiter Stripe → kein Init.
  useEffect(() => {
    if (isPrerender) return;
    if (!Capacitor.isNativePlatform()) return;
    if (!user) { logOutRevenueCat(); return; }
    initRevenueCat(user.id).catch(err => console.warn('RevenueCat init failed:', err));
  }, [user, isPrerender]);

  // Process pending referral after login/signup
  useEffect(() => {
    if (isPrerender) return;
    if (!user || !isSupabaseConfigured()) return;
    const ref = localStorage.getItem('path_ref');
    if (!ref) return;
    localStorage.removeItem('path_ref');
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      if (session) {
        getSupabase().functions.invoke('record-referral', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: { referrer_id: ref },
        }).catch(() => {});
      }
    });
  }, [user, isPrerender]);

  if (isPrerender) {
    return <HashRouter><LandingPage /></HashRouter>;
  }

  if (isSharedRoute) {
    return <HashRouter><Routes><Route path="/shared" element={<SharedResumePage />} /></Routes></HashRouter>;
  }

  if (!isSupabaseConfigured()) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 32 }}>⚙️</span>
        <p style={{ color: 'var(--text-4)', fontSize: 14, maxWidth: 320 }}>
          {t('App nicht konfiguriert.')}<br />{t('Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY als GitHub Secrets setzen.')}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Loader2 data-motion="essential" size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--ios-blue)' }} />
        <span style={{ fontSize: 14, color: 'var(--text-4)' }}>{t('Verbinde…')}</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Show callback landing page while processing email link tokens
  if (authType && (loading || !user || passwordRecovery)) {
    return <HashRouter><AuthCallbackPage authType={authType} /></HashRouter>;
  }

  // Show reset form after PASSWORD_RECOVERY event
  if (passwordRecovery) {
    return <HashRouter><AuthPage /></HashRouter>;
  }

  if (!user) {
    // In der nativen App gibt es keine Marketing-Landing-Page — direkt zum Login.
    if (Capacitor.isNativePlatform()) {
      return <HashRouter><AuthPage /></HashRouter>;
    }
    return <HashRouter><LandingPage /></HashRouter>;
  }

  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
}
