'use client';

// Solution 2 — section-level error boundary.
// Error boundaries must be class components (no hook equivalent in React 19).
// Retry = clear the error state AND re-run the Server Component (router.refresh),
// otherwise we would just re-render the same failed RSC payload.

import { Component, useTransition } from 'react';
import { useRouter } from 'next/navigation';

type BoundaryProps = { children: React.ReactNode; onRetry: () => void; isRetrying: boolean };
type BoundaryState = { error: Error | null };

class Boundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    // Report to logging/monitoring (Sentry etc.) here.
    console.error('[SectionErrorBoundary]', error);
  }

  retry = () => {
    this.props.onRetry();
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="alert alert-error">
        <span>
          Could not load this section.{' '}
          {/* In production Next.js strips server error messages; only a digest reaches the client. */}
          <span className="opacity-70">{this.state.error.message}</span>
        </span>
        <button className="btn btn-sm" onClick={this.retry} disabled={this.props.isRetrying}>
          {this.props.isRetrying && <span className="loading loading-spinner loading-xs" />}
          Retry
        </button>
      </div>
    );
  }
}

export function SectionErrorBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isRetrying, startTransition] = useTransition();
  return (
    <Boundary isRetrying={isRetrying} onRetry={() => startTransition(() => router.refresh())}>
      {children}
    </Boundary>
  );
}
