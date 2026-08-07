import { describe, expect, it, vi } from "vitest";

// The hook module pulls in the app manager store; this is a pure geometry test
// and has no use for it, and letting it initialise logs a localStorage failure.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({ useAppManager: () => false }),
);

import { resolveBalloonPosition } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

/**
 * `position` is a preference. An anchor near an edge of the viewport has no room
 * on the side the caller asked for, and the balloon then opens somewhere nobody
 * can see it.
 *
 * jsdom reports every rect as zero, so a rendered balloon cannot be measured
 * here — these cover the decision as a function of measurements instead. The
 * numbers below are the real ones read out of the browser, and the resulting
 * geometry was confirmed there.
 */

const VIEWPORT = { width: 1280, height: 800 };
const CONTROL_SIZE = 12;
const BALLOON = { width: 234, height: 63.4 };

/** Where the stock desktop puts the Macintosh HD icon: hard against the top right. */
const DISK_ICON = {
	top: 48,
	left: 1172,
	right: 1268,
	bottom: 144,
	width: 96,
};

const at = (left: number, top: number, size = 96) => ({
	top,
	left,
	right: left + size,
	bottom: top + size,
	width: size,
});

describe("resolveBalloonPosition", () => {
	it("gets the disk icon's balloon back on screen", () => {
		// The reported bug. "top-left" is the stock default and means "above the
		// anchor, opening rightward" — from the top-right corner that is off the
		// top of the screen and off the right of it at the same time.
		expect(
			resolveBalloonPosition(
				"top-left",
				DISK_ICON,
				BALLOON,
				CONTROL_SIZE,
				VIEWPORT,
			),
		).toBe("bottom-right");
	});

	it("leaves the caller's preference alone when it fits", () => {
		// Nothing should move for an anchor with room on every side.
		expect(
			resolveBalloonPosition(
				"top-left",
				at(600, 350),
				BALLOON,
				CONTROL_SIZE,
				VIEWPORT,
			),
		).toBe("top-left");
	});

	it("flips only the axis that is short of room", () => {
		// Top edge, but acres of space to the right: the vertical side flips and
		// the horizontal one does not.
		expect(
			resolveBalloonPosition(
				"top-left",
				at(40, 40),
				BALLOON,
				CONTROL_SIZE,
				VIEWPORT,
			),
		).toBe("bottom-left");

		// ...and the mirror image: room above, none to the right.
		expect(
			resolveBalloonPosition(
				"top-left",
				at(1160, 660),
				BALLOON,
				CONTROL_SIZE,
				VIEWPORT,
			),
		).toBe("top-right");
	});

	it("flips a right-aligned preference back toward the left edge", () => {
		// "right" opens leftward, which runs out of room at the left edge.
		expect(
			resolveBalloonPosition(
				"bottom-right",
				at(10, 300),
				BALLOON,
				CONTROL_SIZE,
				VIEWPORT,
			),
		).toBe("bottom-left");
	});

	it("falls back to centre when neither side has room", () => {
		// A balloon wider than the space on either side of the anchor, but which
		// still fits the viewport if it straddles it.
		const narrow = { width: 700, height: 63.4 };
		expect(
			resolveBalloonPosition(
				"top-left",
				at(620, 350),
				narrow,
				CONTROL_SIZE,
				VIEWPORT,
			),
		).toBe("top-center");
	});

	it("picks the least-bad side when the balloon cannot fit at all", () => {
		// A viewport smaller than the balloon has no good answer, so the one that
		// overhangs least wins and the balloon stays mostly visible instead of
		// being parked entirely outside. Here that is centre, which straddles the
		// viewport and spills 400px against left's 668 and right's 648; the two
		// vertical sides overhang equally, so the caller's preference stands.
		expect(
			resolveBalloonPosition(
				"top-left",
				at(240, 180, 40),
				{ width: 900, height: 700 },
				CONTROL_SIZE,
				{ width: 500, height: 400 },
			),
		).toBe("top-center");
	});
});
