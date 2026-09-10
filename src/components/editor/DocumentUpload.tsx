import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, Trash2, FileText, Image, ExternalLink, AlertCircle, Loader2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { usePlan } from '../../lib/plan';
import { useIsMobile } from '../../hooks/useIsMobile';
import type { UploadedDocument } from '../../types/resume';
import { useT } from '../../lib/i18n';

const CATEGORIES: { value: UploadedDocument['category']; label: string }[] = [
  { value: 'certificate', label: 'Zertifikat' },
  { value: 'reference', label: 'Referenz' },
  { value: 'portfolio', label: 'Portfolio' },
  { value: 'other', label: 'Sonstiges' },
];

function FileIcon({ type }: { type: string }) {
  if (type.startsWith('image/')) return <Image size={18} />;
  return <FileText size={18} />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MAX_FILE_MB = 10;
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export default function DocumentUpload() {
  const t = useT();
  const { getActiveResume, uploadDocument, removeDocument, updateDocumentCategory, reorderDocuments, resumes } = useResumeStore();
  const resume = getActiveResume();
  const { limits } = usePlan();
  const isMobile = useIsMobile();
  const [sizeError, setSizeError] = useState('');
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);

  // Total used across ALL resumes (documents are per-user, not per-resume)
  const totalUsedBytes = resumes.reduce((sum, r) =>
    sum + r.documents.reduce((s, d) => s + d.size, 0), 0);
  const totalLimitBytes = limits.documentsMb * 1024 * 1024;

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!resume) return;
    setSizeError('');

    const newBytes = acceptedFiles.reduce((s, f) => s + f.size, 0);
    if (totalUsedBytes + newBytes > totalLimitBytes) {
      const remaining = Math.max(0, totalLimitBytes - totalUsedBytes);
      setSizeError(
        `Speicher voll — noch ${formatBytes(remaining)} von ${limits.documentsMb} MB verfügbar.`
      );
      return;
    }

    setUploadingCount(c => c + acceptedFiles.length);
    for (const file of acceptedFiles) {
      const res = await uploadDocument(resume.id, file, 'other');
      if (!res.ok) setSizeError(res.error ?? t('Upload fehlgeschlagen'));
    }
    setUploadingCount(c => Math.max(0, c - acceptedFiles.length));
  }, [resume, uploadDocument, totalUsedBytes, totalLimitBytes, limits.documentsMb]);

  const onDropRejected = useCallback((rejections: { file: File }[]) => {
    const tooBig = rejections.some(r => r.file.size > MAX_FILE_BYTES);
    if (tooBig) setSizeError(`Datei zu gross — max. ${MAX_FILE_MB} MB pro Datei erlaubt.`);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    multiple: true,
    maxSize: MAX_FILE_BYTES,
  });

  if (!resume) return null;

  const { documents } = resume;
  const storageFullPct = totalUsedBytes / totalLimitBytes;
  const storageFull = totalUsedBytes >= totalLimitBytes;

  function updateCategory(docId: string, category: UploadedDocument['category']) {
    if (!resume) return;
    updateDocumentCategory(resume.id, docId, category);
  }

  return (
    <div className="animate-fade-in">
      {/* Storage bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-4)', marginBottom: 5 }}>
          <span>{t('Speicher')}</span>
          <span style={{ color: storageFullPct >= 1 ? 'var(--ios-red)' : storageFullPct >= 0.8 ? 'var(--ios-amber)' : 'var(--text-4)' }}>
            {formatBytes(totalUsedBytes)} / {limits.documentsMb} MB
          </span>
        </div>
        <div style={{ height: 3, borderRadius: 2, background: 'rgba(var(--rgb-fg),0.08)' }}>
          <div style={{
            height: '100%',
            width: `${Math.min(100, storageFullPct * 100)}%`,
            borderRadius: 2,
            background: storageFullPct >= 1 ? 'var(--ios-red)' : storageFullPct >= 0.8 ? '#FF9F0A' : 'var(--ios-green)',
            transition: 'width 0.3s',
          }} />
        </div>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`dropzone ${isDragActive ? 'active' : ''} ${storageFull ? 'disabled' : ''}`}
        style={{ marginBottom: 20, opacity: storageFull ? 0.45 : 1, pointerEvents: storageFull ? 'none' : undefined }}
      >
        <input {...getInputProps()} />
        {uploadingCount > 0 ? (
          <Loader2 data-motion="essential" size={28} style={{ margin: '0 auto 10px', display: 'block', animation: 'spin 1s linear infinite', color: 'var(--ios-blue)' }} />
        ) : (
          <Upload size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: isDragActive ? 1 : 0.5 }} />
        )}
        <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 4 }}>
          {uploadingCount > 0
            ? (uploadingCount === 1 ? t('Lädt {n} Datei hoch…') : t('Lädt {n} Dateien hoch…')).replace('{n}', String(uploadingCount))
            : storageFull ? t('Speicher voll') : isDragActive ? t('Dateien hier ablegen...') : t('Dokumente hochladen')}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-4)' }}>
          {storageFull
            ? `Limit von ${limits.documentsMb} MB erreicht — Dateien löschen um Platz zu schaffen`
            : `Dateien hierher ziehen oder klicken · PDF, Bilder, Word · max. ${MAX_FILE_MB} MB`}
        </div>
      </div>

      {sizeError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ios-red)', marginBottom: 12 }}>
          <AlertCircle size={14} /> {sizeError}
        </div>
      )}

      {/* Uploaded files */}
      {documents.length === 0 && (
        <div style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-4)', fontSize: 12, borderTop: '1px dashed rgba(var(--rgb-fg),0.08)', marginTop: 4 }}>
          <File size={18} style={{ marginBottom: 4, opacity: 0.4, display: 'block', margin: '0 auto 4px' }} />
          Keine Dokumente hochgeladen — zieh Dateien in die Dropzone oben.
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.map((doc, i) => (
          <div
            key={doc.id}
            className="glass-card animate-scale-in"
            draggable={!isMobile}
            onDragStart={!isMobile ? () => setDragging(i) : undefined}
            onDragOver={!isMobile ? (e) => { e.preventDefault(); setDragOver(i); } : undefined}
            onDrop={!isMobile ? () => { if (dragging !== null && dragging !== i) reorderDocuments(resume.id, dragging, i); setDragging(null); setDragOver(null); } : undefined}
            onDragEnd={!isMobile ? () => { setDragging(null); setDragOver(null); } : undefined}
            style={{
              padding: '12px 16px',
              opacity: dragging === i ? 0.5 : 1,
              border: dragOver === i && dragging !== i ? '1px solid rgba(0,122,255,0.6)' : undefined,
              transition: 'opacity 0.15s, border 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button className="btn-glass btn-icon" disabled={i === 0} onClick={() => reorderDocuments(resume.id, i, i - 1)}
                    style={{ padding: 3, opacity: i === 0 ? 0.2 : 0.6, boxShadow: 'none', background: 'transparent', border: 'none' }}>
                    <ChevronUp size={14} />
                  </button>
                  <button className="btn-glass btn-icon" disabled={i === documents.length - 1} onClick={() => reorderDocuments(resume.id, i, i + 1)}
                    style={{ padding: 3, opacity: i === documents.length - 1 ? 0.2 : 0.6, boxShadow: 'none', background: 'transparent', border: 'none' }}>
                    <ChevronDown size={14} />
                  </button>
                </div>
              ) : (
                <GripVertical size={14} style={{ opacity: 0.3, flexShrink: 0, cursor: 'grab' }} />
              )}
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(0,122,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, color: 'var(--ios-blue)',
              }}>
                <FileIcon type={doc.type} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                  {formatBytes(doc.size)} · {new Date(doc.uploadedAt).toLocaleDateString('de-DE')}
                </div>
              </div>

              <select
                className="input-glass"
                value={doc.category}
                onChange={(e) => updateCategory(doc.id, e.target.value as UploadedDocument['category'])}
                style={{ width: 120, fontSize: 12, padding: '6px 8px' }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>{t(cat.label)}</option>
                ))}
              </select>

              <a
                href={doc.dataUrl}
                download={doc.name}
                className="btn-glass btn-sm btn-icon"
                style={{ padding: 7, display: 'flex', alignItems: 'center' }}
                title={t("Herunterladen")}
              >
                <ExternalLink size={14} />
              </a>

              <button
                className="btn-glass btn-danger btn-icon"
                onClick={() => removeDocument(resume.id, doc.id)}
                style={{ padding: 7 }}
                title={t("Entfernen")}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Used MB info across all resumes */}
      {resumes.length > 1 && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--text-4)', textAlign: 'center' }}>
          Speicher gilt für alle {resumes.length} Mappen zusammen
        </div>
      )}
    </div>
  );
}
