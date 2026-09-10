import { useState, useRef, useEffect } from 'react';
import { Mail, Eye, EyeOff, ShieldAlert, ArrowLeft, CheckCircle, RefreshCw, Zap } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { LogoIcon } from '../components/layout/Logo';
import { passwordStrength, STRENGTH_LABEL, STRENGTH_COLOR, RateLimiter } from '../lib/security';
import { useT } from '../lib/i18n';

const limiter = new RateLimiter(5, 300_000); // 5 min lockout

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'magic';

export default function AuthPage({ onBack, initialMode = 'login' }: { onBack?: () => void; initialMode?: Mode } = {}) {
  const t = useT();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [resetSent, setResetSent] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [pwMismatch, setPwMismatch] = useState(false);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { signIn, signUp, sendPasswordReset, sendMagicLink, updatePassword, resendConfirmation, loading, error, clearError, passwordRecovery, emailUnconfirmed } = useAuthStore();
  const [resendSent, setResendSent] = useState(false);

  // Switch to reset mode when coming from password recovery email
  // (React-Pattern: State während Render anpassen, wenn sich abhängige Prop ändert)
  const [prevPwRecovery, setPrevPwRecovery] = useState(passwordRecovery);
  if (passwordRecovery !== prevPwRecovery) {
    setPrevPwRecovery(passwordRecovery);
    if (passwordRecovery) setMode('reset');
  }

  // Capture referral code from URL hash (e.g. /#/?ref=<uuid>)
  useEffect(() => {
    const hash = window.location.hash;
    const q = hash.includes('?') ? hash.slice(hash.indexOf('?')) : '';
    const ref = new URLSearchParams(q).get('ref');
    if (ref && ref.length >= 32) {
      localStorage.setItem('path_ref', ref);
    }
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = setInterval(() => {
      const secs = limiter.secondsRemaining();
      setCooldown(secs);
      if (secs <= 0 && cooldownRef.current) clearInterval(cooldownRef.current);
    }, 500);
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current); };
  }, [cooldown]);

  const isLocked = limiter.isLocked();
  const strength = mode === 'register' && password.length > 0 ? passwordStrength(password) : null;

  function switchMode(m: Mode) {
    setMode(m);
    clearError();
    setPassword('');
    setConfirmPassword('');
    setResetSent(false);
    setMagicSent(false);
    setPwMismatch(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    setPwMismatch(false);

    if (mode === 'login') {
      if (limiter.isLocked()) return;
      await signIn(email, password);
      setTimeout(() => {
        if (useAuthStore.getState().error) {
          limiter.recordFailure();
          if (limiter.isLocked()) setCooldown(limiter.secondsRemaining());
        } else {
          limiter.reset();
        }
      }, 0);
    } else if (mode === 'register') {
      if (password.length < 8) return;
      await signUp(email, password, name);
    } else if (mode === 'forgot') {
      await sendPasswordReset(email);
      if (!useAuthStore.getState().error) setResetSent(true);
    } else if (mode === 'magic') {
      await sendMagicLink(email);
      if (!useAuthStore.getState().error) setMagicSent(true);
    } else if (mode === 'reset') {
      if (password !== confirmPassword) { setPwMismatch(true); return; }
      if (password.length < 8) return;
      await updatePassword(password);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '20px 16px', boxSizing: 'border-box', overflow: 'auto',
    }}>
      {onBack && (
        <button
          onClick={onBack}
          style={{
            position: 'fixed', top: 20, left: 20,
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(var(--rgb-fg),0.08)', border: '1px solid rgba(var(--rgb-fg),0.15)',
            borderRadius: 10, padding: '8px 14px',
            color: 'var(--text-2)', fontSize: 14, cursor: 'pointer',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            zIndex: 10, transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--rgb-fg),0.14)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(var(--rgb-fg),0.08)')}
        >
          <ArrowLeft size={15} /> Zurück
        </button>
      )}
      <div className="glass-card static animate-scale-in" style={{ width: '100%', maxWidth: 340, padding: '24px 22px' }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 18 }}>
          <div style={{ marginBottom: 8 }}><LogoIcon size={40} /></div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.4px' }}>Path</h1>
        </div>

        {/* ── E-Mail bestätigen (nach Registrierung) ── */}
        {emailUnconfirmed && (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,122,255,0.12)', border: '1px solid rgba(0,122,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Mail size={26} style={{ color: 'var(--ios-blue)' }} />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{t('E-Mail bestätigen')}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-4)', lineHeight: 1.6, margin: '0 0 20px' }}>
              {t('Wir haben dir eine Bestätigungs-E-Mail geschickt.')}<br />{t('Bitte klicke auf den Link in der E-Mail.')}
            </p>
            {resendSent ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, color: 'var(--ios-green)', marginBottom: 16 }}>
                <CheckCircle size={14} /> {t('E-Mail erneut gesendet!')}
              </div>
            ) : (
              <button
                className="btn-glass"
                disabled={loading}
                onClick={async () => {
                  await resendConfirmation(email);
                  if (!useAuthStore.getState().error) setResendSent(true);
                }}
                style={{ width: '100%', justifyContent: 'center', padding: '11px 20px', marginBottom: 12, gap: 6, opacity: loading ? 0.7 : 1 }}
              >
                <RefreshCw size={14} /> {t('E-Mail erneut senden')}
              </button>
            )}
            {error && (
              <div style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 13, color: 'var(--ios-red)', marginBottom: 12 }}>
                {t(error)}
              </div>
            )}
            <button onClick={() => { clearError(); switchMode('login'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 12 }}>
              {t('Zurück zur Anmeldung')}
            </button>
          </div>
        )}

        {/* ── Login / Register tabs ── */}
        {!emailUnconfirmed && (mode === 'login' || mode === 'register') && (
          <>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(var(--rgb-fg),0.08)', marginBottom: 18 }}>
              {(['login', 'register'] as const).map((m) => (
                <button key={m} onClick={() => switchMode(m)} style={{
                  flex: 1, padding: '10px 0',
                  background: 'transparent',
                  border: 'none', fontSize: 14, fontWeight: mode === m ? 600 : 400,
                  color: mode === m ? 'var(--text-1)' : 'var(--text-4)',
                  cursor: 'pointer', fontFamily: 'var(--font-sf)',
                  transition: 'color 150ms ease-out',
                  whiteSpace: 'nowrap',
                  borderBottom: mode === m ? '2px solid var(--ios-blue)' : '2px solid transparent',
                  marginBottom: -1,
                }}>
                  {m === 'login' ? t('Anmelden') : t('Registrieren')}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div style={{ marginBottom: 12 }}>
                  <label className="section-label">{t('Name')}</label>
                  <input className="input-glass" placeholder={t('Max Mustermann')} value={name} maxLength={100}
                    onChange={(e) => setName(e.target.value)} required autoFocus />
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <label className="section-label">{t('E-Mail')}</label>
                <input className="input-glass" type="email" placeholder={t('max@beispiel.de')} value={email} maxLength={254}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus={mode === 'login'}
                  autoComplete={mode === 'login' ? 'username' : 'email'} />
              </div>

              <div style={{ marginBottom: strength ? 6 : 8, position: 'relative' }}>
                <label className="section-label">{t('Passwort')}</label>
                <input className="input-glass" type={showPw ? 'text' : 'password'}
                  placeholder={mode === 'register' ? t('Mindestens 8 Zeichen') : t('Passwort eingeben')}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  required minLength={mode === 'register' ? 8 : 1} maxLength={128}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  style={{ paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{
                  position: 'absolute', right: 12, bottom: 10, background: 'none',
                  border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0,
                }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {strength && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 3, background: 'rgba(var(--rgb-fg),0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%',
                      background: STRENGTH_COLOR[strength], transition: 'width 0.3s, background 0.3s',
                    }} />
                  </div>
                  <span style={{ fontSize: 11, color: STRENGTH_COLOR[strength] }}>{t('Passwortstärke')}: {STRENGTH_LABEL[strength]}</span>
                </div>
              )}

              {/* Passwort vergessen – nur im Login-Modus */}
              {mode === 'login' && (
                <div style={{ marginBottom: 16, textAlign: 'right' }}>
                  <button type="button" onClick={() => switchMode('forgot')} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-4)', fontSize: 12, padding: 0,
                  }}>
                    {t('Passwort vergessen?')}
                  </button>
                </div>
              )}

              {!strength && mode !== 'login' && <div style={{ marginBottom: 16 }} />}

              {isLocked && (
                <div style={{ background: 'rgba(255,149,0,0.15)', border: '1px solid rgba(255,149,0,0.35)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#ff9500', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={15} /> Zu viele Versuche. Bitte warte {cooldown} Sekunden.
                </div>
              )}

              {error && !isLocked && (
                <div style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--ios-red)' }}>
                  {t(error)}
                </div>
              )}

              <button type="submit" className="btn-glass btn-primary"
                disabled={loading || isLocked || (mode === 'register' && password.length < 8)}
                style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', opacity: (loading || isLocked) ? 0.7 : 1 }}>
                {loading ? t('Bitte warten…') : mode === 'login' ? t('Anmelden') : t('Konto erstellen')}
              </button>
            </form>

            {mode === 'login' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 18px' }}>
                  <div style={{ flex: 1, height: 1, background: 'rgba(var(--rgb-fg),0.08)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.08em' }}>{t('ODER')}</span>
                  <div style={{ flex: 1, height: 1, background: 'rgba(var(--rgb-fg),0.08)' }} />
                </div>
                <button
                  type="button"
                  onClick={() => switchMode('magic')}
                  className="btn-glass"
                  style={{ width: '100%', justifyContent: 'center', padding: '11px 20px', gap: 6, fontSize: 13 }}
                >
                  <Zap size={14} /> {t('Mit Magic Link anmelden')}
                </button>
              </>
            )}
          </>
        )}

        {/* ── Passwort vergessen ── */}
        {!emailUnconfirmed && mode === 'forgot' && (
          <>
            <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 13, padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} /> {t('Zurück zur Anmeldung')}
            </button>

            {resetSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle size={40} style={{ color: 'var(--ios-green)', marginBottom: 12 }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{t('E-Mail gesendet')}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-4)', lineHeight: 1.6, margin: '0 0 20px' }}>
                  {t('Wir haben dir einen Link zum Zurücksetzen deines Passworts geschickt. Bitte prüfe dein Postfach.')}
                </p>
                <button onClick={() => switchMode('login')} className="btn-glass" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}>
                  {t('Zurück zur Anmeldung')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{t('Passwort zurücksetzen')}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-4)', margin: '0 0 18px', lineHeight: 1.5 }}>
                  {t('Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Zurücksetzen.')}
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label className="section-label">{t('E-Mail')}</label>
                  <input className="input-glass" type="email" placeholder={t('max@beispiel.de')} value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoFocus />
                </div>

                {error && (
                  <div style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--ios-red)' }}>
                    {t(error)}
                  </div>
                )}

                <button type="submit" className="btn-glass btn-primary" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', opacity: loading ? 0.7 : 1 }}>
                  {loading ? t('Wird gesendet…') : t('Reset-Link senden')}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── Magic Link ── */}
        {!emailUnconfirmed && mode === 'magic' && (
          <>
            <button onClick={() => switchMode('login')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', fontSize: 13, padding: '0 0 16px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <ArrowLeft size={14} /> {t('Zurück zur Anmeldung')}
            </button>

            {magicSent ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <CheckCircle size={40} style={{ color: 'var(--ios-green)', marginBottom: 12 }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{t('Link gesendet')}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-4)', lineHeight: 1.6, margin: '0 0 20px' }}>
                  Wir haben dir einen Anmeldelink an <strong style={{ color: 'var(--text-2)' }}>{email}</strong> geschickt. Der Link ist 60 Minuten gültig.
                </p>
                <button onClick={() => switchMode('login')} className="btn-glass" style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}>
                  {t('Zurück zur Anmeldung')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{t('Magic Link')}</h2>
                <p style={{ fontSize: 13, color: 'var(--text-4)', margin: '0 0 18px', lineHeight: 1.5 }}>
                  {t('Gib deine E-Mail-Adresse ein. Wir senden dir einen einmaligen Anmeldelink – kein Passwort nötig.')}
                </p>

                <div style={{ marginBottom: 16 }}>
                  <label className="section-label">{t('E-Mail')}</label>
                  <input className="input-glass" type="email" placeholder={t('max@beispiel.de')} value={email} maxLength={254}
                    onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" />
                </div>

                {error && (
                  <div style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--ios-red)' }}>
                    {t(error)}
                  </div>
                )}

                <button type="submit" className="btn-glass btn-primary" disabled={loading}
                  style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', gap: 6, opacity: loading ? 0.7 : 1 }}>
                  <Zap size={14} /> {loading ? t('Wird gesendet…') : t('Magic Link senden')}
                </button>
              </form>
            )}
          </>
        )}

        {/* ── Neues Passwort setzen (nach Klick auf Reset-Link) ── */}
        {!emailUnconfirmed && mode === 'reset' && (
          <form onSubmit={handleSubmit}>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{t('Neues Passwort')}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-4)', margin: '0 0 18px', lineHeight: 1.5 }}>
              {t('Wähle ein neues Passwort für dein Konto.')}
            </p>

            <div style={{ marginBottom: 12, position: 'relative' }}>
              <label className="section-label">{t('Neues Passwort')}</label>
              <input className="input-glass" type={showPw ? 'text' : 'password'}
                placeholder={t('Mindestens 8 Zeichen')} value={password}
                onChange={(e) => { setPassword(e.target.value); setPwMismatch(false); }}
                required minLength={8} autoFocus autoComplete="new-password" style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPw(!showPw)} style={{
                position: 'absolute', right: 12, bottom: 10, background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0,
              }}>
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {password.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 3, background: 'rgba(var(--rgb-fg),0.1)', borderRadius: 2, overflow: 'hidden', marginBottom: 4 }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: passwordStrength(password) === 'weak' ? '33%' : passwordStrength(password) === 'medium' ? '66%' : '100%',
                    background: STRENGTH_COLOR[passwordStrength(password)], transition: 'width 0.3s',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: STRENGTH_COLOR[passwordStrength(password)] }}>
                  {t('Passwortstärke')}: {STRENGTH_LABEL[passwordStrength(password)]}
                </span>
              </div>
            )}

            <div style={{ marginBottom: 16, position: 'relative' }}>
              <label className="section-label">{t('Passwort bestätigen')}</label>
              <input className="input-glass" type={showConfirmPw ? 'text' : 'password'}
                placeholder={t('Passwort wiederholen')} value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPwMismatch(false); }}
                required autoComplete="new-password"
                style={{ paddingRight: 42, borderColor: pwMismatch ? 'rgba(255,59,48,0.6)' : undefined }} />
              <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} style={{
                position: 'absolute', right: 12, bottom: 10, background: 'none',
                border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 0,
              }}>
                {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {pwMismatch && (
              <div style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--ios-red)' }}>
                {t('Die Passwörter stimmen nicht überein.')}
              </div>
            )}

            {error && (
              <div style={{ background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16, fontSize: 13, color: 'var(--ios-red)' }}>
                {t(error)}
              </div>
            )}

            <button type="submit" className="btn-glass btn-primary" disabled={loading || password.length < 8}
              style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', opacity: loading ? 0.7 : 1 }}>
              {loading ? t('Wird gespeichert…') : t('Passwort speichern')}
            </button>
          </form>
        )}

      </div>

      <footer style={{
        marginTop: 20,
        fontSize: 11,
        color: 'var(--text-4)',
        userSelect: 'none',
      }}>
        by pixmatic · v{__APP_VERSION__}
      </footer>
    </div>
  );
}
