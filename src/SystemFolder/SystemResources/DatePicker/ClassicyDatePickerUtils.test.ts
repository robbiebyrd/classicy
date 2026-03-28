import { describe, it, expect } from "vitest";
import {
    validateDayOfMonth,
    validateMonth,
} from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePickerUtils";

describe("validateDayOfMonth", () => {
    it("returns the day unchanged for a normal day in January", () => {
        expect(validateDayOfMonth(15, 1)).toBe(15);
    });

    it("returns 1 when day is zero", () => {
        expect(validateDayOfMonth(0, 1)).toBe(1);
    });

    it("returns 1 when day is negative", () => {
        expect(validateDayOfMonth(-5, 1)).toBe(1);
    });

    it("clamps to 31 when day exceeds January maximum", () => {
        expect(validateDayOfMonth(32, 1)).toBe(31);
    });

    it("clamps February to 28 when no year is given", () => {
        expect(validateDayOfMonth(29, 2)).toBe(28);
    });

    it("allows February 29 in a leap year", () => {
        expect(validateDayOfMonth(29, 2, 2024)).toBe(29);
    });

    it("clamps February to 28 in a non-leap century year (1900)", () => {
        expect(validateDayOfMonth(29, 2, 1900)).toBe(28);
    });

    it("allows February 29 in a 400-year leap century (2000)", () => {
        expect(validateDayOfMonth(29, 2, 2000)).toBe(29);
    });

    it("clamps to 30 when day exceeds April maximum", () => {
        expect(validateDayOfMonth(31, 4)).toBe(30);
    });
});

describe("validateMonth", () => {
    it("returns 1 when month is 0", () => {
        expect(validateMonth(0)).toBe(1);
    });

    it("returns 1 when month is negative", () => {
        expect(validateMonth(-1)).toBe(1);
    });

    it("returns 12 when month exceeds 12", () => {
        expect(validateMonth(13)).toBe(12);
    });

    it("returns the month unchanged for a mid-year value", () => {
        expect(validateMonth(6)).toBe(6);
    });

    it("returns 1 for the first month", () => {
        expect(validateMonth(1)).toBe(1);
    });

    it("returns 12 for the last month", () => {
        expect(validateMonth(12)).toBe(12);
    });
});
