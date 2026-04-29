import { describe, expect, it } from "vitest";
import { scenarios } from "../data/fixtures";
import type { PolicyRule } from "../types";
import { validate } from "./validator";

const rule = (overrides: Partial<PolicyRule>): PolicyRule => ({
  id: "P-x",
  name: "test",
  verdict: "pass",
  input: "",
  ...overrides
});

describe("policy validator", () => {
  it("returns Allowed for empty input", () => {
    expect(validate([])).toBe("Allowed");
  });

  it("returns Allowed when every rule passes or skips", () => {
    expect(
      validate([rule({ verdict: "pass" }), rule({ verdict: "skip" })])
    ).toBe("Allowed");
  });

  it("returns Denied for a single deny-fail (default)", () => {
    expect(validate([rule({ verdict: "fail" })])).toBe("Denied");
  });

  it("returns Approval for a single approve-fail", () => {
    expect(validate([rule({ verdict: "fail", onFail: "approve" })])).toBe("Approval");
  });

  it("returns Approval for a single pending", () => {
    expect(validate([rule({ verdict: "pending" })])).toBe("Approval");
  });

  it("deny-fail beats approve-fail and pending", () => {
    expect(
      validate([
        rule({ verdict: "fail", onFail: "approve" }),
        rule({ verdict: "fail" }),
        rule({ verdict: "pending" })
      ])
    ).toBe("Denied");
  });

  it("approve-fail mixes with pending as Approval", () => {
    expect(
      validate([
        rule({ verdict: "fail", onFail: "approve" }),
        rule({ verdict: "pending" }),
        rule({ verdict: "pass" })
      ])
    ).toBe("Approval");
  });

  it("agrees with hardcoded decision on every scenario", () => {
    for (const s of scenarios) {
      expect(validate(s.rules), `scenario ${s.id}`).toBe(s.decision);
    }
  });
});
