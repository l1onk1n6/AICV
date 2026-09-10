import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import type { Resume } from '../types/resume';
import { fetchSharedResume } from '../lib/db';
import { buildMappePdfBytes } from '../lib/pdfRenderer';
import PdfPreview from '../components/ui/PdfPreview';
import { useT } from '../lib/i18n';

export default function SharedResumePage() {
  const t = useT();
  const [params] = useSearchParams();
  const token = params.get('t');
  const [resume, setResume] = useState<Resume | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildError, setBuildError] = useState<string | null>(null);

  // Async-Fetch der Resume-Daten — setState auf Start/Resolve ist nötig.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!token) { setLoading(false); setNotFound(true); return; }
    fetchSharedResume(token).then((r) => {
      if (r) setResume(r);
      else setNotFound(true);
      setLoading(false);
    });
  }, [token]);

  // Ganze Mappe (Anschreiben + CV + Anlagen) als PDF rendern
  useEffect(() => {
    if (!resume) return;
    let cancelled = false;
    setBuilding(true);
    setBuildError(null);
    (async () => {
      try {
        const bytes = await buildMappePdfBytes(resume);
        if (cancelled) return;
        setPdfBytes(bytes);
      } catch (err) {
        console.error('Shared preview build failed:', err);
        if (!cancelled) setBuildError(t('Die Mappe konnte nicht gerendert werden. Bitte lade die Seite neu.'));
      } finally {
        if (!cancelled) setBuilding(false);
      }
    })();
    return () => { cancelled = true; };
  }, [resume]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
        <Loader2 data-motion="essential" size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--ios-blue)' }} />
        <span style={{ fontSize: 14, color: 'var(--text-4)' }}>{t('Bewerbungsmappe wird geladen…')}</span>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (notFound || !resume) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 24, textAlign: 'center' }}>
        <AlertCircle size={40} style={{ opacity: 0.4 }} />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{t('Bewerbungsmappe nicht gefunden')}</h2>
        <p style={{ color: 'var(--text-4)', fontSize: 14, maxWidth: 320 }}>
          {t('Dieser Link ist ungültig oder wurde deaktiviert.')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#333' }}>
      {/* Kein Header / Footer — HR soll die Mappe im Vollbild sehen, ohne Ablenkung */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        <PdfPreview bytes={pdfBytes} building={building} error={buildError} />
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
