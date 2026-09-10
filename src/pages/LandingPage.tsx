import { useState, useEffect, useRef } from 'react';
import { LogoIcon } from '../components/layout/Logo';
import AuthPage from './AuthPage';
import { useIsMobile } from '../hooks/useBreakpoint';
import { openExternal } from '../lib/openExternal';
import { useT, useI18n } from '../lib/i18n';
import {
  FileText, Sparkles, Globe, Clock, Share2, Download,
  Check, ChevronRight, ArrowRight, Star, ClipboardList, Mail, Import,
  Users, Bell, Shield, PenLine, Wand2, Brain, Languages,
  BookOpen, Layers, Smartphone,
} from 'lucide-react';

const FEATURES = [
  { icon: FileText,     color: '#007AFF', title: '15+ professionelle Vorlagen',   desc: 'Von klassisch bis modern – für jede Branche und jeden Stil. Pixelgenaue PDFs direkt aus dem Browser.' },
  { icon: Download,     color: '#34C759', title: 'PDF-Export mit einem Klick',     desc: 'Druckfertiges PDF in Sekunden – perfekt formatiert für Online-Bewerbungen und den Postversand.' },
  { icon: ClipboardList,color: '#5856D6', title: 'Bewerbungs-Tracker',             desc: 'Alle Bewerbungen im Überblick: Status, Deadline, Notizen und verknüpfte Unterlagen an einem Ort.' },
  { icon: Bell,         color: '#FF9F0A', title: 'Deadline-Reminder',              desc: 'Verpasse keine Bewerbungsfrist mehr – automatische Erinnerungen für alle offenen Bewerbungen.' },
  { icon: Share2,       color: '#FF2D55', title: 'Online teilen',                  desc: 'Erstelle einen öffentlichen Link zu deinem Lebenslauf – ideal für LinkedIn, E-Mail und digitale Bewerbungen.' },
  { icon: Clock,        color: '#5AC8FA', title: 'Versionshistorie',               desc: 'Speichere Versionen deines CVs und stelle frühere Stände jederzeit wieder her.' },
  { icon: Globe,        color: '#FF6B35', title: 'Mehrsprachig',                   desc: 'KI-gestützte Übersetzung deines Lebenslaufs in jede Sprache – für internationale Bewerbungen.' },
  { icon: Layers,       color: '#AF52DE', title: 'Eigene Sektionen',               desc: 'Füge beliebige Sektionen hinzu – Publikationen, Projekte, Ehrenamt und mehr.' },
  { icon: Users,        color: '#30D158', title: 'Mehrere Personen & Mappen',      desc: 'Verwalte CVs für verschiedene Personen oder erstelle mehrere Versionen für verschiedene Stellen.' },
  { icon: Mail,         color: '#FF6B6B', title: 'Anschreiben-Vorlagen',           desc: '4 professionelle Strukturen als Startpunkt – individuell anpassbar, mit KI-Unterstützung.' },
  { icon: BookOpen,     color: '#64D2FF', title: 'Strukturierter Editor',          desc: 'Alle Sektionen – Person, Erfahrung, Ausbildung, Skills, Projekte – übersichtlich und intuitiv.' },
  { icon: Shield,       color: '#4CAF50', title: 'DSGVO-konform & sicher',         desc: 'Deine Daten bleiben in der Schweiz. Kein Tracking, keine Weitergabe an Dritte.' },
];

const AI_FEATURES = [
  {
    icon: PenLine,
    title: 'Anschreiben generieren',
    desc: 'Stelle, Unternehmen und Ton eingeben – Claude AI schreibt in Sekunden ein vollständiges, individuelles Anschreiben.',
    badge: 'Claude AI',
  },
  {
    icon: Wand2,
    title: 'Texte verbessern',
    desc: 'Bestehende Formulierungen professionell optimieren, umschreiben oder auf Stelle zuschneiden – mit einem Klick.',
    badge: 'Claude AI',
  },
  {
    icon: Import,
    title: 'LinkedIn-Import',
    desc: 'LinkedIn-Profiltext einfügen – die KI erkennt automatisch Name, Erfahrungen, Ausbildung und Skills.',
    badge: 'Claude AI',
  },
  {
    icon: Languages,
    title: 'Automatische Übersetzung',
    desc: 'Den gesamten Lebenslauf in jede Sprache übersetzen – Deutsch, Englisch, Französisch, Italienisch und mehr.',
    badge: 'Claude AI',
  },
];

const STEPS = [
  { num: '1', title: 'Konto erstellen',   desc: 'Kostenlos registrieren, keine Kreditkarte nötig.' },
  { num: '2', title: 'Vorlage wählen',    desc: 'Passende Vorlage für deine Branche und deinen Stil aussuchen.' },
  { num: '3', title: 'Daten eintragen',   desc: 'Lebenslauf ausfüllen – oder per LinkedIn-Import & KI in Sekunden befüllen.' },
  { num: '4', title: 'PDF herunterladen', desc: 'Mit einem Klick als druckfertiges PDF exportieren.' },
];

