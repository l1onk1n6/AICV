import { Plus, Trash2, Zap, Globe, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useResumeStore } from '../../store/resumeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import EmptyState from '../ui/EmptyState';
import SkillNameInput from '../ui/SkillNameInput';
import { useUndoToast } from '../../lib/undoToast';
import type { Language } from '../../types/resume';
import { useT } from '../../lib/i18n';

const SKILL_LEVELS = [1, 2, 3, 4, 5];
const LEVEL_LABELS = ['Grundlagen', 'Grundkenntnisse', 'Fortgeschritten', 'Fachkundig', 'Experte'];
const LEVEL_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#007AFF'];

const LANG_LEVELS: Language['level'][] = ['Grundkenntnisse', 'Fortgeschritten', 'Fließend', 'Muttersprache'];

export default function SkillsEditor() {
  const t = useT();
  const {
    getActiveResume,
    addSkill, updateSkill, removeSkill, reorderSkills,
    addLanguage, updateLanguage, removeLanguage,
    restoreItemAt,
  } = useResumeStore();
  const showUndo = useUndoToast(s => s.show);
  const [dragging, setDragging] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const isMobile = useIsMobile();
  const resume = getActiveResume();
  if (!resume) return null;

  const { skills, languages } = resume;

  return (
    <div className="animate-fade-in">
      {/* Skills */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>
            <Zap size={10} style={{ display: 'inline', marginRight: 4 }} />
            Fähigkeiten ({skills.length})
          </div>
          <button className="btn-glass btn-primary btn-sm" onClick={() => addSkill(resume.id)}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {skills.length === 0 && (
          <EmptyState
            compact
            icon={Zap}
            title={t("Fähigkeiten hinzufügen")}
            description={t('Tools, Frameworks, Methoden — mit Niveau-Bewertung.')}
            ctaLabel={t('Erste Fähigkeit')}
            onCta={() => addSkill(resume.id)}
          />
        )}

        {skills.length > 0 && (
          <div style={{ display: 'flex', gap: 10, paddingLeft: isMobile ? 32 : 22, paddingRight: 38, marginBottom: 4 }}>
            <span style={{ flex: 2, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-4)' }}>{t('Fähigkeit')}</span>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-4)' }}>{t('Kategorie')}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-4)', minWidth: 114 }}>{t('Niveau')}</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {skills.map((skill, i) => (
            <div
              key={skill.id}
              className="glass-card"
              draggable={!isMobile}
              onDragStart={!isMobile ? () => setDragging(i) : undefined}
              onDragOver={!isMobile ? (e) => { e.preventDefault(); setDragOver(i); } : undefined}
              onDrop={!isMobile ? () => { if (dragging !== null && dragging !== i) reorderSkills(resume.id, dragging, i); setDragging(null); setDragOver(null); } : undefined}
              onDragEnd={!isMobile ? () => { setDragging(null); setDragOver(null); } : undefined}
              style={{
                padding: '12px 14px',
                opacity: dragging === i ? 0.5 : 1,
                border: dragOver === i && dragging !== i ? '1px solid rgba(0,122,255,0.6)' : undefined,
                transition: 'opacity 0.15s',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                    <button className="btn-glass btn-icon" disabled={i === 0} onClick={() => reorderSkills(resume.id, i, i - 1)}
                      style={{ padding: 3, opacity: i === 0 ? 0.2 : 0.6, boxShadow: 'none', background: 'transparent', border: 'none' }}>
                      <ChevronUp size={14} />
                    </button>
                    <button className="btn-glass btn-icon" disabled={i === skills.length - 1} onClick={() => reorderSkills(resume.id, i, i + 1)}
                      style={{ padding: 3, opacity: i === skills.length - 1 ? 0.2 : 0.6, boxShadow: 'none', background: 'transparent', border: 'none' }}>
                      <ChevronDown size={14} />
                    </button>
                  </div>
                ) : (
                  <GripVertical size={14} style={{ opacity: 0.3, flexShrink: 0, cursor: 'grab' }} />
                )}
                <SkillNameInput
                  placeholder={t('Fähigkeit (z.B. React, Python...)')}
                  value={skill.name} maxLength={80}
                  onChange={(name) => updateSkill(resume.id, skill.id, { name })}
                  onPick={(s) => updateSkill(resume.id, skill.id, { name: s.name, category: skill.category || s.category })}
                  style={{ flex: 2, fontSize: 13, padding: '8px 10px' }}
                />
                <input
                  className="input-glass"
                  placeholder={t('Kategorie')}
                  value={skill.category} maxLength={50}
                  onChange={(e) => updateSkill(resume.id, skill.id, { category: e.target.value })}
                  style={{ flex: 1, fontSize: 13, padding: '8px 10px' }}
                />
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  {SKILL_LEVELS.map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => updateSkill(resume.id, skill.id, { level: lvl as 1|2|3|4|5 })}
                      title={t(LEVEL_LABELS[lvl - 1])}
                      style={{
                        width: 16, height: 16, borderRadius: '50%',
                        background: skill.level >= lvl ? LEVEL_COLORS[skill.level - 1] : 'rgba(var(--rgb-fg),0.15)',
                        border: 'none', cursor: 'pointer', transition: '0.2s',
                        transform: skill.level >= lvl ? 'scale(1.15)' : 'scale(1)',
                      }}
                    />
                  ))}
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-4)', minWidth: 70 }}>
                  {t(LEVEL_LABELS[skill.level - 1])}
                </span>
                <button
                  className="btn-glass btn-danger btn-icon"
                  onClick={() => {
                    const snapshot = skill;
                    const idx = i;
                    removeSkill(resume.id, skill.id);
                    const label = skill.name || t('Fähigkeit');
                    showUndo(t('Fähigkeit «{label}» gelöscht').replace('{label}', label), () => restoreItemAt(resume.id, 'skills', snapshot, idx));
                  }}
                  style={{ padding: 6, flexShrink: 0 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

        </div>
      </div>

      <div className="divider" />

      {/* Languages */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>
            <Globe size={10} style={{ display: 'inline', marginRight: 4 }} />
            Sprachen ({languages.length})
          </div>
          <button className="btn-glass btn-primary btn-sm" onClick={() => addLanguage(resume.id)}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {languages.length > 0 && (
          <div style={{ display: 'flex', gap: 10, paddingLeft: isMobile ? 32 : 22, paddingRight: 38, marginBottom: 4 }}>
            <span style={{ flex: 2, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-4)' }}>{t('Sprache')}</span>
            <span style={{ flex: 1, fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-4)' }}>{t('Niveau')}</span>
            <span style={{ width: 166, flexShrink: 0 }} />
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {languages.map((lang) => (
            <div key={lang.id} className="glass-card" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                {/* Platzhalter, damit die Spalten ueber Skills+Sprachen gleich ausgerichtet sind
                    (Skills haben links einen Grip / Pfeile) */}
                <div style={{ width: isMobile ? 20 : 14, flexShrink: 0 }} />
                <input
                  className="input-glass"
                  placeholder={t('Sprache (z.B. Englisch)')}
                  value={lang.name} maxLength={60}
                  onChange={(e) => updateLanguage(resume.id, lang.id, { name: e.target.value })}
                  style={{ flex: 2, fontSize: 13, padding: '8px 10px' }}
                />
                <select
                  className="input-glass"
                  value={lang.level}
                  onChange={(e) => updateLanguage(resume.id, lang.id, { level: e.target.value as Language['level'] })}
                  style={{ flex: 1, fontSize: 13, padding: '8px 10px' }}
                >
                  {LANG_LEVELS.map((lvl) => (
                    <option key={lvl} value={lvl}>{t(lvl)}</option>
                  ))}
                </select>
                {/* Platzhalter in der Breite der Skills-Niveau-Spalte (5 Dots 16px + 4 Gaps 4px + 70px Label) */}
                <div style={{ width: 166, flexShrink: 0 }} />
                <button
                  className="btn-glass btn-danger btn-icon"
                  onClick={() => {
                    const snapshot = lang;
                    const idx = resume.languages.findIndex(l => l.id === lang.id);
                    removeLanguage(resume.id, lang.id);
                    const label = lang.name || t('Sprache');
                    showUndo(t('Sprache «{label}» gelöscht').replace('{label}', label), () => restoreItemAt(resume.id, 'languages', snapshot, idx));
                  }}
                  style={{ padding: 6, flexShrink: 0 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {languages.length === 0 && (
            <EmptyState
              compact
              icon={Globe}
              title={t("Sprachen hinzufügen")}
              description={t('Welche Sprachen sprichst du und auf welchem Niveau?')}
              ctaLabel={t('Sprache hinzufügen')}
              onCta={() => addLanguage(resume.id)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
