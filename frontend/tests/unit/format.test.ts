import { describe, it, expect } from "vitest";
import { formatGen, parseGen, shortAddress, ATTOS_PER_GEN } from "@/lib/format";

describe("formatGen", () => {
  it("0 wei", () => {
    expect(formatGen(0n)).toBe("0 GEN");
  });
  it("1 GEN", () => {
    expect(formatGen(ATTOS_PER_GEN)).toBe("1 GEN");
  });
  it("0.5 GEN", () => {
    expect(formatGen(ATTOS_PER_GEN / 2n)).toBe("0.5 GEN");
  });
  it("123.456 GEN, 4dp", () => {
    expect(formatGen(123_456_000_000_000_000_000n + 0n, 4)).toBe("123.456 GEN");
  });
  it("trims trailing zeros", () => {
    expect(formatGen(ATTOS_PER_GEN * 2n + ATTOS_PER_GEN / 10n)).toBe("2.1 GEN");
  });
  it("negative", () => {
    expect(formatGen(-ATTOS_PER_GEN)).toBe("-1 GEN");
  });
});

describe("parseGen", () => {
  it("integer string", () => {
    expect(parseGen("1")).toBe(ATTOS_PER_GEN);
  });
  it("fractional string", () => {
    expect(parseGen("0.5")).toBe(ATTOS_PER_GEN / 2n);
  });
  it("empty -> 0", () => {
    expect(parseGen("")).toBe(0n);
  });
  it("roundtrip", () => {
    const wei = parseGen("12.345");
    expect(formatGen(wei, 4)).toBe("12.345 GEN");
  });
});

describe("shortAddress", () => {
  it("formats 6/4 with ellipsis", () => {
    expect(shortAddress("0xEb7370b0df3e3d5eCAf9846048693598362D6CE8")).toBe(
      "0xEb73\u20266CE8",
    );
  });
  it("handles short input", () => {
    expect(shortAddress("0xabcd")).toBe("0xabcd");
  });
  it("empty input", () => {
    expect(shortAddress("")).toBe("");
  });
});
