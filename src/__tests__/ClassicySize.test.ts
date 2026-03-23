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
});
