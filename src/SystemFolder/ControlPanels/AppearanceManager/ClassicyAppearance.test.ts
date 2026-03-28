import { describe, it, expect } from "vitest";
import {
  getAllThemes,
  getTheme,
  getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

describe("getAllThemes", () => {
  it("returns an array", () => {
    expect(Array.isArray(getAllThemes())).toBe(true);
  });

  it("returns a non-empty array", () => {
    expect(getAllThemes().length).toBeGreaterThan(0);
  });

  it("each theme has required top-level fields", () => {
    const themes = getAllThemes();
    for (const theme of themes) {
      expect(theme).toHaveProperty("id");
      expect(theme).toHaveProperty("name");
      expect(theme).toHaveProperty("color");
      expect(theme).toHaveProperty("typography");
      expect(theme).toHaveProperty("measurements");
      expect(theme).toHaveProperty("desktop");
      expect(theme).toHaveProperty("sound");
    }
  });
});

describe("getTheme", () => {
  it("returns the matching theme for a known id", () => {
    const theme = getTheme("azul");
    expect(theme.id).toBe("azul");
    expect(theme.name).toBe("Azul");
  });

  it("returns the first theme as fallback for an unknown id", () => {
    const fallback = getTheme("this-theme-does-not-exist");
    const first = getAllThemes()[0];
    expect(fallback.id).toBe(first.id);
  });

  it("merges overrides into the returned theme", () => {
    const overrides = { typography: { ui: "Comic Sans" } };
    const theme = getTheme("default", overrides);
    expect(theme.typography.ui).toBe("Comic Sans");
  });

  it("deep-merges overrides without losing sibling properties", () => {
    const overrides = { typography: { ui: "Comic Sans" } };
    const theme = getTheme("default", overrides);
    // bodySize should still be present from the original
    expect(theme.typography.bodySize).toBeGreaterThan(0);
  });

  it("overrides do not mutate the original theme data", () => {
    const overrides = { typography: { ui: "Mutated Font" } };
    getTheme("default", overrides);
    // Calling again without overrides should return the original ui font
    const clean = getTheme("default");
    expect(clean.typography.ui).not.toBe("Mutated Font");
  });
});

describe("getThemeVars", () => {
  it("returns an object with --color-* keys", () => {
    const theme = getTheme("default");
    const vars = getThemeVars(theme);
    const colorKeys = Object.keys(vars).filter((k) => k.startsWith("--color-"));
    expect(colorKeys.length).toBeGreaterThan(0);
  });

  it("returns an object with --*-font keys", () => {
    const theme = getTheme("default");
    const vars = getThemeVars(theme);
    const fontKeys = Object.keys(vars).filter((k) => k.endsWith("-font"));
    expect(fontKeys.length).toBeGreaterThan(0);
  });

  it("all values are strings", () => {
    const theme = getTheme("default");
    const vars = getThemeVars(theme);
    for (const value of Object.values(vars)) {
      expect(typeof value).toBe("string");
    }
  });

  it("has at least 30 keys", () => {
    const theme = getTheme("default");
    const vars = getThemeVars(theme);
    expect(Object.keys(vars).length).toBeGreaterThanOrEqual(30);
  });

  it("contains the specific key --color-black", () => {
    const theme = getTheme("default");
    const vars = getThemeVars(theme);
    expect(vars).toHaveProperty("--color-black");
  });

  it("contains the specific key --ui-font", () => {
    const theme = getTheme("default");
    const vars = getThemeVars(theme);
    expect(vars).toHaveProperty("--ui-font");
  });

  it("contains the specific key --window-border-size", () => {
    const theme = getTheme("default");
    const vars = getThemeVars(theme);
    expect(vars).toHaveProperty("--window-border-size");
  });

  it("contains the specific key --desktop-icon-size", () => {
    const theme = getTheme("default");
    const vars = getThemeVars(theme);
    expect(vars).toHaveProperty("--desktop-icon-size");
  });
});
