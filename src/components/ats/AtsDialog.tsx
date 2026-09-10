import { useState, useMemo } from 'react';
import { X, BarChart2, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { analyzeAts, type AtsAnalysis } from '../../lib/atsAnalyzer';
import { displayPersonName } from '../../lib/displayName';
import { useT } from '../../lib/i18n';

interface Props {
  onClose: () => void;
}

export default function AtsDialog({ onClose }: Props) {
  const t = useT();
  const { getActiveResume, getActivePerson } = useResumeStore();
  const resume = getActiveResume();
  const person = getActivePerson();

  const [jobDescription, setJobDescription] = useState('');
  const [running, setRunning]       = useState(false);
  const [result, setResult]         = useState<AtsAnalysis | null>(null);

  const personName = useMemo(() => displayPersonName(person, resume), [person, resume]);

  function runAnalysis() {
    if (!resume || !jobDescription.trim()) return;
    setRunning(true);
    // setTimeout, damit der Spinner sichtbar wird (Analyse selbst ist instant)
    setTimeout(() => {
      setResult(analyzeAts(resume, jobDescription));
      setRunning(false);
    }, 80);
  }

  const scoreColor = (s: number) =>
    s >= 80 ? 'var(--ios-green)' : s >= 60 ? '#FFCC00' : s >= 40 ? '#FF9500' : 'var(--ios-red)';

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card animate-scale-in"
        style={{ width: 720, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: '1px solid rgba(var(--rgb-fg),0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(0,122,255,0.18)', border: '1px solid rgba(0,122,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart2 size={18} style={{ color: 'var(--ios-blue)' }} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{t('ATS-Score')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>
                {personName} · {resume?.name || t('Bewerbungsmappe')}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn-glass btn-icon btn-sm" style={{ padding: 6 }}>
            <X size={14} />
          </button>
        </div>

        {/* Body — scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px' }}>
          {!result ? (
            <>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 14, lineHeight: 1.5 }}>
                {t('Füge die komplette Stellenanzeige ein. Die Analyse vergleicht relevante Keywords aus dem Inserat mit deinem aktuellen Lebenslauf, gibt einen Score und konkrete Hinweise.')}
              </p>
              <textarea
                className="input-glass"
                placeholder={t('Stellenanzeige hier einfügen — Titel, Aufgaben, Anforderungen, Skills…')}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                rows={10}
                style={{ fontSize: 13, padding: 12, marginBottom: 14, minHeight: 220 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ fontSize: 11, color: 'var(--text-4)' }}>
                  {jobDescription.trim().split(/\s+/).filter(Boolean).length} {t('Wörter · lokal verarbeitet, kein Upload')}
                </div>
                <button
                  className="btn-glass btn-primary"
                  onClick={runAnalysis}
                  disabled={running || !jobDescription.trim() || !resume}
                  style={{ padding: '10px 18px', gap: 8 }}
                >
                  {running ? (
                    <><Loader2 data-motion="essential" size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t('Analysiere…')}</>
                  ) : (
                    <><Sparkles size={14} /> {t('Analyse starten')}</>
                  )}
                </button>
              </div>
            </>
          ) : (
            <AtsResultView
              result={result}
              onAgain={() => setResult(null)}
              scoreColor={scoreColor(result.score)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AtsResultView({ result, onAgain, scoreColor }: { result: AtsAnalysis; onAgain: () => void; scoreColor: string }) {
  const t = useT();
  return (
    <div>
      {/* Score Hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
        <div style={{
          width: 92, height: 92, borderRadius: '50%', flexShrink: 0,
          background: `conic-gradient(${scoreColor} ${result.score * 3.6}deg, rgba(var(--rgb-fg),0.08) 0)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: 76, height: 76, borderRadius: '50%', background: 'var(--bg-card)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{result.score}</div>
            <div style={{ fontSize: 9, color: 'var(--text-4)', marginTop: 2 }}>{t('von 100')}</div>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{t('Match-Score')}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.5 }}>
            {t('{n} von {total} relevanten Keywords sind im Lebenslauf vorhanden.')
              .replace('{n}', String(result.matched.length))
              .replace('{total}', String(result.totalJdKeywords))}
          </div>
        </div>
      </div>

      {/* Tips */}
      {result.tips.length > 0 && (
        <div style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ios-blue)', letterSpacing: '0.06em', marginBottom: 6, textTransform: 'uppercase' }}>{t('Empfehlungen')}</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            {result.tips.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      {/* Two columns: matched + missing */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 18 }}>
        <KeywordList
          title={t('Im CV vorhanden')}
          icon={<CheckCircle size={13} style={{ color: 'var(--ios-green)' }} />}
          color="var(--ios-green)"
          items={result.matched}
          empty={t('Noch keine Keywords gematcht.')}
        />
        <KeywordList
          title={t('Fehlt im CV')}
          icon={<AlertCircle size={13} style={{ color: '#FF9500' }} />}
          color="#FF9500"
          items={result.missing}
          empty={t('Keine wichtigen Lücken — passt!')}
        />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn-glass" onClick={onAgain}>{t('Andere Stelle prüfen')}</button>
      </div>
    </div>
  );
}

function KeywordList({ title, icon, color, items, empty }: {
  title: string;
  icon: React.ReactNode;
  color: string;
  items: { keyword: string; jdCount: number }[];
  empty: string;
}) {
  const t = useT();
  return (
    <div style={{ background: 'rgba(var(--rgb-fg),0.03)', border: '1px solid rgba(var(--rgb-fg),0.08)', borderRadius: 10, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        {icon}
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color }}>{title}</span>
        <span style={{ fontSize: 11, color: 'var(--text-4)', marginLeft: 'auto' }}>{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-4)', padding: '4px 0' }}>{empty}</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {items.slice(0, 24).map(({ keyword, jdCount }) => (
            <span key={keyword}
              style={{
                fontSize: 11, padding: '3px 8px', borderRadius: 12,
                background: 'rgba(var(--rgb-fg),0.05)', border: '1px solid rgba(var(--rgb-fg),0.1)',
                display: 'inline-flex', alignItems: 'center', gap: 4,
              }}
              title={t('{n}× in der Stellenanzeige').replace('{n}', String(jdCount))}
            >
              {keyword}
              {jdCount > 1 && <span style={{ fontSize: 9, color: 'var(--text-4)' }}>×{jdCount}</span>}
            </span>
          ))}
          {items.length > 24 && (
            <span style={{ fontSize: 10, color: 'var(--text-4)', alignSelf: 'center' }}>
              {t('+{n} weitere').replace('{n}', String(items.length - 24))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
