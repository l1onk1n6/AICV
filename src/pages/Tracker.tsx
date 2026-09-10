import { useState } from 'react';
import { Plus, Trash2, ExternalLink, ChevronDown, ChevronUp, ClipboardList, Link } from 'lucide-react';
import { useTrackerStore, type Application, type ApplicationStatus, type ApplicationType } from '../store/trackerStore';
import { useResumeStore } from '../store/resumeStore';
import { useT } from '../lib/i18n';
import { useIsMobile } from '../hooks/useBreakpoint';
import { CustomSelect } from '../components/ui/CustomSelect';

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; bg: string }> = {
  offen:          { label: 'Offen',           color: 'var(--text-3)', bg: 'rgba(var(--rgb-fg),0.08)' },
  beworben:       { label: 'Beworben',        color: 'var(--ios-blue)',                bg: 'rgba(0,122,255,0.15)'    },
  interview:      { label: 'Interview',       color: 'var(--ios-amber)',                bg: 'rgba(255,159,10,0.15)'   },
  angebot:        { label: 'Angebot',         color: 'var(--ios-green)',                bg: 'rgba(52,199,89,0.15)'    },
  abgelehnt:      { label: 'Abgelehnt',       color: 'var(--ios-red)',                bg: 'rgba(255,59,48,0.12)'    },
  zurueckgezogen: { label: 'Zurückgezogen',   color: 'var(--text-4)', bg: 'rgba(var(--rgb-fg),0.05)'  },
};

const TYPE_CONFIG: Record<ApplicationType, { label: string; icon: string }> = {
  online:      { label: 'Online-Portal', icon: '🌐' },
  email:       { label: 'E-Mail',        icon: '✉️' },
  postalisch:  { label: 'Postalisch',    icon: '📮' },
  persoenlich: { label: 'Persönlich',    icon: '🤝' },
  telefonisch: { label: 'Telefonisch',   icon: '📞' },
};

const ALL_STATUSES = Object.keys(STATUS_CONFIG) as ApplicationStatus[];
const ALL_TYPES = Object.keys(TYPE_CONFIG) as ApplicationType[];

const SORT_OPTIONS = [
  { value: 'date-desc',   label: 'Datum (neu zuerst)' },
  { value: 'date-asc',    label: 'Datum (alt zuerst)' },
  { value: 'company-asc', label: 'Firma (A–Z)' },
  { value: 'status',      label: 'Status' },
];


function TypeBadge({ type }: { type: ApplicationType }) {
  const t = useT();
  const cfg = TYPE_CONFIG[type];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 20,
      fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
      color: 'var(--text-4)',
      background: 'rgba(var(--rgb-fg),0.06)',
      border: '1px solid rgba(var(--rgb-fg),0.1)',
    }}>
      {cfg.icon} {t(cfg.label)}
    </span>
  );
}

