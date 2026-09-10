import { Component, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { logError } from '../lib/errorLog';
import { SUPPORT_EMAIL } from '../lib/userError';

interface State { err: Error | null }

/**
 * Faengt uncaught React-Fehler (Rendering, Lifecycle) ab, damit der User nicht
 * auf einen weissen Screen schaut, und loggt sie nach Supabase \xE2\x80\x94 inklusive
 * Component-Stack, User-ID und aktueller Seite.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State {
    return { err };
  }

  componentDidCatch(err: Error, info: { componentStack?: string }): void {
    void logError('Uncaught React error', err, {
      extra: { componentStack: info.componentStack?.slice(0, 2000) ?? null },
    });
  }

  reset = () => this.setState({ err: null });

  render(): ReactNode {
    if (!this.state.err) return this.props.children;
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'rgba(0,0,0,0.85)', color: '#fff', textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ maxWidth: 420 }}>
          <div style={{
            width: 56, height: 56, margin: '0 auto 18px', borderRadius: 16,
            background: 'rgba(255,59,48,0.18)', border: '1px solid rgba(255,59,48,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertCircle size={26} style={{ color: '#FF6B6B' }} />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 10px' }}>
            Da ist etwas schiefgelaufen
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 22px' }}>
            Wir haben den Fehler automatisch gemeldet und schauen ihn uns an. Lade die Seite neu,
            um weiterzumachen. Falls das Problem bestehen bleibt, melde dich bitte bei uns unter{' '}
            <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: '#64B5F6' }}>{SUPPORT_EMAIL}</a>.
          </p>
          <button onClick={() => window.location.reload()} style={{
            padding: '11px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600,
            background: 'rgba(0,122,255,0.25)', border: '1px solid rgba(0,122,255,0.5)',
            color: '#fff', cursor: 'pointer',
          }}>
            Seite neu laden
          </button>
        </div>
      </div>
    );
  }
}
