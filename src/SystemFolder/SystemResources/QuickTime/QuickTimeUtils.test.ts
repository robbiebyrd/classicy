import { describe, expect, it } from "vitest";
import {
	getVolumeIcon,
	timeFriendly,
} from "@/SystemFolder/SystemResources/QuickTime/QuickTimeUtils";

describe("timeFriendly", () => {
	it("formats 0 seconds as 0:00:00", () => {
		expect(timeFriendly(0)).toBe("0:00:00");
	});

	it("formats 61 seconds as 0:01:01", () => {
		expect(timeFriendly(61)).toBe("0:01:01");
	});

	it("formats 3661 seconds as 1:01:01", () => {
		expect(timeFriendly(3661)).toBe("1:01:01");
	});

	it("returns 0:00:00 for NaN", () => {
		expect(timeFriendly(NaN)).toBe("0:00:00");
	});

	it("returns 0:00:00 for Infinity", () => {
		expect(timeFriendly(Infinity)).toBe("0:00:00");
	});

	it("returns 0:00:00 for -Infinity", () => {
		expect(timeFriendly(-Infinity)).toBe("0:00:00");
	});

	it("formats 59 seconds as 0:00:59", () => {
		expect(timeFriendly(59)).toBe("0:00:59");
	});

	it("formats 3600 seconds as 1:00:00", () => {
		expect(timeFriendly(3600)).toBe("1:00:00");
	});
});

describe("getVolumeIcon", () => {
	it("returns a string for volume 0 (muted)", () => {
		expect(typeof getVolumeIcon(0)).toBe("string");
	});

	it("returns a string for volume 0.1 (low)", () => {
		expect(typeof getVolumeIcon(0.1)).toBe("string");
	});

	it("returns a string for volume 0.5 (mid)", () => {
		expect(typeof getVolumeIcon(0.5)).toBe("string");
	});

	it("returns a string for volume 1.0 (full)", () => {
		expect(typeof getVolumeIcon(1.0)).toBe("string");
	});

	it("returns different values for different volume ranges", () => {
		const muted = getVolumeIcon(0);
		const low = getVolumeIcon(0.1);
		const mid = getVolumeIcon(0.5);
		const full = getVolumeIcon(1.0);

		// Each range produces a distinct icon
		expect(muted).not.toBe(low);
		expect(low).not.toBe(mid);
		expect(mid).not.toBe(full);
		expect(muted).not.toBe(full);
	});

	it("boundary 0.3 is mid range, not low", () => {
		const low = getVolumeIcon(0.29);
		const mid = getVolumeIcon(0.3);
		expect(low).not.toBe(mid);
	});

	it("boundary 0.7 and above is full volume", () => {
		const mid = getVolumeIcon(0.69);
		const full = getVolumeIcon(0.7);
		expect(mid).not.toBe(full);
	});
});
