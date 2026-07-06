/**
 * tests/ui/error-boundary.test.tsx — sanity check the boundary wraps App.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "../../src/components/ErrorBoundary";
import type { ReactNode } from "react";

function Boom(): never {
  throw new Error("boom from test child");
}

function Silent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

describe("ErrorBoundary", () => {
  afterEach(() => cleanup());

  it("renders children when there is no error", () => {
    render(
      <ErrorBoundary>
        <div data-testid="ok">ok child</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("ok")).toBeInTheDocument();
  });

  it("catches a thrown render and shows the fallback", () => {
    // Silence React's "uncaught error" log noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
    expect(screen.getByTestId("error-boundary")).toHaveTextContent(/boom from test child/);
    spy.mockRestore();
  });

  it("resets on Try again (child re-renders without error)", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    function Stable() {
      return <div data-testid="stable">stable</div>;
    }
    function Throwing() {
      throw new Error("first render boom");
    }
    const { rerender } = render(
      <ErrorBoundary>
        <Throwing />
      </ErrorBoundary>,
    );
    expect(screen.getByTestId("error-boundary")).toBeInTheDocument();
    rerender(
      <ErrorBoundary>
        <Stable />
      </ErrorBoundary>,
    );
    expect(screen.queryByTestId("error-boundary")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("error-boundary-retry"));
    expect(screen.queryByTestId("error-boundary")).not.toBeInTheDocument();
    expect(screen.getByTestId("stable")).toBeInTheDocument();
    spy.mockRestore();
  });
});
