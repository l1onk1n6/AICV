import { X, Plus, Minus, Pencil } from 'lucide-react';
import type { Resume } from '../../types/resume';
import type { ResumeVersion } from '../../lib/versions';
import { computeDiff } from '../../lib/versionDiff';
import { useT } from '../../lib/i18n';

interface Props {
  version: ResumeVersion;
  current: Resume;
  onClose: () => void;
}

function truncate(s: string, max = 80): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}

export default function VersionDiffModal({ version, current, onClose }: Props) {
  const t = useT();
  const diff = computeDiff(version.snapshot as Resume, current);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass-card animate-scale-in"
        style={{
          width: '100%', maxWidth: 560,
          maxHeight: 'calc(100dvh - 80px)',
          padding: 0, display: 'flex', flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{t('Änderungen seit dieser Version')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
              {version.label || new Date(version.created_at).toLocaleString('de-CH')}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-4)', padding: 4, display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '14px 20px 20px' }}>
          {diff.totalChanges === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
              Keine Änderungen seit dieser Version.
            </div>
          ) : (
            <>
              {/* Listen-Aenderungen */}
              {diff.lists.map(l => (
                <div key={l.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{l.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                      {l.before} → {l.after}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {l.added.map((name, i) => (
                      <div key={`a-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ios-green)' }}>
                        <Plus size={12} /> {truncate(name)}
                      </div>
                    ))}
                    {l.removed.map((name, i) => (
                      <div key={`r-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ios-red)' }}>
                        <Minus size={12} /> {truncate(name)}
                      </div>
                    ))}
                    {l.modified > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ios-orange)' }}>
                        <Pencil size={12} /> {l.modified} bearbeitet
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Feld-Aenderungen */}
              {diff.fields.length > 0 && (
                <div style={{ marginTop: diff.lists.length > 0 ? 6 : 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{t('Geänderte Felder')}</div>
                  {diff.fields.map((f, i) => (
                    <div key={i} style={{
                      marginBottom: 10, padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-btn)',
                      border: '1px solid var(--border-subtle)',
                      fontSize: 12,
                    }}>
                      <div style={{ fontWeight: 600, marginBottom: 4 }}>{f.label}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ color: 'var(--ios-red)' }}>
                          <Minus size={11} style={{ verticalAlign: 'middle' }} /> {truncate(f.before || '(leer)', 200)}
                        </div>
                        <div style={{ color: 'var(--ios-green)' }}>
                          <Plus size={11} style={{ verticalAlign: 'middle' }} /> {truncate(f.after || '(leer)', 200)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
