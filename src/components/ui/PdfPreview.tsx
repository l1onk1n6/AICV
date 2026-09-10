/**
 * PDF-Vorschau mit Viewport-abhaengigem Renderer.
 *
 * - Desktop: iframe mit application/pdf-Blob. Nutzt den nativen Browser-
 *   PDF-Viewer (Scrollen, Zoomen, Download, Such-Funktion out-of-the-box).
 * - Mobile: pdf.js rendert jede Seite als <canvas>. Chrome auf Android
 *   zeigt Blob-iframes sonst nur als grauen Screen.
 */
import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
// Vite bundlet den Worker automatisch und gibt die finale URL.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useIsMobile } from '../../hooks/useBreakpoint';
import { useT } from '../../lib/i18n';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
  /** PDF-Bytes. `null` bedeutet "noch nicht bereit". */
  bytes: Uint8Array | null;
  /** Zusaetzlicher State fuer externen Build-Status (z. B. beim Rebuild). */
  building?: boolean;
  /** Fehlermeldung vom Aufrufer (z. B. Build-Fehler). */
  error?: string | null;
}

export default function PdfPreview({ bytes, building, error }: Props) {
  const _t = useT(); void _t;
  const isMobile = useIsMobile();
  return isMobile
    ? <MobileCanvasPreview bytes={bytes} building={building} error={error} />
    : <DesktopIframePreview bytes={bytes} building={building} error={error} />;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Desktop: nativer PDF-Viewer via iframe
// ─────────────────────────────────────────────────────────────────────────────

function DesktopIframePreview({ bytes, building, error }: Props) {
  const t = useT();
  const [url, setUrl] = useState<string | null>(null);
  const currentUrlRef = useRef<string | null>(null);

  // Effect: Blob-URL erzeugen + alte freigeben — Side-Effect, setState ist nötig.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!bytes) return;
    const blob = new Blob([bytes as BlobPart], { type: 'application/pdf' });
    const nextUrl = URL.createObjectURL(blob);
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    currentUrlRef.current = nextUrl;
    setUrl(nextUrl);
  }, [bytes]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => () => {
    if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#555' }}>
      {error ? (
        <ErrorOverlay message={error} />
      ) : url ? (
        <iframe
          title={t("Vorschau")}
          // #toolbar=0&navpanes=0 blendet Chromes eigene Werkzeugleiste und die
          // Seitenleiste aus. Am 10.09. an Chrome 152 nachgemessen, weil offen
          // war, ob das an einer Blob-URL ueberhaupt beachtet wird: es wird.
          // Belege: data/path-ui-rest/pdf/blob-{ohne,mit}-fragment.png im
          // Jarvis-Workspace. Ohne das Fragment stand die dunkle Leiste samt
          // Zufalls-ID des Blobs als Dateiname in der hellen Oberflaeche.
          src={`${url}#toolbar=0&navpanes=0`}
          style={{ width: '100%', height: '100%', border: 'none', background: '#555' }}
        />
      ) : (
        <SpinnerOverlay label={building ? t('Vorschau wird aufgebaut…') : undefined} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mobile: pdf.js Canvas-Rendering
// ─────────────────────────────────────────────────────────────────────────────

function MobileCanvasPreview({ bytes, building, error }: Props) {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (!bytes) return;
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    setLoading(true);
    setRenderError(null);

    (async () => {
      try {
        // bytes kopieren — pdf.js transferiert das ArrayBuffer sonst in den
        // Worker, und ein spaeterer Render wirft "Detached ArrayBuffer".
        const copy = new Uint8Array(bytes);
        const doc = await pdfjsLib.getDocument({ data: copy }).promise;
        // pdf.js 6 hat PDFDocumentProxy.destroy() entfernt — der Abbruch laeuft
        // jetzt ueber den LoadingTask (identische Wirkung, war vorher nur ein Alias).
        if (cancelled) { doc.loadingTask.destroy(); return; }

        container.innerHTML = '';
        setPageCount(doc.numPages);

        // DPR begrenzen — hoeher als 2 bringt fuer Bildschirm-Vorschau nichts
        // und killt auf schwachen Handys den Speicher.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const containerWidth = container.clientWidth || 600;

        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) break;
          const page = await doc.getPage(i);
          const viewport0 = page.getViewport({ scale: 1 });
          const scale = (containerWidth - 16) / viewport0.width;
          const viewport = page.getViewport({ scale: scale * dpr });

          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = `${viewport.width / dpr}px`;
          canvas.style.height = `${viewport.height / dpr}px`;
          canvas.style.display = 'block';
          canvas.style.margin = i === 1 ? '8px auto' : '12px auto';
          canvas.style.boxShadow = '0 4px 16px rgba(0,0,0,0.4)';
          canvas.style.background = '#fff';
          canvas.style.maxWidth = '100%';
          container.appendChild(canvas);

          const ctx = canvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        }

        await doc.cleanup();
      } catch (err) {
        console.error('PdfPreview render failed:', err);
        if (!cancelled) setRenderError(t('Die Vorschau konnte nicht geladen werden.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [bytes]);

  const showSpinner = (loading || building) && !error && !renderError;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'auto', background: '#555' }}>
      <div ref={containerRef} style={{ minHeight: '100%', paddingBottom: 12 }} />
      {showSpinner && pageCount === 0 && (
        <SpinnerOverlay label="Vorschau wird geladen…" />
      )}
      {(error || renderError) && (
        <ErrorOverlay message={error || renderError || ''} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Shared overlays
// ─────────────────────────────────────────────────────────────────────────────

function SpinnerOverlay({ label }: { label?: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'rgba(255,255,255,0.85)', pointerEvents: 'none' }}>
      <Loader2 size={22} data-motion="essential" style={{ animation: 'spin 1s linear infinite' }} />
      {label ? <span style={{ fontSize: 13 }}>{label}</span> : null}
    </div>
  );
}

function ErrorOverlay({ message }: { message: string }) {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
      <div style={{ maxWidth: 360, color: 'rgba(255,255,255,0.92)' }}>
        <AlertCircle size={28} style={{ opacity: 0.7, marginBottom: 10 }} />
        <p style={{ fontSize: 13, lineHeight: 1.5 }}>{message}</p>
      </div>
    </div>
  );
}
