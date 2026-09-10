import { X } from 'lucide-react';
import type { Shortcut } from '../../hooks/useGlobalShortcuts';
import { useT } from '../../lib/i18n';

interface Props {
  shortcuts: Shortcut[];
  onClose: () => void;
}

/** Erklaert eine Combo wie 'mod+b' menschenlesbar (z. B. ⌘B / Ctrl+B). */
function formatCombo(combo: string): string {
  const isMac = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform);
  return combo
    .split('+')
    .map(part => {
      const p = part.trim().toLowerCase();
      if (p === 'mod') return isMac ? '⌘' : 'Ctrl';
      if (p === 'shift') return isMac ? '⇧' : 'Shift';
      if (p === 'alt') return isMac ? '⌥' : 'Alt';
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join(isMac ? ' ' : '+');
}

export default function ShortcutsHelp({ shortcuts, onClose }: Props) {
  const t = useT();
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="glass-card animate-scale-in"
        style={{ width: '100%', maxWidth: 460, padding: '24px 24px 18px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{t('Tastatur-Kürzel')}</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-4)', padding: 4, display: 'flex',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {shortcuts.map(sc => (
            <div
              key={sc.combo}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 4px',
                fontSize: 13,
              }}
            >
              <span style={{ color: 'var(--text-1)' }}>{sc.description}</span>
              <kbd style={{
                fontFamily: 'var(--font-sf)',
                fontSize: 12, fontWeight: 600,
                padding: '3px 9px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-btn)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-1)',
                minWidth: 32, textAlign: 'center',
              }}>
                {formatCombo(sc.combo)}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 14, fontSize: 11, color: 'var(--text-4)' }}>
          Tipp: Drücke <kbd style={{ fontFamily: 'var(--font-sf)', fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--bg-btn)', border: '1px solid var(--border-default)' }}>?</kbd> jederzeit, um diese Liste zu öffnen.
        </div>
      </div>
    </div>
  );
}
