import { describe, expect, it } from "vitest";
import {
	freezeAnimationsAt,
	isMidShotName,
	midAnimationTime,
	midClockMs,
	midFreezeScript,
	midShotName,
	midStillCss,
	PARITY_MID_CLOCK_MS,
	PARITY_MID_STILL_SELECTORS,
	parseMidAt,
	selectsMidShot,
	unfrozenAnimations,
} from "./parityMidTime.ts";

const timing = (t: Partial<Parameters<typeof midAnimationTime>[0]> = {}) => ({
	delay: 0,
	duration: 1000,
	activeDuration: Number.POSITIVE_INFINITY,
	...t,
});

describe("parseMidAt", () => {
	it("reads a percentage of an iteration", () => {
		expect(parseMidAt("50%")).toEqual({ unit: "%", value: 50 });
		expect(parseMidAt("12.5%")).toEqual({ unit: "%", value: 12.5 });
		expect(parseMidAt("0%")).toEqual({ unit: "%", value: 0 });
		expect(parseMidAt("100%")).toEqual({ unit: "%", value: 100 });
	});

	it("reads milliseconds and seconds", () => {
		expect(parseMidAt("400ms")).toEqual({ unit: "ms", value: 400 });
		expect(parseMidAt("0ms")).toEqual({ unit: "ms", value: 0 });
		expect(parseMidAt("1.5s")).toEqual({ unit: "ms", value: 1500 });
	});

	it("rejects a bare number, a percentage over 100 and garbage", () => {
		for (const bad of ["400", "101%", "-5%", "-1ms", "half", "", "50 %"])
			expect(() => parseMidAt(bad), bad).toThrow(/--at/);
	});
});

describe("midAnimationTime", () => {
	const half = { unit: "%", value: 50 } as const;

	it("takes the fraction of one iteration, whatever the iteration count", () => {
		expect(midAnimationTime(timing(), half)).toBe(500);
		expect(midAnimationTime(timing({ activeDuration: 3000 }), half)).toBe(500);
		expect(
			midAnimationTime(timing({ duration: 200 }), { unit: "%", value: 25 }),
		).toBe(50);
	});

	it("takes the fraction of the active interval when it is shorter than an iteration", () =>
		expect(midAnimationTime(timing({ activeDuration: 400 }), half)).toBe(200));

	it("skips a positive delay, so the shot lands inside the first iteration", () =>
		expect(midAnimationTime(timing({ delay: 2000 }), half)).toBe(2500));

	it("keeps a negative delay as a phase offset (staggered elements stay staggered)", () =>
		expect(midAnimationTime(timing({ delay: -300 }), half)).toBe(500));

	it("parks a zero-length or non-numeric duration at its start", () => {
		expect(midAnimationTime(timing({ duration: 0 }), half)).toBe(0);
		expect(midAnimationTime(timing({ duration: "auto" }), half)).toBe(0);
		expect(midAnimationTime(timing({ duration: 0, delay: 70 }), half)).toBe(70);
		expect(midAnimationTime(timing({ activeDuration: 0 }), half)).toBe(0);
	});

	it("uses a fixed time as is: the frame that many ms after the start", () => {
		const at = { unit: "ms", value: 400 } as const;
		expect(midAnimationTime(timing({ delay: 2000 }), at)).toBe(400);
		expect(midAnimationTime(timing({ duration: 50 }), at)).toBe(400);
	});
});

describe("midClockMs", () => {
	it("moves the JS clock by the fixed time, or by the default for a percentage", () => {
		expect(midClockMs({ unit: "ms", value: 400 })).toBe(400);
		expect(midClockMs({ unit: "%", value: 50 })).toBe(PARITY_MID_CLOCK_MS);
	});

	it("lets an explicit --mid-clock win", () =>
		expect(midClockMs({ unit: "ms", value: 400 }, 0)).toBe(0));
});

describe("mid shot names", () => {
	it("suffixes the story id with @mid, which no story id contains", () => {
		expect(midShotName("controls-button--default")).toBe(
			"controls-button--default@mid",
		);
		expect(isMidShotName("controls-button--default@mid")).toBe(true);
		expect(isMidShotName("controls-button--default")).toBe(false);
		expect(isMidShotName("x@middle")).toBe(false);
	});
});

describe("selectsMidShot", () => {
	const forced = new Set(["listed--story"]);
	it("selects a story with animations at ready time, or one on the list", () => {
		expect(selectsMidShot("a--b", 2, forced)).toBe(true);
		expect(selectsMidShot("a--b", 0, forced)).toBe(false);
		expect(selectsMidShot("listed--story", 0, forced)).toBe(true);
		expect(selectsMidShot("a--b", 0)).toBe(false);
	});
});

