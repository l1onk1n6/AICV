import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '../../hooks/useBreakpoint';
import {
  Plus, ChevronDown, Trash2,
  LayoutDashboard, FileText, Eye, FilePlus, LogOut,
  PanelLeftClose, PanelLeftOpen, Sparkles, UserCircle, Lock,
  ClipboardList, FileEdit,
} from 'lucide-react';
import { useResumeStore } from '../../store/resumeStore';
import { useAuthStore } from '../../store/authStore';
import { LogoFull, LogoIcon } from './Logo';
import { usePlan } from '../../lib/plan';
import { UpgradeModal } from '../ui/ProGate';
import { displayPersonName } from '../../lib/displayName';
import { useT } from '../../lib/i18n';
import type { Person, Resume } from '../../types/resume';

interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const t = useT();

  const { signOut } = useAuthStore();
  const { isPro, limits } = usePlan();
  const {
    persons, resumes, activePersonId, activeResumeId,
    addPerson, setActivePerson, addResume, setActiveResume, deleteResume,
  } = useResumeStore();

  const [showUpgrade, setShowUpgrade] = useState(false);

  function go(path: string) { navigate(path); onClose?.(); }
  const isActive = (path: string) => location.pathname === path;

  // ── Collapsed (icon-only) sidebar ──────────────────────────
  if (collapsed) {
    return (
      <aside style={{ width: 60, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '16px 0', gap: 4 }}>
        <div style={{ marginBottom: 16, filter: 'drop-shadow(0 3px 8px rgba(52,199,89,0.4))' }}>
          <LogoIcon size={32} />
        </div>
        <button className="btn-glass btn-icon" onClick={onToggleCollapse} title={t("Seitenleiste einblenden")}
          style={{ padding: 8, marginBottom: 8, boxShadow: 'none', background: 'rgba(var(--rgb-fg),0.06)', border: '1px solid rgba(var(--rgb-fg),0.1)' }}>
          <PanelLeftOpen size={15} />
        </button>
        <div style={{ width: '70%', height: 1, background: 'rgba(var(--rgb-fg),0.1)', margin: '4px 0 8px' }} />
        {[
          { path: '/',        icon: LayoutDashboard, label: t('Dashboard') },
          { path: '/editor',  icon: FileText,        label: t('Editor') },
          { path: '/preview', icon: Eye,             label: t('Vorschau') },
          { path: '/tracker', icon: ClipboardList,   label: t('Tracker') },
          { path: '/account', icon: UserCircle,      label: t('Konto') },
        ].map(({ path, icon: Icon, label }) => (
          <button key={path} onClick={() => go(path)} className="btn-glass btn-icon" title={label}
            style={{ padding: 10, boxShadow: 'none', background: isActive(path) ? 'rgba(0,122,255,0.2)' : 'transparent', border: isActive(path) ? '1px solid rgba(0,122,255,0.35)' : '1px solid transparent' }}>
            <Icon size={17} style={{ opacity: isActive(path) ? 1 : 0.55 }} />
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="btn-glass btn-icon" onClick={() => signOut()} title={t('Abmelden')} style={{ padding: 9, boxShadow: 'none' }}>
          <LogOut size={15} />
        </button>
      </aside>
    );
  }

  // ── Full sidebar: Logo | Aktive-Mappe-Switcher | Flat Nav | Bottom ──
  const frozenPersonIds = new Set(
    limits.persons < Infinity ? persons.slice(limits.persons).map(p => p.id) : []
  );
  const frozenResumeIds = new Set(
    limits.resumes < Infinity ? resumes.slice(limits.resumes).map(r => r.id) : []
  );

  const activePerson = persons.find(p => p.id === activePersonId) ?? null;
  const activeResume = resumes.find(r => r.id === activeResumeId) ?? null;

  const navPad   = isMobile ? '11px 14px' : '10px 12px';
  const navStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', justifyContent: 'flex-start',
    borderRadius: 'var(--radius-sm)', padding: navPad, marginBottom: isMobile ? 3 : 1,
    fontSize: isMobile ? 15 : undefined,
    background: active ? 'linear-gradient(135deg, rgba(0,122,255,0.25), rgba(88,86,214,0.2))' : 'transparent',
    border: active ? '1px solid rgba(0,122,255,0.4)' : '1px solid transparent',
    boxShadow: 'none',
  });

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', height: '100%', width: isMobile ? 280 : 240, flexShrink: 0, padding: '16px 12px' }}>
      {/* Logo + collapse */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, paddingLeft: 4 }}>
        <LogoFull size={32} />
        {onToggleCollapse && (
          <button className="btn-glass btn-icon btn-sm" onClick={onToggleCollapse} title={t("Seitenleiste einklappen")}
            style={{ padding: 6, boxShadow: 'none', opacity: 0.6, background: 'transparent', border: 'none', flexShrink: 0 }}>
            <PanelLeftClose size={15} />
          </button>
        )}
      </div>

      {/* Aktive Mappe - Header + Switcher */}
      <MappeSwitcher
        persons={persons}
        resumes={resumes}
        activePerson={activePerson}
        activeResume={activeResume}
        frozenPersonIds={frozenPersonIds}
        frozenResumeIds={frozenResumeIds}
        onSelectPerson={(id) => { setActivePerson(id); go('/editor'); }}
        onSelectResume={(id) => { setActiveResume(id); go('/editor'); }}
        onAddPerson={async (name) => { const p = await addPerson(name); if (p) go('/editor'); }}
        onAddResume={async (personId) => { const r = await addResume(personId); if (r) go('/editor'); }}
        onDeleteResume={deleteResume}
        isMobile={isMobile}
      />

      {/* Flat navigation */}
      <nav style={{ marginTop: 12, marginBottom: 8 }}>
        {[
          { path: '/',        icon: LayoutDashboard, label: t('Dashboard') },
          { path: '/editor',  icon: FileEdit,        label: t('Editor') },
          { path: '/preview', icon: Eye,             label: t('Vorschau') },
          { path: '/tracker', icon: ClipboardList,   label: t('Tracker') },
          { path: '/account', icon: UserCircle,      label: t('Konto') },
        ].map(({ path, icon: Icon, label }) => {
          const act = isActive(path);
          return (
            <button key={path} onClick={() => go(path)} className="btn-glass" style={navStyle(act)}>
              <Icon size={16} style={{ opacity: act ? 1 : 0.6 }} />
              <span style={{ opacity: act ? 1 : 0.7 }}>{label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Bottom: Pro-Badge + Logout */}
      <div style={{ paddingTop: 8, borderTop: '1px solid rgba(var(--rgb-fg),0.08)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {showUpgrade && <UpgradeModal onClose={() => setShowUpgrade(false)} />}
        {!isPro ? (
          <button onClick={() => setShowUpgrade(true)} className="btn-glass"
            style={{ width: '100%', justifyContent: 'center', padding: '8px 12px', background: 'linear-gradient(135deg, rgba(255,159,10,0.12), rgba(255,55,95,0.1))', border: '1px solid rgba(255,159,10,0.25)', boxShadow: 'none', fontSize: 12, gap: 7 }}>
            <Sparkles size={14} style={{ color: 'var(--ios-amber)' }} />
            <span style={{ fontWeight: 600, color: 'var(--ios-amber)' }}>{t('Auf Pro upgraden')}</span>
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, color: 'var(--ios-amber)', padding: '4px 0' }}>
            <Sparkles size={12} /><span style={{ fontWeight: 700 }}>PATH Pro</span>
          </div>
        )}
        <button className="btn-glass btn-sm" onClick={() => signOut()}
          style={{ width: '100%', justifyContent: 'center', padding: '8px 10px', boxShadow: 'none', fontSize: 12 }}>
          <LogOut size={14} /> {t('Abmelden')}
        </button>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
//  Aktive-Mappe-Header + Switcher (two-column panel)
// ─────────────────────────────────────────────────────────────

interface MappeSwitcherProps {
  persons: Person[];
  resumes: Resume[];
  activePerson: Person | null;
  activeResume: Resume | null;
  frozenPersonIds: Set<string>;
  frozenResumeIds: Set<string>;
  onSelectPerson: (id: string) => void;
  onSelectResume: (id: string) => void;
  onAddPerson: (name: string) => void | Promise<void>;
  onAddResume: (personId: string) => void | Promise<void>;
  onDeleteResume: (id: string) => void;
  isMobile: boolean;
}

function personAvatar(name: string, photo: string | undefined, size: number, ring: boolean) {
  const hue1 = name.charCodeAt(0) * 10 % 360;
  const hue2 = name.charCodeAt(0) * 15 % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: photo ? 'transparent' : `linear-gradient(135deg, hsl(${hue1},65%,48%), hsl(${hue2},55%,38%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700, color: '#fff',
      boxShadow: ring ? '0 0 0 2px rgba(0,122,255,0.65)' : 'none',
      transition: 'box-shadow 0.15s',
    }}>
      {photo
        ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name.charAt(0).toUpperCase()}
    </div>
  );
}

function MappeSwitcher(props: MappeSwitcherProps) {
  const {
    persons, resumes, activePerson, activeResume,
    frozenPersonIds, frozenResumeIds,
    onSelectPerson, onSelectResume, onAddPerson, onAddResume, onDeleteResume,
    isMobile,
  } = props;
  const t = useT();

  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [focusedPersonId, setFocusedPersonId] = useState<string | null>(activePerson?.id ?? null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // Reset focus to active person whenever panel closes (Adjusting State on Prop Change)
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open && activePerson) setFocusedPersonId(activePerson.id);
  }

  // Compute fixed position when opening
  function openPanel() {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      setPanelPos({ top: r.bottom + 6, left: r.left });
    }
    setOpen(true);
  }

  // Close on outside click (fixed panel is outside the rootRef subtree)
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideTrigger = triggerRef.current?.contains(target);
      const insidePanel   = panelRef.current?.contains(target);
      if (!insideTrigger && !insidePanel) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const activePersonResumes = activePerson ? resumes.filter(r => activePerson.resumeIds.includes(r.id)) : [];
  const headerPhoto = activePersonResumes.find(r => r.personalInfo.photo)?.personalInfo.photo;
  const headerName  = displayPersonName(activePerson, activeResume ?? activePersonResumes[0]);
  const headerSub   = activeResume?.name ?? activeResume?.personalInfo.title ?? 'Keine Mappe ausgewählt';

  const focusedPerson  = persons.find(p => p.id === focusedPersonId) ?? persons[0] ?? null;
  const focusedResumes = focusedPerson ? resumes.filter(r => focusedPerson.resumeIds.includes(r.id)) : [];
  const focusedFrozen  = focusedPerson ? frozenPersonIds.has(focusedPerson.id) : false;

  const LEFT_W = isMobile ? 130 : 160;

  async function submitNewPerson() {
    if (!newPersonName.trim()) return;
    await onAddPerson(newPersonName.trim());
    setNewPersonName(''); setAddingPerson(false); setOpen(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* ── Trigger button ── */}
      <button
        ref={triggerRef}
        onClick={() => open ? setOpen(false) : openPanel()}
        className="btn-glass"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          borderRadius: 'var(--radius-sm)', boxShadow: 'none', textAlign: 'left',
          background: open ? 'rgba(0,122,255,0.12)' : 'rgba(var(--rgb-fg),0.06)',
          border: open ? '1px solid rgba(0,122,255,0.35)' : '1px solid rgba(var(--rgb-fg),0.12)',
        }}
      >
        {personAvatar(headerName, headerPhoto, 32, false)}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {headerName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {headerSub}
          </div>
        </div>
        <ChevronDown size={14} style={{ opacity: 0.5, flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s' }} />
      </button>

      {/* ── Two-column panel (fixed so it escapes sidebar overflow:hidden) ── */}
      {open && panelPos && (
        <div ref={panelRef} style={{
          position: 'fixed',
          top: panelPos.top,
          left: panelPos.left,
          width: isMobile ? 310 : 400,
          zIndex: 9999,
          borderRadius: 'var(--radius-sm)',
          background: 'rgba(8,10,20,0.94)',
          border: '1px solid rgba(var(--rgb-fg),0.13)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 480,
          overflow: 'hidden',
        }}>

          {/* Columns */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* Left: persons list */}
            <div style={{
              width: LEFT_W, flexShrink: 0,
              borderRight: '1px solid rgba(var(--rgb-fg),0.09)',
              overflowY: 'auto', padding: '6px 5px',
            }}>
              {persons.length === 0 && (
                <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                  Noch keine Person.
                </div>
              )}
              {persons.map(person => {
                const personResumes = resumes.filter(r => person.resumeIds.includes(r.id));
                const isFrozenP    = frozenPersonIds.has(person.id);
                const isFocused    = person.id === focusedPersonId;
                const dname        = displayPersonName(person, personResumes[0]);
                const ppic         = personResumes.find(r => r.personalInfo.photo)?.personalInfo.photo;
                return (
                  <button
                    key={person.id}
                    className="btn-glass"
                    onClick={() => setFocusedPersonId(person.id)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 8px', marginBottom: 3,
                      borderRadius: 'var(--radius-sm)', boxShadow: 'none',
                      background: isFocused ? 'rgba(0,122,255,0.18)' : 'rgba(var(--rgb-fg),0.03)',
                      border: isFocused ? '1px solid rgba(0,122,255,0.38)' : '1px solid transparent',
                      opacity: isFrozenP ? 0.55 : 1, cursor: 'pointer',
                      justifyContent: 'flex-start',
                    }}
                  >
                    {personAvatar(dname, ppic, 30, isFocused)}
                    <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: isFocused ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {dname}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <span style={{ fontSize: 10, color: 'var(--text-4)' }}>{personResumes.length} {personResumes.length === 1 ? t('Mappe') : t('Mappen')}</span>
                        {isFrozenP && <Lock size={9} style={{ color: 'var(--ios-amber)', flexShrink: 0 }} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right: Mappen of focused person */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '6px 5px', minWidth: 0 }}>
              {!focusedPerson ? (
                <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                  {t('Person auswählen')}
                </div>
              ) : (
                <>
                  {/* Section header */}
                  <div style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                    color: 'var(--text-4)', padding: '4px 8px 8px',
                  }}>
                    {t('Mappen')}
                  </div>

                  {focusedResumes.length === 0 && (
                    <div style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--text-4)', fontSize: 12 }}>
                      {t('Keine Mappen vorhanden')}
                    </div>
                  )}

                  {focusedResumes.map((r, idx) => {
                    const isResumeFrozen = focusedFrozen || frozenResumeIds.has(r.id);
                    const isActiveR = r.id === activeResume?.id;
                    const name = r.name || t('Bewerbungsmappe {n}').replace('{n}', String(idx + 1));
                    return (
                      <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 3, marginBottom: 3 }}>
                        <button
                          onClick={() => {
                            if (isResumeFrozen) return;
                            onSelectResume(r.id);
                            // also switch active person if needed
                            if (focusedPerson.id !== activePerson?.id) onSelectPerson(focusedPerson.id);
                            setOpen(false);
                          }}
                          className="btn-glass"
                          style={{
                            flex: 1, justifyContent: 'flex-start', padding: '9px 10px',
                            borderRadius: 'var(--radius-sm)', boxShadow: 'none', gap: 8, minWidth: 0,
                            background: isActiveR ? 'rgba(0,122,255,0.2)' : 'rgba(var(--rgb-fg),0.04)',
                            border: isActiveR ? '1px solid rgba(0,122,255,0.4)' : '1px solid rgba(var(--rgb-fg),0.07)',
                            opacity: isResumeFrozen ? 0.5 : 1,
                            cursor: isResumeFrozen ? 'default' : 'pointer',
                          }}
                        >
                          {isResumeFrozen
                            ? <Lock size={12} style={{ flexShrink: 0, color: 'var(--ios-amber)', opacity: 0.7 }} />
                            : <FileText size={12} style={{ flexShrink: 0, opacity: 0.45 }} />}
                          <span style={{ fontSize: 13, fontWeight: isActiveR ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {name}
                          </span>
                          {isActiveR && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#007AFF', flexShrink: 0 }} />}
                        </button>
                        {focusedResumes.length > 1 && !isResumeFrozen && (
                          <button
                            onClick={() => onDeleteResume(r.id)}
                            title={t('Mappe löschen')}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 5, opacity: 0.28, color: 'inherit', flexShrink: 0, display: 'flex' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* ── Footer ── */}
          <div style={{ borderTop: '1px solid rgba(var(--rgb-fg),0.09)', display: 'flex', alignItems: 'stretch', minHeight: 42 }}>
            {/* + Neue Person */}
            {addingPerson ? (
              <div style={{ width: LEFT_W, flexShrink: 0, display: 'flex', gap: 4, padding: '5px 6px', borderRight: '1px solid rgba(var(--rgb-fg),0.09)' }}>
                <input
                  className="input-glass"
                  placeholder={t('Name...')}
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitNewPerson(); if (e.key === 'Escape') { setAddingPerson(false); setNewPersonName(''); } }}
                  autoFocus
                  style={{ flex: 1, fontSize: 12, padding: '5px 7px' }}
                />
                <button className="btn-glass btn-primary" onClick={submitNewPerson} style={{ fontSize: 11, padding: '4px 7px', boxShadow: 'none' }}>OK</button>
                <button className="btn-glass" onClick={() => { setAddingPerson(false); setNewPersonName(''); }} style={{ fontSize: 11, padding: '4px 7px', boxShadow: 'none' }}>✕</button>
              </div>
            ) : (
              <button
                onClick={() => setAddingPerson(true)}
                style={{
                  width: LEFT_W, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  background: 'none', border: 'none', borderRight: '1px solid rgba(var(--rgb-fg),0.09)',
                  cursor: 'pointer', color: 'var(--text-4)', fontSize: 12, padding: '0 8px',
                }}
              >
                <Plus size={14} /> {t('Neue Person')}
              </button>
            )}

            {/* + Neue Mappe */}
            <button
              onClick={() => { if (focusedPerson && !focusedFrozen) { onAddResume(focusedPerson.id); setOpen(false); } }}
              disabled={!focusedPerson || focusedFrozen}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                background: 'none', border: 'none',
                cursor: focusedPerson && !focusedFrozen ? 'pointer' : 'default',
                color: focusedPerson && !focusedFrozen ? 'var(--text-3)' : 'var(--text-4)',
                fontSize: 12, padding: '0 8px',
              }}
            >
              <FilePlus size={14} /> {t('Neue Mappe')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
