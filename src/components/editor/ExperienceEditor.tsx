import { Plus, Trash2, Briefcase, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react';
import MonthYearPicker from '../ui/MonthYearPicker';
import { useState } from 'react';
import { useResumeStore } from '../../store/resumeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import EmptyState from '../ui/EmptyState';
import { useUndoToast } from '../../lib/undoToast';
import { sortWorkExperience } from '../../lib/sortByDate';
import { useT } from '../../lib/i18n';

export default function ExperienceEditor() {
  const t = useT();
  const { getActiveResume, addWorkExperience, updateWorkExperience, removeWorkExperience, restoreItemAt } = useResumeStore();
  const showUndo = useUndoToast(s => s.show);
  const resume = getActiveResume();
  const [expanded, setExpanded] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (!resume) return null;
  const jobs = sortWorkExperience(resume.workExperience);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Briefcase size={10} style={{ display: 'inline' }} />
          {jobs.length} {t('Einträge')}
          {jobs.length > 1 && (
            <span title={t("Automatisch nach Datum sortiert (neueste zuerst)")}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-4)', fontWeight: 500, marginLeft: 4 }}>
              <CalendarClock size={10} /> {t('nach Datum')}
            </span>
          )}
        </div>
        <button className="btn-glass btn-primary btn-sm" onClick={() => addWorkExperience(resume.id)}>
          <Plus size={14} /> {t('Hinzufügen')}
        </button>
      </div>

      {jobs.length === 0 && (
        <EmptyState
          icon={Briefcase}
          title={t("Berufserfahrung hinzufügen")}
          description={t('Erfasse deine bisherigen Stationen — Firma, Rolle, Zeitraum und was du bewirkt hast.')}
          ctaLabel={t('Ersten Eintrag anlegen')}
          onCta={() => addWorkExperience(resume.id)}
        />
      )}

      {jobs.map((job, i) => (
        <div
          key={job.id}
          className="glass-card animate-fade-in"
          style={{ padding: 16, marginBottom: 10 }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 8 }}
            onClick={() => setExpanded(expanded === job.id ? null : job.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {job.position || job.company || t('Eintrag {n}').replace('{n}', String(i + 1))}
                </div>
                {job.company && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {job.company}{job.location ? ` · ${job.location}` : ''}
                  </div>
                )}
              </div>
              {(job.startDate || job.endDate || job.current) && (
                <div style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {job.startDate || '—'} – {job.current ? t('heute') : (job.endDate || '—')}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <button
                className="btn-glass btn-danger btn-sm btn-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  const snapshot = job;
                  const idx = resume.workExperience.findIndex(w => w.id === job.id);
                  removeWorkExperience(resume.id, job.id);
                  const label = job.company || job.position || t('Eintrag');
                  showUndo(t('Erfahrung «{label}» gelöscht').replace('{label}', label), () => restoreItemAt(resume.id, 'workExperience', snapshot, idx));
                }}
                style={{ padding: 6 }}
              >
                <Trash2 size={12} />
              </button>
              {expanded === job.id ? <ChevronUp size={14} style={{ opacity: 0.5 }} /> : <ChevronDown size={14} style={{ opacity: 0.5 }} />}
            </div>
          </div>

          {expanded === job.id && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="section-label">{t('Position')}</label>
                  <input className="input-glass" placeholder={t('z.B. Senior Developer')} value={job.position} maxLength={150}
                    onChange={(e) => updateWorkExperience(resume.id, job.id, { position: e.target.value })} />
                </div>
                <div>
                  <label className="section-label">{t('Unternehmen')}</label>
                  <input className="input-glass" placeholder={t('z.B. Tech GmbH')} value={job.company} maxLength={150}
                    onChange={(e) => updateWorkExperience(resume.id, job.id, { company: e.target.value })} />
                </div>
                <div>
                  <label className="section-label">{t('Standort')}</label>
                  <input className="input-glass" placeholder={t('Berlin')} value={job.location} maxLength={100}
                    onChange={(e) => updateWorkExperience(resume.id, job.id, { location: e.target.value })} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 18 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
                    <input type="checkbox" checked={job.current}
                      onChange={(e) => updateWorkExperience(resume.id, job.id, { current: e.target.checked })} />
                    {t('Aktuell tätig')}
                  </label>
                </div>
                <div>
                  <label className="section-label">{t('Von')}</label>
                  <MonthYearPicker value={job.startDate} onChange={(v) => updateWorkExperience(resume.id, job.id, { startDate: v })} />
                </div>
                <div>
                  <label className="section-label">{t('Bis')}</label>
                  <MonthYearPicker value={job.endDate} disabled={job.current} onChange={(v) => updateWorkExperience(resume.id, job.id, { endDate: v })} />
                </div>
              </div>
              <div>
                <label className="section-label">{t('Aufgaben & Erfolge')}</label>
                <textarea className="input-glass"
                  placeholder={t('Pro Zeile ein Stichpunkt — System formatiert als Aufzählung:\nEntwicklung und Betreuung von Microsoft-Power-Platform-Lösungen\nKonzeption von M365-Teams-Strukturen\nLeitung IT-Projekte')}
                  value={job.description} maxLength={1500}
                  rows={5}
                  onChange={(e) => updateWorkExperience(resume.id, job.id, { description: e.target.value })} />
                <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>
                  {t('Tipp: Einfach tippen — pro Zeile ein Punkt. Bullets fügt das System automatisch ein.')}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
