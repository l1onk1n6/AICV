import { Plus, Trash2, FolderOpen, Award, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';
import MonthYearPicker from '../ui/MonthYearPicker';
import { useState } from 'react';
import { useResumeStore } from '../../store/resumeStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import EmptyState from '../ui/EmptyState';
import { useUndoToast } from '../../lib/undoToast';
import { useT } from '../../lib/i18n';

export default function ProjectsEditor() {
  const t = useT();
  const {
    getActiveResume,
    addProject, updateProject, removeProject, reorderProjects,
    addCertificate, updateCertificate, removeCertificate, reorderCertificates,
    restoreItemAt,
  } = useResumeStore();
  const showUndo = useUndoToast(s => s.show);
  const resume = getActiveResume();
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [expandedCert, setExpandedCert] = useState<string | null>(null);
  const [draggingP, setDraggingP] = useState<number | null>(null);
  const [dragOverP, setDragOverP] = useState<number | null>(null);
  const [draggingC, setDraggingC] = useState<number | null>(null);
  const [dragOverC, setDragOverC] = useState<number | null>(null);
  const isMobile = useIsMobile();

  if (!resume) return null;

  const { projects, certificates } = resume;

  function handleDropP(to: number) {
    if (draggingP !== null && draggingP !== to) reorderProjects(resume!.id, draggingP, to);
    setDraggingP(null); setDragOverP(null);
  }

  function handleDropC(to: number) {
    if (draggingC !== null && draggingC !== to) reorderCertificates(resume!.id, draggingC, to);
    setDraggingC(null); setDragOverC(null);
  }

  return (
    <div className="animate-fade-in">
      {/* Projects */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>
            <FolderOpen size={10} style={{ display: 'inline', marginRight: 4 }} />
            Projekte ({projects.length})
          </div>
          <button className="btn-glass btn-primary btn-sm" onClick={() => addProject(resume.id)}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {projects.map((project, i) => (
          <div
            key={project.id}
            className="glass-card animate-fade-in"
            draggable={!isMobile}
            onDragStart={!isMobile ? () => setDraggingP(i) : undefined}
            onDragOver={!isMobile ? (e) => { e.preventDefault(); setDragOverP(i); } : undefined}
            onDrop={!isMobile ? () => handleDropP(i) : undefined}
            onDragEnd={!isMobile ? () => { setDraggingP(null); setDragOverP(null); } : undefined}
            style={{
              padding: 14, marginBottom: 8,
              opacity: draggingP === i ? 0.5 : 1,
              border: dragOverP === i && draggingP !== i ? '1px solid rgba(0,122,255,0.6)' : undefined,
              transition: 'opacity 0.15s, border 0.15s',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedProject(expandedProject === project.id ? null : project.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                {isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-glass btn-icon"
                      disabled={i === 0}
                      onClick={() => reorderProjects(resume.id, i, i - 1)}
                      style={{ padding: 3, opacity: i === 0 ? 0.2 : 0.6, boxShadow: 'none', background: 'transparent', border: 'none' }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="btn-glass btn-icon"
                      disabled={i === projects.length - 1}
                      onClick={() => reorderProjects(resume.id, i, i + 1)}
                      style={{ padding: 3, opacity: i === projects.length - 1 ? 0.2 : 0.6, boxShadow: 'none', background: 'transparent', border: 'none' }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                ) : (
                  <GripVertical size={14} style={{ opacity: 0.3, flexShrink: 0, cursor: 'grab' }} />
                )}
                <div style={{ fontWeight: 600, fontSize: 14 }}>{project.name || `Projekt ${i + 1}`}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn-glass btn-danger btn-sm btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    const snapshot = project;
                    const idx = i;
                    removeProject(resume.id, project.id);
                    const label = project.name || t('Projekt');
                    showUndo(t('Projekt «{label}» gelöscht').replace('{label}', label), () => restoreItemAt(resume.id, 'projects', snapshot, idx));
                  }}
                  style={{ padding: 6 }}
                >
                  <Trash2 size={12} />
                </button>
                {expandedProject === project.id ? <ChevronUp size={14} style={{ opacity: 0.5 }} /> : <ChevronDown size={14} style={{ opacity: 0.5 }} />}
              </div>
            </div>

            {expandedProject === project.id && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label className="section-label">{t('Projektname')}</label>
                    <input className="input-glass" placeholder="z.B. E-Commerce App" value={project.name} maxLength={150}
                      onChange={(e) => updateProject(resume.id, project.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="section-label">{t('URL')}</label>
                    <input className="input-glass" placeholder="github.com/..." value={project.url} maxLength={300}
                      onChange={(e) => updateProject(resume.id, project.id, { url: e.target.value })} />
                  </div>
                  <div>
                    <label className="section-label">{t('Von')}</label>
                    <MonthYearPicker value={project.startDate} onChange={(v) => updateProject(resume.id, project.id, { startDate: v })} />
                  </div>
                  <div>
                    <label className="section-label">{t('Bis')}</label>
                    <MonthYearPicker value={project.endDate} onChange={(v) => updateProject(resume.id, project.id, { endDate: v })} />
                  </div>
                  <div style={{ gridColumn: isMobile ? 'auto' : 'span 2' }}>
                    <label className="section-label">{t('Technologien (Komma-getrennt)')}</label>
                    <TechnologiesInput
                      value={project.technologies}
                      onChange={(techs) => updateProject(resume.id, project.id, { technologies: techs })}
                    />
                  </div>
                </div>
                <div>
                  <label className="section-label">{t('Beschreibung')}</label>
                  <textarea className="input-glass"
                    placeholder={'Pro Zeile ein Stichpunkt:\nAufbau einer REST-API mit 12 Endpunkten\nReduzierung der Ladezeit um 60%'}
                    value={project.description} maxLength={1000}
                    rows={4}
                    onChange={(e) => updateProject(resume.id, project.id, { description: e.target.value })} />
                  <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>
                    Tipp: Einfach tippen — pro Zeile ein Punkt. Bullets fügt das System automatisch ein.
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {projects.length === 0 && (
          <EmptyState
            compact
            icon={FolderOpen}
            title={t("Projekte hinzufügen")}
            description={t('Nebenprojekte, Open Source, Praktika — alles was dich auszeichnet.')}
            ctaLabel={t('Projekt anlegen')}
            onCta={() => addProject(resume.id)}
          />
        )}
      </div>

      <div className="divider" />

      {/* Certificates */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="section-label" style={{ marginBottom: 0 }}>
            <Award size={10} style={{ display: 'inline', marginRight: 4 }} />
            Zertifikate ({certificates.length})
          </div>
          <button className="btn-glass btn-primary btn-sm" onClick={() => addCertificate(resume.id)}>
            <Plus size={14} /> Hinzufügen
          </button>
        </div>

        {certificates.map((cert, i) => (
          <div
            key={cert.id}
            className="glass-card animate-fade-in"
            draggable={!isMobile}
            onDragStart={!isMobile ? () => setDraggingC(i) : undefined}
            onDragOver={!isMobile ? (e) => { e.preventDefault(); setDragOverC(i); } : undefined}
            onDrop={!isMobile ? () => handleDropC(i) : undefined}
            onDragEnd={!isMobile ? () => { setDraggingC(null); setDragOverC(null); } : undefined}
            style={{
              padding: 14, marginBottom: 8,
              opacity: draggingC === i ? 0.5 : 1,
              border: dragOverC === i && draggingC !== i ? '1px solid rgba(0,122,255,0.6)' : undefined,
              transition: 'opacity 0.15s, border 0.15s',
            }}
          >
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              onClick={() => setExpandedCert(expandedCert === cert.id ? null : cert.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                {isMobile ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-glass btn-icon"
                      disabled={i === 0}
                      onClick={() => reorderCertificates(resume.id, i, i - 1)}
                      style={{ padding: 3, opacity: i === 0 ? 0.2 : 0.6, boxShadow: 'none', background: 'transparent', border: 'none' }}
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      className="btn-glass btn-icon"
                      disabled={i === certificates.length - 1}
                      onClick={() => reorderCertificates(resume.id, i, i + 1)}
                      style={{ padding: 3, opacity: i === certificates.length - 1 ? 0.2 : 0.6, boxShadow: 'none', background: 'transparent', border: 'none' }}
                    >
                      <ChevronDown size={14} />
                    </button>
                  </div>
                ) : (
                  <GripVertical size={14} style={{ opacity: 0.3, flexShrink: 0, cursor: 'grab' }} />
                )}
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cert.name || `Zertifikat ${i + 1}`}
                  </div>
                  {(cert.issuer || cert.date) && (
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {[cert.issuer, cert.date].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <button
                  className="btn-glass btn-danger btn-sm btn-icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    const snapshot = cert;
                    const idx = i;
                    removeCertificate(resume.id, cert.id);
                    const label = cert.name || t('Zertifikat');
                    showUndo(t('Zertifikat «{label}» gelöscht').replace('{label}', label), () => restoreItemAt(resume.id, 'certificates', snapshot, idx));
                  }}
                  style={{ padding: 6 }}
                >
                  <Trash2 size={12} />
                </button>
                {expandedCert === cert.id ? <ChevronUp size={14} style={{ opacity: 0.5 }} /> : <ChevronDown size={14} style={{ opacity: 0.5 }} />}
              </div>
            </div>

            {expandedCert === cert.id && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10 }}>
                  <div>
                    <label className="section-label">{t('Zertifikat')}</label>
                    <input className="input-glass" placeholder={t('z.B. AWS Certified')} value={cert.name} maxLength={150}
                      onChange={(e) => updateCertificate(resume.id, cert.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="section-label">{t('Aussteller')}</label>
                    <input className="input-glass" placeholder={t('z.B. Amazon Web Services')} value={cert.issuer} maxLength={150}
                      onChange={(e) => updateCertificate(resume.id, cert.id, { issuer: e.target.value })} />
                  </div>
                  <div>
                    <label className="section-label">{t('Datum')}</label>
                    <MonthYearPicker value={cert.date} onChange={(v) => updateCertificate(resume.id, cert.id, { date: v })} />
                  </div>
                  <div>
                    <label className="section-label">{t('URL')}</label>
                    <input className="input-glass" placeholder={t('Zertifikat-Link')} value={cert.url} maxLength={300}
                      onChange={(e) => updateCertificate(resume.id, cert.id, { url: e.target.value })} />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {certificates.length === 0 && (
          <EmptyState
            compact
            icon={Award}
            title={t("Zertifikate hinzufügen")}
            description={t('Abschlüsse, Weiterbildungen, Online-Kurse.')}
            ctaLabel={t('Zertifikat anlegen')}
            onCta={() => addCertificate(resume.id)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Technologien-Input mit lokalem Raw-String-State.
 * Nur beim Blur wird in ein Array geparst — waehrend des Tippens bleiben
 * Leerzeichen erhalten (sonst wuerde `.map(trim)` sie live wegfressen).
 */
function TechnologiesInput({ value, onChange }: { value: string[]; onChange: (techs: string[]) => void }) {
  const [raw, setRaw] = useState(value.join(', '));
  return (
    <input
      className="input-glass"
      placeholder="z.B. React, TypeScript, Node.js"
      value={raw}
      maxLength={300}
      onChange={(e) => setRaw(e.target.value)}
      onBlur={() => {
        const techs = raw.split(',').map(t => t.trim()).filter(Boolean);
        onChange(techs);
        setRaw(techs.join(', '));
      }}
    />
  );
}
