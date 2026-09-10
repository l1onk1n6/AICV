import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { LogoIcon } from '../components/layout/Logo';
import { useAuthStore } from '../store/authStore';
import { useT } from '../lib/i18n';

type AuthType = 'signup' | 'magiclink' | 'recovery' | 'invite' | 'unknown';
type Status = 'loading' | 'success' | 'error';

const ICONS: Record<AuthType, string> = {
  signup: '✉️',
  magiclink: '⚡',
  recovery: '🔐',
  invite: '🎉',
  unknown: '🔗',
};

export default function AuthCallbackPage({ authType }: { authType: AuthType }) {
  const t = useT();
  const { user, passwordRecovery, error } = useAuthStore();

  const config: Record<AuthType, { title: string; subtitle: string; successTitle: string; successSubtitle: string }> = {
    signup: {
      title: t('E-Mail wird bestätigt…'),
      subtitle: t('Bitte warte einen Moment.'),
      successTitle: t('E-Mail bestätigt!'),
      successSubtitle: t('Dein Konto ist jetzt aktiv. Du wirst weitergeleitet…'),
    },
    magiclink: {
      title: t('Anmeldung läuft…'),
      subtitle: t('Du wirst gleich eingeloggt.'),
      successTitle: t('Erfolgreich angemeldet!'),
      successSubtitle: t('Du wirst zur App weitergeleitet…'),
    },
    recovery: {
      title: t('Passwort-Reset wird vorbereitet…'),
      subtitle: t('Bitte warte einen Moment.'),
      successTitle: t('Bereit!'),
      successSubtitle: t('Du kannst jetzt dein neues Passwort setzen.'),
    },
    invite: {
      title: t('Einladung wird verarbeitet…'),
      subtitle: t('Gleich kannst du dein Konto einrichten.'),
      successTitle: t('Einladung angenommen!'),
      successSubtitle: t('Du wirst weitergeleitet…'),
    },
    unknown: {
      title: t('Wird verarbeitet…'),
      subtitle: t('Bitte warte einen Moment.'),
      successTitle: t('Fertig!'),
      successSubtitle: t('Du wirst weitergeleitet…'),
    },
  };

  const cfg = { ...config[authType], icon: ICONS[authType] };

  const status: Status = error
    ? 'error'
    : (authType === 'recovery' && passwordRecovery) || (user && !passwordRecovery)
    ? 'success'
    : 'loading';
  const errorMsg = error ?? '';

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px',
    }}>
      <div className="glass-card static animate-scale-in" style={{ width: '100%', maxWidth: 380, padding: '36px 28px', textAlign: 'center' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <LogoIcon size={36} />
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
              background: 'rgba(var(--rgb-fg),0.06)', border: '1px solid rgba(var(--rgb-fg),0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
            }}>
              {cfg.icon}
            </div>
            <Loader2 data-motion="essential" size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--ios-blue)', marginBottom: 14 }} />
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px' }}>{cfg.title}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-4)', margin: 0 }}>{cfg.subtitle}</p>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
              background: 'rgba(52,199,89,0.12)', border: '1px solid rgba(52,199,89,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckCircle size={36} style={{ color: 'var(--ios-green)' }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px' }}>{cfg.successTitle}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-4)', margin: 0 }}>{cfg.successSubtitle}</p>
            {authType === 'recovery' && (
              <p style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 16 }}>
                {t('Das Formular zum Passwort setzen erscheint gleich…')}
              </p>
            )}
          </>
        )}

        {/* Error */}
        {status === 'error' && (
          <>
            <div style={{
              width: 72, height: 72, borderRadius: 20, margin: '0 auto 20px',
              background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <XCircle size={36} style={{ color: 'var(--ios-red)' }} />
            </div>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.3px' }}>{t('Fehler aufgetreten')}</h2>
            <p style={{ fontSize: 13, color: 'rgba(255,59,48,0.8)', margin: '0 0 20px', lineHeight: 1.5 }}>
              {errorMsg || t('Der Link ist ungültig oder abgelaufen.')}
            </p>
            <button
              className="btn-glass"
              onClick={() => window.location.href = window.location.pathname}
              style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}
            >
              {t('Zurück zur Anmeldung')}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