function formatDate(d: string) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}.${m}.${y}`;
}

function sortApps(apps: Application[], sort: string) {
  const sorted = [...apps];
  if (sort === 'date-desc') sorted.sort((a, b) => b.appliedDate.localeCompare(a.appliedDate));
  else if (sort === 'date-asc') sorted.sort((a, b) => a.appliedDate.localeCompare(b.appliedDate));
  else if (sort === 'company-asc') sorted.sort((a, b) => a.company.localeCompare(b.company));
  else if (sort === 'status') sorted.sort((a, b) => ALL_STATUSES.indexOf(a.status) - ALL_STATUSES.indexOf(b.status));
  return sorted;
}

export default function Tracker() {
  const t = useT();
  const { applications, addApplication, updateApplication, removeApplication } = useTrackerStore();
  const { resumes, persons } = useResumeStore();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<ApplicationStatus | 'all'>('all');
  const [sort, setSort] = useState('date-desc');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const filtered = sortApps(
    filter === 'all' ? applications : applications.filter((a) => a.status === filter),
    sort
  );

  const counts = ALL_STATUSES.reduce((acc, s) => {
    acc[s] = applications.filter((a) => a.status === s).length;
    return acc;
  }, {} as Record<ApplicationStatus, number>);

  function handleImportFromResume(resumeId: string) {
    const resume = resumes.find((r) => r.id === resumeId);
    if (!resume) return;
    const patch: Partial<Omit<Application, 'id'>> = {
      company: resume.name || '',
      position: resume.personalInfo?.title || '',
      deadline: resume.deadline || '',
      url: resume.jobUrl || '',
      resumeId: resume.id,
      status: 'offen',
      type: 'online',
    };
    // addApplication creates a blank one first, then we patch it
    useTrackerStore.getState().addApplication();
    const newId = useTrackerStore.getState().applications[0].id;
    useTrackerStore.getState().updateApplication(newId, patch);
    setShowImportModal(false);
    setExpanded(newId);
  }

  function handleResumeLink(appId: string, app: Application, resumeId: string) {
    const patch: Partial<Omit<Application, 'id'>> = { resumeId };
    if (resumeId) {
      const resume = resumes.find((r) => r.id === resumeId);
      if (resume) {
        if (!app.company) patch.company = resume.name || '';
        if (!app.position) patch.position = resume.personalInfo?.title || '';
        if (!app.deadline) patch.deadline = resume.deadline || '';
        if (!app.url) patch.url = resume.jobUrl || '';
      }
    }
    updateApplication(appId, patch);
  }

  return (
    <div className="animate-fade-in glass" style={{ height: '100%', overflow: 'auto', borderRadius: 'var(--radius-lg)', padding: isMobile ? '14px 14px' : '20px 28px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(0,122,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ClipboardList size={18} />
            </div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{t('Bewerbungs-Tracker')}</h2>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-4)' }}>
            {applications.length} Bewerbung{applications.length !== 1 ? 'en' : ''} total
          </p>
        </div>
        {/* Auf dem Telefon untereinander und volle Breite: nebeneinander wird
            „Bewerbung hinzufügen" bei 390 px um 28 px abgeschnitten, und der
            Container laesst sich nicht seitlich scrollen. */}
        <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
          <button className="btn-glass" onClick={() => setShowImportModal(true)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Link size={18} /> Aus Mappe
          </button>
          <button className="btn-glass btn-primary" onClick={addApplication} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={18} /> Bewerbung hinzufügen
          </button>
        </div>
      </div>

      {/* Stats row */}
      {applications.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {(['beworben', 'interview', 'angebot', 'abgelehnt'] as ApplicationStatus[]).map((s) => {
            const cfg = STATUS_CONFIG[s];
            return (
              <div key={s} style={{
                padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                background: cfg.bg, border: `1px solid color-mix(in srgb, ${cfg.color} 20%, transparent)`, color: cfg.color,
                cursor: 'pointer', opacity: filter !== 'all' && filter !== s ? 0.5 : 1,
                transition: 'opacity 0.15s',
              }} onClick={() => setFilter(filter === s ? 'all' : s)}>
                {counts[s]} {t(cfg.label)}
              </div>
            );
          })}
        </div>
      )}

      {/* Filter + Sort bar */}
      {applications.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ minWidth: 130, flex: 'none' }}>
            <CustomSelect
              value={filter}
              onChange={(v) => setFilter(v as ApplicationStatus | 'all')}
              options={[{ value: 'all', label: t('Alle Status') }, ...ALL_STATUSES.map((s) => ({ value: s, label: t(STATUS_CONFIG[s].label) }))]}
              style={{ fontSize: 12, padding: '6px 10px' }}
            />
          </div>
          <div style={{ minWidth: 160, flex: 'none' }}>
            <CustomSelect
              value={sort}
              onChange={(v) => setSort(v)}
              options={SORT_OPTIONS.map(o => ({ ...o, label: t(o.label) }))}
              style={{ fontSize: 12, padding: '6px 10px' }}
            />
          </div>
        </div>
      )}

      {/* Empty state */}
      {applications.length === 0 && (
        <div className="glass-card" style={{ padding: '48px 24px', textAlign: 'center' }}>
          <ClipboardList size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{t('Noch keine Bewerbungen')}</div>
          <p style={{ fontSize: 13, color: 'var(--text-4)', marginBottom: 20 }}>
            Füge deine erste Bewerbung hinzu und behalte den Überblick.
          </p>
          <button className="btn-glass btn-primary" onClick={addApplication}>
            <Plus size={14} /> Erste Bewerbung hinzufügen
          </button>
        </div>
      )}

      {/* Application list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((app) => {
          const isOpen = expanded === app.id;
          const appType: ApplicationType = app.type ?? 'online';
          const linkedResume = app.resumeId ? resumes.find((r) => r.id === app.resumeId) : null;

          return (
            <div key={app.id} className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
              {/* Summary row */}
              <div style={{ padding: '12px 14px' }}>
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 8 }}
                  onClick={() => setExpanded(isOpen ? null : app.id)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {app.company || <span style={{ opacity: 0.4 }}>{t('Firma')}</span>}
                      </span>
                      {app.position && (
                        <span style={{ fontSize: 12, color: 'var(--text-4)' }}>· {app.position}</span>
                      )}
                    </div>
                    {(app.appliedDate || app.deadline) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2 }}>
                        {app.appliedDate && (
                          <span style={{ fontSize: 11, color: 'var(--text-4)' }}>
                            {formatDate(app.appliedDate)}
                          </span>
                        )}
                        {app.deadline && (
                          <span style={{ fontSize: 11, color: 'var(--ios-amber)' }}>
                            Deadline: {formatDate(app.deadline)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <TypeBadge type={appType} />
                    <button
                      className="btn-glass btn-danger btn-icon"
                      onClick={(e) => { e.stopPropagation(); if (confirm(t('Bewerbung löschen?'))) removeApplication(app.id); }}
                      style={{ padding: 6 }}
                    >
                      <Trash2 size={12} />
                    </button>
                    {isOpen ? <ChevronUp size={14} style={{ opacity: 0.4 }} /> : <ChevronDown size={14} style={{ opacity: 0.4 }} />}
                  </div>
                </div>

                {/* Clickable status steps */}
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {ALL_STATUSES.map((s) => {
                    const cfg = STATUS_CONFIG[s];
                    const isActive = app.status === s;
                    return (
                      <button
                        key={s}
                        onClick={(e) => { e.stopPropagation(); updateApplication(app.id, { status: s }); }}
                        style={{
                          // 3 px Innenabstand ergaben 23 px Hoehe. Sechs Stufen
                          // nebeneinander auf 44 px zu bringen wuerde jede
                          // Tracker-Karte um ueber 20 px aufblaehen; 7 px
                          // bringen die Flaeche auf 31 px und damit ueber die
                          // 24 px, die WCAG 2.5.8 als Mindestmass nennt.
                          padding: '7px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                          cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                          background: isActive ? cfg.bg : 'rgba(var(--rgb-fg),0.05)',
                          color: isActive ? cfg.color : 'var(--text-4)',
                          outline: isActive ? `1px solid color-mix(in srgb, ${cfg.color} 19%, transparent)` : '1px solid rgba(var(--rgb-fg),0.08)',
                        }}
                      >
                        {t(cfg.label)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Expanded editor */}
              {isOpen && (
                <div style={{ padding: '4px 14px 14px', borderTop: '1px solid rgba(var(--rgb-fg),0.07)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label className="section-label">{t('Firma')}</label>
                      <input className="input-glass" placeholder={t('z.B. Google AG')} value={app.company} maxLength={150}
                        onChange={(e) => updateApplication(app.id, { company: e.target.value })} />
                    </div>
                    <div>
                      <label className="section-label">{t('Stelle')}</label>
                      <input className="input-glass" placeholder={t('z.B. Product Manager')} value={app.position} maxLength={150}
                        onChange={(e) => updateApplication(app.id, { position: e.target.value })} />
                    </div>
                    <div>
                      <label className="section-label">{t('Status')}</label>
                      <CustomSelect
                        value={app.status}
                        onChange={(v) => updateApplication(app.id, { status: v as ApplicationStatus })}
                        options={ALL_STATUSES.map((s) => ({ value: s, label: t(STATUS_CONFIG[s].label) }))}
                      />
                    </div>
                    <div>
                      <label className="section-label">{t('Stelleninserat URL')}</label>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'stretch' }}>
                        <input className="input-glass" placeholder="https://..." value={app.url} maxLength={500}
                          onChange={(e) => updateApplication(app.id, { url: e.target.value })}
                          style={{ flex: 1 }} />
                        {app.url && (
                          <a href={app.url} target="_blank" rel="noopener noreferrer"
                            className="btn-glass" title={t("Inserat öffnen")}
                            style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', borderRadius: 'var(--radius-sm)' }}>
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="section-label">{t('Bewerbungsdatum')}</label>
                      <input className="input-glass" type="date" value={app.appliedDate}
                        onChange={(e) => updateApplication(app.id, { appliedDate: e.target.value })} />
                    </div>
                    <div>
                      <label className="section-label">{t('Deadline (optional)')}</label>
                      <input className="input-glass" type="date" value={app.deadline}
                        onChange={(e) => updateApplication(app.id, { deadline: e.target.value })} />
                    </div>
                  </div>

                  {/* Bewerbungsart pill-toggle */}
                  <div style={{ marginBottom: 10 }}>
                    <label className="section-label">{t('Bewerbungsart')}</label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {ALL_TYPES.map((typeKey) => {
                        const isActive = appType === typeKey;
                        const cfg = TYPE_CONFIG[typeKey];
                        return (
                          <button
                            key={typeKey}
                            type="button"
                            onClick={() => updateApplication(app.id, { type: typeKey })}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '5px 12px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 500,
                              cursor: 'pointer',
                              border: isActive ? '1px solid rgba(0,122,255,0.4)' : '1px solid rgba(var(--rgb-fg),0.1)',
                              background: isActive ? 'rgba(0,122,255,0.2)' : 'rgba(var(--rgb-fg),0.06)',
                              color: isActive ? 'var(--text-1)' : 'var(--text-3)',
                              transition: 'all 0.15s',
                            }}
                          >
                            {cfg.icon} {t(cfg.label)}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Notes */}
                  <div style={{ marginBottom: 10 }}>
                    <label className="section-label">{t('Notizen')}</label>
                    <textarea className="input-glass"
                      placeholder={t('Kontaktperson, Gesprächsthemen, Eindrücke...')}
                      value={app.notes} maxLength={1000} rows={3}
                      onChange={(e) => updateApplication(app.id, { notes: e.target.value })}
                      style={{ resize: 'vertical' }} />
                  </div>

                  {/* Mappe verknüpfen */}
                  <div>
                    <label className="section-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      Mappe verknüpfen
                      {linkedResume && (
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(0,122,255,0.8)', marginLeft: 4 }}>
                          · {linkedResume.name || 'Unbenannte Mappe'}
                        </span>
                      )}
                    </label>
                    <CustomSelect
                      value={app.resumeId ?? ''}
                      onChange={(v) => handleResumeLink(app.id, app, v)}
                      options={[
                        { value: '', label: 'Keine Mappe verknüpft' },
                        ...resumes.map((r) => ({ value: r.id, label: r.name || 'Unbenannte Mappe' })),
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && applications.length > 0 && (
        <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-4)', fontSize: 13 }}>
          Keine Bewerbungen mit diesem Filter.
        </div>
      )}

      {/* "Aus Mappe importieren" modal */}
      {showImportModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowImportModal(false); }}
        >
          <div
            className="glass-card"
            style={{
              width: '100%',
              maxWidth: 400,
              padding: '20px 20px',
              maxHeight: '80vh',
              overflow: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t('Aus Mappe importieren')}</h3>
              <button className="btn-glass btn-icon" onClick={() => setShowImportModal(false)} style={{ padding: 6 }}>
                ✕
              </button>
            </div>

            {resumes.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--text-4)', textAlign: 'center', padding: '24px 0' }}>
                Keine Mappen vorhanden.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {resumes.map((resume) => {
                  const person = persons.find((p) => p.resumeIds.includes(resume.id));
                  const personName = person?.name || '';
                  return (
                    <button
                      key={resume.id}
                      type="button"
                      className="btn-glass"
                      onClick={() => handleImportFromResume(resume.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        gap: 2,
                        padding: '10px 12px',
                        textAlign: 'left',
                        width: '100%',
                        borderRadius: 8,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
                        {resume.name || 'Unbenannte Mappe'}
                      </span>
                      {personName && (
                        <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{personName}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
