import { describe, expect, it } from "vitest";
import { isDataforseoAuthStatus } from "./core";

describe("isDataforseoAuthStatus", () => {
  // DataForSEO answers a bad Authorization header with 403, not 401. Phase 1
  // reproduced this live; before the fix it surfaced as a generic error.
  it("treats 403 as an authentication failure", () => {
    expect(isDataforseoAuthStatus(403)).toBe(true);
  });

  it("treats 401 as an authentication failure", () => {
    expect(isDataforseoAuthStatus(401)).toBe(true);
  });

  it("leaves other statuses alone", () => {
    for (const status of [200, 402, 404, 429, 500, undefined]) {
      expect(isDataforseoAuthStatus(status)).toBe(false);
    }
  });
});
