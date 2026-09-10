import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  User, Briefcase, GraduationCap, Zap, FolderOpen,
  Upload, Palette, AlertCircle, FileEdit, LayoutList, Lock,
  Pencil, Check, X, Languages, History, ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react';
import { useResumeStore } from '../store/resumeStore';
import { usePlan } from '../lib/plan';
import { useUIStore } from '../store/uiStore';
import type { EditorSection } from '../types/resume';
import type { LucideProps } from 'lucide-react';
import { getSectionOrder, setSectionOrder, moveSection } from '../lib/sectionOrder';
import { useT } from '../lib/i18n';
import PersonalInfoEditor from '../components/editor/PersonalInfoEditor';
import CoverLetterEditor from '../components/editor/CoverLetterEditor';
import ExperienceEditor from '../components/editor/ExperienceEditor';
import EducationEditor from '../components/editor/EducationEditor';
import SkillsEditor from '../components/editor/SkillsEditor';
import ProjectsEditor from '../components/editor/ProjectsEditor';
import DocumentUpload from '../components/editor/DocumentUpload';
import CustomSectionEditor from '../components/editor/CustomSectionEditor';
import TemplateSelector from '../components/templates/TemplateSelector';
import TranslateDialog from '../components/editor/TranslateDialog';
import VersionHistoryPanel from '../components/editor/VersionHistoryPanel';
import { useIsMobile } from '../hooks/useBreakpoint';

const SECTIONS: { id: EditorSection; label: string; short: string; icon: React.ComponentType<LucideProps> }[] = [
  { id: 'personal',     label: 'Persönliche Daten',     short: 'Person',    icon: User },
  { id: 'cover-letter', label: 'Motivationsschreiben',  short: 'Anschreiben', icon: FileEdit },
  { id: 'experience',   label: 'Berufserfahrung',        short: 'Erfahrung', icon: Briefcase },
  { id: 'education',    label: 'Ausbildung',             short: 'Bildung',   icon: GraduationCap },
  { id: 'skills',       label: 'Fähigkeiten',            short: 'Skills',    icon: Zap },
  { id: 'projects',     label: 'Projekte & Zertifikate', short: 'Projekte',  icon: FolderOpen },
  { id: 'documents',    label: 'Dokumente',              short: 'Dokumente', icon: Upload },
  { id: 'custom',       label: 'Eigene Sektionen',       short: 'Eigene',    icon: LayoutList },
  { id: 'template',     label: 'Design & Template',      short: 'Design',    icon: Palette },
];

