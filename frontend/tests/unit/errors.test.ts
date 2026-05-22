import { describe, it, expect } from "vitest";
import { humanError } from "@/lib/errors";

describe("humanError", () => {
  it("strips the [EXPECTED] prefix and maps known codes", () => {
    expect(humanError("[EXPECTED] no_repo")).toMatch(/hasn.?t been registered/);
    expect(humanError("[EXPECTED] period_too_short")).toMatch(/once every 7 days/);
    expect(humanError("[EXPECTED] not_dormant")).toMatch(/180 days/);
    expect(humanError("[EXPECTED] zero_value")).toMatch(/greater than zero/);
    expect(humanError("[EXPECTED] not_sponsor")).toMatch(/original sponsor/);
  });

  it("strips UserError wrapper", () => {
    expect(humanError("UserError(message='[EXPECTED] no_repo')")).toMatch(
      /hasn.?t been registered/,
    );
  });

  it("falls back to lowercase passthrough for unknown short messages", () => {
    expect(humanError("Something Weird")).toBe("something weird");
  });

  it("collapses long opaque errors to a generic message", () => {
    const long = "x".repeat(200);
    expect(humanError(long)).toMatch(/transaction failed/i);
  });

  it("never returns an empty string for empty input", () => {
    expect(humanError("")).not.toBe("");
  });

  it("matches when the code appears as a substring", () => {
    expect(humanError("revert: [EXPECTED] roster_full at line 47")).toMatch(
      /maximum number of enrolled/,
    );
  });
});
