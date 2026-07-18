import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { DateRangeFilter } from "@/components/search/DateRangeFilter";

describe("DateRangeFilter", () => {
  it("renders a compact, visibly labelled date range without changing field names", () => {
    const markup = renderToStaticMarkup(
      createElement(DateRangeFilter, {
        fromName: "deadlineFrom",
        toName: "deadlineTo",
        from: "2026-07-01",
        to: "2026-07-31",
        label: "Дедлайн",
      }),
    );

    expect(markup).toContain("<fieldset");
    expect(markup).toContain("<legend");
    expect(markup).toContain("Дедлайн");
    expect(markup).toContain("Від");
    expect(markup).toContain("До");
    expect(markup).toContain('name="deadlineFrom"');
    expect(markup).toContain('name="deadlineTo"');
    expect(markup).toContain('value="2026-07-01"');
    expect(markup).toContain('value="2026-07-31"');
  });
});
