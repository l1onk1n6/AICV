import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { presentCustomerCenter } from '../lib/revenuecat';
import { userError } from '../lib/userError';
import {
  User, Shield, Lock, Sparkles, Mail, ExternalLink,
  AlertTriangle, Download, Trash2, KeyRound,
  CreditCard, Loader2, CheckCircle, PlayCircle, LogOut,
  Copy, Check, Gift, XCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useResumeStore } from '../store/resumeStore';
import { usePlan, PRO_FEATURES, LIMITS } from '../lib/plan';
import { UpgradeModal } from '../components/ui/ProGate';
import { useIsMobile } from '../hooks/useBreakpoint';
import { getPdfExportCount } from '../lib/pdfExports';
import { shareLink } from '../lib/shareLink';
import { openExternal } from '../lib/openExternal';
import { getSupabase, isSupabaseConfigured } from '../lib/supabase';
import { resetOnboarding } from '../lib/onboarding';
import { getStoredTheme, setStoredTheme, type Theme as ThemeChoice } from '../lib/theme';
import { useI18n, useT } from '../lib/i18n';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';

type Section = 'plan' | 'account' | 'security' | 'referral' | 'privacy';

const NAV: { id: Section; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { id: 'account',  label: 'Konto',               icon: User },
  { id: 'security', label: 'Sicherheit',           icon: Lock },
  { id: 'referral', label: 'Freunde einladen',     icon: Gift },
  { id: 'privacy',  label: 'Datenschutz',          icon: Shield },
  { id: 'plan',     label: 'Plan & Features',      icon: Sparkles },
];

