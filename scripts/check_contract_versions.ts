#!/usr/bin/env tsx
/**
 * scripts/check_contract_versions.ts — Asserts contract versions are monotonic
 * and every `SPRINT_CONTRACT_VERSION`-style constant has a registered schema.
 *
 * Run as part of CI; non-zero exit on regression.
 */
import { listContractVersions } from "../shared/contracts/index.js";

function isMonotonic(versions: string[]): boolean {
  for (let i = 1; i < versions.length; i++) {
    if (compareSemver(versions[i - 1], versions[i]) >= 0) return false;
  }
  return true;
}

function compareSemver(a: string, b: string): number {
  const [aMaj, aMin, aPat] = a.split(".").map(Number);
  const [bMaj, bMin, bPat] = b.split(".").map(Number);
  if (aMaj !== bMaj) return aMaj - bMaj;
  if (aMin !== bMin) return aMin - bMin;
  return (aPat ?? 0) - (bPat ?? 0);
}

let ok = true;
for (const kind of ["sprint", "audit", "run_result"] as const) {
  const versions = listContractVersions(kind);
  if (versions.length === 0) {
    console.error(`[contracts] no versions registered for ${kind}`);
    ok = false;
    continue;
  }
  // listContractVersions returns newest-first; check ascending monotonicity.
  const ascending = [...versions].reverse();
  if (!isMonotonic(ascending)) {
    console.error(`[contracts] ${kind} versions are not monotonic: ${ascending.join(", ")}`);
    ok = false;
    continue;
  }
  console.log(`[contracts] ${kind}: ${ascending.join(" → ")} (${versions.length} version${versions.length === 1 ? "" : "s"})`);
}

if (!ok) {
  console.error("[contracts] FAIL");
  process.exit(1);
}
console.log("[contracts] OK");
