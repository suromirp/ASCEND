// ASCEND — top-level render error boundary.
//
// Without this, an uncaught error during a page's render leaves the user
// staring at nothing but the app background (React unmounts the failing
// subtree with no fallback) and — because there's no way to see what threw
// — no way to report it either. This turns that into a legible, in-app
// message: what broke, the exact error text (copyable), and a way back
// to a working screen without losing the rest of the app (BottomNav stays
// mounted as this boundary's sibling in App.tsx, not inside it).
//
// Deliberately a class component — React only supports the
// error-boundary lifecycle methods (getDerivedStateFromError,
// componentDidCatch) on classes, there is no hook equivalent.

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  // Remounts the boundary's children fresh whenever this changes (e.g. the
  // current route) — so navigating away from the page that crashed and
  // back gets a clean render attempt rather than staying stuck in the
  // caught state.
  resetKey?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }) {
    // eslint-disable-next-line no-console
    console.error('ASCEND render error:', error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    // Gated on resetKey actually changing, so this can never re-trigger
    // itself — the standard React-documented pattern for "clear a caught
    // error once its cause (here: the route) has moved on".
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ error: null });
    }
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex flex-1 flex-col gap-4 px-6 py-10" style={{ color: 'var(--color-ink)' }}>
        <p className="font-display text-2xl" style={{ color: 'var(--color-gold)' }}>Er ging iets mis</p>
        <p className="text-sm" style={{ color: 'var(--color-ink-dim)' }}>
          Dit scherm kon niet geladen worden. Maak een screenshot van de melding hieronder en stuur die door — dat
          is de snelste weg naar een oplossing.
        </p>
        <pre
          className="overflow-x-auto whitespace-pre-wrap rounded-xl border p-3 text-xs"
          style={{ borderColor: 'var(--color-card-border)', background: 'var(--color-charcoal)', color: 'var(--color-danger)' }}
        >
          {error.message}
        </pre>
        <button
          onClick={() => this.setState({ error: null })}
          className="w-full rounded-xl py-3 text-sm font-semibold tracking-wide"
          style={{ background: 'linear-gradient(135deg, var(--color-gold), var(--color-bronze-dark))', color: '#15130d' }}
        >
          OPNIEUW PROBEREN
        </button>
      </div>
    );
  }
}
