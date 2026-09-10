import { useState, useEffect, useCallback } from 'react';
import { History, Plus, RotateCcw, Trash2, Loader2, Clock, AlertCircle, GitCompare } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { userError } from '../../lib/userError';
import {
  saveVersion, listVersions, deleteVersion,
  relativeTime, type ResumeVersion,
} from '../../lib/versions';
import VersionDiffModal from './VersionDiffModal';
import { useT } from '../../lib/i18n';

interface Props {
  resumeId: string;
}

export default function VersionHistoryPanel({ resumeId }: Props) {
  const t = useT();
  const { resumes, updateResume } = useResumeStore();
  const resume = resumes.find(r => r.id === resumeId);

  const [versions, setVersions]     = useState<ResumeVersion[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [restoring, setRestoring]   = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);
  const [diffVersion, setDiffVersion] = useState<ResumeVersion | null>(null);
  const [labelInput, setLabelInput] = useState('');
  const [showLabel, setShowLabel]   = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await listVersions(resumeId);
    if (result.error) {
      setError(result.error);
    } else {
      setVersions(result.data);
    }
    setLoading(false);
  }, [resumeId]);

  // Async DB-Fetch — setState auf Resolve ist hier korrekt.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!resume) return;
    setSaving(true);
    setError(null);
    const ok = await saveVersion(resume, labelInput.trim() || undefined);
    if (!ok) {
      setError(userError('Die Version konnte nicht gespeichert werden'));
    } else {
      setLabelInput('');
      setShowLabel(false);
      await load();
    }
    setSaving(false);
  }

  async function handleRestore(version: ResumeVersion) {
    if (!resume) return;
    setRestoring(version.id);
    const { id: _id, personId: _personId, createdAt: _createdAt, shareToken: _shareToken, reminderDays: _reminderDays, ...restorable } = version.snapshot;
    updateResume(resumeId, restorable);
    setRestoring(null);
    setConfirmId(null);
  }

  async function handleDelete(versionId: string) {
    await deleteVersion(versionId);
    setVersions(v => v.filter(x => x.id !== versionId));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 0 }}>

      {/* Header */}
      <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(var(--rgb-fg),0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,122,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={15} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{t('Versionshistorie')}</h2>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-4)', marginTop: 2 }}>
              {t('Bis zu 20 gespeicherte Versionen pro Mappe')}
            </p>
          </div>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px',
          background: 'rgba(255,59,48,0.12)', border: '1px solid rgba(255,59,48,0.3)',
          borderRadius: 10, marginBottom: 16, fontSize: 12, color: 'var(--text-2)',
        }}>
          <AlertCircle size={14} style={{ color: 'var(--ios-red)', flexShrink: 0, marginTop: 1 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Save controls */}
      <div style={{ marginBottom: 20 }}>
        {showLabel ? (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="input-glass"
              placeholder={t('Bezeichnung (optional, z.B. «vor Überarbeitung»)')}
              value={labelInput}
              onChange={e => setLabelInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              autoFocus
              style={{ flex: 1, fontSize: 13 }}
            />
            <button className="btn-glass btn-sm btn-primary" onClick={handleSave} disabled={saving} style={{ gap: 5, flexShrink: 0 }}>
              {saving ? <Loader2 data-motion="essential" size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
              {t('Speichern')}
            </button>
            <button className="btn-glass btn-sm" onClick={() => setShowLabel(false)} style={{ flexShrink: 0 }}>
              {t('Abbrechen')}
            </button>
          </div>
        ) : (
          <button
            className="btn-glass"
            onClick={() => setShowLabel(true)}
            style={{ gap: 8, width: '100%', justifyContent: 'center', padding: '10px 16px' }}
          >
            <Plus size={14} /> {t('Aktuelle Version speichern')}
          </button>
        )}
      </div>

      {/* Version list */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 8, color: 'var(--text-4)', fontSize: 13 }}>
          <Loader2 data-motion="essential" size={16} style={{ animation: 'spin 1s linear infinite' }} /> {t('Lädt…')}
        </div>
      ) : versions.length === 0 && !error ? (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-4)' }}>
          <Clock size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>{t('Noch keine Versionen gespeichert')}</div>
          <div style={{ fontSize: 12 }}>{t('Speichere manuell eine Version um Änderungen festzuhalten.')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
          {versions.map((v, i) => (
            <div
              key={v.id}
              className="glass-card"
              style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
            >
              {/* Index badge */}
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: i === 0 ? 'rgba(0,122,255,0.2)' : 'rgba(var(--rgb-fg),0.06)',
                border: i === 0 ? '1px solid rgba(0,122,255,0.3)' : '1px solid rgba(var(--rgb-fg),0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                color: i === 0 ? 'var(--ios-blue)' : 'var(--text-4)',
              }}>
                {versions.length - i}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: v.label ? 600 : 400, color: v.label ? 'var(--text-1)' : 'var(--text-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {v.label ?? t('Version')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                  {relativeTime(v.created_at)} · {new Date(v.created_at).toLocaleString('de-CH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                {confirmId === v.id ? (
                  <>
                    <button
                      className="btn-glass btn-sm"
                      onClick={() => handleRestore(v)}
                      disabled={restoring === v.id}
                      style={{ fontSize: 11, gap: 4, background: 'rgba(0,122,255,0.2)', border: '1px solid rgba(0,122,255,0.4)' }}
                    >
                      {restoring === v.id
                        ? <Loader2 data-motion="essential" size={12} style={{ animation: 'spin 1s linear infinite' }} />
                        : <RotateCcw size={12} />}
                      {t('Bestätigen')}
                    </button>
                    <button className="btn-glass btn-sm" onClick={() => setConfirmId(null)} style={{ fontSize: 11 }}>
                      {t('Nein')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-glass btn-sm"
                      onClick={() => setDiffVersion(v)}
                      title={t('Mit aktuellem Stand vergleichen')}
                      style={{ padding: '6px 8px' }}
                    >
                      <GitCompare size={14} />
                    </button>
                    <button
                      className="btn-glass btn-sm"
                      onClick={() => setConfirmId(v.id)}
                      title={t('Wiederherstellen')}
                      style={{ padding: '6px 8px' }}
                    >
                      <RotateCcw size={14} />
                    </button>
                    <button
                      className="btn-glass btn-sm btn-danger"
                      onClick={() => handleDelete(v.id)}
                      title={t('Löschen')}
                      style={{ padding: '6px 8px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {diffVersion && resume && (
        <VersionDiffModal version={diffVersion} current={resume} onClose={() => setDiffVersion(null)} />
      )}
    </div>
  );
}
