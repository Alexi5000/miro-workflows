/**
 * src/lib/router.ts — Tiny hash router with no external deps.
 *
 * `path()` reads `window.location.hash` and returns a normalized
 * pattern that is parsed by `parse()` into `{ segment, params }`.
 *
 * Usage:
 *   const r = useRoute();
 *   if (r.path === "/boards/:id") { const id = r.params.id; }
 *   navigate("/workspaces");
 */
import { useEffect, useState } from "react";

export interface Route {
  /** The matched pattern (e.g. "/boards/:id"). */
  pattern: string;
  /** The current path segment (e.g. "/boards/abc"). */
  path: string;
  params: Record<string, string>;
}

function normalizePath(raw: string): string {
  if (!raw) return "/";
  const trimmed = raw.replace(/^#/, "").trim();
  if (!trimmed.startsWith("/")) return `/${trimmed}`;
  return trimmed.replace(/\/+$/, "") || "/";
}

export function matchRoute(patterns: string[], path: string): { pattern: string | null; params: Record<string, string> } {
  for (const pattern of patterns) {
    const patternParts = pattern.split("/").filter(Boolean);
    const pathParts = path.split("/").filter(Boolean);
    if (patternParts.length !== pathParts.length) continue;
    const params: Record<string, string> = {};
    let ok = true;
    for (let i = 0; i < patternParts.length; i++) {
      const pat = patternParts[i];
      const seg = pathParts[i];
      if (pat.startsWith(":")) {
        params[pat.slice(1)] = decodeURIComponent(seg);
      } else if (pat !== seg) {
        ok = false;
        break;
      }
    }
    if (ok) return { pattern, params };
  }
  return { pattern: null, params: {} };
}

export function useRoute(patterns: string[]): Route {
  const [path, setPath] = useState<string>(() => normalizePath(typeof window === "undefined" ? "/" : window.location.hash));
  useEffect(() => {
    function handler() { setPath(normalizePath(window.location.hash)); }
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  const { pattern, params } = matchRoute(patterns, path);
  return { pattern: pattern ?? patterns[0], path, params };
}

export function navigate(to: string) {
  if (typeof window === "undefined") return;
  const next = `#${to.startsWith("/") ? to : `/${to}`}`;
  if (window.location.hash !== next) window.location.hash = next;
}