// ── Section: Plan ──────────────────────────────────────────
function PlanSection() {
  const { isPro, plan, limits } = usePlan();
  const t = useT();

  const { persons, resumes } = useResumeStore();
  const totalDocMb = Math.round(
    resumes.flatMap(r => r.documents ?? []).reduce((s, d) => s + d.size, 0) / (1024 * 1024) * 10
  ) / 10;
  const { refreshUser, user } = useAuthStore();
  const location = useLocation();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [webhookPending, setWebhookPending] = useState(false);
  const [webhookFailed, setWebhookFailed] = useState(false);
  const pdfCount = getPdfExportCount();
  const activeShareLinks = resumes.filter(r => r.shareToken).length;
  const isGift = user?.user_metadata?.gift_pro === true;

  // Detect Stripe success redirect + always refresh metadata on mount.
  // Async polling — setState ist hier korrekt.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const isSuccess = location.search.includes('success=1') || location.hash.includes('success=1');
    if (isSuccess) {
      setShowSuccess(true);
      setWebhookPending(true);
      window.history.replaceState(null, '', window.location.pathname + window.location.hash.replace('?success=1', ''));
      // Webhook is async — poll until plan is updated (max 6 attempts, 2s apart = 13s total)
      let attempts = 0;
      const poll = async () => {
        await refreshUser();
        attempts++;
        const { user: u } = useAuthStore.getState();
        if (u?.user_metadata?.plan === 'pro') {
          setWebhookPending(false);
        } else if (attempts < 6) {
          setTimeout(poll, 2000);
        } else {
          setWebhookPending(false);
          setWebhookFailed(true);
        }
      };
      setTimeout(poll, 1500);
    } else {
      refreshUser();
    }
    // Bewusst on-mount-only: Stripe-Success-URL einmal beim Öffnen erkennen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handlePortal() {
    setPortalLoading(true);
    setPortalError('');
    // Native: RevenueCat Customer Center (Play-Store-Abrechnung)
    if (Capacitor.isNativePlatform()) {
      try {
        await presentCustomerCenter();
      } catch (err) {
        setPortalError(userError('Die Abo-Verwaltung konnte nicht geöffnet werden', err));
      } finally {
        setPortalLoading(false);
      }
      return;
    }
    // Web: Stripe Customer Portal
    if (!isSupabaseConfigured()) { setPortalLoading(false); return; }
    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.functions.invoke('create-portal-session', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error || !data?.url) {
        setPortalError(userError('Das Abo-Portal konnte nicht geöffnet werden', error ?? data?.error));
      } else {
        window.location.href = data.url;
      }
    } catch (err) {
      setPortalError(userError('Das Abo-Portal konnte nicht geöffnet werden', err));
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}

      {/* Payment success banner */}
      {showSuccess && !webhookPending && !webhookFailed && (
        <div className="glass-card" style={{ padding: '14px 16px', border: '1px solid rgba(52,199,89,0.4)', background: 'rgba(52,199,89,0.1)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CheckCircle size={18} style={{ color: 'var(--ios-green)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ios-green)' }}>{t('Willkommen bei PATH Pro!')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{t('Dein Upgrade war erfolgreich. Alle Pro-Features sind jetzt aktiv.')}</div>
          </div>
        </div>
      )}

      {/* Webhook pending — plan not yet reflected */}
      {webhookPending && (
        <div className="glass-card" style={{ padding: '14px 16px', border: '1px solid rgba(0,122,255,0.35)', background: 'rgba(0,122,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Loader2 data-motion="essential" size={18} style={{ color: 'var(--ios-blue)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ios-blue)' }}>{t('Pro wird aktiviert…')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{t('Zahlung bestätigt — warte auf Aktivierung (max. 15 Sek.)')}</div>
          </div>
        </div>
      )}

      {/* Webhook failed — plan not updated after polling */}
      {webhookFailed && (
        <div className="glass-card" style={{ padding: '14px 16px', border: '1px solid rgba(255,159,10,0.4)', background: 'rgba(255,159,10,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={18} style={{ color: 'var(--ios-amber)', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ios-amber)' }}>{t('Aktivierung verzögert')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>{t('Zahlung war erfolgreich. Lade die Seite in einer Minute neu oder kontaktiere uns.')}</div>
          </div>
          <button className="btn-glass btn-sm" onClick={() => { setWebhookFailed(false); setWebhookPending(true); let a = 0; const p = async () => { await refreshUser(); a++; const { user: u } = useAuthStore.getState(); if (u?.user_metadata?.plan === 'pro') { setWebhookPending(false); setShowSuccess(true); } else if (a < 4) { setTimeout(p, 3000); } else { setWebhookPending(false); setWebhookFailed(true); } }; setTimeout(p, 1000); }} style={{ fontSize: 11, padding: '6px 10px', flexShrink: 0 }}>
            {t('Nochmals prüfen')}
          </button>
        </div>
      )}

      {/* Current plan card */}
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{
                padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 800,
                background: isPro
                  ? 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(255,55,95,0.25))'
                  : 'rgba(var(--rgb-fg),0.1)',
                border: isPro ? '1px solid rgba(255,159,10,0.5)' : '1px solid rgba(var(--rgb-fg),0.2)',
                color: isPro ? 'var(--ios-amber)' : 'var(--text-3)',
              }}>
                {isPro ? '✦ PRO' : 'FREE'}
              </span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              PATH {isPro ? 'Pro' : 'Free'}
              {isGift && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)', color: 'var(--ios-green)' }}>
                  {t('Geschenkt')} ✦
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 2 }}>
              {isPro ? t('Alle Features freigeschaltet') : t('Grundfunktionen — kostenlos')}
            </div>
            {isPro && !isGift && (() => {
              const ts = user?.user_metadata?.subscription_period_end as number | undefined;
              if (!ts) return null;
              const locale = useI18n.getState().locale === 'en' ? 'en-GB' : 'de-CH';
              const date = new Date(ts * 1000).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
              return (
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>
                  {t('Verlängert am {date}').replace('{date}', date)}
                </div>
              );
            })()}
          </div>
          {isPro && !isGift ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
              <button
                className="btn-glass btn-sm"
                onClick={handlePortal}
                disabled={portalLoading}
                style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {portalLoading ? <Loader2 data-motion="essential" size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <CreditCard size={12} />}
                {t('Abo verwalten')}
              </button>
              <button
                onClick={handlePortal}
                disabled={portalLoading}
                style={{
                  background: 'none', border: 'none', padding: 0,
                  fontSize: 11, color: 'var(--text-4)',
                  cursor: portalLoading ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  textDecoration: 'underline', textUnderlineOffset: 3,
                }}
                title={t('Kündigung läuft über das Abo-Portal')}
              >
                <XCircle size={12} /> {t('Abo kündigen')}
              </button>
            </div>
          ) : !isPro ? (

            <button
              className="btn-glass"
              onClick={() => setShowUpgrade(true)}
              style={{
                padding: '10px 18px', fontWeight: 700, fontSize: 13,
                background: 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(255,55,95,0.2))',
                border: '1px solid rgba(255,159,10,0.4)', color: 'var(--ios-amber)',
              }}
            >
              <Sparkles size={14} /> {t('Upgrade')}
            </button>
          ) : null}
        </div>
        {portalError && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--ios-red)', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} /> {portalError}
          </div>
        )}

        <div className="divider" style={{ margin: '12px 0' }} />

        {/* Usage limits */}
        {[
          { label: 'Personen', used: persons.length, max: LIMITS[plan].persons },
          { label: 'Bewerbungsmappen', used: resumes.length, max: LIMITS[plan].resumes },
          { label: 'PDF-Exporte diesen Monat', used: pdfCount, max: LIMITS[plan].pdfExportsPerMonth },
          { label: 'Aktive Share-Links', used: activeShareLinks, max: LIMITS[plan].shareLinks },
          { label: 'Foto-Upload-Grösse', used: null, max: LIMITS[plan].photoMb, unit: 'MB' },
          { label: 'Eigene Sektionen / Mappe', used: null, max: LIMITS[plan].customSections },
          { label: 'Templates', used: null, max: LIMITS[plan].templates },
          { label: 'Dokumente gesamt', used: totalDocMb, max: LIMITS[plan].documentsMb, unit: 'MB' },
          { label: 'CV-Versionshistorie', used: null, max: limits.versionHistory ? 1 : 0, isBoolean: true },
        ].map(({ label, used, max, unit, isBoolean }) => {
          const pct = used !== null ? used / max : 0;
          const color = pct >= 1 ? 'var(--ios-red)' : pct >= 0.8 ? 'var(--ios-amber)' : 'var(--ios-green)';
          const maxDisplay = max === Infinity ? '∞' : `${max}${unit ? ' ' + unit : ''}`;

          if (isBoolean) {
            const enabled = limits.versionHistory;
            return (
              <div key={label} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-3)' }}>{t(label)}</span>
                  <span style={{ fontWeight: 600, color: enabled ? 'var(--ios-green)' : 'var(--text-4)' }}>
                    {enabled ? `✓ ${t('Aktiv')}` : '—'}
                  </span>
                </div>
              </div>
            );
          }

          return (
            <div key={label} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span style={{ color: 'var(--text-3)' }}>{t(label)}</span>
                <span style={{ fontWeight: 600, color: used !== null ? color : 'var(--text-4)' }}>
                  {used !== null ? `${used} / ${maxDisplay}` : maxDisplay}
                </span>
              </div>
              {used !== null && max !== Infinity && (
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(var(--rgb-fg),0.1)' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, pct * 100)}%`, borderRadius: 2, background: color, transition: 'width 0.3s' }} />
                </div>
              )}
            </div>
          );
        })}

        <div className="divider" style={{ margin: '12px 0' }} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PRO_FEATURES.map((f) => {
            const status = !isPro ? 'locked' : f.available ? 'active' : 'soon';
            return (
              <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 15, opacity: status === 'soon' ? 0.4 : 1 }}>{f.icon}</span>
                <span style={{ fontSize: 13, flex: 1, opacity: status === 'soon' ? 0.4 : 1 }}>{t(f.label)}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
                  background: status === 'active'
                    ? 'rgba(52,199,89,0.15)'
                    : status === 'soon'
                    ? 'rgba(var(--rgb-fg),0.05)'
                    : 'rgba(255,159,10,0.12)',
                  border: status === 'active'
                    ? '1px solid rgba(52,199,89,0.3)'
                    : status === 'soon'
                    ? '1px solid rgba(var(--rgb-fg),0.08)'
                    : '1px solid rgba(255,159,10,0.25)',
                  color: status === 'active'
                    ? 'var(--ios-green)'
                    : status === 'soon'
                    ? 'rgba(var(--rgb-fg),0.22)'
                    : '#FF9F0A',
                }}>
                  {status === 'active' ? `✓ ${t('Aktiv')}` : status === 'soon' ? t('Bald') : 'PRO'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Section: Account ───────────────────────────────────────
const COUNTRIES = ['Schweiz', 'Deutschland', 'Österreich', 'Liechtenstein']

function ProfileCard() {
  const { user } = useAuthStore();
  const t = useT();

  const supabase = isSupabaseConfigured() ? getSupabase() : null

  const [phone,   setPhone]   = useState('')
  const [street,  setStreet]  = useState('')
  const [zip,     setZip]     = useState('')
  const [city,    setCity]    = useState('')
  const [country, setCountry] = useState('Schweiz')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const [saveErr, setSaveErr] = useState('')

  // Load profile on mount / user-change. supabase ist ein Singleton (getSupabase),
  // user re-rendert bei jeder Metadata-Änderung — wir wollen nur bei Identity-Wechsel laden.
  useEffect(() => {
    if (!supabase || !user) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(supabase.from('profiles' as any) as any)
      .select('*').eq('id', user.id).maybeSingle()
      .then(({ data }: { data: Record<string, string> | null }) => {
        if (!data) return
        if (data.phone)   setPhone(data.phone)
        if (data.street)  setStreet(data.street)
        if (data.zip)     setZip(data.zip)
        if (data.city)    setCity(data.city)
        if (data.country) setCountry(data.country)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  async function handleSave() {
    if (!supabase || !user) return
    setSaving(true); setSaveErr('')
    try {
      // Save directly to DB (reliable)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles' as any) as any).upsert({
        id: user.id, phone, street, zip, city, country,
        updated_at: new Date().toISOString(),
      })
      if (error) { setSaveErr(t('Speichern fehlgeschlagen.')); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)

      // Sync to Listmonk/InvoiceNinja in background (best-effort)
      if (supabase) {
        supabase.functions.invoke('update-user-profile', {
          body: { phone, street, zip, city, country },
        }).catch(() => {/* ignore sync errors */})
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14, opacity: 0.6 }}>{t('PROFIL')}</div>
      {saveErr && <div style={{ fontSize: 12, color: 'var(--ios-red)', marginBottom: 10 }}>{saveErr}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label className="section-label">{t('Telefon')}</label>
          <input className="input-glass" placeholder="+41 79 123 45 67" value={phone}
            onChange={e => setPhone(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label className="section-label">{t('Strasse & Nr.')}</label>
          <input className="input-glass" placeholder={t('Musterstrasse 1')} value={street}
            onChange={e => setStreet(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
          <div>
            <label className="section-label">{t('PLZ')}</label>
            <input className="input-glass" placeholder="8000" value={zip}
              onChange={e => setZip(e.target.value)} />
          </div>
          <div>
            <label className="section-label">{t('Ort')}</label>
            <input className="input-glass" placeholder={t('Zürich')} value={city}
              onChange={e => setCity(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="section-label">{t('Land')}</label>
          <select className="input-glass" value={country} onChange={e => setCountry(e.target.value)}
            style={{ width: '100%' }}>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button className="btn-glass btn-sm btn-primary" onClick={handleSave}
          disabled={saving} style={{ alignSelf: 'flex-end', gap: 6, marginTop: 4 }}>
          {saving ? <Loader2 data-motion="essential" size={14} style={{ animation: 'spin 1s linear infinite' }} /> :
           saved  ? <CheckCircle size={14} style={{ color: 'var(--ios-green)' }} /> : null}
          {saved ? t('Gespeichert') : t('Speichern')}
        </button>
      </div>
    </div>
  )
}

function EmailChangeCard() {
  const { user, updateEmail, loading, error, clearError } = useAuthStore();  const t = useT();

  const [editing, setEditing] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [sent, setSent] = useState(false);

  function startEdit() {
    clearError();
    setNewEmail(user?.email ?? '');
    setEditing(true);
    setSent(false);
  }

  function cancel() {
    clearError();
    setEditing(false);
    setNewEmail('');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || newEmail.trim().toLowerCase() === (user?.email ?? '').toLowerCase()) return;
    await updateEmail(newEmail.trim());
    if (!useAuthStore.getState().error) {
      setSent(true);
      setEditing(false);
    }
  }

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('E-MAIL-ADRESSE')}</div>
      {sent ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, color: 'var(--ios-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={14} /> Bestätigungs-E-Mail gesendet
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0, lineHeight: 1.5 }}>
            Wir haben einen Bestätigungslink an <strong style={{ color: 'var(--text-2)' }}>{newEmail}</strong> geschickt. Klicke auf den Link, um die Änderung abzuschliessen.
          </p>
          <button
            className="btn-glass btn-sm"
            onClick={() => { setSent(false); setNewEmail(''); }}
            style={{ alignSelf: 'flex-start' }}
          >
            Schliessen
          </button>
        </div>
      ) : editing ? (
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <input
            className="input-glass"
            type="email"
            placeholder={t('neue@beispiel.de')}
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required maxLength={254} autoFocus autoComplete="email"
          />
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0, lineHeight: 1.5 }}>
            {t('Wir senden einen Bestätigungslink an die neue Adresse — die Änderung wird erst nach dem Klick aktiv.')}
          </p>
          {error && (
            <div style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', fontSize: 12, color: 'var(--ios-red)' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="submit"
              className="btn-glass btn-sm btn-primary"
              disabled={loading || !newEmail.trim() || newEmail.trim().toLowerCase() === (user?.email ?? '').toLowerCase()}
              style={{ gap: 6 }}
            >
              <Mail size={14} /> {loading ? t('Wird gesendet…') : t('Bestätigung senden')}
            </button>
            <button type="button" className="btn-glass btn-sm" onClick={cancel} disabled={loading}>
              Abbrechen
            </button>
          </div>
        </form>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email ?? '—'}
          </span>
          <button className="btn-glass btn-sm" onClick={startEdit} style={{ gap: 6, flexShrink: 0 }}>
            <Mail size={14} /> Ändern
          </button>
        </div>
      )}
    </div>
  );
}

function LanguageCard() {
  const locale = useI18n(s => s.locale);
  const setLocale = useI18n(s => s.setLocale);
  const t = useT();

  const options: { id: 'de' | 'en'; label: string }[] = [
    { id: 'de', label: 'Deutsch' },
    { id: 'en', label: 'English' },
  ];

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('Sprache').toUpperCase()}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => setLocale(opt.id)}
            style={{
              flex: 1,
              padding: '10px 12px',
              minHeight: 44,
              fontSize: 13,
              fontWeight: locale === opt.id ? 600 : 400,
              borderRadius: 'var(--radius-sm)',
              border: locale === opt.id ? '1px solid var(--ios-blue)' : '1px solid var(--border-default)',
              background: locale === opt.id ? 'rgba(0,122,255,0.12)' : 'var(--bg-btn)',
              color: locale === opt.id ? 'var(--ios-blue)' : 'var(--text-2)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sf)',
              transition: 'all 150ms ease-out',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-4)' }}>
        {t('Englische Übersetzungen sind teilweise verfügbar — bestehende Stellen werden schrittweise migriert.')}
      </div>
    </div>
  );
}

function ThemeCard() {
  const [theme, setTheme] = useState<ThemeChoice>(() => getStoredTheme());
  const t = useT();

  function choose(c: ThemeChoice) {
    setTheme(c);
    setStoredTheme(c);
  }

  const options: { id: ThemeChoice; label: string }[] = [
    { id: 'system', label: 'System' },
    { id: 'dark', label: 'Dunkel' },
    { id: 'light', label: 'Hell' },
  ];

  return (
    <div className="glass-card" style={{ padding: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('Erscheinungsbild').toUpperCase()}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(opt => (
          <button
            key={opt.id}
            onClick={() => choose(opt.id)}
            style={{
              flex: 1,
              padding: '10px 12px',
              minHeight: 44,
              fontSize: 13,
              fontWeight: theme === opt.id ? 600 : 400,
              borderRadius: 'var(--radius-sm)',
              border: theme === opt.id ? '1px solid var(--ios-blue)' : '1px solid var(--border-default)',
              background: theme === opt.id ? 'rgba(0,122,255,0.12)' : 'var(--bg-btn)',
              color: theme === opt.id ? 'var(--ios-blue)' : 'var(--text-2)',
              cursor: 'pointer',
              fontFamily: 'var(--font-sf)',
              transition: 'all 150ms ease-out',
            }}
          >
            {t(opt.label)}
          </button>
        ))}
      </div>
    </div>
  );
}

function AccountSection() {
  const { user, signOut } = useAuthStore();  const t = useT();

  const { persons, resumes } = useResumeStore();
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <EmailChangeCard />

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('KONTO-DETAILS')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
            <span style={{ color: 'var(--text-4)' }}>{t('Personen')}</span>
            <span style={{ fontWeight: 500 }}>{persons.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
            <span style={{ color: 'var(--text-4)' }}>{t('Bewerbungsmappen')}</span>
            <span style={{ fontWeight: 500 }}>{resumes.length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 14 }}>
            <span style={{ color: 'var(--text-4)' }}>{t('Mitglied seit')}</span>
            <span style={{ fontWeight: 500 }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString('de-CH', { month: 'long', year: 'numeric' }) : '—'}
            </span>
          </div>
        </div>
      </div>

      <ProfileCard />

      <ThemeCard />

      <LanguageCard />

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.6 }}>{t('APP-TOUR')}</div>
        <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 12 }}>
          {t('Zeige die Einführungstour erneut an.')}
        </p>
        <button
          className="btn-glass btn-sm"
          onClick={() => { resetOnboarding(); navigate('/'); }}
          style={{ gap: 6 }}
        >
          <PlayCircle size={14} /> {t('Tour neu starten')}
        </button>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('SUPPORT')}</div>
        <a href="mailto:info@pixmatic.ch" className="btn-glass" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontSize: 13, padding: '8px 14px' }}>
          <Mail size={14} /> info@pixmatic.ch
        </a>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.6 }}>{t('SITZUNG')}</div>
        <button
          className="btn-glass btn-sm btn-danger"
          onClick={() => signOut()}
          style={{ gap: 6 }}
        >
          <LogOut size={14} /> {t('Abmelden')}
        </button>
      </div>
    </div>
  );
}

