import { useState } from 'react';
import { Lock, X, Sparkles, Loader2, Clock } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { usePlan, PRO_FEATURES } from '../../lib/plan';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { presentProPaywall } from '../../lib/revenuecat';
import { userError } from '../../lib/userError';
import { useT } from '../../lib/i18n';

// ── Checkout helper ────────────────────────────────────────
async function startCheckout(plan: 'monthly' | 'yearly'): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    headers: { Authorization: `Bearer ${session.access_token}` },
    body: { plan },
  });
  if (error || !data?.url) {
    console.error('Checkout error:', error ?? data);
    return null;
  }
  return data.url as string;
}

// ── Upgrade Modal ──────────────────────────────────────────
export function UpgradeModal({ onClose, highlightId }: { onClose: () => void; highlightId?: string }) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');

  async function handleUpgrade() {
    setLoading(true);
    setCheckoutError('');
    // Native: Google-Play-IAP via RevenueCat-Paywall (Play-Store-Pflicht)
    if (Capacitor.isNativePlatform()) {
      try {
        const purchased = await presentProPaywall();
        if (purchased) onClose();
      } catch (err) {
        setCheckoutError(userError('Der Kauf konnte nicht abgeschlossen werden', err));
      } finally {
        setLoading(false);
      }
      return;
    }
    // Web: Stripe-Checkout
    const url = await startCheckout(plan);
    if (url) {
      window.location.href = url;
    } else {
      setCheckoutError(userError('Der Checkout konnte nicht gestartet werden'));
      setLoading(false);
    }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="glass-card animate-scale-in"
        style={{
          padding: '28px 24px', width: 660, maxWidth: '92vw', maxHeight: '88vh', overflow: 'auto',
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(32px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(32px) saturate(1.6)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #FF9F0A, #FF375F)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} style={{ color: '#1c1c1e' }} />
              </div>
              <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>PATH Pro</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-4)' }}>
              Alle Funktionen für professionelle Bewerbungen
            </p>
          </div>
          <button className="btn-glass btn-icon" onClick={onClose} style={{ padding: 6, flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>

        {/* Plan Toggle — nur Web */}
        {!Capacitor.isNativePlatform() && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 0, marginBottom: 20,
            background: 'rgba(var(--rgb-fg),0.06)', borderRadius: 10, padding: 3,
            border: '1px solid rgba(var(--rgb-fg),0.1)',
          }}>
            {(['monthly', 'yearly'] as const).map((p) => {
              const active = plan === p;
              return (
                <button
                  key={p}
                  onClick={() => setPlan(p)}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
                    background: active ? 'linear-gradient(135deg, rgba(255,159,10,0.35), rgba(255,55,95,0.28))' : 'transparent',
                    color: active ? 'var(--text-1)' : 'var(--text-4)',
                    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.25)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}
                >
                  {p === 'monthly' ? (
                    <>{t('Monatlich')} <span style={{ fontSize: 12, fontWeight: 500 }}>CHF 5</span></>
                  ) : (
                    <>
                      Jährlich <span style={{ fontSize: 12, fontWeight: 500 }}>CHF 49</span>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                        background: active ? 'rgba(52,199,89,0.35)' : 'rgba(52,199,89,0.2)',
                        color: 'var(--ios-green)', border: '1px solid rgba(52,199,89,0.4)',
                      }}>−18%</span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Feature list */}
        <div style={{ marginBottom: 24 }}>
          {/* Available now */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'rgba(52,199,89,0.8)', textTransform: 'uppercase', padding: '2px 4px', marginBottom: 8 }}>
            ✓ Jetzt verfügbar
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 6, marginBottom: 14 }}>
            {PRO_FEATURES.filter(f => f.available).map((f) => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 10,
                background: f.id === highlightId ? 'rgba(255,159,10,0.12)' : 'rgba(52,199,89,0.07)',
                border: `1px solid ${f.id === highlightId ? 'rgba(255,159,10,0.3)' : 'rgba(52,199,89,0.2)'}`,
              }}>
                <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.4 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{f.description}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon */}
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-4)', textTransform: 'uppercase', padding: '2px 4px', marginBottom: 8 }}>
            ⏳ In Entwicklung
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 6 }}>
            {PRO_FEATURES.filter(f => !f.available).map((f) => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 12px', borderRadius: 10,
                background: f.id === highlightId ? 'rgba(255,159,10,0.12)' : 'rgba(var(--rgb-fg),0.04)',
                border: `1px solid ${f.id === highlightId ? 'rgba(255,159,10,0.3)' : 'rgba(var(--rgb-fg),0.07)'}`,
                opacity: 0.7,
              }}>
                <span style={{ fontSize: 15, flexShrink: 0, lineHeight: 1.4 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 1 }}>{f.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{f.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="btn-glass"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 12, fontSize: 15, fontWeight: 700,
              background: loading
                ? 'rgba(255,159,10,0.15)'
                : 'linear-gradient(135deg, rgba(255,159,10,0.4), rgba(255,55,95,0.35))',
              border: '1px solid rgba(255,159,10,0.5)',
              color: 'var(--text-1)', opacity: loading ? 0.8 : 1, cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading
              ? <><Loader2 data-motion="essential" size={15} style={{ animation: 'spin 1s linear infinite' }} /> {Capacitor.isNativePlatform() ? t('Öffne Google Play…') : t('Weiterleitung zu Stripe…')}</>
              : <><Sparkles size={14} /> {Capacitor.isNativePlatform()
                  ? t('Jetzt upgraden — PATH Pro')
                  : plan === 'yearly'
                    ? t('Jetzt upgraden — CHF 49 / Jahr')
                    : t('Jetzt upgraden — CHF 5 / Monat')
                }</>
            }
          </button>

          {checkoutError && (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ios-red)', textAlign: 'center' }}>
              {checkoutError}
            </p>
          )}

          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-4)', textAlign: 'center' }}>
            {Capacitor.isNativePlatform()
              ? t('Abrechnung über Google Play · Jederzeit kündbar')
              : plan === 'yearly'
                ? t('Sichere Zahlung via Stripe · Jährliche Abrechnung · Jederzeit kündbar')
                : t('Sichere Zahlung via Stripe · Monatlich kündbar')}
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── ProGate — wraps Pro-only UI elements ──────────────────
interface ProGateProps {
  featureId: string;
  children: React.ReactNode;
  /** If true, shows a small inline "PRO" badge instead of overlaying */
  badge?: boolean;
}

