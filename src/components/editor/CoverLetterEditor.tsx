import { useState, useCallback } from 'react';
import { Link, Calendar, Sparkles, Bell, BellOff, Loader2, Wand2, ChevronDown, ChevronUp, AlertTriangle, Check, ClipboardList } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { useIsMobile } from '../../hooks/useBreakpoint';
import { userError } from '../../lib/userError';
import { usePlan } from '../../lib/plan';
import { generateCoverLetter, improveText } from '../../lib/ai';
import ProGate from '../ui/ProGate';
import { UpgradeModal } from '../ui/ProGate';
import { getSupabase, isSupabaseConfigured } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { useTrackerStore } from '../../store/trackerStore';
import { useT } from '../../lib/i18n';

// Parse multiline recipient string into structured address fields.
// Adressen werden als 4 fixe Zeilen gespeichert (Firma / Person / Strasse / Ort)
// — leere Zeilen bleiben erhalten, damit die Position stabil ist und der
// Cursor im Editor nicht in ein anderes Feld "springt", wenn man eins leert.
const ADDR_LINES = 4;
function parseRecipient(s: string) {
  const raw = s.split('\n');
  const lines = Array.from({ length: ADDR_LINES }, (_, i) => (raw[i] ?? '').trim());
  const [company, dept, street, city] = lines;
  return { company, dept, street, city };
}
function assembleRecipient(company: string, dept: string, street: string, city: string) {
  const all = [company, dept, street, city];
  // Nur trailing-leere Zeilen abschneiden, damit die gespeicherte Repraesentation
  // bei rein leeren Zusatzfeldern kein unnoetiges Padding hat. Innere leere
  // Zeilen bleiben erhalten (s. parseRecipient).
  let end = all.length;
  while (end > 0 && !all[end - 1]) end--;
  return all.slice(0, end).join('\n');
}

const CL_TEMPLATES = [
  {
    id: 'klassisch', label: 'Klassisch', emoji: '📋',
    desc: 'Formal, bewährt für konservative Branchen',
    body: `Sehr geehrte Damen und Herren,\n\nmit grossem Interesse habe ich Ihre Stellenausschreibung als [STELLE] bei [UNTERNEHMEN] gelesen. Mit meiner Erfahrung in [BEREICH] bin ich überzeugt, einen wertvollen Beitrag zu Ihrem Team leisten zu können.\n\nIn meiner bisherigen Laufbahn konnte ich [LEISTUNG]. Diese Erfahrungen haben mir gezeigt, wie entscheidend [QUALITÄT] ist — eine Überzeugung, die ich in Ihrer Organisation einbringen möchte.\n\nBesonders angesprochen hat mich an [UNTERNEHMEN]: [GRUND]. Meine Qualifikationen und Ihre Anforderungen ergänzen sich meiner Einschätzung nach sehr gut.\n\nGerne überzeuge ich Sie in einem persönlichen Gespräch von meiner Eignung.`,
  },
  {
    id: 'modern', label: 'Modern', emoji: '⚡',
    desc: 'Dynamisch und direkt, für innovative Unternehmen',
    body: `Sehr geehrte Damen und Herren,\n\n[UNTERNEHMEN] steht für [EIGENSCHAFT] — genau das, womit ich meine nächste Station verbinden möchte.\n\nAls [BERUFSBEZEICHNUNG] mit [X] Jahren Erfahrung in [BEREICH] bringe ich mit:\n→ [STÄRKE 1]\n→ [STÄRKE 2]\n→ [STÄRKE 3]\n\nMein Ziel: [MOTIVATION]. Ich bin überzeugt, dass ich in Ihrem Team schnell Wirkung erzeugen kann — und freue mich auf ein Gespräch, in dem wir das gemeinsam herausfinden.`,
  },
  {
    id: 'initiativ', label: 'Initiativ', emoji: '🚀',
    desc: 'Für Direktbewerbungen ohne offene Stelle',
    body: `Sehr geehrte Damen und Herren,\n\nIch bewerbe mich initiativ bei [UNTERNEHMEN], weil Ihre Arbeit im Bereich [BEREICH] mich begeistert und ich überzeugt bin, einen echten Mehrwert einbringen zu können.\n\nAls [BERUFSBEZEICHNUNG] habe ich in den letzten [X] Jahren [LEISTUNG]. Meine Kernkompetenzen:\n• [KOMPETENZ 1]\n• [KOMPETENZ 2]\n• [KOMPETENZ 3]\n\nAuch wenn aktuell keine passende Stelle ausgeschrieben ist — ich bin flexibel und offen für verschiedene Möglichkeiten. Darf ich Sie in einem kurzen Gespräch kennenlernen?`,
  },
  {
    id: 'kurz', label: 'Kurz & prägnant', emoji: '✦',
    desc: 'Auf das Wesentliche reduziert, maximal wirkungsvoll',
    body: `Guten Tag,\n\nIch bewerbe mich als [STELLE] bei [UNTERNEHMEN].\n\nIch bin [BERUFSBEZEICHNUNG] mit [X] Jahren Erfahrung, zuletzt bei [LETZTER ARBEITGEBER].\n\nWarum [UNTERNEHMEN]? [GRUND IN 1–2 SÄTZEN]\n\nIch freue mich auf Ihre Rückmeldung.`,
  },
];

