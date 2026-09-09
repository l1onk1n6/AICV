import { useState } from 'react';
import { Languages, X, Loader2, CheckCircle } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { usePlan } from '../../lib/plan';
import { translateFields } from '../../lib/ai';
import { userError } from '../../lib/userError';
import { useT } from '../../lib/i18n';
import { UpgradeModal } from '../ui/ProGate';
import type { Resume } from '../../types/resume';


const LANGUAGES = [
  'Deutsch', 'Englisch', 'Französisch', 'Italienisch', 'Spanisch',
  'Portugiesisch', 'Niederländisch', 'Polnisch', 'Russisch',
  'Chinesisch (Vereinfacht)', 'Japanisch', 'Arabisch',
];

function collectFields(r: Resume): Record<string, string> {
  const f: Record<string, string> = {};
  if (r.personalInfo.title)   f['title']   = r.personalInfo.title;
  if (r.personalInfo.summary) f['summary'] = r.personalInfo.summary;
  r.workExperience.forEach((j, i) => {
    if (j.description) f[`exp_${i}_desc`] = j.description;
    j.highlights?.forEach((h, hi) => { if (h) f[`exp_${i}_h${hi}`] = h; });
  });
  r.education.forEach((e, i) => { if (e.description) f[`edu_${i}_desc`] = e.description; });
  r.projects.forEach((p, i)   => { if (p.description) f[`proj_${i}_desc`] = p.description; });
  r.customSections.forEach((s, i) => {
    s.items.forEach((item, ii) => { if (item) f[`cs_${i}_item${ii}`] = item; });
  });
  if (r.coverLetter?.subject) f['cl_subject'] = r.coverLetter.subject;
  if (r.coverLetter?.body)    f['cl_body']    = r.coverLetter.body;
  return f;
}

function applyTranslations(r: Resume, t: Record<string, string>): void {
  const upd: Partial<Resume['personalInfo']> = {};
  if (t['title'])   upd.title   = t['title'];
  if (t['summary']) upd.summary = t['summary'];

  const updatedExp = r.workExperience.map((j, i) => ({
    ...j,
    description: t[`exp_${i}_desc`] ?? j.description,
    highlights:  j.highlights?.map((h, hi) => t[`exp_${i}_h${hi}`] ?? h) ?? j.highlights,
  }));
  const updatedEdu = r.education.map((e, i) => ({
    ...e,
    description: t[`edu_${i}_desc`] ?? e.description,
  }));
  const updatedProj = r.projects.map((p, i) => ({
    ...p,
    description: t[`proj_${i}_desc`] ?? p.description,
  }));
  const updatedCS = r.customSections.map((s, i) => ({
    ...s,
    items: s.items.map((item, ii) => t[`cs_${i}_item${ii}`] ?? item),
  }));
  const updatedCL = r.coverLetter ? {
    ...r.coverLetter,
    subject: t['cl_subject'] ?? r.coverLetter.subject,
    body:    t['cl_body']    ?? r.coverLetter.body,
  } : r.coverLetter;

  // Mutate via store
  Object.assign(r, {
    personalInfo:   { ...r.personalInfo, ...upd },
    workExperience: updatedExp,
    education:      updatedEdu,
    projects:       updatedProj,
    customSections: updatedCS,
    coverLetter:    updatedCL,
  });
}