export default function Editor() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const t = useT();
  const { getActiveResume, getActivePerson, activeSection, setActiveSection, resumes, renameResume } = useResumeStore();
  const { limits } = usePlan();
  const { showTranslate, setShowTranslate } = useUIStore();
  const resume = getActiveResume();
  const person = getActivePerson();

  // Inline-Umbenennen der aktuellen Bewerbungsmappe.
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  // Section-Reordering (Editor-Sidebar). Persistiert in localStorage.
  const knownSectionIds = SECTIONS.map(s => s.id);
  const [sectionOrder, setSectionOrderState] = useState<EditorSection[]>(() => getSectionOrder(knownSectionIds));
  const [reordering, setReordering] = useState(false);
  function move(id: EditorSection, delta: number) {
    const next = moveSection(sectionOrder, id, delta);
    setSectionOrderState(next);
    setSectionOrder(next);
  }
  const orderedSections = sectionOrder
    .map(id => SECTIONS.find(s => s.id === id))
    .filter(Boolean) as typeof SECTIONS;
  const startRename = () => { if (resume) { setRenameValue(resume.name ?? ''); setRenaming(true); } };
  const commitRename = () => {
    if (resume && renameValue.trim()) renameResume(resume.id, renameValue.trim());
    setRenaming(false);
  };
  const cancelRename = () => setRenaming(false);

  // Check if the active resume is frozen (beyond plan limit)
  const resumeIndex = resume ? resumes.findIndex(r => r.id === resume.id) : -1;
  const isFrozen = limits.resumes < Infinity && resumeIndex >= limits.resumes;

  if (!resume || !person) {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '48px 32px', textAlign: 'center', margin: 'auto' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 600 }}>{t('Kein Lebenslauf ausgewählt')}</h3>
        <p style={{ color: 'var(--text-4)', marginBottom: 20 }}>
          Wählen Sie eine Person in der Seitenleiste oder legen Sie eine neue an.
        </p>
        <button className="btn-glass btn-primary" onClick={() => navigate('/')}>
          Zum Dashboard
        </button>
      </div>
    );
  }

  const renderSection = () => {
    switch (activeSection) {
      case 'personal':     return <PersonalInfoEditor />;
      case 'cover-letter': return <CoverLetterEditor />;
      case 'experience':   return <ExperienceEditor />;
      case 'education':    return <EducationEditor />;
      case 'skills':       return <SkillsEditor />;
      case 'projects':     return <ProjectsEditor />;
      case 'documents':    return <DocumentUpload />;
      case 'custom':       return <CustomSectionEditor />;
      case 'template':     return <TemplateSelector />;
      default:           return null;
    }
  };

  const currentSection = SECTIONS.find(s => s.id === activeSection);

  // ── Frozen overlay ────────────────────────────────────────
  if (isFrozen) {
    return (
      <div className="glass-card animate-fade-in" style={{ padding: '48px 32px', textAlign: 'center', margin: 'auto', maxWidth: 400 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Lock size={24} style={{ color: 'var(--ios-amber)' }} />
        </div>
        <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700 }}>{t('Mappe eingefroren')}</h3>
        <p style={{ color: 'var(--text-4)', fontSize: 13, marginBottom: 20 }}>
          {t('«{name}» überschreitet dein Free-Limit von {n} Mappen. Upgrade auf Pro oder lösche andere Mappen um diese wieder zu bearbeiten.')
            .replace('{name}', resume.name || t('Bewerbungsmappe'))
            .replace('{n}', String(limits.resumes))}
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-glass" onClick={() => navigate('/')}>← Dashboard</button>
          <button
            className="btn-glass"
            onClick={() => navigate('/account')}
            style={{ background: 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(255,55,95,0.2))', border: '1px solid rgba(255,159,10,0.4)', color: 'var(--ios-amber)', fontWeight: 700 }}
          >
            Upgrade auf Pro
          </button>
        </div>
      </div>
    );
  }

  // ── Mobile layout: horizontal tab bar ─────────────────────
  if (isMobile) {
    return (
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Rename-Mappe-Leiste ueber den Tabs */}
        <div style={{ paddingBottom: 8, flexShrink: 0 }}>
          <MappeRename
            renaming={renaming}
            value={renameValue}
            onValueChange={setRenameValue}
            currentName={resume.name}
            onStart={startRename}
            onCommit={commitRename}
            onCancel={cancelRename}
          />
        </div>
        {/* Horizontal scrollable tab bar */}
        <div style={{
          display: 'flex', overflowX: 'auto', gap: 6, paddingBottom: 8,
          flexShrink: 0, scrollbarWidth: 'none', msOverflowStyle: 'none',
        }}>
          {orderedSections.map(({ id, short, icon: Icon }) => {
            const isActive = activeSection === id;
            return (
              <button key={id} className="btn-glass" onClick={() => setActiveSection(id)} style={{
                flexShrink: 0, padding: '8px 12px', borderRadius: 'var(--radius-sm)', boxShadow: 'none',
                background: isActive ? 'linear-gradient(135deg, rgba(0,122,255,0.3), rgba(88,86,214,0.25))' : 'rgba(var(--rgb-fg),0.07)',
                border: isActive ? '1px solid rgba(0,122,255,0.45)' : '1px solid rgba(var(--rgb-fg),0.1)',
                display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
              }}>
                <Icon size={14} style={{ opacity: isActive ? 1 : 0.55 }} />
                <span style={{ fontSize: 12, fontWeight: isActive ? 600 : 400, opacity: isActive ? 1 : 0.65 }}>{t(short)}</span>
              </button>
            );
          })}
        </div>

        {/* Editor content — also handles 'history' on mobile */}
        <div className="glass" style={{ flex: 1, borderRadius: 'var(--radius-lg)', overflow: 'auto', padding: '16px 16px' }}>
          {showTranslate && <TranslateDialog onClose={() => setShowTranslate(false)} />}
          <div key={activeSection} className="animate-section-in">
            {activeSection === 'history'
              ? <VersionHistoryPanel resumeId={resume.id} />
              : renderSection()
            }
          </div>
        </div>
      </div>
    );
  }

  // ── Desktop layout: zwei Spalten (Sektions-Rail links, Inhalt rechts) ──
  return (
    <div className="animate-fade-in" style={{ display: 'flex', gap: 12, height: '100%', overflow: 'hidden' }}>
      {showTranslate && <TranslateDialog onClose={() => setShowTranslate(false)} />}

      {/* Links: Rail mit Editor-Sektionen + Aktionen */}
      <aside className="glass" style={{ width: 210, flexShrink: 0, borderRadius: 'var(--radius-lg)', overflow: 'auto', padding: 8 }}>
        {orderedSections.map(({ id, label, icon: Icon }, i) => {
          const active = activeSection === id && activeSection !== 'history';
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'center', gap: 2, marginBottom: 2 }}>
              <button className="btn-glass"
                onClick={() => { if (!reordering) setActiveSection(id); }}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10,
                  padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                  boxShadow: 'none',
                  background: active ? 'rgba(0,122,255,0.2)' : 'transparent',
                  border: active ? '1px solid rgba(0,122,255,0.35)' : '1px solid transparent',
                  cursor: reordering ? 'default' : 'pointer',
                }}>
                <Icon size={14} style={{ opacity: active ? 1 : 0.65 }} />
                <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, opacity: active ? 1 : 0.78 }}>{t(label)}</span>
              </button>
              {reordering && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                  <button
                    onClick={() => move(id, -1)}
                    disabled={i === 0}
                    title={t("Nach oben")}
                    style={{
                      background: 'rgba(var(--rgb-fg),0.06)', border: '1px solid var(--border-subtle)',
                      borderRadius: 4, padding: 1, cursor: i === 0 ? 'not-allowed' : 'pointer',
                      opacity: i === 0 ? 0.3 : 0.85, color: 'var(--text-1)',
                    }}
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    onClick={() => move(id, 1)}
                    disabled={i === orderedSections.length - 1}
                    title={t("Nach unten")}
                    style={{
                      background: 'rgba(var(--rgb-fg),0.06)', border: '1px solid var(--border-subtle)',
                      borderRadius: 4, padding: 1, cursor: i === orderedSections.length - 1 ? 'not-allowed' : 'pointer',
                      opacity: i === orderedSections.length - 1 ? 0.3 : 0.85, color: 'var(--text-1)',
                    }}
                  >
                    <ArrowDown size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ height: 1, background: 'rgba(var(--rgb-fg),0.08)', margin: '6px 4px' }} />

        {/* Reihenfolge anpassen */}
        <button className="btn-glass"
          onClick={() => setReordering(v => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10,
            padding: '8px 10px', marginBottom: 2, borderRadius: 'var(--radius-sm)', boxShadow: 'none',
            background: reordering ? 'rgba(0,122,255,0.2)' : 'transparent',
            border: reordering ? '1px solid rgba(0,122,255,0.35)' : '1px solid transparent',
          }}>
          <ArrowUpDown size={14} style={{ opacity: reordering ? 1 : 0.65 }} />
          <span style={{ fontSize: 13, opacity: 0.78 }}>{reordering ? t('Fertig') : t('Reihenfolge')}</span>
        </button>

        {/* Übersetzen */}
        <button className="btn-glass"
          onClick={() => setShowTranslate(true)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, padding: '8px 10px', marginBottom: 2, borderRadius: 'var(--radius-sm)', boxShadow: 'none', background: 'transparent', border: '1px solid transparent' }}>
          <Languages size={14} style={{ opacity: 0.65 }} />
          <span style={{ fontSize: 13, opacity: 0.78 }}>{t('Übersetzen')}</span>
        </button>

        {/* Versionen (Pro) */}
        {limits.versionHistory ? (
          <button className="btn-glass"
            onClick={() => setActiveSection(activeSection === 'history' ? 'personal' : 'history')}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, padding: '8px 10px', marginBottom: 2,
              borderRadius: 'var(--radius-sm)', boxShadow: 'none',
              background: activeSection === 'history' ? 'rgba(0,122,255,0.2)' : 'transparent',
              border: activeSection === 'history' ? '1px solid rgba(0,122,255,0.35)' : '1px solid transparent',
            }}>
            <History size={14} style={{ opacity: activeSection === 'history' ? 1 : 0.65 }} />
            <span style={{ fontSize: 13, opacity: 0.78 }}>{t('Versionen')}</span>
          </button>
        ) : (
          <button disabled className="btn-glass"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', boxShadow: 'none', opacity: 0.4, cursor: 'not-allowed', background: 'transparent', border: '1px solid transparent' }}>
            <History size={14} />
            <span style={{ fontSize: 13, flex: 1, textAlign: 'left' }}>{t('Versionen')}</span>
            <Lock size={12} />
          </button>
        )}
      </aside>

      {/* Rechts: Inhalt */}
      <div className="glass" style={{ flex: 1, overflow: 'auto', borderRadius: 'var(--radius-lg)', padding: '20px 28px 20px 22px' }}>
        <div key={activeSection} className="animate-section-in">
          {activeSection === 'history' ? (
            <VersionHistoryPanel resumeId={resume.id} />
          ) : (
            <>
              <div style={{ marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid rgba(var(--rgb-fg),0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    {currentSection?.icon && (
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,122,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <currentSection.icon size={15} />
                      </div>
                    )}
                    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{currentSection ? t(currentSection.label) : ''}</h2>
                  </div>
                  <MappeRename
                    renaming={renaming}
                    value={renameValue}
                    onValueChange={setRenameValue}
                    currentName={resume.name}
                    onStart={startRename}
                    onCommit={commitRename}
                    onCancel={cancelRename}
                  />
                </div>
              </div>
              {renderSection()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface MappeRenameProps {
  renaming: boolean;
  value: string;
  currentName: string;
  onValueChange: (v: string) => void;
  onStart: () => void;
  onCommit: () => void;
  onCancel: () => void;
}

function MappeRename({ renaming, value, currentName, onValueChange, onStart, onCommit, onCancel }: MappeRenameProps) {
  const t = useT();
  if (renaming) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <input
          className="input-glass"
          autoFocus
          value={value}
          maxLength={80}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onCommit(); if (e.key === 'Escape') onCancel(); }}
          placeholder={t("Name der Bewerbungsmappe")}
          style={{ fontSize: 13, padding: '7px 10px', width: 240, maxWidth: '60vw' }}
        />
        <button className="btn-glass btn-icon btn-sm" onClick={onCommit} title={t("Speichern")} style={{ padding: 6 }}>
          <Check size={14} style={{ color: 'var(--ios-green)' }} />
        </button>
        <button className="btn-glass btn-icon btn-sm" onClick={onCancel} title={t("Abbrechen")} style={{ padding: 6 }}>
          <X size={14} />
        </button>
      </div>
    );
  }
  return (
    <button
      className="btn-glass btn-sm"
      onClick={onStart}
      title={t("Bewerbungsmappe umbenennen")}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', maxWidth: '100%' }}
    >
      <Pencil size={14} style={{ opacity: 0.6, flexShrink: 0 }} />
      <span style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {currentName || t('Bewerbungsmappe')}
      </span>
    </button>
  );
}