const REMINDER_OPTIONS = [
  { days: 1, label: '1 Tag vorher' },
  { days: 3, label: '3 Tage vorher' },
  { days: 7, label: '7 Tage vorher' },
];

function ReminderPanel({ resumeId, deadline, reminderDays, onClose }: {
  resumeId: string; deadline: string; reminderDays: number[]; onClose: () => void;
}) {
  const t = useT();
  const { updateResume } = useResumeStore();
  const { session } = useAuthStore();
  const [selected, setSelected] = useState<number[]>(reminderDays ?? []);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const toggle = useCallback((days: number) => {
    setSelected(prev => prev.includes(days) ? prev.filter(d => d !== days) : [...prev, days]);
    setSaved(false);
  }, []);

  async function save() {
    setSaving(true); setError('');
    // Save to store
    updateResume(resumeId, { reminderDays: selected });
    // Sync to Supabase if configured
    if (isSupabaseConfigured() && session?.access_token) {
      try {
        const resume = useResumeStore.getState().resumes.find(r => r.id === resumeId);
        const supabase = getSupabase();
        const { error: fnErr } = await supabase.functions.invoke('upsert-deadline-reminders', {
          body: { resume_id: resumeId, deadline, reminder_days: selected, resume_name: resume?.name ?? '' },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (fnErr) setError(userError('Die Änderungen wurden gespeichert, aber die Synchronisation hat nicht funktioniert'));
      } catch { setError(userError('Die Änderungen wurden gespeichert, aber die Synchronisation hat nicht funktioniert')); }
    }
    setSaving(false); setSaved(true);
    setTimeout(onClose, 900);
  }

  return (
    <div className="glass-card animate-scale-in" style={{ marginTop: 8, padding: 14, border: '1px solid rgba(0,122,255,0.25)', background: 'rgba(0,122,255,0.06)' }}>
      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <Bell size={12} style={{ color: 'var(--ios-blue)' }} />
        {t('E-Mail-Reminder vor Frist')}
      </div>
      {!deadline && (
        <div style={{ fontSize: 12, color: 'rgba(var(--rgb-fg),0.4)', marginBottom: 10 }}>
          {t('Zuerst eine Bewerbungsfrist setzen.')}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
        {REMINDER_OPTIONS.map(({ days, label }) => (
          <label key={days} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: deadline ? 'pointer' : 'default', opacity: deadline ? 1 : 0.4 }}>
            <input type="checkbox" checked={selected.includes(days)} disabled={!deadline}
              onChange={() => toggle(days)}
              style={{ width: 15, height: 15, accentColor: 'var(--ios-blue)', cursor: 'pointer' }} />
            <span style={{ fontSize: 13 }}>{label}</span>
          </label>
        ))}
      </div>
      {error && <div style={{ fontSize: 11, color: 'var(--ios-red)', marginBottom: 8 }}>{error}</div>}
      <div style={{ display: 'flex', gap: 6 }}>
        <button className="btn-glass btn-sm" onClick={onClose} style={{ fontSize: 12 }}>{t('Abbrechen')}</button>
        <button className="btn-glass btn-primary btn-sm" onClick={save} disabled={saving || !deadline}
          style={{ fontSize: 12, gap: 5 }}>
          {saved ? <><Check size={12} /> {t('Gespeichert')}</> : saving ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {t('Speichern…')}</> : t('Speichern')}
        </button>
      </div>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}

export default function CoverLetterEditor() {
  const t = useT();
  const { getActiveResume, updateCoverLetter, updateResume } = useResumeStore();
  const { isPro } = usePlan();
  const resume = getActiveResume();
  const isMobile = useIsMobile();

  const { addApplication, updateApplication } = useTrackerStore();
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [trackerAdded, setTrackerAdded] = useState(false);
  const [aiJobTitle, setAiJobTitle] = useState('');
  const [aiCompany, setAiCompany] = useState('');
  const [aiJobDesc, setAiJobDesc] = useState('');
  const [generatingCL, setGeneratingCL] = useState(false);
  const [improvingBody, setImprovingBody] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState<'generate' | 'improve' | 'template' | null>(null);
  const [showReminder, setShowReminder] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState('');

  if (!resume) return null;

  const cl = resume.coverLetter ?? { recipient: '', subject: '', body: '', closing: 'Mit freundlichen Grüssen' };
  const hasExistingBody = cl.body.trim().length > 0;
  const addr = parseRecipient(cl.recipient);

  function updateAddr(field: 'company' | 'dept' | 'street' | 'city', value: string) {
    const next = { ...addr, [field]: value };
    update('recipient', assembleRecipient(next.company, next.dept, next.street, next.city));
  }

  function addToTracker() {
    if (!resume) return;
    addApplication();
    const apps = useTrackerStore.getState().applications;
    const newApp = apps[0];
    if (newApp) {
      updateApplication(newApp.id, {
        company:     addr.company,
        position:    resume.personalInfo.title || '',
        deadline:    resume.deadline || '',
        url:         resume.jobUrl || '',
        resumeId:    resume.id,
        status:      'offen',
        type:        'online',
      });
    }
    setTrackerAdded(true);
    setTimeout(() => setTrackerAdded(false), 2000);
  }

  function update(field: keyof typeof cl, value: string) {
    updateCoverLetter(resume!.id, { [field]: value });
  }

  const deadlineColor = (() => {
    if (!resume.deadline) return undefined;
    // Date.now() im Render: gewollt — Deadline-Farbe ist live-abhängig vom heutigen Datum.
    // eslint-disable-next-line react-hooks/purity
    const diff = (new Date(resume.deadline).getTime() - Date.now()) / 86400000;
    if (diff < 0) return 'var(--ios-red)';
    if (diff <= 7) return 'var(--ios-yellow, #FF9F0A)';
    return 'var(--ios-green)';
  })();

  async function doGenerateCL() {
    setConfirmOverwrite(null);
    setGeneratingCL(true);
    const summary = resume!.personalInfo.summary ?? '';
    const experience = resume!.workExperience
      .slice(0, 3)
      .map(j => `${j.position} bei ${j.company}${j.description ? ': ' + j.description : ''}`)
      .join('\n');
    const result = await generateCoverLetter({
      jobTitle:       aiJobTitle || resume!.personalInfo.title,
      company:        aiCompany,
      jobDescription: aiJobDesc,
      summary,
      experience,
    });
    if (result) update('body', result);
    setGeneratingCL(false);
    setShowAiPanel(false);
  }

  async function doImproveBody() {
    setConfirmOverwrite(null);
    setImprovingBody(true);
    const result = await improveText(cl.body, `Bewerbung als ${resume!.personalInfo.title || 'Fachkraft'}`);
    if (result) update('body', result);
    setImprovingBody(false);
  }

  function handleGenerateCL() {
    if (!isPro) { setShowUpgrade(true); return; }
    if (hasExistingBody) { setConfirmOverwrite('generate'); return; }
    doGenerateCL();
  }

  function handleImproveBody() {
    if (!isPro) { setShowUpgrade(true); return; }
    if (!cl.body.trim()) return;
    setConfirmOverwrite('improve');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} highlightId="ai" />}

      {/* Overwrite confirmation modal */}
      {confirmOverwrite && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        }} onClick={() => setConfirmOverwrite(null)}>
          <div className="glass-card animate-scale-in"
            style={{ padding: '28px 24px', width: 360, maxWidth: '92vw', background: 'var(--bg-overlay)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,159,10,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} style={{ color: '#FF9F0A' }} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{t('Bestehenden Text überschreiben?')}</div>
                <div style={{ fontSize: 12, color: 'rgba(var(--rgb-fg),0.45)', marginTop: 2 }}>
                  {confirmOverwrite === 'generate'
                    ? t('Der KI-Assistent ersetzt deinen aktuellen Anschreiben-Text.')
                    : confirmOverwrite === 'template'
                    ? t('Die Vorlage ersetzt deinen aktuellen Anschreiben-Text.')
                    : t('Der verbesserte Text ersetzt deinen aktuellen Anschreiben-Text.')}
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'rgba(var(--rgb-fg),0.5)', margin: '0 0 20px', lineHeight: 1.55 }}>
              {t('Dein bestehender Text wird unwiderruflich ersetzt. Möchtest du fortfahren?')}
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-glass" style={{ flex: 1 }} onClick={() => setConfirmOverwrite(null)}>
                {t('Abbrechen')}
              </button>
              <button
                className="btn-glass"
                style={{ flex: 1, background: 'rgba(255,159,10,0.2)', border: '1px solid rgba(255,159,10,0.4)', color: '#FF9F0A', fontWeight: 700 }}
                onClick={() => {
                  if (confirmOverwrite === 'generate') doGenerateCL();
                  else if (confirmOverwrite === 'template') { update('body', pendingTemplate); setConfirmOverwrite(null); setPendingTemplate(''); }
                  else doImproveBody();
                }}
              >
                {t('Ja, überschreiben')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job details */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.7 }}>
            <Link size={12} /> {t('Stellenausschreibung URL')}
          </label>
          <input
            className="input-glass"
            placeholder="https://jobs.beispiel.ch/stelle-xyz"
            value={resume.jobUrl ?? ''}
            onChange={(e) => updateResume(resume.id, { jobUrl: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.7 }}>
            <Calendar size={12} /> {t('Bewerbungsfrist')}
          </label>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              className="input-glass"
              type="date"
              value={resume.deadline ?? ''}
              onChange={(e) => updateResume(resume.id, { deadline: e.target.value })}
              style={{ flex: 1, color: deadlineColor ?? undefined }}
            />
            <ProGate featureId="reminder" badge>
              <button
                className="btn-glass btn-icon"
                style={{ padding: 8, color: (resume.reminderDays?.length ?? 0) > 0 ? 'var(--ios-blue)' : undefined }}
                title={t("Deadline-Reminder")}
                onClick={() => isPro ? setShowReminder(v => !v) : setShowUpgrade(true)}
              >
                {(resume.reminderDays?.length ?? 0) > 0 ? <Bell size={14} /> : <BellOff size={14} />}
              </button>
            </ProGate>
          </div>
          {resume.deadline && deadlineColor === 'var(--ios-red)' && (
            <div style={{ fontSize: 11, color: 'var(--ios-red)', marginTop: 4 }}>{t('Frist abgelaufen')}</div>
          )}
          {showReminder && (
            <ReminderPanel
              resumeId={resume.id}
              deadline={resume.deadline ?? ''}
              reminderDays={resume.reminderDays ?? []}
              onClose={() => setShowReminder(false)}
            />
          )}
        </div>
      </div>

      {/* Template picker */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CL_TEMPLATES.map(tpl => (
          <button
            key={tpl.id}
            className="btn-glass btn-sm"
            title={t(tpl.desc)}
            onClick={() => {
              if (cl.body.trim()) { setConfirmOverwrite('template'); setPendingTemplate(tpl.body); }
              else { update('body', tpl.body); }
            }}
            style={{ gap: 5, boxShadow: 'none' }}
          >
            <span>{tpl.emoji}</span> {t(tpl.label)}
          </button>
        ))}
      </div>

      {/* Structured address */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>{t('Empfänger / Adresse')}</label>
          {addr.company && (
            <button
              className="btn-glass btn-sm"
              onClick={addToTracker}
              style={{ fontSize: 11, gap: 5, background: trackerAdded ? 'rgba(52,199,89,0.15)' : undefined, border: trackerAdded ? '1px solid rgba(52,199,89,0.3)' : undefined, color: trackerAdded ? '#34C759' : undefined }}
            >
              {trackerAdded
                ? <><Check size={12} /> {t('Hinzugefügt')}</>
                : <><ClipboardList size={12} /> {t('Zu Tracker')}</>}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <input
            className="input-glass"
            placeholder={t('Firmenname (z.B. Muster AG)')}
            value={addr.company} maxLength={150}
            onChange={e => updateAddr('company', e.target.value)}
            style={{ fontSize: 13 }}
          />
          <input
            className="input-glass"
            placeholder={t('Abteilung / Ansprechperson (optional)')}
            value={addr.dept} maxLength={150}
            onChange={e => updateAddr('dept', e.target.value)}
            style={{ fontSize: 13 }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 6 }}>
            <input
              className="input-glass"
              placeholder={t('Strasse und Nr.')}
              value={addr.street} maxLength={150}
              onChange={e => updateAddr('street', e.target.value)}
              style={{ fontSize: 13 }}
            />
            <input
              className="input-glass"
              placeholder={t('PLZ / Ort')}
              value={addr.city} maxLength={100}
              onChange={e => updateAddr('city', e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        </div>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.7 }}>
          {t('Betreff')}
        </label>
        <input
          className="input-glass"
          placeholder={t('Bewerbung als Senior Developer – Ihre Ausschreibung vom 01.04.2026')}
          value={cl.subject}
          onChange={(e) => update('subject', e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      {/* AI panel — directly above body */}
      <div className="glass-card" style={{
        padding: 0, overflow: 'hidden',
        border: showAiPanel ? '1px solid rgba(255,159,10,0.35)' : '1px solid rgba(var(--rgb-fg),0.1)',
        background: showAiPanel ? 'rgba(255,159,10,0.04)' : 'rgba(var(--rgb-fg),0.04)',
        marginBottom: -10,
      }}>
        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px',
            background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
          }}
          onClick={() => isPro ? setShowAiPanel(v => !v) : setShowUpgrade(true)}
        >
          <Sparkles size={14} style={{ color: isPro ? '#FF9F0A' : 'rgba(var(--rgb-fg),0.4)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, flex: 1, textAlign: 'left', color: isPro ? '#FF9F0A' : 'rgba(var(--rgb-fg),0.5)' }}>
            {t('KI-Assistent — Anschreiben generieren')}
          </span>
          {!isPro && (
            <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 5px', borderRadius: 4, background: 'linear-gradient(135deg, #FF9F0A, #FF375F)', color: '#fff' }}>PRO</span>
          )}
          {isPro && (showAiPanel ? <ChevronUp size={14} style={{ opacity: 0.5 }} /> : <ChevronDown size={14} style={{ opacity: 0.5 }} />)}
        </button>

        {showAiPanel && (
          <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hasExistingBody && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.2)', fontSize: 12, color: '#FF9F0A' }}>
                <AlertTriangle size={12} style={{ flexShrink: 0 }} />
                {t('Der bestehende Anschreiben-Text wird überschrieben.')}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <label style={{ fontSize: 11, opacity: 0.6, display: 'block', marginBottom: 4 }}>{t('Stelle')}</label>
                <input className="input-glass" placeholder={resume.personalInfo.title || 'z.B. Software Engineer'} value={aiJobTitle}
                  onChange={e => setAiJobTitle(e.target.value)} style={{ width: '100%', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ fontSize: 11, opacity: 0.6, display: 'block', marginBottom: 4 }}>{t('Unternehmen')}</label>
                <input className="input-glass" placeholder={addr.company || 'z.B. Acme AG'} value={aiCompany}
                  onChange={e => setAiCompany(e.target.value)} style={{ width: '100%', fontSize: 13 }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, opacity: 0.6, display: 'block', marginBottom: 4 }}>
                {t('Stellenbeschreibung (optional, für bessere Ergebnisse)')}
              </label>
              <textarea className="input-glass" placeholder={t('Stellenbeschreibung hier einfügen…')} value={aiJobDesc}
                onChange={e => setAiJobDesc(e.target.value)} rows={4}
                style={{ width: '100%', resize: 'vertical', fontSize: 13 }} />
            </div>
            <button
              className="btn-glass"
              onClick={handleGenerateCL}
              disabled={generatingCL}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 16px',
                background: generatingCL ? 'rgba(255,159,10,0.1)' : 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(255,55,95,0.2))',
                border: '1px solid rgba(255,159,10,0.4)', color: '#FF9F0A', fontWeight: 700, fontSize: 13,
              }}
            >
              {generatingCL
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {t('Wird generiert…')}</>
                : <><Sparkles size={14} /> {t('Anschreiben generieren')}</>}
            </button>
          </div>
        )}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, opacity: 0.7 }}>{t('Anschreiben-Text')}</label>
          <button
            className="btn-glass btn-sm"
            style={{ fontSize: 11, gap: 5, opacity: !isPro || !cl.body.trim() ? 0.45 : 1 }}
            onClick={handleImproveBody}
            disabled={improvingBody || !cl.body.trim()}
            title={!isPro ? t('Pro-Feature') : t('Text mit KI verbessern')}
          >
            {improvingBody
              ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> {t('Verbessert…')}</>
              : <><Wand2 size={12} /> {t('Verbessern')}{!isPro && ' ✦'}</>}
          </button>
        </div>
        <textarea
          className="input-glass"
          placeholder={"Sehr geehrte Damen und Herren,\n\nmit grossem Interesse habe ich Ihre Stellenausschreibung gelesen...\n\nIch freue mich auf ein persönliches Gespräch."}
          value={cl.body}
          onChange={(e) => update('body', e.target.value)}
          rows={14}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, opacity: 0.7 }}>
          {t('Grussformel')}
        </label>
        <textarea
          className="input-glass"
          placeholder={"Mit freundlichen Grüssen\n\nMax Mustermann"}
          value={cl.closing}
          onChange={(e) => update('closing', e.target.value)}
          rows={3}
          style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit' }}
        />
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
