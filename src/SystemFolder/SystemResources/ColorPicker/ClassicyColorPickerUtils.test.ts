import { describe, expect, it } from "vitest";
import {
  intToRgb, rgbToInt,
  rgbToHsv, hsvToRgb,
  rgbToHls, hlsToRgb,
  rgbToCmyk, cmykToRgb,
} from "./ClassicyColorPickerUtils";

const EPSILON = 2; // max rounding error per channel

describe("intToRgb / rgbToInt", () => {
  it("splits 0xFF0000 into r=255,g=0,b=0", () => {
    expect(intToRgb(0xFF0000)).toEqual({ r: 255, g: 0, b: 0 });
  });
  it("splits 0x1A2B3C into correct channels", () => {
    expect(intToRgb(0x1A2B3C)).toEqual({ r: 0x1A, g: 0x2B, b: 0x3C });
  });
  it("round-trips rgbToInt → intToRgb", () => {
    const { r, g, b } = intToRgb(rgbToInt(73, 128, 200));
    expect(r).toBe(73); expect(g).toBe(128); expect(b).toBe(200);
  });
  it("rgbToInt(0,0,0) === 0", () => { expect(rgbToInt(0, 0, 0)).toBe(0); });
  it("rgbToInt(255,255,255) === 0xFFFFFF", () => { expect(rgbToInt(255, 255, 255)).toBe(0xFFFFFF); });
});

describe("HSV round-trips", () => {
  it("pure red round-trips through HSV", () => {
    const { r, g, b } = hsvToRgb(...Object.values(rgbToHsv(255, 0, 0)) as [number,number,number]);
    expect(r).toBeCloseTo(255, -1); expect(g).toBeCloseTo(0, -1); expect(b).toBeCloseTo(0, -1);
  });
  it("white round-trips through HSV", () => {
    const { h, s, v } = rgbToHsv(255, 255, 255);
    expect(s).toBe(0); expect(v).toBe(100);
    const { r, g, b } = hsvToRgb(h, s, v);
    expect(r).toBeCloseTo(255, -1); expect(g).toBeCloseTo(255, -1); expect(b).toBeCloseTo(255, -1);
  });
  it("mid-range color round-trips within epsilon", () => {
    const orig = { r: 100, g: 150, b: 200 };
    const { r, g, b } = hsvToRgb(...Object.values(rgbToHsv(orig.r, orig.g, orig.b)) as [number,number,number]);
    expect(Math.abs(r - orig.r)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(g - orig.g)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(b - orig.b)).toBeLessThanOrEqual(EPSILON);
  });
});

describe("HLS round-trips", () => {
  it("pure green round-trips through HLS", () => {
    const { h, l, s } = rgbToHls(0, 255, 0);
    expect(h).toBe(120); expect(l).toBe(50); expect(s).toBe(100);
    const { r, g, b } = hlsToRgb(h, l, s);
    expect(r).toBeCloseTo(0, -1); expect(g).toBeCloseTo(255, -1); expect(b).toBeCloseTo(0, -1);
  });
  it("mid-range color round-trips within epsilon", () => {
    const orig = { r: 80, g: 160, b: 220 };
    const { h, l, s } = rgbToHls(orig.r, orig.g, orig.b);
    const { r, g, b } = hlsToRgb(h, l, s);
    expect(Math.abs(r - orig.r)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(g - orig.g)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(b - orig.b)).toBeLessThanOrEqual(EPSILON);
  });
});

describe("CMYK round-trips", () => {
  it("black maps to k=100", () => {
    expect(rgbToCmyk(0, 0, 0)).toEqual({ c: 0, m: 0, y: 0, k: 100 });
  });
  it("white maps to all zeros", () => {
    expect(rgbToCmyk(255, 255, 255)).toEqual({ c: 0, m: 0, y: 0, k: 0 });
  });
  it("mid-range color round-trips within epsilon", () => {
    const orig = { r: 120, g: 60, b: 200 };
    const { c, m, y, k } = rgbToCmyk(orig.r, orig.g, orig.b);
    const { r, g, b } = cmykToRgb(c, m, y, k);
    expect(Math.abs(r - orig.r)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(g - orig.g)).toBeLessThanOrEqual(EPSILON);
    expect(Math.abs(b - orig.b)).toBeLessThanOrEqual(EPSILON);
  });
});