export default function ProGate({ featureId, children, badge = false }: ProGateProps) {
  const t = useT();
  const { isPro } = usePlan();
  const [showModal, setShowModal] = useState(false);
  const [showSoon, setShowSoon] = useState(false);

  // Feature existiert aber ist noch nicht ausgerollt: ausgrauen,
  // Klick zeigt 'Bald verfügbar'. Gilt auch fuer Pro-User.
  const feature = PRO_FEATURES.find(f => f.id === featureId);
  const notYetAvailable = feature && feature.available === false;

  if (notYetAvailable) {
    const label = feature.label;
    const hint = `${label} – bald verfügbar`;
    const Overlay = badge ? (
      <span style={{
        position: 'absolute', top: -5, right: -16,
        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em',
        padding: '2px 4px', borderRadius: 3,
        background: 'rgba(var(--rgb-fg),0.12)', border: '1px solid rgba(var(--rgb-fg),0.18)',
        color: 'var(--text-2)', pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 1,
      }}>BALD</span>
    ) : (
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, borderRadius: 'inherit', background: 'rgba(0,0,0,0.2)',
      }}>
        <Clock size={12} style={{ color: 'var(--text-2)' }} />
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
          padding: '3px 7px', borderRadius: 6,
          background: 'rgba(var(--rgb-fg),0.12)', border: '1px solid rgba(var(--rgb-fg),0.18)',
          color: 'var(--text-1)',
        }}>BALD VERFÜGBAR</span>
      </div>
    );
    return (
      <>
        {showSoon && (
          <div onClick={() => setShowSoon(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 9500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}>
            <div className="glass-card animate-scale-in" onClick={e => e.stopPropagation()}
              style={{ padding: '24px 28px', maxWidth: 320, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(88,86,214,0.2)', border: '1px solid rgba(88,86,214,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Clock size={20} style={{ color: 'var(--text-1)' }} />
              </div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>{label} — bald verfügbar</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>
                {feature.description}
              </div>
              <button className="btn-glass btn-primary btn-sm" onClick={() => setShowSoon(false)}>{t('Verstanden')}</button>
            </div>
          </div>
        )}
        <div
          style={{ position: 'relative', display: badge ? 'inline-flex' : 'block', marginRight: badge ? 6 : 0, cursor: 'pointer' }}
          onClick={() => setShowSoon(true)}
          title={hint}
        >
          <div style={{ opacity: 0.35, pointerEvents: 'none', filter: 'grayscale(0.6)' }}>{children}</div>
          {Overlay}
        </div>
      </>
    );
  }

  if (isPro) return <>{children}</>;

  if (badge) {
    return (
      <>
        {showModal && <UpgradeModal onClose={() => setShowModal(false)} highlightId={featureId} />}
        <div
          style={{ position: 'relative', display: 'inline-flex', marginRight: 6 }}
          onClick={() => setShowModal(true)}
          title={t("Pro-Feature")}
        >
          <div style={{ opacity: 0.4, pointerEvents: 'none', filter: 'grayscale(0.5)' }}>{children}</div>
          <span style={{
            position: 'absolute', top: -5, right: -14,
            fontSize: 9, fontWeight: 800, letterSpacing: '0.04em',
            padding: '2px 4px', borderRadius: 3,
            // Weiss auf diesem Verlauf ergibt 2,06:1 am Amber-Ende und
            // 3,52:1 am Pink-Ende — in BEIDEN Themes, denn der Verlauf ist
            // fest. (Der Board-Wert 1,0:1 war ein Messfehler: getComputedStyle
            // liefert bei linear-gradient backgroundColor "transparent", also
            // wurde weiss gegen die weisse Karte gerechnet.) Dunkler Text
            // dreht es auf 10,2:1 bzw. 4,87:1.
            background: 'linear-gradient(135deg, #FF9F0A, #FF375F)',
            color: '#1c1c1e', pointerEvents: 'none', whiteSpace: 'nowrap',
            zIndex: 1,
          }}>PRO</span>
        </div>
      </>
    );
  }

  return (
    <>
      {showModal && <UpgradeModal onClose={() => setShowModal(false)} highlightId={featureId} />}
      <div
        style={{ position: 'relative', cursor: 'pointer' }}
        onClick={() => setShowModal(true)}
        title={t("Pro-Feature — klicken für mehr Infos")}
      >
        <div style={{ opacity: 0.35, pointerEvents: 'none', filter: 'grayscale(0.4)' }}>{children}</div>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 6, borderRadius: 'inherit',
          background: 'rgba(0,0,0,0.15)',
        }}>
          <Lock size={12} style={{ color: 'var(--text-2)' }} />
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.08em',
            padding: '3px 7px', borderRadius: 6,
            background: 'linear-gradient(135deg, #FF9F0A, #FF375F)',
            color: '#1c1c1e',
          }}>PRO</span>
        </div>
      </div>
    </>
  );
}
