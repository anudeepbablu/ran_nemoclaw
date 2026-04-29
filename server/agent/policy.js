// Mirror of src/policy/validator.ts. The bridge owns the deterministic
// enforcement layer at runtime; the TS copy gives the UI types and a
// browser-side check. A vitest cross-check (server/__tests__/policy.test.js)
// asserts both copies agree on every fixture.

export function validate(rules) {
  let denyFail = false;
  let approveFail = false;
  let pending = false;

  for (const r of rules) {
    if (r.verdict === "fail") {
      if ((r.onFail ?? "deny") === "deny") denyFail = true;
      else approveFail = true;
    } else if (r.verdict === "pending") {
      pending = true;
    }
  }

  if (denyFail) return "Denied";
  if (approveFail || pending) return "Approval";
  return "Allowed";
}