// ── Section: Security ──────────────────────────────────────
function SecuritySection() {
  const { sendPasswordReset, user, loading } = useAuthStore();  const t = useT();

  const [sent, setSent] = useState(false);

  async function handleReset() {
    if (!user?.email) return;
    await sendPasswordReset(user.email);
    setSent(true);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('PASSWORT')}</div>
        <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 12 }}>
          {t('Wir senden einen Link an')} {user?.email} {t('zum Zurücksetzen des Passworts.')}
        </p>
        {sent ? (
          <div style={{ fontSize: 13, color: 'var(--ios-green)', display: 'flex', alignItems: 'center', gap: 6 }}>
            ✓ {t('E-Mail gesendet — bitte prüfe dein Postfach.')}
          </div>
        ) : (
          <button className="btn-glass btn-sm" onClick={handleReset} disabled={loading} style={{ gap: 6 }}>
            <KeyRound size={14} /> {t('Passwort zurücksetzen')}
          </button>
        )}
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, opacity: 0.6 }}>{t('AKTIVE SITZUNG')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-4)' }}>{t('Angemeldet als')}</span>
            <span style={{ fontWeight: 500 }}>{user?.email ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-4)' }}>{t('Letzte Anmeldung')}</span>
            <span style={{ fontWeight: 500 }}>
              {user?.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString('de-CH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section: Referral ──────────────────────────────────────
function ReferralSection() {
  const { user } = useAuthStore();  const t = useT();

  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState<{ total: number; subscribed: number; rewarded: number } | null>(null);

  const refLink = user
    ? `${window.location.origin}${window.location.pathname}#/?ref=${user.id}`
    : '';

  useEffect(() => {
    if (!user || !isSupabaseConfigured()) return;
    const sb = getSupabase();
    if (!sb) return;
    sb.from('referrals')
      .select('subscribed, rewarded')
      .eq('referrer_id', user.id)
      .then(({ data }) => {
        if (data) {
          const rows = data as { subscribed: boolean; rewarded: boolean }[];
          setStats({
            total:      rows.length,
            subscribed: rows.filter(r => r.subscribed).length,
            rewarded:   rows.filter(r => r.rewarded).length,
          });
        }
      });
  }, [user]);

  async function copyLink() {
    const nativeSheet = await shareLink(refLink, t('Einladung zu PATH'));
    if (nativeSheet) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 20, background: 'rgba(0,122,255,0.06)', border: '1px solid rgba(0,122,255,0.2)' }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{t('Freunde einladen, 1 Monat gratis')}</div>
        <p style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.65, margin: 0 }}>
          {t('Teile deinen persönlichen Link. Wenn sich jemand über deinen Link registriert und ein Pro-Abo abschliesst, bekommst du automatisch CHF 5.00 auf dein Konto gutgeschrieben.')}
        </p>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('DEIN EINLADUNGSLINK')}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            flex: 1, background: 'rgba(var(--rgb-fg),0.05)', border: '1px solid rgba(var(--rgb-fg),0.1)',
            borderRadius: 8, padding: '9px 12px', fontSize: 12, fontFamily: 'monospace',
            color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {refLink}
          </div>
          <button className="btn-glass btn-sm" onClick={copyLink} style={{ gap: 6, flexShrink: 0 }}>
            {copied
              ? <Check size={14} style={{ color: 'var(--ios-green)' }} />
              : <Copy size={14} />}
            {copied ? t('Kopiert!') : t('Kopieren')}
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('DEINE STATISTIK')}</div>
        {stats === null ? (
          <div style={{ fontSize: 13, color: 'var(--text-4)' }}>{t('Lädt…')}</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { label: 'Eingeladen', value: stats.total },
              { label: 'Pro-Abos',   value: stats.subscribed },
              { label: 'Gutschriften', value: stats.rewarded },
            ].map(({ label, value }) => (
              <div key={label} style={{
                textAlign: 'center', padding: '14px 8px',
                background: 'rgba(var(--rgb-fg),0.04)', borderRadius: 10,
                border: '1px solid rgba(var(--rgb-fg),0.08)',
              }}>
                <div style={{ fontSize: 26, fontWeight: 700, color: value > 0 ? 'var(--ios-green)' : 'var(--text-4)' }}>
                  {value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4 }}>{t(label)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section: Privacy ───────────────────────────────────────
function PrivacySection() {
  const { exportGdprData } = useResumeStore();
  const t = useT();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('RECHTLICHES')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { label: 'Datenschutzerklärung', href: 'https://pixmatic.ch/datenschutz' },
            { label: 'AGB', href: 'https://pixmatic.ch/agb' },
          ].map(({ label, href }) => (
            <button key={label} type="button" onClick={() => openExternal(href)}
              className="btn-glass"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', fontSize: 13, width: '100%', textAlign: 'left' }}>
              {t(label)}
              <ExternalLink size={14} style={{ opacity: 0.5 }} />
            </button>
          ))}
        </div>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, opacity: 0.6 }}>{t('DATENVERARBEITUNG')}</div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-4)', lineHeight: 1.8 }}>
          <li>{t('Deine Daten werden ausschliesslich für die App-Funktionalität verwendet')}</li>
          <li>{t('Keine Weitergabe an Dritte')}</li>
          <li>{t('Speicherung auf Supabase-Servern (EU/Schweiz)')}</li>
          <li>{t('Passwörter werden gehasht gespeichert (bcrypt)')}</li>
          <li>{t('Datenexport jederzeit möglich (DSGVO Art. 20)')}</li>
        </ul>
      </div>

      <div className="glass-card" style={{ padding: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.6 }}>{t('DATEN-EXPORT (DSGVO Art. 20)')}</div>
        <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 12 }}>
          {t('Lade alle deine Daten als JSON-Datei herunter. Dokumentenanhänge (Base64) werden aus Datenschutzgründen nicht mitexportiert.')}
        </p>
        <button className="btn-glass btn-sm" onClick={exportGdprData} style={{ gap: 6 }}>
          <Download size={14} /> {t('Daten herunterladen')}
        </button>
      </div>


      <div className="glass-card" style={{ padding: 20, border: '1px solid rgba(255,59,48,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 600, marginBottom: 8, color: 'var(--ios-red)', opacity: 0.9 }}>
          <AlertTriangle size={14} /> {t('GEFAHRENZONE')}
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 12 }}>
          {t('Zum Löschen deines Kontos kontaktiere uns bitte direkt — wir entfernen alle Daten innerhalb von 30 Tagen.')}
        </p>
        <a
          href="mailto:info@pixmatic.ch?subject=Konto löschen – PATH"
          className="btn-glass btn-danger"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', fontSize: 13, padding: '8px 14px' }}
        >
          <Trash2 size={14} /> {t('Konto löschen anfragen')}
        </a>
      </div>
    </div>
  );
}

