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
});
