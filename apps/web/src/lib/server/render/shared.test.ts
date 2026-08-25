import { describe, expect, it } from "vitest";

import { resolveTemplateLabels } from "./shared";

describe("template labels", () => {
  it("lets CV metadata override template defaults per template", () => {
    const labels = resolveTemplateLabels(
      {
        labels: {
          en: {
            common: { page: "Page" },
            sections: { education: "Education" },
          },
        },
      },
      {
        metadata: {
          template_headers: {
            sections: { education: "Образование" },
          },
        },
      },
      "bg",
    );

    expect(labels).toEqual({
      common: { page: "Page" },
      sections: { education: "Образование" },
    });
  });
});