// ── Main Account Page ──────────────────────────────────────
export default function AccountPage() {
  const { accountSection: section, setAccountSection: setSection } = useUIStore();
  const isMobile = useIsMobile();
  const t = useT();

  const renderSection = () => {
    switch (section) {
      case 'plan':     return <PlanSection />;
      case 'account':  return <AccountSection />;
      case 'security': return <SecuritySection />;
      case 'referral': return <ReferralSection />;
      case 'privacy':  return <PrivacySection />;
    }
  };

  const current = NAV.find(n => n.id === section);

  if (isMobile) {
    return (
      <div className="animate-fade-in" style={{ height: '100%', overflow: 'auto' }}>
        {/* Mobile tab bar */}
        <div style={{ display: 'flex', overflowX: 'auto', gap: 6, paddingBottom: 8, flexShrink: 0, scrollbarWidth: 'none' }}>
          {NAV.map(({ id, label, icon: Icon }) => {
            const isActive = section === id;
            return (
              <button key={id} className="btn-glass btn-nav" onClick={() => setSection(id)}
                style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 'var(--radius-sm)', boxShadow: 'none', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6,
                  background: isActive ? 'linear-gradient(135deg, rgba(0,122,255,0.3), rgba(88,86,214,0.25))' : 'rgba(var(--rgb-fg),0.07)',
                  border: isActive ? '1px solid rgba(0,122,255,0.45)' : '1px solid rgba(var(--rgb-fg),0.1)',
                }}>
                <Icon size={14} />
                <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400 }}>{t(label)}</span>
              </button>
            );
          })}
        </div>
        <div className="glass" style={{ borderRadius: 'var(--radius-lg)', padding: '16px', overflow: 'auto' }}>
          {renderSection()}
        </div>
      </div>
    );
  }

  // Desktop: zwei Spalten (Rail links, Inhalt rechts).
  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 12, height: '100%', overflow: 'hidden' }}>
      <aside className="glass" style={{ width: 210, flexShrink: 0, borderRadius: 'var(--radius-lg)', overflow: 'auto', padding: 8 }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = section === id;
          return (
            <button key={id} className="btn-glass"
              onClick={() => setSection(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10,
                padding: '8px 10px', marginBottom: 2, borderRadius: 'var(--radius-sm)',
                boxShadow: 'none',
                background: active ? 'rgba(0,122,255,0.2)' : 'transparent',
                border: active ? '1px solid rgba(0,122,255,0.35)' : '1px solid transparent',
              }}>
              <Icon size={14} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, opacity: active ? 1 : 0.78 }}>{t(label)}</span>
            </button>
          );
        })}
      </aside>

      <div className="glass" style={{ flex: 1, overflow: 'auto', borderRadius: 'var(--radius-lg)', padding: '20px 28px 20px 22px' }}>
        <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(var(--rgb-fg),0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {current && (
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,122,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <current.icon size={15} />
              </div>
            )}
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{current ? t(current.label) : ''}</h2>
          </div>
        </div>
        {renderSection()}
      </div>
    </div>
  );
}