type FakeAnimation = {
	paused: boolean;
	playState?: string;
	currentTime: number | null;
	effect: { getComputedTiming: () => ReturnType<typeof timing> } | null;
	pause: () => void;
};

const fake = (t: ReturnType<typeof timing> | null): FakeAnimation => ({
	paused: false,
	currentTime: 123,
	effect: t ? { getComputedTiming: () => t } : null,
	pause() {
		this.paused = true;
		this.playState = "paused";
	},
});

describe("freezeAnimationsAt", () => {
	it("pauses every animation at its own time and counts them", () => {
		const a = fake(timing());
		const b = fake(timing({ duration: 200, delay: 100 }));
		expect(freezeAnimationsAt([a, b], { unit: "%", value: 50 })).toBe(2);
		expect([a.paused, a.currentTime]).toEqual([true, 500]);
		expect([b.paused, b.currentTime]).toEqual([true, 200]);
	});

	it("is idempotent, so new animations can be caught by freezing all again", () => {
		const a = fake(timing());
		freezeAnimationsAt([a], { unit: "%", value: 50 });
		freezeAnimationsAt([a], { unit: "%", value: 50 });
		expect(a.currentTime).toBe(500);
	});

	it("skips an animation that throws, and one without an effect", () => {
		const boom = {
			...fake(timing()),
			pause() {
				throw new Error("detached");
			},
		};
		const bare = fake(null);
		expect(freezeAnimationsAt([boom, bare], { unit: "ms", value: 9 })).toBe(0);
		expect(bare.paused).toBe(false);
	});
});

describe("unfrozenAnimations", () => {
	const half = { unit: "%", value: 50 } as const;
	it("counts animations that are not paused at their mid time", () => {
		const frozen = fake(timing());
		freezeAnimationsAt([frozen], half);
		const running = fake(timing());
		const moved = fake(timing());
		freezeAnimationsAt([moved], half);
		moved.currentTime = 501;
		const resumed = fake(timing());
		freezeAnimationsAt([resumed], half);
		resumed.playState = "running";
		expect(unfrozenAnimations([frozen], half)).toBe(0);
		expect(unfrozenAnimations([frozen, running, moved, resumed], half)).toBe(3);
	});

	it("ignores an animation without an effect, as the freeze does", () =>
		expect(unfrozenAnimations([fake(null)], half)).toBe(0));
});

describe("midFreezeScript", () => {
	it("defines a self-contained freeze that runs without this module", () => {
		const listeners: string[] = [];
		const a = fake(timing({ duration: 800 }));
		const win: Record<string, unknown> = {};
		const doc = {
			getAnimations: () => [a],
			addEventListener: (type: string) => listeners.push(type),
		};
		new Function("window", "document", midFreezeScript())(win, doc);
		const mid = win.__parityMid as {
			freeze: (at: unknown) => number;
			watch: (at: unknown) => void;
		};
		expect(mid.freeze({ unit: "%", value: 50 })).toBe(1);
		expect(a.currentTime).toBe(400);
		mid.watch({ unit: "%", value: 50 });
		expect(listeners.sort()).toEqual(["animationstart", "transitionrun"]);
	});

	it("reports the unfrozen count and how many animations it has frozen so far", () => {
		const anims = [fake(timing())];
		const win: Record<string, unknown> = {};
		const doc = { getAnimations: () => anims, addEventListener: () => {} };
		new Function("window", "document", midFreezeScript())(win, doc);
		const mid = win.__parityMid as {
			freeze: (at: unknown) => number;
			state: (at: unknown) => { unfrozen: number; seen: number };
		};
		const half = { unit: "%", value: 50 };
		expect(mid.state(half)).toEqual({ unfrozen: 1, seen: 0 });
		mid.freeze(half);
		mid.freeze(half);
		expect(mid.state(half)).toEqual({ unfrozen: 0, seen: 1 });
		anims.push(fake(timing()));
		expect(mid.state(half)).toEqual({ unfrozen: 1, seen: 1 });
		mid.freeze(half);
		expect(mid.state(half)).toEqual({ unfrozen: 0, seen: 2 });
	});
});

describe("midStillCss", () => {
	it("switches the clock colon's blink off, with enough weight to win", () => {
		expect(PARITY_MID_STILL_SELECTORS).toContain(".textBlinker");
		expect(midStillCss()).toContain(".textBlinker, ");
		expect(midStillCss()).toMatch(/ \{ animation: none !important; \}$/);
	});

	it("holds the chasing arrows' spinner still too", () => {
		expect(PARITY_MID_STILL_SELECTORS).toContain(
			".classicyProgressChasingArrowsSpinner",
		);
	});

	it("lists every selector, comma separated", () => {
		expect(midStillCss()).toMatch(/^(\.[\w-]+, )*\.[\w-]+ \{/);
	});
});
