import type { Decision, PolicyRule } from "../types";

export function validate(rules: ReadonlyArray<PolicyRule>): Decision {
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
