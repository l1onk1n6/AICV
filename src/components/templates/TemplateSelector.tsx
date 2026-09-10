import { Check, Palette } from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { TEMPLATES } from './templateConfig';
import TemplateMiniPreview from './TemplateMiniPreview';
import type { TemplateId } from '../../types/resume';
import { useT } from '../../lib/i18n';

const ACCENT_COLORS = [
  '#007AFF', '#5856D6', '#AF52DE', '#FF2D55', '#FF3B30',
  '#FF9500', '#FFCC00', '#34C759', '#5AC8FA', '#00C7BE',
  '#1C1C1E', '#636366',
];

export default function TemplateSelector() {
  const t = useT();
  const { getActiveResume, setTemplate, setAccentColor } = useResumeStore();
  const resume = getActiveResume();

  if (!resume) return null;

  return (
    <div className="animate-fade-in">
      {/* Template Grid */}
      <div className="section-label" style={{ marginBottom: 12 }}>
        <Palette size={10} style={{ display: 'inline', marginRight: 4 }} />
        {t('Template wählen')}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 10,
        marginBottom: 24,
        paddingRight: 2,
      }}>
        {TEMPLATES.map((tmpl) => {
          const isSelected = resume.templateId === tmpl.id;
          return (
            <button
              key={tmpl.id}
              onClick={() => setTemplate(resume.id, tmpl.id as TemplateId)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div
                className="glass-card"
                style={{
                  padding: 12,
                  border: isSelected
                    ? `2px solid ${resume.accentColor}`
                    : '1px solid rgba(var(--rgb-fg),0.15)',
                  boxShadow: isSelected
                    ? `0 0 0 1px ${resume.accentColor}40, 0 8px 24px rgba(0,0,0,0.2)`
                    : 'var(--glass-shadow)',
                  transition: 'all 0.2s',
                }}
              >
                {/* Thumbnail — realistic layout preview */}
                <div style={{ position: 'relative', marginBottom: 10 }}>
                  <TemplateMiniPreview
                    templateId={tmpl.id as TemplateId}
                    accent={resume.accentColor}
                    height={110}
                  />
                  {isSelected && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 22, height: 22, borderRadius: '50%',
                      background: resume.accentColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                    }}>
                      <Check size={12} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{tmpl.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-4)', marginBottom: 6, lineHeight: 1.3 }}>
                  {t(tmpl.description)}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {tmpl.tags.map((tag) => (
                    <span key={tag} className="badge" style={{ fontSize: 10 }}>{t(tag)}</span>
                  ))}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Accent Color */}
      <div className="section-label" style={{ marginBottom: 10 }}>{t('Akzentfarbe')}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {ACCENT_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setAccentColor(resume.id, color)}
            title={color}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: color,
              border: resume.accentColor === color
                ? '3px solid #fff'
                : '2px solid rgba(var(--rgb-fg),0.2)',
              cursor: 'pointer',
              transition: 'all 0.15s',
              transform: resume.accentColor === color ? 'scale(1.2)' : 'scale(1)',
              boxShadow: resume.accentColor === color
                ? `0 0 12px ${color}80`
                : 'none',
            }}
          />
        ))}

        {/* Custom color */}
        <label title={t('Eigene Farbe')} style={{ position: 'relative', cursor: 'pointer' }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'conic-gradient(red, yellow, green, blue, red)',
            border: '2px solid rgba(var(--rgb-fg),0.3)',
            cursor: 'pointer',
          }} />
          <input
            type="color"
            value={resume.accentColor}
            onChange={(e) => setAccentColor(resume.id, e.target.value)}
            style={{
              position: 'absolute', inset: 0, opacity: 0,
              width: '100%', height: '100%', cursor: 'pointer',
            }}
          />
        </label>
      </div>
    </div>
  );
}
