import { describe, it, expect } from "vitest";
import { listContractVersions } from "../shared/contracts/index.js";

describe("scripts/check_contract_versions.ts", () => {
  it("reports a single version for every contract kind", () => {
    for (const kind of ["sprint", "audit", "run_result"] as const) {
      expect(listContractVersions(kind)).toEqual(["1.0.0"]);
    }
  });

  it("newest version is first in the descending list", () => {
    const versions = listContractVersions("sprint");
    // Single version today; semantically stable.
    expect(versions[0]).toBe("1.0.0");
  });
});
