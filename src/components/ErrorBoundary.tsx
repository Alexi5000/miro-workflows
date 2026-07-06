/**
 * src/components/ErrorBoundary.tsx — top-level error boundary.
 *
 * Catches render-time errors anywhere below it; surfaces a recovery affordance
 * instead of white-screening the app.
 */
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Optional route name to label the error report. */
  boundary?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // In a real deployment, ship to Sentry / Honeycomb here.
    // eslint-disable-next-line no-console
    console.error(`[ui] error boundary (${this.props.boundary ?? "root"})`, error, info.componentStack);
  }

  reset = (): void => this.setState({ error: null });

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div role="alert" data-testid="error-boundary" className="error-boundary">
          <h2>Something went wrong</h2>
          <p>The dashboard hit an unexpected error. Reload to retry.</p>
          <pre>{this.state.error.message}</pre>
          <button type="button" onClick={this.reset} data-testid="error-boundary-retry">Try again</button>
        </div>
      );
    }
    return this.props.children;
  }
}
