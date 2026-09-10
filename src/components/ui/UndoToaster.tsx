import { useEffect, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { useUndoToast } from '../../lib/undoToast';
import { useT } from '../../lib/i18n';

export default function UndoToaster() {
  const tr = useT();
  const toasts   = useUndoToast(s => s.toasts);
  const dismiss  = useUndoToast(s => s.dismiss);
  const [, tick] = useState(0);

  // re-render every 100ms so progress bars animate smoothly
  useEffect(() => {
    if (toasts.length === 0) return;
    const id = setInterval(() => tick(n => n + 1), 100);
    return () => clearInterval(id);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: `calc(env(safe-area-inset-bottom, 0px) + 18px)`,
      left: '50%', transform: 'translateX(-50%)',
      zIndex: 9500, display: 'flex', flexDirection: 'column', gap: 8,
      pointerEvents: 'none', alignItems: 'center',
    }}>
      {toasts.map(t => {
        // Date.now() im Render: gewollt — Toast-Progress aktualisiert sich
        // bei jedem Re-Render (Parent triggert via setInterval).
        // eslint-disable-next-line react-hooks/purity
        const elapsed  = Date.now() - t.createdAt;
        const progress = Math.max(0, Math.min(1, 1 - elapsed / t.durationMs));
        return (
          <div key={t.id}
            className="animate-slide-up"
            style={{
              pointerEvents: 'auto',
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px 10px 16px',
              borderRadius: 12,
              background: 'rgba(18,20,30,0.96)',
              border: '1px solid rgba(var(--rgb-fg),0.12)',
              backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              minWidth: 320, maxWidth: '92vw', position: 'relative', overflow: 'hidden',
            }}
          >
            <div style={{ flex: 1, fontSize: 13, color: 'var(--text-1)' }}>
              {t.message}
            </div>
            <button
              className="btn-glass btn-sm"
              onClick={() => { t.onUndo(); dismiss(t.id); }}
              style={{
                gap: 5, padding: '6px 10px', fontSize: 12, fontWeight: 600,
                background: 'rgba(0,122,255,0.18)', border: '1px solid rgba(0,122,255,0.35)',
                color: 'var(--ios-blue)', boxShadow: 'none',
              }}
            >
              <RotateCcw size={12} /> {tr('Rückgängig')}
            </button>
            <button
              onClick={() => dismiss(t.id)}
              aria-label={tr("Schliessen")}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', padding: 4, display: 'flex' }}
            >
              <X size={14} />
            </button>
            {/* Progress bar */}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, height: 2,
              width: `${progress * 100}%`, background: 'rgba(0,122,255,0.55)',
              transition: 'width 0.1s linear',
            }} />
          </div>
        );
      })}
    </div>
  );
}
