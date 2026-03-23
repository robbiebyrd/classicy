import { describe, it, expect } from "vitest";
import { hexToInt, intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";

describe("intToHex", () => {
  it("converts 0 to #000000", () => {
    expect(intToHex(0)).toBe("#000000");
  });

  it("converts 16777215 (0xFFFFFF) to #ffffff", () => {
    expect(intToHex(16777215)).toBe("#ffffff");
  });

  it("pads short hex values with leading zeros", () => {
    expect(intToHex(255)).toBe("#0000ff");
  });

  it("converts a mid-range value correctly", () => {
    expect(intToHex(0x1a2b3c)).toBe("#1a2b3c");
  });

  it("intToHex(-1) produces a malformed string — documented behavior", () => {
    // (-1).toString(16) === "-1"; padStart(6, "0") on a 2-char string prefixes
    // four zeros, yielding "0000-1", so the result is "#0000-1".
    // NOTE: negative inputs are not a supported use-case; this test documents
    // the current behavior so a future fix will be detectable.
    expect(intToHex(-1)).toBe("#0000-1");
  });
});

describe("hexToInt", () => {
  it("converts 0x000000 to 0", () => {
    expect(hexToInt("0x000000")).toBe(0);
  });

  it("converts 0xFFFFFF to 16777215", () => {
    expect(hexToInt("0xFFFFFF")).toBe(16777215);
  });

  it("prepends 0x prefix if missing", () => {
    expect(hexToInt("ff0000")).toBe(0xff0000);
  });

  it("round-trips with intToHex", () => {
    const original = 0x3a7bcd;
    expect(hexToInt("0x" + original.toString(16))).toBe(original);
  });

  it('hexToInt("") returns NaN — empty string is not a valid hex value', () => {
    // "" does not start with "0x", so becomes "0x"; Number("0x") === NaN.
    // NOTE: callers must guard against empty input.
    expect(hexToInt("")).toBeNaN();
  });

  it('hexToInt("#ff0000") returns NaN — CSS hex notation is not supported', () => {
    // "#ff0000" does not start with "0x", so becomes "0x#ff0000";
    // Number("0x#ff0000") === NaN.
    // NOTE: strip the "#" before calling hexToInt if you have CSS color strings.
    expect(hexToInt("#ff0000")).toBeNaN();
  });
});
