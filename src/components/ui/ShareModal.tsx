import { useState } from 'react';
import { Share2, X, CheckCircle, Eye, Clock } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useResumeStore } from '../../store/resumeStore';
import { usePlan } from '../../lib/plan';
import { shareLink } from '../../lib/shareLink';
import { useT } from '../../lib/i18n';

function relativeTime(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'gerade eben';
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  if (d < 30) return `vor ${d} Tagen`;
  const mo = Math.round(d / 30);
  if (mo < 12) return `vor ${mo} Monaten`;
  return `vor ${Math.round(mo / 12)} Jahren`;
}

interface Props {
  resumeId: string;
  token?: string;
  onClose: () => void;
}

export default function ShareModal({ resumeId, token, onClose }: Props) {
  const t = useT();
  const { setShareToken, resumes } = useResumeStore();
  const { limits } = usePlan();
  const [copied, setCopied] = useState(false);

  const shareUrl = token ? `${window.location.origin}${window.location.pathname}#/shared?t=${token}` : null;
  const resume = resumes.find(r => r.id === resumeId);
  const views = resume?.shareViews ?? 0;
  const lastViewedAt = resume?.lastViewedAt;
  const activeShareCount = resumes.filter(r => r.shareToken && r.id !== resumeId).length;
  const atShareLimit = !token && activeShareCount >= limits.shareLinks;

  function generate() {
    if (atShareLimit) return;
    setShareToken(resumeId, uuidv4());
  }

  function disable() {
    setShareToken(resumeId, null);
  }

  async function copy() {
    if (!shareUrl) return;
    const nativeSheet = await shareLink(shareUrl, t('Lebenslauf teilen'));
    if (nativeSheet) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="glass-card animate-scale-in"
        style={{ padding: 20, width: 340, maxWidth: '90vw', zIndex: 9001 }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{t('Lebenslauf teilen')}</div>
          <button className="btn-glass btn-icon" onClick={onClose} style={{ padding: 5 }}>
            <X size={14} />
          </button>
        </div>

        {!shareUrl ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 14 }}>
              Erstelle einen öffentlichen Link — der Lebenslauf ist ohne Login einsehbar.
            </p>
            {atShareLimit ? (
              <div style={{ fontSize: 12, color: 'var(--ios-amber)', background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.25)', borderRadius: 8, padding: '10px 12px' }}>
                Share-Link-Limit erreicht ({limits.shareLinks}/{limits.shareLinks}). Deaktiviere einen anderen Link oder upgrade auf Pro.
              </div>
            ) : (
              <button className="btn-glass btn-primary" style={{ width: '100%' }} onClick={generate}>
                <Share2 size={14} /> Link generieren
              </button>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              <input
                className="input-glass"
                readOnly
                value={shareUrl}
                style={{ flex: 1, fontSize: 11 }}
              />
              <button className="btn-glass btn-primary" onClick={copy} style={{ flexShrink: 0, padding: '0 12px' }}>
                {copied ? <CheckCircle size={14} /> : t('Kopieren')}
              </button>
            </div>

            {/* Analytics */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: 12, padding: '10px 12px', marginBottom: 12,
              background: 'var(--bg-btn)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)', fontSize: 12,
              color: 'var(--text-2)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Eye size={14} /> {views} Aufruf{views === 1 ? '' : 'e'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
                <Clock size={14} /> {lastViewedAt ? relativeTime(lastViewedAt) : t('Noch nicht aufgerufen')}
              </span>
            </div>

            <button className="btn-glass btn-danger" style={{ width: '100%', fontSize: 12 }} onClick={disable}>
              Link deaktivieren
            </button>
          </>
        )}
      </div>
    </div>
  );
}
