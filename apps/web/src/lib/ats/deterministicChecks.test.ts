import { describe, expect, it } from "vitest";

import { runDeterministicAtsChecks } from "./deterministicChecks";

describe("runDeterministicAtsChecks", () => {
  it("fails empty CV contact and experience", () => {
    const report = runDeterministicAtsChecks({ cv: { person: {} } });
    expect(report.summary.fail).toBeGreaterThan(0);
    expect(report.items.some((i) => i.id === "email" && i.severity === "fail")).toBe(true);
  });

  it("passes a fuller sample with keywords", () => {
    const report = runDeterministicAtsChecks({
      cv: {
        person: {
          full_name: "Jane Doe",
          contact: { email: "jane@example.com", phone_e164: "+10000000000" },
        },
        positioning: { headline: "Senior TypeScript engineer" },
        experience: [{ role: "Engineer", bullets: ["Built TypeScript services"] }],
        education: [{ degree: "BSc" }],
      },
      keywords: [
        { keyword: "TypeScript", weight: 90, role: "must", source: "user" },
        { keyword: "Kubernetes", weight: 85, role: "must", source: "user" },
      ],
    });
    expect(report.items.some((i) => i.id === "name" && i.severity === "pass")).toBe(true);
    expect(report.items.some((i) => i.id === "email" && i.severity === "pass")).toBe(true);
    expect(report.score).toBeGreaterThan(40);
  });
});
