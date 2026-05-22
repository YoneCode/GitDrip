import { describe, it, expect } from "vitest";
import { formatGlt, parseGlt, shortAddress, ATTOS_PER_GLT } from "@/lib/format";

describe("formatGlt", () => {
  it("0 wei", () => {
    expect(formatGlt(0n)).toBe("0 GLT");
  });
  it("1 GLT", () => {
    expect(formatGlt(ATTOS_PER_GLT)).toBe("1 GLT");
  });
  it("0.5 GLT", () => {
    expect(formatGlt(ATTOS_PER_GLT / 2n)).toBe("0.5 GLT");
  });
  it("123.456 GLT, 4dp", () => {
    expect(formatGlt(123_456_000_000_000_000_000n + 0n, 4)).toBe("123.456 GLT");
  });
  it("trims trailing zeros", () => {
    expect(formatGlt(ATTOS_PER_GLT * 2n + ATTOS_PER_GLT / 10n)).toBe("2.1 GLT");
  });
  it("negative", () => {
    expect(formatGlt(-ATTOS_PER_GLT)).toBe("-1 GLT");
  });
});

describe("parseGlt", () => {
  it("integer string", () => {
    expect(parseGlt("1")).toBe(ATTOS_PER_GLT);
  });
  it("fractional string", () => {
    expect(parseGlt("0.5")).toBe(ATTOS_PER_GLT / 2n);
  });
  it("empty -> 0", () => {
    expect(parseGlt("")).toBe(0n);
  });
  it("roundtrip", () => {
    const wei = parseGlt("12.345");
    expect(formatGlt(wei, 4)).toBe("12.345 GLT");
  });
});

describe("shortAddress", () => {
  it("formats 6/4 with ellipsis", () => {
    expect(shortAddress("0x725A57f7ED354eD124812DB9349483095dd38d99")).toBe(
      "0x725A\u202657f7ED354eD124812DB9349483095dd38d99".slice(0, 6) +
        "\u2026" +
        "8d99",
    );
  });
  it("handles short input", () => {
    expect(shortAddress("0xabcd")).toBe("0xabcd");
  });
  it("empty input", () => {
    expect(shortAddress("")).toBe("");
  });
});
