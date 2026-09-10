import { useNavigate } from 'react-router-dom';
import { AlertCircle, Download, Loader2, Layers, X, FolderDown, Lock, ChevronDown, FileText, FileEdit, Share2, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useResumeStore } from '../store/resumeStore';
import ProGate from '../components/ui/ProGate';
import { TEMPLATES } from '../components/templates/templateConfig';
import { useIsMobile } from '../hooks/useBreakpoint';
import { usePlan, FREE_TEMPLATE_IDS } from '../lib/plan';
import { canExportPdf, incrementPdfExport, getPdfExportCount, savePdf } from '../lib/pdfExports';
import { renderResumePdf, renderCoverLetterPdf, buildMappePdfBytes } from '../lib/pdfRenderer';
import ShareModal from '../components/ui/ShareModal';
import PdfPreview from '../components/ui/PdfPreview';
import { userError } from '../lib/userError';
import type { Resume } from '../types/resume';
import { useT } from '../lib/i18n';

function buildFilename(resume: Resume): string {
  const first = resume.personalInfo.firstName || '';
  const last = resume.personalInfo.lastName || '';
  const name = [first, last].filter(Boolean).join('_') || 'Bewerbung';
  return `${name}_Bewerbungsmappe.pdf`;
}

export default function Preview() {
  const t = useT();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { getActiveResume, setTemplate } = useResumeStore();
  const { limits, isPro } = usePlan();
  const resume = getActiveResume();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [downloadMenuOpen, setDownloadMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // Live-Vorschau: baut bei jeder Template- oder Resume-Aenderung die komplette
  // Mappe als PDF-Bytes und rendert sie via pdf.js in <canvas>. Chrome-Mobile
  // zeigt PDF-Blobs im iframe nur als grauen Screen — Canvas-Rendering
  // funktioniert ueberall.
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null);
  const [previewBuilding, setPreviewBuilding] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  // Key-String, der sich nur bei sichtbaren Aenderungen aendert. Verhindert,
  // dass innere React-State-Updates (z. B. Template-Picker-Open) das PDF
  // unnoetig neu bauen.
  // WICHTIG: Alle Felder rein, die in irgendeinem PDF-Template sichtbar
  // werden — sonst bleibt die Vorschau stale (z. B. Doc-Category-Label
  // wird gerendert, also muss eine Aenderung den Rebuild ausloesen).
  const pdfKey = resume ? JSON.stringify({
    t: resume.templateId, c: resume.accentColor,
    pi: resume.personalInfo, w: resume.workExperience, e: resume.education,
    s: resume.skills, l: resume.languages, p: resume.projects, cert: resume.certificates,
    cl: resume.coverLetter, cs: resume.customSections,
    docs: resume.documents?.map(d => `${d.id}|${d.category}|${d.name}|${d.size}|${d.uploadedAt}`),
  }) : '';

  // Async PDF-Build — setState auf Start/Error/Done ist hier korrekt.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!resume) return;
    let cancelled = false;
    setPreviewBuilding(true);
    setPreviewError(null);
    (async () => {
      try {
        const bytes = await buildMappePdfBytes(resume);
        if (cancelled) return;
        setPreviewBytes(bytes);
      } catch (err) {
        console.error('Preview PDF build failed:', err);
        if (!cancelled) setPreviewError(userError('Die Vorschau konnte nicht aufgebaut werden', err));
      } finally {
        if (!cancelled) setPreviewBuilding(false);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!resume) {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '48px 32px', textAlign: 'center', margin: 'auto' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>{t('Kein Lebenslauf ausgewählt')}</h3>
        <button className="btn-glass btn-primary" onClick={() => navigate('/')}>{t('Zum Dashboard')}</button>
      </div>
    );
  }

  // Export: Lebenslauf-Einzel-PDF.
  const handleExport = async () => {
    if (exporting) return;
    if (!canExportPdf(limits.pdfExportsPerMonth)) {
      setExportError(`PDF-Export-Limit erreicht (${limits.pdfExportsPerMonth}/Monat). Upgrade auf Pro für mehr Exporte.`);
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const first = resume.personalInfo.firstName || 'Lebenslauf';
      const last = resume.personalInfo.lastName ? '_' + resume.personalInfo.lastName : '';
      const bytes = await renderResumePdf(resume);
      await savePdf(bytes, `${first}${last}_CV.pdf`);
      await incrementPdfExport();
    } catch (err) {
      setExportError(userError('Der PDF-Export hat nicht funktioniert', err));
    } finally { setExporting(false); }
  };

  // Export: nur Anschreiben.
  const handleExportCoverLetter = async () => {
    if (exporting) return;
    if (!canExportPdf(limits.pdfExportsPerMonth)) {
      setExportError(`PDF-Export-Limit erreicht (${limits.pdfExportsPerMonth}/Monat). Upgrade auf Pro für mehr Exporte.`);
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const first = resume.personalInfo.firstName || 'Anschreiben';
      const last = resume.personalInfo.lastName ? '_' + resume.personalInfo.lastName : '';
      const bytes = await renderCoverLetterPdf(resume);
      await savePdf(bytes, `${first}${last}_Anschreiben.pdf`);
      await incrementPdfExport();
    } catch (err) {
      setExportError(userError('Der Anschreiben-Export hat nicht funktioniert', err));
    } finally { setExporting(false); }
  };

  // Export: komplette Bewerbungsmappe (Anschreiben + Lebenslauf + Dokumente).
  const handleExportMappe = async () => {
    if (exporting) return;
    if (!canExportPdf(limits.pdfExportsPerMonth)) {
      setExportError(`PDF-Export-Limit erreicht (${limits.pdfExportsPerMonth}/Monat). Upgrade auf Pro für mehr Exporte.`);
      return;
    }
    setExporting(true);
    setExportError(null);
    try {
      const bytes = await buildMappePdfBytes(resume);
      await savePdf(bytes, buildFilename(resume));
      await incrementPdfExport();
    } catch (err) {
      setExportError(userError('Der Mappen-Export hat nicht funktioniert', err));
    } finally { setExporting(false); }
  };

  const templatePicker = (
    <>
      {TEMPLATES.map((tmpl) => {
        const isSelected = resume.templateId === tmpl.id;
        const isFreeTemplate = (FREE_TEMPLATE_IDS as readonly string[]).includes(tmpl.id);
        const locked = !isPro && !isFreeTemplate;

        const card = (
          <div
            className="glass-card"
            style={{
              padding: 10,
              border: isSelected ? `2px solid ${resume.accentColor}` : '1px solid rgba(var(--rgb-fg),0.12)',
              background: isSelected ? `${resume.accentColor}1a` : undefined,
              opacity: locked ? 0.55 : 1,
              position: 'relative',
            }}
          >
            <div style={{ height: 40, borderRadius: 6, background: tmpl.preview, marginBottom: 6 }} />
            <div style={{ fontSize: 11, fontWeight: isSelected ? 700 : 500, textAlign: 'left', display: 'flex', alignItems: 'center', gap: 4 }}>
              {tmpl.name}
              {locked && <span style={{ fontSize: 8, fontWeight: 800, padding: '1px 4px', borderRadius: 3, background: 'linear-gradient(135deg, #FF9F0A, #FF375F)', color: '#1c1c1e' }}>PRO</span>}
            </div>
            {isSelected && (
              <div style={{
                position: 'absolute', top: 6, right: 6,
                width: 18, height: 18, borderRadius: '50%',
                background: resume.accentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Check size={12} color="#fff" strokeWidth={3} />
              </div>
            )}
          </div>
        );

        if (locked) {
          return (
            <ProGate key={tmpl.id} featureId="templates">
              {card}
            </ProGate>
          );
        }

        return (
          <button
            key={tmpl.id}
            onClick={() => { setTemplate(resume.id, tmpl.id); if (isMobile) setTemplatePickerOpen(false); }}
            style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 6 }}
          >
            {card}
          </button>
        );
      })}
    </>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 16, height: '100%', overflow: 'hidden', position: 'relative' }}>
      {/* Desktop: Template-Sidebar */}
      {!isMobile && (
        <aside style={{ width: 160, flexShrink: 0, overflow: 'auto' }}>
          <div className="section-label" style={{ marginBottom: 8 }}>{t('Templates')}</div>
          {templatePicker}
        </aside>
      )}

      {/* Vorschau-Bereich */}
      <div className="glass" style={{ flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '8px 12px' : '10px 16px',
          borderBottom: '1px solid rgba(var(--rgb-fg),0.1)', flexShrink: 0, gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && (
              <button
                className="btn-glass btn-sm btn-icon"
                onClick={() => setTemplatePickerOpen(true)}
                style={{ padding: 9 }}
                title={t("Templates")}
              >
                <Layers size={18} />
              </button>
            )}
            {previewBuilding && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-4)' }}>
                <Loader2 data-motion="essential" size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Vorschau aktualisieren…
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center', position: 'relative' }}>
            {!isMobile && limits.pdfExportsPerMonth !== Infinity && (
              <span style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap' }}>
                {getPdfExportCount()}/{limits.pdfExportsPerMonth} PDF
              </span>
            )}
            {/* Share-Button — oeffentlicher Link */}
            <button
              className="btn-glass btn-sm"
              onClick={() => setShareOpen(true)}
              title={resume.shareToken ? 'Teil-Link aktiv — Klicken zum Verwalten' : 'Oeffentlichen Link teilen'}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px',
                color: resume.shareToken ? 'var(--ios-blue)' : undefined,
                borderColor: resume.shareToken ? 'rgba(0,122,255,0.4)' : undefined,
              }}
            >
              <Share2 size={16} />{!isMobile && ' Teilen'}
            </button>
            {/* Download Split-Button: primaere Aktion = ganze Mappe, Chevron oeffnet die Optionen */}
            <button
              className="btn-glass btn-primary btn-sm"
              onClick={handleExportMappe}
              disabled={exporting}
              title={t("Ganze Mappe herunterladen")}
              style={{ opacity: exporting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px' }}
            >
              {exporting
                ? <Loader2 data-motion="essential" size={16} style={{ animation: 'spin 1s linear infinite' }} />
                : <Download size={16} />
              }
              {!isMobile && ' Download'}
            </button>
            <button
              className="btn-glass btn-primary btn-sm"
              onClick={() => setDownloadMenuOpen(v => !v)}
              disabled={exporting}
              title={t("Weitere Download-Optionen")}
              aria-label={t("Weitere Download-Optionen")}
              style={{ padding: '7px 8px' }}
            >
              <ChevronDown size={14} style={{ transform: downloadMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>

            {downloadMenuOpen && (
              <>
                <div onClick={() => setDownloadMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                  minWidth: 220, padding: 6,
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(var(--rgb-fg),0.12)',
                  borderRadius: 'var(--radius-sm)',
                  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                }}>
                  <button className="btn-glass"
                    onClick={() => { setDownloadMenuOpen(false); handleExportMappe(); }}
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', gap: 8, marginBottom: 2, boxShadow: 'none', background: 'transparent', border: '1px solid transparent' }}>
                    <FolderDown size={14} style={{ opacity: 0.7 }} />
                    <span style={{ fontSize: 13 }}>{t('Ganze Mappe')}</span>
                  </button>
                  <button className="btn-glass"
                    onClick={() => { setDownloadMenuOpen(false); handleExport(); }}
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', gap: 8, marginBottom: 2, boxShadow: 'none', background: 'transparent', border: '1px solid transparent' }}>
                    <FileText size={14} style={{ opacity: 0.7 }} />
                    <span style={{ fontSize: 13 }}>{t('Nur Lebenslauf')}</span>
                  </button>
                  <button className="btn-glass"
                    onClick={() => { setDownloadMenuOpen(false); handleExportCoverLetter(); }}
                    style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', gap: 8, marginBottom: 2, boxShadow: 'none', background: 'transparent', border: '1px solid transparent' }}>
                    <FileEdit size={14} style={{ opacity: 0.7 }} />
                    <span style={{ fontSize: 13 }}>{t('Nur Motivationsschreiben')}</span>
                  </button>
                  <div style={{ height: 1, background: 'rgba(var(--rgb-fg),0.08)', margin: '4px 0' }} />
                  <ProGate featureId="password" badge>
                    <button className="btn-glass"
                      onClick={() => { setDownloadMenuOpen(false); /* Pro-Feature, handler kommt noch */ }}
                      style={{ width: '100%', justifyContent: 'flex-start', padding: '8px 10px', gap: 8, boxShadow: 'none', background: 'transparent', border: '1px solid transparent' }}>
                      <Lock size={14} style={{ opacity: 0.7 }} />
                      <span style={{ fontSize: 13 }}>{t('Mit Passwort…')}</span>
                    </button>
                  </ProGate>
                </div>
              </>
            )}
          </div>
        </div>

        {/* PDF-Vorschau (Canvas via pdf.js) */}
        <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
          <PdfPreview bytes={previewBytes} building={previewBuilding} error={previewError} />
        </div>
      </div>

      {/* Mobile: Template-Picker-Modal */}
      {isMobile && templatePickerOpen && (
        <>
          <div
            onClick={() => setTemplatePickerOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, backdropFilter: 'blur(4px)' }}
          />
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 51,
            maxHeight: '70vh', display: 'flex', flexDirection: 'column',
          }}>
            <div className="glass" style={{ borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0', overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 12px', flexShrink: 0, borderBottom: '1px solid rgba(var(--rgb-fg),0.1)' }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>{t('Templates')}</span>
                <button className="btn-glass btn-icon btn-sm" onClick={() => setTemplatePickerOpen(false)} style={{ padding: 6 }}>
                  <X size={16} />
                </button>
              </div>
              <div style={{ overflowY: 'auto', padding: '12px 16px 24px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {templatePicker}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export-Fehler-Toast */}
      {exportError && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 300, padding: '12px 20px', borderRadius: 12,
          background: 'rgba(255,59,48,0.95)', backdropFilter: 'blur(12px)',
          color: '#fff', fontSize: 13, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          maxWidth: '90vw',
        }}>
          <span>{exportError}</span>
          <button onClick={() => setExportError(null)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.7, padding: 2 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {shareOpen && (
        <ShareModal resumeId={resume.id} token={resume.shareToken} onClose={() => setShareOpen(false)} />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
