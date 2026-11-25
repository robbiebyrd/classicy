// What Windows 98's screen savers ran on: the 55 ms timer tick and the C
// runtime's random numbers. Every saver here is a port of its .scr file on the
// Windows 98 Second Edition CD (docs/windows98-asset-inventory.md, "Screen
// savers"), and these two decide how fast and how randomly it moves.

/**
 * Windows 95 and 98 delivered WM_TIMER on the system's 18.2 Hz clock tick, so
 * a timer fired every 55 ms at the fastest, and a longer one at the first
 * tick after its interval had passed. The savers asked for 9, 10, 30 or
 * 50 ms and got 55.
 */
export const WINDOWS98_TIMER_TICK_MS = 55;

/** The period a SetTimer interval of `ms` really fired at under Windows 98. */
export const windows98TimerPeriod = (ms: number): number =>
	Math.max(1, Math.ceil(Math.max(0, ms) / WINDOWS98_TIMER_TICK_MS)) *
	WINDOWS98_TIMER_TICK_MS;

/** A seeded random number generator, one call one value. */
export type Windows98Random = () => number;

/**
 * The linear congruential generator Starfield, Flying Windows, Mystify and
 * Scrolling Marquee carry (`seed = seed * 214013 + 2531011`, the Microsoft C
 * runtime's), each value the seed's high 16 bits (0 to 65535), seeded with
 * the tick count as the savers seeded it.
 */
export const createWindows98Random = (
	seed: number = Date.now(),
): Windows98Random => {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 0x343fd) + 0x269ec3) >>> 0;
		return state >>> 16;
	};
};

/**
 * Curves and Colors' own generator (`seed = seed * 69069 + 1`, the whole
 * 32-bit seed each value), seeded with the tick count.
 */
export const createWindows98CurvesRandom = (
	seed: number = Date.now(),
): Windows98Random => {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 0x10dcd) + 1) >>> 0;
		return state;
	};
};
