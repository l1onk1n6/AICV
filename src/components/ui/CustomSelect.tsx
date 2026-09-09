import { useState, useRef, useEffect, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useT } from '../../lib/i18n';

interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  style?: CSSProperties;
  placeholder?: string;
  className?: string;
}

export function CustomSelect({ value, onChange, options, style, placeholder = 'Auswählen…', className }: CustomSelectProps) {
  const _t = useT(); void _t;
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;
  const hasValue = !!selectedOption;

  // Position dropdown via getBoundingClientRect to escape overflow clipping
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropdownH = Math.min(options.length * 41 + 8, 260);
    const openUp = spaceBelow < dropdownH + 8 && rect.top > dropdownH;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUp
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        containerRef.current && !containerRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest?.('[data-custom-select-dropdown]')
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const triggerStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    cursor: 'pointer',
    userSelect: 'none',
    width: '100%',
    ...(focused || open
      ? {
          borderColor: 'rgba(0,122,255,0.7)',
          boxShadow: '0 0 0 3px rgba(0,122,255,0.18)',
          outline: 'none',
        }
      : {}),
    ...style,
  };

  const dropdown = open && (
    <div
      data-custom-select-dropdown
      role="listbox"
      style={{
        ...dropdownStyle,
        background: 'var(--bg-overlay)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(var(--rgb-fg),0.15)',
        borderRadius: 10,
        overflow: 'auto',
        maxHeight: 260,
        boxShadow: 'var(--shadow-dropdown)',
      }}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <div
            key={opt.value}
            role="option"
            aria-selected={isSelected}
            onMouseDown={(e) => {
              e.preventDefault();
              onChange(opt.value);
              setOpen(false);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              cursor: 'pointer',
              fontSize: 13,
              background: isSelected ? 'rgba(0,122,255,0.2)' : 'transparent',
              border: isSelected ? '1px solid rgba(0,122,255,0.3)' : '1px solid transparent',
              margin: '2px 4px',
              borderRadius: 7,
              transition: 'background 0.1s',
              // Kein festes Weiss: der ausgewaehlte Eintrag steht auf einer nur
              // leicht blau getoenten Flaeche und waere im Hellmodus unsichtbar.
              color: isSelected ? 'rgba(var(--rgb-fg),0.95)' : 'rgba(var(--rgb-fg),0.85)',
            }}
            onMouseEnter={(e) => {
              if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'rgba(var(--rgb-fg),0.08)';
            }}
            onMouseLeave={(e) => {
              if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
            {isSelected && <Check size={14} style={{ flexShrink: 0, color: '#007AFF' }} />}
          </div>
        );
      })}
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }} className={className}>
      <button
        ref={triggerRef}
        type="button"
        className="input-glass"
        style={triggerStyle}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span style={{ color: hasValue ? undefined : 'rgba(var(--rgb-fg),0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'left' }}>
          {displayLabel}
        </span>
        <ChevronDown
          size={14}
          style={{
            flexShrink: 0,
            opacity: 0.5,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s',
          }}
        />
      </button>

      {createPortal(dropdown, document.body)}
    </div>
  );
}

export default CustomSelect;
