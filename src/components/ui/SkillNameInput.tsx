import { useState, useRef, useEffect } from 'react';
import { searchSkills, type SkillSuggestion } from '../../lib/skillsLibrary';
import { useT } from '../../lib/i18n';

interface Props {
  value: string;
  onChange: (value: string) => void;
  /** Wird aufgerufen, wenn der User eine Suggestion picked — kann z. B.
   *  die Kategorie automatisch mit-uebernehmen. */
  onPick?: (suggestion: SkillSuggestion) => void;
  placeholder?: string;
  maxLength?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function SkillNameInput({ value, onChange, onPick, placeholder, maxLength, style, className = 'input-glass' }: Props) {
  const _t = useT(); void _t;
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Suggestions sind reine Ableitung des aktuellen value — kein useState/useEffect noetig.
  const suggestions = searchSkills(value);

  // Highlight zuruecksetzen, wenn value sich aendert (Adjusting State on Prop Change).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setHighlight(0);
  }

  // Schliessen bei Click ausserhalb.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function pick(s: SkillSuggestion) {
    onChange(s.name);
    onPick?.(s);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight(h => Math.min(h + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight(h => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      pick(suggestions[highlight]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} style={{ position: 'relative', flex: style?.flex ?? 'unset' }}>
      <input
        className={className}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        style={style}
      />
      {open && suggestions.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          marginTop: 4,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-card-hover)',
          overflow: 'hidden',
          maxHeight: 240,
          overflowY: 'auto',
        }}>
          {suggestions.map((s, i) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => pick(s)}
              onMouseEnter={() => setHighlight(i)}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                width: '100%', textAlign: 'left',
                padding: '7px 10px',
                background: i === highlight ? 'rgba(var(--rgb-fg), 0.06)' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: 'var(--text-1)',
                fontFamily: 'var(--font-sf)',
                fontSize: 13,
              }}
            >
              <span>{s.name}</span>
              <span style={{ fontSize: 11, color: 'var(--text-4)' }}>{s.category}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
