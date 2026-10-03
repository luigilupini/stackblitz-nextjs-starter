'use client';

import { Component } from 'react';
import { useRouter } from 'next/navigation';

class Boundary extends Component<{ children: React.ReactNode; onRetry: () => void }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="alert alert-error">
        <span>Something went wrong.</span>
        <button
          className="btn btn-sm"
          onClick={() => {
            this.props.onRetry();
            this.setState({ error: null });
          }}
        >
          Retry
        </button>
      </div>
    );
  }
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return <Boundary onRetry={() => router.refresh()}>{children}</Boundary>;
}
