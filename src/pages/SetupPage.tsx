import { useState } from 'react';
import { Database, ExternalLink, CheckCircle, AlertCircle } from 'lucide-react';
import { saveSupabaseConfig, resetSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { validateSupabaseUrl, validateSupabaseKey } from '../lib/security';
import { useT } from '../lib/i18n';

export default function SetupPage() {
  const t = useT();
  const [url, setUrl] = useState(localStorage.getItem('aicv-supabase-url') || '');
  const [key, setKey] = useState(localStorage.getItem('aicv-supabase-key') || '');
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState('');
  const { initialize } = useAuthStore();

  async function handleSave() {
    setValidationError('');
    if (!validateSupabaseUrl(url)) {
      setValidationError(t('Ungültige URL. Format: https://xxx.supabase.co'));
      return;
    }
    if (!validateSupabaseKey(key)) {
      setValidationError(t('Ungültiger API-Key. Muss mit "eyJ" beginnen.'));
      return;
    }
    saveSupabaseConfig(url.trim(), key.trim());
    resetSupabaseClient();
    await initialize();
    setSaved(true);
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div className="glass-card animate-scale-in" style={{ width: '100%', maxWidth: 500, padding: 36 }}>
        {/* Icon */}
        <div style={{
          width: 56, height: 56, borderRadius: 16, margin: '0 auto 20px',
          background: 'linear-gradient(135deg, var(--ios-blue), var(--ios-indigo))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 24px rgba(0,122,255,0.4)',
        }}>
          <Database size={26} color="#fff" />
        </div>

        <h1 style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.4px' }}>
          {t('Supabase konfigurieren')}
        </h1>
        <p style={{ textAlign: 'center', color: 'var(--text-4)', fontSize: 14, marginBottom: 28, lineHeight: 1.5 }}>
          {t('Verbinden Sie Ihr eigenes Supabase-Projekt für sichere Cloud-Synchronisation.')}
        </p>

        {/* Instructions */}
        <div className="glass-card" style={{ padding: '12px 16px', marginBottom: 24, borderRadius: 'var(--radius-sm)' }}>
          <div className="section-label" style={{ marginBottom: 8 }}>{t('So richten Sie Supabase ein')}</div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-3)', lineHeight: 2 }}>
            <li>{t('Kostenloses Konto auf supabase.com erstellen')} (<a href="https://supabase.com" target="_blank" rel="noreferrer" style={{ color: 'var(--ios-blue)' }}>supabase.com</a>)</li>
            <li>{t('Neues Projekt anlegen')}</li>
            <li>{t('SQL Editor → schema.sql ausführen')} — <code style={{ background: 'rgba(var(--rgb-fg),0.1)', padding: '1px 5px', borderRadius: 4 }}>supabase/schema.sql</code></li>
            <li>{t('Settings → API → URL & anon key kopieren')}</li>
          </ol>
          <a
            href="https://supabase.com/dashboard"
            target="_blank" rel="noreferrer"
            className="btn-glass btn-sm"
            style={{ marginTop: 10, display: 'inline-flex', fontSize: 12 }}
          >
            <ExternalLink size={12} /> {t('Supabase Dashboard öffnen')}
          </a>
        </div>

        {/* Form */}
        <div style={{ marginBottom: 12 }}>
          <label className="section-label">{t('Project URL')}</label>
          <input
            className="input-glass"
            placeholder="https://xxxxxxxxxxxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label className="section-label">{t('anon / public Key')}</label>
          <input
            className="input-glass"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            value={key}
            onChange={(e) => setKey(e.target.value)}
            type="password"
          />
        </div>

        {validationError && (
          <div style={{
            background: 'rgba(255,59,48,0.15)', border: '1px solid rgba(255,59,48,0.3)',
            borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: 'var(--ios-red)', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <AlertCircle size={14} /> {validationError}
          </div>
        )}

        <button
          className={`btn-glass btn-primary ${saved ? 'btn-success' : ''}`}
          onClick={handleSave}
          disabled={!url.trim() || !key.trim() || saved}
          style={{ width: '100%', justifyContent: 'center', padding: '13px 20px' }}
        >
          {saved
            ? <><CheckCircle size={16} /> {t('Gespeichert – Seite wird neu geladen…')}</>
            : t('Verbindung herstellen')
          }
        </button>

        {isSupabaseConfigured() && (
          <button
            className="btn-glass btn-sm"
            onClick={() => window.location.reload()}
            style={{ width: '100%', justifyContent: 'center', marginTop: 10 }}
          >
            {t('Überspringen (bereits konfiguriert)')}
          </button>
        )}
      </div>
    </div>
  );
}
