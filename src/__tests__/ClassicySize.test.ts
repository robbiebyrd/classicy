import { describe, it, expect } from "vitest";
import {
  intToPx,
  pxToInt,
  intToPct,
  pctToInt,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicySize";

describe("intToPx", () => {
  it("appends px to an integer", () => {
    expect(intToPx(16)).toBe("16px");
  });

  it("works with 0", () => {
    expect(intToPx(0)).toBe("0px");
  });
});

describe("pxToInt", () => {
  it("strips px suffix and returns number", () => {
    expect(pxToInt("16px")).toBe(16);
  });

  it("handles value without px suffix", () => {
    expect(pxToInt("16")).toBe(16);
  });

  it("round-trips with intToPx", () => {
    expect(pxToInt(intToPx(42))).toBe(42);
  });
});

describe("intToPct", () => {
  it("appends * to a number", () => {
    expect(intToPct(50)).toBe("50*");
  });

  it("returns string passthrough unchanged", () => {
    expect(intToPct("auto")).toBe("auto");
  });
});

describe("pctToInt", () => {
  it("strips % suffix and returns number", () => {
    expect(pctToInt("75%")).toBe(75);
  });

  it("handles value without % suffix", () => {
    expect(pctToInt("75")).toBe(75);
  });

  it("round-trips with intToPct: pctToInt(intToPct(50)) returns 50", () => {
    // intToPct(50) returns "50*" (not "50%") — pctToInt does not strip "*",
    // so parseInt("50*") is called, which returns 50 because parseInt stops
    // at the first non-numeric character.
    expect(pctToInt(intToPct(50))).toBe(50);
  });

  it('pctToInt("50*") returns 50 via parseInt truncation', () => {
    // "50*" does not end with "%" so no stripping occurs.
    // parseInt("50*") === 50 because parseInt ignores trailing non-numeric chars.
    expect(pctToInt("50*")).toBe(50);
  });
});
