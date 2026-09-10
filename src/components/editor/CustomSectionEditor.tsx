import { Plus, Trash2, GripVertical, X, Lock, LayoutList } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { usePlan } from '../../lib/plan';
import { UpgradeModal } from '../ui/ProGate';
import { useState } from 'react';
import EmptyState from '../ui/EmptyState';
import { useT } from '../../lib/i18n';

export default function CustomSectionEditor() {
  const t = useT();
  const { getActiveResume, addCustomSection, updateCustomSection, removeCustomSection, reorderCustomSections } = useResumeStore();
  const { limits } = usePlan();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const resume = getActiveResume();
  if (!resume) return null;

  const sections = resume.customSections ?? [];

  if (limits.customSections === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', textAlign: 'center', gap: 16 }}>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} highlightId="custom" />}
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={22} style={{ color: 'var(--ios-amber)' }} />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{t('Eigene Sektionen')}</div>
          <div style={{ fontSize: 13, color: 'var(--text-4)', maxWidth: 280 }}>
            {t('Erstelle eigene Abschnitte wie Projekte, Publikationen oder Zertifikate — mit PATH Pro.')}
          </div>
        </div>
        <button
          className="btn-glass"
          onClick={() => setShowUpgrade(true)}
          style={{ padding: '10px 22px', fontWeight: 700, fontSize: 13, background: 'linear-gradient(135deg, rgba(255,159,10,0.3), rgba(255,55,95,0.2))', border: '1px solid rgba(255,159,10,0.4)', color: 'var(--ios-amber)' }}
        >
          {t('Upgrade auf Pro')}
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {sections.length === 0 && (
        <EmptyState
          icon={LayoutList}
          title={t("Eigene Sektionen")}
          description={t('Publikationen, Ehrenamt, Interessen, Auszeichnungen — gestalte deinen CV flexibel.')}
          ctaLabel={t('Erste Sektion anlegen')}
          onCta={() => addCustomSection(resume.id)}
        />
      )}

      {sections.map((section, sIdx) => (
        <div key={section.id} className="glass-card" style={{ padding: 16 }}>
          {/* Section header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span title={t("Verschieben")} style={{ display: 'flex', flexShrink: 0 }}>
              <GripVertical size={16} style={{ opacity: 0.3, cursor: 'grab' }} />
            </span>
            <input
              className="input-glass"
              placeholder={t('Titel der Sektion…')}
              value={section.title} maxLength={100}
              onChange={(e) => updateCustomSection(resume.id, section.id, { title: e.target.value })}
              style={{ flex: 1, fontWeight: 600, fontSize: 14 }}
            />
            <button
              className="btn-glass btn-danger btn-icon"
              onClick={() => { if (confirm(`Sektion "${section.title}" löschen?`)) removeCustomSection(resume.id, section.id); }}
              style={{ padding: 6, flexShrink: 0 }}
            >
              <Trash2 size={14} />
            </button>
          </div>

          {/* Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {section.items.map((item, iIdx) => (
              <div key={iIdx} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <textarea
                  className="input-glass"
                  placeholder={`Eintrag ${iIdx + 1}…`}
                  value={item} maxLength={500}
                  rows={2}
                  onChange={(e) => {
                    const newItems = [...section.items];
                    newItems[iIdx] = e.target.value;
                    updateCustomSection(resume.id, section.id, { items: newItems });
                  }}
                  style={{ flex: 1, resize: 'vertical', fontSize: 13 }}
                />
                {section.items.length > 1 && (
                  <button
                    className="btn-glass btn-icon"
                    onClick={() => {
                      const newItems = section.items.filter((_, i) => i !== iIdx);
                      updateCustomSection(resume.id, section.id, { items: newItems });
                    }}
                    style={{ padding: 6, marginTop: 2, flexShrink: 0, opacity: 0.5 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add item */}
          <button
            className="btn-glass btn-sm"
            onClick={() => updateCustomSection(resume.id, section.id, { items: [...section.items, ''] })}
            style={{ marginTop: 8, fontSize: 12 }}
          >
            <Plus size={12} /> {t('Eintrag hinzufügen')}
          </button>

          {/* Reorder buttons */}
          {sections.length > 1 && (
            <div style={{ display: 'flex', gap: 4, marginTop: 8, justifyContent: 'flex-end' }}>
              {sIdx > 0 && (
                <button className="btn-glass btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => reorderCustomSections(resume.id, sIdx, sIdx - 1)}>
                  ↑
                </button>
              )}
              {sIdx < sections.length - 1 && (
                <button className="btn-glass btn-sm" style={{ fontSize: 11, padding: '3px 8px' }}
                  onClick={() => reorderCustomSections(resume.id, sIdx, sIdx + 1)}>
                  ↓
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      <button
        className="btn-glass btn-primary"
        onClick={() => addCustomSection(resume.id)}
        style={{ width: '100%' }}
      >
        <Plus size={14} /> {t('Sektion hinzufügen')}
      </button>
    </div>
  );
}