const FREE_FEATURES = [
  '1 Person, 3 Mappen',
  '6 Templates',
  '5 PDF-Exporte / Monat',
  '1 Share-Link',
  'Bewerbungs-Tracker',
  'Anschreiben-Vorlagen',
  'LinkedIn-Import (KI)',
  'DSGVO-konform',
];

const PRO_FEATURES = [
  '5 Personen, 60 Mappen',
  'Alle 15+ Templates',
  'Unbegrenzte PDF-Exporte',
  '10 Share-Links',
  'KI-Assistent – Anschreiben & Texte (Claude AI)',
  'KI-Übersetzung in alle Sprachen',
  'Versionshistorie',
  'Eigene Sektionen',
  'Deadline-Reminder',
];

const EARLYBIRD_DEADLINE = new Date('2026-05-15T23:59:59');

function useCountdown(deadline: Date) {
  const calc = () => {
    const diff = deadline.getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    return {
      days:    Math.floor(diff / 86_400_000),
      hours:   Math.floor((diff % 86_400_000) / 3_600_000),
      minutes: Math.floor((diff % 3_600_000)  /    60_000),
      seconds: Math.floor((diff %    60_000)  /     1_000),
      expired: false,
    };
  };
  const [tick, setTick] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTick(calc()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return tick;
}

export default function LandingPage() {
  const t = useT();
  const locale = useI18n(s => s.locale);
  const setLocale = useI18n(s => s.setLocale);
  const [showAuth, setShowAuth] = useState<false | 'login' | 'register'>(false);
  const [scrolled, setScrolled] = useState(false);
  const isMobile = useIsMobile();
  // Eigener Breakpoint nur fuer die Kopfzeile: Logo + Menue + Auth-Block
  // brauchen zusammen rund 890 px. Unterhalb 1024 px entfaellt das Menue,
  // sonst bricht die Leiste zwischen 768 und 890 px um.
  const isCompactNav = useIsMobile(1024);
  // Unter 360 px (iPhone SE 1. Gen) reicht es auch ohne Badge und Sprachwahl
  // nicht: dann entfaellt „Anmelden" in der Leiste. Der Weg bleibt offen —
  // die Auth-Seite hat oben einen Umschalter Anmelden/Registrieren.
  const isTinyNav = useIsMobile(360);
  const countdown = useCountdown(EARLYBIRD_DEADLINE);
  const containerRef = useRef<HTMLDivElement>(null);

  // Allow page to scroll (body has overflow:hidden normally)
  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';
    return () => {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = () => setScrolled(el.scrollTop > 40);
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, []);

  // Signalisiert dem Pre-Renderer (scripts/prerender.mjs), dass das DOM
  // vollstaendig aufgebaut ist und das HTML jetzt eingefroren werden kann.
  useEffect(() => {
    document.dispatchEvent(new Event('app-loaded'));
  }, []);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

  if (showAuth) return <AuthPage onBack={() => setShowAuth(false)} initialMode={showAuth} />;

  // Sprach-Picker — DE als Default; Auswahl persistiert via localStorage.
  // Steht auf dem Desktop in der Kopfzeile, auf dem Telefon in der Fusszeile:
  // in der Kopfzeile ist dort kein Platz, ohne den Hauptknopf abzuschneiden.
  const langPicker = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: 3, borderRadius: 10, background: 'rgba(var(--rgb-fg),0.05)', border: '1px solid rgba(var(--rgb-fg),0.08)' }}>
      {(['de', 'en'] as const).map(code => (
        <button
          key={code}
          className="tap44"
          onClick={() => setLocale(code)}
          aria-pressed={locale === code}
          aria-label={code === 'de' ? 'Deutsch' : 'English'}
          style={{
            border: 'none', cursor: 'pointer',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            padding: '5px 10px', borderRadius: 8,
            textTransform: 'uppercase',
            background: locale === code ? 'rgba(0,122,255,0.18)' : 'transparent',
            color: locale === code ? '#fff' : 'var(--text-3)',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { if (locale !== code) e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { if (locale !== code) e.currentTarget.style.color = 'var(--text-3)'; }}
        >
          {code}
        </button>
      ))}
    </div>
  );

  return (
    <div
      ref={containerRef}
      // .force-dark erzwingt die Dark-Tokens. Frueher standen --rgb-fg und
      // --rgb-bg hier inline; seit es die Textfarben-Leiter (--text-1 … -4)
      // gibt, reicht das nicht mehr: die Leiter wird bereits auf <body>
      // aufgeloest und erbt danach als fertige Farbe. Die Klasse setzt beide
      // Ebenen und zusaetzlich die iOS-Farben auf ihre Dunkel-Varianten.
      className="force-dark"
      style={{
        height: '100dvh',
        overflowY: 'auto',
        overflowX: 'hidden',
        fontFamily: 'var(--font-sf)',
        background: '#0c0c0e',
        color: '#fff',
        scrollBehavior: 'smooth',
      }}
    >
      {/* ── Sticky Nav ──────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: isMobile ? '14px 16px' : '16px 48px',
        background: scrolled ? 'rgba(8,15,30,0.92)' : 'rgba(8,15,30,0.55)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(var(--rgb-fg),0.08)',
        transition: 'background 0.3s',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}>
          <LogoIcon size={30} />
          <span style={{ fontWeight: 800, fontSize: 17, letterSpacing: '-0.3px' }}>PATH</span>
          {/* Badge kostet 82 px und steht auf dem Telefon in der Fusszeile */}
          {!isMobile && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'rgba(0,122,255,0.2)', border: '1px solid rgba(0,122,255,0.35)', color: 'var(--ios-blue)', marginLeft: 2, whiteSpace: 'nowrap' }}>by pixmatic</span>
          )}
        </div>

        {/* Nav links – erst ab 1024 px, darunter fehlt die Breite */}
        {!isCompactNav && (
          <div style={{ display: 'flex', gap: 32, fontSize: 14, color: 'var(--text-3)' }}>
            {[['features', t('Features')], ['how', t("So funktioniert's")], ['pricing', t('Preise')]].map(([id, label]) => (
              <button key={id} onClick={() => scrollTo(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', padding: 0, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Auth buttons */}
        <div style={{ display: 'flex', gap: isMobile ? 8 : 10, alignItems: 'center' }}>
          {!isMobile && langPicker}
          {!isTinyNav && <button className="tap44" onClick={() => setShowAuth('login')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-3)', fontSize: isMobile ? 13 : 14, padding: isMobile ? '8px 10px' : '8px 14px',
            borderRadius: 10, transition: 'color 0.2s', whiteSpace: 'nowrap', flexShrink: 0,
          }}
            onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
            {t('Anmelden')}
          </button>}
          <button className="tap44" onClick={() => setShowAuth('register')} style={{
            background: 'var(--fill-blue)', border: 'none', cursor: 'pointer',
            color: '#fff', fontSize: isMobile ? 13 : 14, fontWeight: 600,
            padding: isMobile ? '9px 13px' : '9px 18px', borderRadius: 10,
            transition: 'background 0.2s, transform 0.15s',
            // Ohne nowrap bricht „Kostenlos starten" auf dem Telefon zweizeilig
            // um und die Leiste wird 30 px hoeher.
            whiteSpace: 'nowrap', flexShrink: 0,
          }}
            // Beim Hover wird abgedunkelt statt aufgehellt: weisse Schrift auf
            // dem helleren #007AFF kaeme nur auf 4,02:1.
            onMouseEnter={e => { e.currentTarget.style.background = '#005FC7'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--fill-blue)'; e.currentTarget.style.transform = 'none'; }}>
            {t('Kostenlos starten')}
          </button>
        </div>
      </nav>

      {/* ── Earlybird Banner ────────────────────────────────── */}
      {!countdown.expired && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(255,159,10,0.18) 0%, rgba(255,55,95,0.15) 50%, rgba(175,82,222,0.15) 100%)',
          borderBottom: '1px solid rgba(255,159,10,0.25)',
          padding: isMobile ? '10px 16px' : '11px 48px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: isMobile ? 10 : 20, flexWrap: 'wrap',
          backdropFilter: 'blur(8px)',
        }}>
          {/* Label + Code */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,159,10,0.25)', border: '1px solid rgba(255,159,10,0.4)', color: '#FF9F0A', letterSpacing: '0.06em', flexShrink: 0 }}>
              LAUNCH-ANGEBOT
            </span>
            <span style={{ fontSize: isMobile ? 13 : 14, fontWeight: 600, color: 'var(--text-1)' }}>
              50% Rabatt im ersten Monat —{' '}
              <span style={{ color: '#FF9F0A' }}>CHF 2.50 statt CHF 5</span>
            </span>
            <span style={{
              fontSize: 12, fontWeight: 800, letterSpacing: '0.06em',
              padding: '3px 10px', borderRadius: 7,
              background: 'rgba(var(--rgb-fg),0.1)', border: '1px solid rgba(var(--rgb-fg),0.2)',
              color: '#fff', fontFamily: 'monospace', cursor: 'default',
            }}
              title={t("Gutschein-Code kopieren")}
              onClick={() => navigator.clipboard?.writeText('START25')}
            >
              START25
            </span>
          </div>

          {/* Divider */}
          {!isMobile && <div style={{ width: 1, height: 20, background: 'rgba(var(--rgb-fg),0.15)' }} />}

          {/* Countdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0 }}>{t('Noch')}</span>
            {[
              [countdown.days,    'd'],
              [countdown.hours,   'h'],
              [countdown.minutes, 'm'],
              [countdown.seconds, 's'],
            ].map(([val, unit]) => (
              <span key={unit as string} style={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <span style={{
                  fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                  minWidth: unit === 'd' ? 20 : 18, textAlign: 'right',
                  color: '#FF9F0A',
                }}>
                  {String(val).padStart(2, '0')}
                </span>
                <span style={{ fontSize: 11, color: 'var(--text-4)', marginRight: 4 }}>{unit}</span>
              </span>
            ))}
          </div>

          {/* CTA */}
          <button onClick={() => setShowAuth('register')} style={{
            fontSize: 12, fontWeight: 700, padding: '6px 14px', borderRadius: 8, flexShrink: 0,
            background: 'linear-gradient(135deg, #FF9F0A, #FF375F)',
            border: 'none', color: '#1c1c1e', cursor: 'pointer',
            boxShadow: '0 3px 12px rgba(255,159,10,0.35)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 5px 18px rgba(255,159,10,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 3px 12px rgba(255,159,10,0.35)'; }}>
            {t('Jetzt sichern')}
          </button>
        </div>
      )}

      {/* ── Hero ────────────────────────────────────────────── */}
      <section style={{
        display: 'flex', alignItems: 'center',
        padding: isMobile ? '48px 24px 64px' : '64px 48px 80px',
        maxWidth: 1200, margin: '0 auto',
        gap: isMobile ? 48 : 64,
        flexDirection: isMobile ? 'column' : 'row',
      }}>
        {/* Left: text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 99,
            background: 'rgba(175,82,222,0.15)', border: '1px solid rgba(175,82,222,0.3)',
            color: '#CF9FFF', marginBottom: 28, letterSpacing: '0.04em',
          }}>
            <Sparkles size={12} /> {t('KI-gestützte Bewerbungsmappe')}
          </div>

          <h1 style={{
            margin: '0 0 24px',
            fontSize: isMobile ? 40 : 58,
            fontWeight: 800,
            lineHeight: 1.08,
            letterSpacing: '-1.5px',
          }}>
            {t('Dein Lebenslauf.')}{' '}
            <span style={{
              background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 50%, #34C759 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {t('Professionell.')}
            </span>
            <br />{t('In Minuten.')}
          </h1>

          <p style={{
            margin: '0 0 36px',
            fontSize: isMobile ? 16 : 18,
            color: 'var(--text-3)',
            lineHeight: 1.65,
            maxWidth: 480,
          }}>
            {t('PATH hilft dir, überzeugende Bewerbungsunterlagen zu erstellen — mit modernen Vorlagen, KI-Unterstützung und PDF-Export mit einem Klick.')}
          </p>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={() => setShowAuth('register')} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #007AFF, #5856D6)',
              border: 'none', borderRadius: 14, cursor: 'pointer',
              color: '#fff', fontSize: 16, fontWeight: 700,
              padding: '14px 28px',
              boxShadow: '0 8px 30px rgba(0,122,255,0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,122,255,0.45)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,122,255,0.35)'; }}>
              Kostenlos starten <ArrowRight size={16} />
            </button>
            <button onClick={() => scrollTo('pricing')} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'rgba(var(--rgb-fg),0.08)', border: '1px solid rgba(var(--rgb-fg),0.15)',
              borderRadius: 14, cursor: 'pointer',
              color: 'var(--text-2)', fontSize: 16, fontWeight: 500,
              padding: '14px 28px',
              transition: 'background 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(var(--rgb-fg),0.13)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(var(--rgb-fg),0.08)'; e.currentTarget.style.transform = 'none'; }}>
              {t('Preise ansehen')}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 28, flexWrap: 'wrap' }}>
            {['Kostenlos starten', 'Keine Kreditkarte nötig', 'DSGVO-konform'].map(label => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-4)' }}>
                <Check size={14} style={{ color: '#34C759', flexShrink: 0 }} /> {t(label)}
              </div>
            ))}
          </div>
        </div>

        {/* Right: mock UI */}
        {!isMobile && <MockAppPreview />}
      </section>

      {/* ── Stats bar ───────────────────────────────────────── */}
      <div style={{
        borderTop: '1px solid rgba(var(--rgb-fg),0.07)',
        borderBottom: '1px solid rgba(var(--rgb-fg),0.07)',
        background: 'rgba(var(--rgb-fg),0.03)',
        padding: '28px 48px',
      }}>
        <div style={{
          maxWidth: 900, margin: '0 auto',
          display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24,
        }}>
          {[
            ['15+', 'Professionelle Vorlagen'],
            ['4x', 'KI-Features (Claude AI)'],
            ['1-Klick', 'PDF-Export'],
            ['100%', 'DSGVO-konform'],
            ['CHF 0', 'Kostenlos starten'],
          ].map(([val, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', color: '#fff' }}>{val}</div>
              <div style={{ fontSize: 13, color: 'var(--text-4)', marginTop: 4 }}>{t(label)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" style={{ padding: isMobile ? '80px 24px' : '100px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <h2 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.8px' }}>
            {t('Alles was du brauchst')}
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-4)', margin: 0, maxWidth: 520, marginInline: 'auto', lineHeight: 1.6 }}>
            {t('Von der ersten Idee bis zum fertigen PDF — PATH begleitet dich durch den gesamten Bewerbungsprozess.')}
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 20,
        }}>
          {FEATURES.map(({ icon: Icon, color, title, desc }) => (
            <div key={title} style={{
              background: 'rgba(var(--rgb-fg),0.04)',
              border: '1px solid rgba(var(--rgb-fg),0.08)',
              borderRadius: 20, padding: 28,
              transition: 'background 0.2s, border-color 0.2s, transform 0.2s',
              cursor: 'default',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--rgb-fg),0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--rgb-fg),0.04)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 18,
                background: `${color}22`, border: `1px solid ${color}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={20} style={{ color }} />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 10px' }}>{t(title)}</h3>
              <p style={{ fontSize: 14, color: 'var(--text-4)', margin: 0, lineHeight: 1.6 }}>{t(desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── AI Features Spotlight ───────────────────────────── */}
      <section style={{
        padding: isMobile ? '80px 24px' : '100px 48px',
        background: 'linear-gradient(180deg, rgba(175,82,222,0.04) 0%, rgba(0,122,255,0.04) 100%)',
        borderTop: '1px solid rgba(var(--rgb-fg),0.06)',
        borderBottom: '1px solid rgba(var(--rgb-fg),0.06)',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 99, background: 'rgba(175,82,222,0.15)', border: '1px solid rgba(175,82,222,0.3)', color: '#CF9FFF', marginBottom: 20, letterSpacing: '0.06em' }}>
              <Brain size={14} /> POWERED BY CLAUDE AI
            </div>
            <h2 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.8px' }}>
              {t('KI übernimmt die schwere Arbeit')}
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-4)', margin: 0, maxWidth: 520, marginInline: 'auto', lineHeight: 1.6 }}>
              {t('Claude AI – eines der leistungsfähigsten Sprachmodelle der Welt – ist direkt in PATH integriert.')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 20 }}>
            {AI_FEATURES.map(({ icon: Icon, title, desc, badge }) => (
              <div key={title} style={{
                display: 'flex', gap: 18, padding: 28,
                background: 'rgba(175,82,222,0.06)', border: '1px solid rgba(175,82,222,0.18)',
                borderRadius: 20, transition: 'background 0.2s, transform 0.2s',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(175,82,222,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(175,82,222,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, flexShrink: 0, background: 'rgba(175,82,222,0.15)', border: '1px solid rgba(175,82,222,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={22} style={{ color: '#CF9FFF' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{t(title)}</h3>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(175,82,222,0.25)', color: '#CF9FFF', letterSpacing: '0.04em', flexShrink: 0 }}>{badge}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.65 }}>{t(desc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section id="how" style={{
        padding: isMobile ? '80px 24px' : '100px 48px',
        background: 'rgba(var(--rgb-fg),0.02)',
        borderTop: '1px solid rgba(var(--rgb-fg),0.06)',
        borderBottom: '1px solid rgba(var(--rgb-fg),0.06)',
      }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <h2 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.8px' }}>
              {t('In 4 Schritten zur Bewerbung')}
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-4)', margin: 0, lineHeight: 1.6 }}>
              {t('Einfach und schnell — ohne komplizierte Software.')}
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(4, 1fr)',
            gap: 24, position: 'relative',
          }}>
            {STEPS.map(({ num, title, desc }, i) => (
              <div key={num} style={{ textAlign: 'center', position: 'relative' }}>
                {/* Connector line */}
                {!isMobile && i < STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', top: 22, left: '62%', width: '76%',
                    height: 1, background: 'linear-gradient(90deg, rgba(0,122,255,0.4), rgba(0,122,255,0.1))',
                    zIndex: 0,
                  }} />
                )}
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', margin: '0 auto 20px',
                  background: 'linear-gradient(135deg, #007AFF, #5856D6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, position: 'relative', zIndex: 1,
                  boxShadow: '0 4px 20px rgba(0,122,255,0.3)',
                }}>
                  {num}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 8px' }}>{t(title)}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-4)', margin: 0, lineHeight: 1.6 }}>{t(desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <PricingSection isMobile={isMobile} onRegister={() => setShowAuth('register')} />

      {/* ── Testimonials / Trust ────────────────────────────── */}
      <section style={{
        padding: isMobile ? '60px 24px' : '80px 48px',
        background: 'rgba(var(--rgb-fg),0.02)',
        borderTop: '1px solid rgba(var(--rgb-fg),0.06)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 3, marginBottom: 20 }}>
            {[...Array(5)].map((_, i) => <Star key={i} size={18} style={{ color: '#FF9F0A', fill: '#FF9F0A' }} />)}
          </div>
          <blockquote style={{ fontSize: isMobile ? 20 : 26, fontWeight: 600, margin: '0 0 20px', lineHeight: 1.4, letterSpacing: '-0.3px' }}>
            "Endlich eine Bewerbungs-App die nicht aussieht wie aus den 90ern — und trotzdem in der Schweiz funktioniert."
          </blockquote>
          <div style={{ fontSize: 14, color: 'var(--text-4)' }}>{t('Zufriedener Nutzer aus Zürich')}</div>
        </div>
      </section>

      {/* ── Mobile Apps Teaser ──────────────────────────────── */}
      <section style={{
        padding: isMobile ? '80px 24px' : '100px 48px',
        background: 'linear-gradient(180deg, rgba(52,199,89,0.04) 0%, rgba(0,122,255,0.05) 100%)',
        borderTop: '1px solid rgba(var(--rgb-fg),0.06)',
        borderBottom: '1px solid rgba(var(--rgb-fg),0.06)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            fontSize: 12, fontWeight: 700, padding: '5px 14px', borderRadius: 99,
            background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)',
            color: '#34C759', marginBottom: 24, letterSpacing: '0.06em',
          }}>
            <Smartphone size={12} /> DEMNÄCHST VERFÜGBAR
          </div>

          <h2 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.8px' }}>
            {t('PATH kommt auf')}{' '}
            <span style={{
              background: 'linear-gradient(135deg, #34C759 0%, #007AFF 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {t('Android & iOS')}
            </span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-4)', margin: '0 auto 52px', maxWidth: 520, lineHeight: 1.65 }}>
            {t('Alle deine Bewerbungsunterlagen immer dabei — bearbeiten, exportieren und teilen, direkt vom Handy.')}
          </p>

          {/* Platform cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: 20, marginBottom: 40,
          }}>
            {/* Android */}
            <div style={{
              background: 'rgba(52,199,89,0.07)',
              border: '1px solid rgba(52,199,89,0.2)',
              borderRadius: 24, padding: isMobile ? 28 : 36,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              transition: 'background 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(52,199,89,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(52,199,89,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
              {/* Android icon */}
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AndroidIcon />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>{t('Android')}</div>
                <div style={{ fontSize: 14, color: 'var(--text-4)', lineHeight: 1.5 }}>{t('Google Play Store')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', textAlign: 'left' }}>
                {['Volle Offline-Unterstützung', 'Push-Erinnerungen für Deadlines', 'Native PDF-Speicherung'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)' }}>
                    <Check size={14} style={{ color: '#34C759', flexShrink: 0 }} /> {f}
                  </div>
                ))}
              </div>
              <div style={{
                width: '100%', padding: '12px 20px', borderRadius: 12, marginTop: 4,
                background: 'rgba(52,199,89,0.15)', border: '1px solid rgba(52,199,89,0.3)',
                fontSize: 14, fontWeight: 600, color: '#34C759', textAlign: 'center',
              }}>
                {t('Bald im Play Store')}
              </div>
            </div>

            {/* iOS */}
            <div style={{
              background: 'rgba(0,122,255,0.07)',
              border: '1px solid rgba(0,122,255,0.2)',
              borderRadius: 24, padding: isMobile ? 28 : 36,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
              transition: 'background 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,122,255,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(0,122,255,0.07)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}>
              {/* Apple icon */}
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <AppleIcon />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>iPhone & iPad</div>
                <div style={{ fontSize: 14, color: 'var(--text-4)', lineHeight: 1.5 }}>{t('Apple App Store')}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', textAlign: 'left' }}>
                {['Nahtlose iCloud-Synchronisation', 'Face ID & Touch ID Login', 'Apple Pencil Unterstützung'].map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-3)' }}>
                    <Check size={14} style={{ color: '#007AFF', flexShrink: 0 }} /> {f}
                  </div>
                ))}
              </div>
              <div style={{
                width: '100%', padding: '12px 20px', borderRadius: 12, marginTop: 4,
                background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.3)',
                fontSize: 14, fontWeight: 600, color: '#007AFF', textAlign: 'center',
              }}>
                {t('Bald im App Store')}
              </div>
            </div>
          </div>

          <p style={{ fontSize: 13, color: 'var(--text-4)', margin: 0 }}>
            {t('Web-App bereits jetzt kostenlos nutzbar — Apps folgen in Kürze.')}
          </p>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────── */}
      <section style={{
        padding: isMobile ? '80px 24px' : '100px 48px',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <h2 style={{ fontSize: isMobile ? 30 : 44, fontWeight: 800, margin: '0 0 20px', letterSpacing: '-1px', lineHeight: 1.1 }}>
            {t('Bereit für deine')}{' '}
            <span style={{
              background: 'linear-gradient(135deg, #007AFF, #34C759)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              {t('Traumstelle?')}
            </span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--text-3)', margin: '0 0 36px', lineHeight: 1.6 }}>
            {t('Erstelle in wenigen Minuten einen Lebenslauf, der überzeugt. Kostenlos, ohne Kreditkarte.')}
          </p>
          <button onClick={() => setShowAuth('register')} style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #007AFF, #5856D6)',
            border: 'none', borderRadius: 16, cursor: 'pointer',
            color: '#fff', fontSize: 18, fontWeight: 700,
            padding: '16px 36px',
            boxShadow: '0 8px 40px rgba(0,122,255,0.35)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 50px rgba(0,122,255,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,122,255,0.35)'; }}>
            Jetzt kostenlos starten <ChevronRight size={20} />
          </button>
          <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-4)' }}>
            Kein Abo nötig · Jederzeit kündbar · DSGVO-konform
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer style={{
        padding: isMobile ? '36px 24px' : '48px 48px',
        borderTop: '1px solid rgba(var(--rgb-fg),0.08)',
        background: 'rgba(0,0,0,0.2)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <LogoIcon size={24} />
            <span style={{ fontWeight: 700, fontSize: 15 }}>PATH</span>
            <span style={{ fontSize: 12, color: 'var(--text-4)' }}>by pixmatic</span>
          </div>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {[
              ['https://pixmatic.ch/datenschutz', 'Datenschutz'],
              ['https://pixmatic.ch/agb', 'AGB'],
              ['mailto:info@pixmatic.ch', 'Kontakt'],
            ].map(([href, label]) => (
              <button key={label} type="button" className="tap44" onClick={() => openExternal(href)}
                style={{ fontSize: 13, color: 'var(--text-3)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                {t(label)}
              </button>
            ))}
          </div>

          {/* Auf dem Telefon steht der Sprachumschalter hier statt in der Kopfzeile */}
          {isMobile && langPicker}

          <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
            © {new Date().getFullYear()} pixmatic. Alle Rechte vorbehalten.
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          50% { transform: translateY(-12px) rotate(-2deg); }
        }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
}

function PricingSection({ isMobile, onRegister }: { isMobile: boolean; onRegister: () => void }) {
  const t = useT();
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly');
  const isYearly = billing === 'yearly';

  return (
    <section id="pricing" style={{ padding: isMobile ? '80px 24px' : '100px 48px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h2 style={{ fontSize: isMobile ? 30 : 42, fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.8px' }}>
          {t('Transparent & fair')}
        </h2>
        <p style={{ fontSize: 17, color: 'var(--text-4)', margin: '0 0 28px', lineHeight: 1.6 }}>
          {t('Kostenlos starten, bei Bedarf upgraden. Jederzeit kündbar.')}
        </p>

        {/* Billing Toggle */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 0, background: 'rgba(var(--rgb-fg),0.06)', borderRadius: 12, padding: 4, border: '1px solid rgba(var(--rgb-fg),0.1)' }}>
          {(['monthly', 'yearly'] as const).map((b) => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              style={{
                padding: '8px 20px', borderRadius: 9, border: 'none', cursor: 'pointer',
                minHeight: 44,
                fontSize: 14, fontWeight: 600, transition: 'all 0.15s',
                background: billing === b ? 'rgba(0,122,255,0.85)' : 'transparent',
                color: billing === b ? '#fff' : 'var(--text-3)',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              {b === 'monthly' ? t('Monatlich') : (
                <>{t('Jährlich')} <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'rgba(52,199,89,0.3)', color: '#34C759', border: '1px solid rgba(52,199,89,0.4)' }}>−18%</span></>
              )}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 24, alignItems: 'start' }}>
        {/* Free */}
        <div style={{ background: 'rgba(var(--rgb-fg),0.04)', border: '1px solid rgba(var(--rgb-fg),0.1)', borderRadius: 24, padding: 36 }}>
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-4)', marginBottom: 8, letterSpacing: '0.06em' }}>KOSTENLOS</div>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1px' }}>CHF 0</div>
            <div style={{ fontSize: 14, color: 'var(--text-4)', marginTop: 4 }}>{t('Für immer kostenlos')}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
            {FREE_FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <Check size={15} style={{ color: 'var(--text-4)', flexShrink: 0 }} />
                <span style={{ color: 'var(--text-3)' }}>{t(f)}</span>
              </div>
            ))}
          </div>
          <button onClick={onRegister} style={{
            width: '100%', padding: '13px 20px', borderRadius: 12,
            background: 'rgba(var(--rgb-fg),0.08)', border: '1px solid rgba(var(--rgb-fg),0.15)',
            color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(var(--rgb-fg),0.13)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(var(--rgb-fg),0.08)')}>
            {t('Kostenlos starten')}
          </button>
        </div>

        {/* Pro */}
        <div style={{
          background: 'linear-gradient(160deg, rgba(0,122,255,0.12) 0%, rgba(88,86,214,0.1) 100%)',
          border: '1px solid rgba(0,122,255,0.35)',
          borderRadius: 24, padding: 36, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,122,255,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', top: 20, right: 20, fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 99, background: 'linear-gradient(135deg, #FF9F0A, #FF6B35)', color: '#fff', letterSpacing: '0.04em' }}>
            EMPFOHLEN
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Sparkles size={14} style={{ color: '#FF9F0A' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', letterSpacing: '0.06em' }}>PATH PRO</div>
            </div>

            {isYearly ? (
              <>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1px' }}>
                    CHF 49
                    <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-4)', letterSpacing: 0 }}> / Jahr</span>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--text-4)', textDecoration: 'line-through' }}>CHF 60</span>
                </div>
                <div style={{ fontSize: 14, color: '#34C759', marginTop: 4, fontWeight: 600 }}>
                  CHF 4.08 / Monat · 2 Monate gratis
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1px' }}>
                  CHF 5
                  <span style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-4)', letterSpacing: 0 }}> / Monat</span>
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-4)', marginTop: 4 }}>{t('Jederzeit kündbar')}</div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 11, marginBottom: 32 }}>
            {PRO_FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
                <Check size={15} style={{ color: '#34C759', flexShrink: 0 }} />
                <span>{t(f)}</span>
              </div>
            ))}
          </div>

          <button onClick={onRegister} style={{
            width: '100%', padding: '14px 20px', borderRadius: 12,
            background: 'linear-gradient(135deg, #007AFF, #5856D6)', border: 'none',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 6px 24px rgba(0,122,255,0.3)',
            transition: 'transform 0.2s, box-shadow 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(0,122,255,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,122,255,0.3)'; }}>
            <Sparkles size={15} /> {isYearly ? t('Jetzt starten — CHF 49 / Jahr') : t('Jetzt PATH Pro holen')}
          </button>

          <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text-4)' }}>
            Sichere Zahlung via Stripe · Keine versteckten Kosten
          </div>
        </div>
      </div>
    </section>
  );
}

function AndroidIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
      <path d="M17.6 9.48l1.84-3.18c.16-.31.04-.69-.26-.85a.64.64 0 0 0-.85.26l-1.86 3.22A9.96 9.96 0 0 0 12 8c-1.64 0-3.18.42-4.53 1.13L5.67 5.91a.64.64 0 0 0-.85-.26c-.3.16-.42.54-.26.85L6.4 9.48A9.96 9.96 0 0 0 2 18h20a9.96 9.96 0 0 0-4.4-8.52zM8.5 15.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm7 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" fill="#34C759"/>
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.37 2.83zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" fill="#007AFF"/>
    </svg>
  );
}

function MockAppPreview() {
  const t = useT();
  return (
    <div style={{ flex: '0 0 auto', width: 340, position: 'relative' }}>
      {/* Dezenter Glow im Hintergrund — passt zum reduzierten Look */}
      <div style={{
        position: 'absolute', inset: -32,
        background: 'radial-gradient(ellipse at center, rgba(0,122,255,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Main card — solide Calm-Surface */}
      <div style={{
        background: '#16161a',
        border: '1px solid rgba(var(--rgb-fg),0.06)',
        borderRadius: 22,
        padding: 24,
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        animation: 'float 5s ease-in-out infinite',
        position: 'relative', zIndex: 1,
      }}>
        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #34C759, #00C7BE)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{t('Max Mustermann')}</div>
            <div style={{ fontSize: 11, color: 'var(--text-4)' }}>{t('Softwareentwickler')}</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 10, padding: '3px 8px', borderRadius: 99, background: 'rgba(0,122,255,0.15)', border: '1px solid rgba(0,122,255,0.25)', color: 'var(--ios-blue)' }}>
            Modern
          </div>
        </div>

        {/* Progress/sections */}
        {[
          { label: 'Persönliche Daten', pct: 100, color: 'var(--ios-green)' },
          { label: 'Berufserfahrung', pct: 80, color: 'var(--ios-blue)' },
          { label: 'Ausbildung', pct: 100, color: 'var(--ios-green)' },
          { label: 'Fähigkeiten', pct: 60, color: 'var(--ios-amber)' },
          { label: 'Anschreiben', pct: 45, color: 'var(--ios-purple)' },
        ].map(({ label, pct, color }) => (
          <div key={label} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 5, color: 'var(--text-3)' }}>
              <span>{t(label)}</span>
              <span style={{ color }}>{pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(var(--rgb-fg),0.06)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, opacity: 0.85 }} />
            </div>
          </div>
        ))}

        {/* CTA in card */}
        <div style={{
          marginTop: 20, padding: '10px 14px', borderRadius: 12,
          background: 'linear-gradient(135deg, rgba(0,122,255,0.18), rgba(88,86,214,0.14))',
          border: '1px solid rgba(0,122,255,0.22)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} style={{ color: '#007AFF' }} />
            <span>PDF exportieren</span>
          </div>
          <ArrowRight size={14} style={{ color: 'var(--text-4)' }} />
        </div>
      </div>

      {/* Floating badge — solide statt blur */}
      <div style={{
        position: 'absolute', bottom: -16, right: -16,
        background: '#1a1a20',
        border: '1px solid rgba(255,159,10,0.3)',
        borderRadius: 14, padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 13, fontWeight: 600,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        zIndex: 2,
      }}>
        <Sparkles size={14} style={{ color: '#FF9F0A' }} />
        KI-Assistent aktiv
      </div>
    </div>
  );
}