export default function TranslateDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const { getActiveResume, updateResume } = useResumeStore();
  const { isPro } = usePlan();
  const resume = getActiveResume();

  const [language, setLanguage] = useState<string>('Englisch');
  const [custom, setCustom]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [done, setDone]         = useState(false);
  const [error, setError]       = useState('');
  if (!resume) return null;
  if (!isPro) return <UpgradeModal onClose={onClose} highlightId="translate" />;

  const targetLang = language === 'Andere…' ? custom : language;

  async function handleTranslate() {
    // Capture lang immediately at click time — avoid stale closure
    const lang = (language === 'Andere…' ? custom : language).trim();
    if (!lang) return;
    setLoading(true);
    setError('');
    const resumeId = resume!.id;
    const fields = collectFields(resume!);
    const count = Object.keys(fields).length;
    if (count === 0) { setError(t('Kein übersetzbarer Text gefunden.')); setLoading(false); return; }

    const translated = await translateFields(fields, lang);
    if (!translated) { setError(userError('Die Übersetzung hat nicht funktioniert')); setLoading(false); return; }

    // Get latest resume state from store (not stale closure)
    const latest = useResumeStore.getState().resumes.find(r => r.id === resumeId);
    if (!latest) { setLoading(false); return; }

    const updated = { ...latest };
    applyTranslations(updated, translated);
    updateResume(resumeId, {
      personalInfo:   updated.personalInfo,
      workExperience: updated.workExperience,
      education:      updated.education,
      projects:       updated.projects,
      customSections: updated.customSections,
      coverLetter:    updated.coverLetter,
      name:           latest.name + ` (${lang})`,
    });
    setDone(true);
    setLoading(false);
    setTimeout(onClose, 1800);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="glass-card animate-scale-in"
        style={{ padding: '28px 24px', width: 360, maxWidth: '92vw', background: 'var(--bg-overlay)', backdropFilter: 'blur(32px)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,122,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Languages size={16} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t('Lebenslauf übersetzen')}</div>
              <div style={{ fontSize: 11, color: 'rgba(var(--rgb-fg),0.4)' }}>{t('Alle Textfelder werden übersetzt')}</div>
            </div>
          </div>
          <button className="btn-glass btn-icon" onClick={onClose} style={{ padding: 6 }}><X size={14} /></button>
        </div>

        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <CheckCircle size={40} style={{ color: 'var(--ios-green)', margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 600 }}>{t('Übersetzung abgeschlossen!')}</div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 8, opacity: 0.7 }}>{t('Zielsprache')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {LANGUAGES.map(lang => (
                  <button key={lang} className="btn-glass btn-sm"
                    onClick={() => setLanguage(lang)}
                    style={{
                      fontSize: 12,
                      background: language === lang ? 'rgba(0,122,255,0.25)' : 'rgba(var(--rgb-fg),0.07)',
                      border: language === lang ? '1px solid rgba(0,122,255,0.5)' : '1px solid rgba(var(--rgb-fg),0.12)',
                    }}>
                    {t(lang)}
                  </button>
                ))}
                <button className="btn-glass btn-sm"
                  onClick={() => setLanguage('Andere…')}
                  style={{
                    fontSize: 12,
                    background: language === 'Andere…' ? 'rgba(0,122,255,0.25)' : 'rgba(var(--rgb-fg),0.07)',
                    border: language === 'Andere…' ? '1px solid rgba(0,122,255,0.5)' : '1px solid rgba(var(--rgb-fg),0.12)',
                  }}>
                  {t('Andere…')}
                </button>
              </div>
              {language === 'Andere…' && (
                <input className="input-glass" placeholder={t('Sprache eingeben…')} value={custom}
                  onChange={e => setCustom(e.target.value)} style={{ marginTop: 8, width: '100%', fontSize: 13 }} autoFocus />
              )}
            </div>

            <div style={{ fontSize: 12, color: 'rgba(var(--rgb-fg),0.4)', marginBottom: 16, padding: '8px 12px', background: 'rgba(var(--rgb-fg),0.04)', borderRadius: 8 }}>
              {t('Übersetzt: Zusammenfassung, Berufserfahrung, Ausbildung, Projekte, eigene Sektionen, Anschreiben. Namen, Daten und Kontaktdaten bleiben unverändert.')}
            </div>

            {error && <div style={{ fontSize: 12, color: 'var(--ios-red)', marginBottom: 12 }}>{error}</div>}

            <button className="btn-glass btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px', fontWeight: 700 }}
              onClick={handleTranslate} disabled={loading || (!targetLang.trim())}>
              {loading
                ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> {t('Übersetze…')}</>
                : <><Languages size={15} /> {t('Jetzt übersetzen')}</>}
            </button>
          </>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
