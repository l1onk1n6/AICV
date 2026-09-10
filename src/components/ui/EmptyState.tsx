import type { LucideProps } from 'lucide-react';
import { Plus } from 'lucide-react';
import { useT } from '../../lib/i18n';

interface EmptyStateProps {
  icon: React.ComponentType<LucideProps>;
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
  compact?: boolean;
}

export default function EmptyState({
  icon: Icon, title, description, ctaLabel, onCta,
  secondaryCtaLabel, onSecondaryCta, compact,
}: EmptyStateProps) {
  const _t = useT(); void _t;
  return (
    <div
      className="glass-card animate-fade-in"
      style={{
        padding: compact ? '24px 20px' : '36px 24px',
        textAlign: 'center',
        border: '1px dashed rgba(var(--rgb-fg),0.14)',
        background: 'linear-gradient(180deg, rgba(var(--rgb-fg),0.03), rgba(var(--rgb-fg),0.01))',
      }}
    >
      <div style={{
        width: compact ? 48 : 56, height: compact ? 48 : 56, borderRadius: 14,
        background: 'rgba(0,122,255,0.12)', border: '1px solid rgba(0,122,255,0.22)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 14px',
      }}>
        <Icon size={compact ? 20 : 24} style={{ color: 'var(--ios-blue)' }} />
      </div>

      <h4 style={{
        margin: '0 0 6px', fontSize: compact ? 14 : 15, fontWeight: 600,
        color: 'var(--text-1)',
      }}>
        {title}
      </h4>

      {description && (
        <p style={{
          margin: '0 auto', fontSize: 12, color: 'var(--text-4)',
          maxWidth: 340, lineHeight: 1.5, marginBottom: (ctaLabel || secondaryCtaLabel) ? 16 : 0,
        }}>
          {description}
        </p>
      )}

      {(ctaLabel || secondaryCtaLabel) && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
          {ctaLabel && onCta && (
            <button className="btn-glass btn-primary btn-sm" onClick={onCta} style={{ padding: '8px 16px' }}>
              <Plus size={14} /> {ctaLabel}
            </button>
          )}
          {secondaryCtaLabel && onSecondaryCta && (
            <button className="btn-glass btn-sm" onClick={onSecondaryCta} style={{ padding: '8px 16px' }}>
              {secondaryCtaLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
