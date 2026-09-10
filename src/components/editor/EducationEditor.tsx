import { Plus, Trash2, GraduationCap, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react';
import MonthYearPicker from '../ui/MonthYearPicker';
import { useState } from 'react';
import { useResumeStore } from '../../store/resumeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import EmptyState from '../ui/EmptyState';
import { useUndoToast } from '../../lib/undoToast';
import { sortEducation } from '../../lib/sortByDate';
import { useT } from '../../lib/i18n';

export default function EducationEditor() {
  const t = useT();
  const { getActiveResume, addEducation, updateEducation, removeEducation, restoreItemAt } = useResumeStore();
  const showUndo = useUndoToast(s => s.show);
  const resume = getActiveResume();
  const [expanded, setExpanded] = useState<string | null>(null);
  const isMobile = useIsMobile();

  if (!resume) return null;
  const education = sortEducation(resume.education);

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="section-label" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
          <GraduationCap size={10} style={{ display: 'inline' }} />
          {education.length} {t('Einträge')}
          {education.length > 1 && (
            <span title={t("Automatisch nach Datum sortiert (neueste zuerst)")}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--text-4)', fontWeight: 500, marginLeft: 4 }}>
              <CalendarClock size={10} /> {t('nach Datum')}
            </span>
          )}
        </div>
        <button className="btn-glass btn-primary btn-sm" onClick={() => addEducation(resume.id)}>
          <Plus size={14} /> {t('Hinzufügen')}
        </button>
      </div>

      {education.length === 0 && (
        <EmptyState
          icon={GraduationCap}
          title={t("Ausbildung hinzufügen")}
          description={t('Schule, Lehre, Studium — alles was zu deinem Bildungsweg gehört.')}
          ctaLabel={t('Ersten Eintrag anlegen')}
          onCta={() => addEducation(resume.id)}
        />
      )}

      {education.map((edu, i) => (
        <div
          key={edu.id}
          className="glass-card animate-fade-in"
          style={{ padding: 16, marginBottom: 10 }}
        >
          <div
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', gap: 8 }}
            onClick={() => setExpanded(expanded === edu.id ? null : edu.id)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  {edu.degree || edu.institution || t('Eintrag {n}').replace('{n}', String(i + 1))}
                </div>
                {edu.institution && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {edu.institution}{edu.field ? ` · ${edu.field}` : ''}
                  </div>
                )}
              </div>
              {(edu.startDate || edu.endDate) && (
                <div style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0, textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {edu.startDate || '—'} – {edu.endDate || t('heute')}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              <button
                className="btn-glass btn-danger btn-sm btn-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  const snapshot = edu;
                  const idx = resume.education.findIndex(x => x.id === edu.id);
                  removeEducation(resume.id, edu.id);
                  const label = edu.institution || edu.degree || t('Eintrag');
                  showUndo(t('Ausbildung «{label}» gelöscht').replace('{label}', label), () => restoreItemAt(resume.id, 'education', snapshot, idx));
                }}
                style={{ padding: 6 }}
              >
                <Trash2 size={12} />
              </button>
              {expanded === edu.id ? <ChevronUp size={14} style={{ opacity: 0.5 }} /> : <ChevronDown size={14} style={{ opacity: 0.5 }} />}
            </div>
          </div>

          {expanded === edu.id && (
            <div style={{ marginTop: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <label className="section-label">{t('Abschluss')}</label>
                  <input className="input-glass" placeholder={t('z.B. Bachelor of Science')} value={edu.degree} maxLength={150}
                    onChange={(e) => updateEducation(resume.id, edu.id, { degree: e.target.value })} />
                </div>
                <div>
                  <label className="section-label">{t('Fachrichtung')}</label>
                  <input className="input-glass" placeholder={t('z.B. Informatik')} value={edu.field} maxLength={150}
                    onChange={(e) => updateEducation(resume.id, edu.id, { field: e.target.value })} />
                </div>
                <div>
                  <label className="section-label">{t('Institution')}</label>
                  <input className="input-glass" placeholder={t('z.B. TU Berlin')} value={edu.institution} maxLength={150}
                    onChange={(e) => updateEducation(resume.id, edu.id, { institution: e.target.value })} />
                </div>
                <div>
                  <label className="section-label">{t('Standort')}</label>
                  <input className="input-glass" placeholder={t('Berlin')} value={edu.location} maxLength={100}
                    onChange={(e) => updateEducation(resume.id, edu.id, { location: e.target.value })} />
                </div>
                <div>
                  <label className="section-label">{t('Von')}</label>
                  <MonthYearPicker value={edu.startDate} onChange={(v) => updateEducation(resume.id, edu.id, { startDate: v })} />
                </div>
                <div>
                  <label className="section-label">{t('Bis')}</label>
                  <MonthYearPicker value={edu.endDate} onChange={(v) => updateEducation(resume.id, edu.id, { endDate: v })} />
                </div>
                <div>
                  <label className="section-label">{t('Note / GPA')}</label>
                  <input className="input-glass" placeholder={t('z.B. 1,5 oder 3.8')} value={edu.grade} maxLength={20}
                    onChange={(e) => updateEducation(resume.id, edu.id, { grade: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="section-label">{t('Schwerpunkte & Erfolge')}</label>
                <textarea
                  className="input-glass"
                  placeholder={t('Pro Zeile ein Stichpunkt:\nSchwerpunkt Software Engineering\nAbschlussarbeit "Skalierbare Microservices"\nAustauschsemester in Kopenhagen')}
                  value={edu.description} maxLength={1000}
                  rows={4}
                  onChange={(e) => updateEducation(resume.id, edu.id, { description: e.target.value })}
                />
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
