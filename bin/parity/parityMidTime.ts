// The mid-time shot: every animation paused at a fixed point inside it, so a
// regression that only shows mid-animation (a keyframe, a flash, a bounce)
// differs, where the t=0 shot parks everything at its first frame. Pure
// helpers; parityShoot.ts drives the page.
//
// `midAnimationTime` and `freezeAnimationsAt` also run inside the page:
// `midFreezeScript` sends their source text, so they must stay
// self-contained (no imports, no module-level names but each other).

/** Where to pause: a percentage of each animation's iteration, or a fixed
 * time after the story became ready. */
export type ParityMidAt =
	| { unit: "%"; value: number }
	| { unit: "ms"; value: number };

/** The default `--at`: the middle of an iteration is the point farthest from
 * both boundaries, where a looping or alternating animation meets its t=0 or
 * final frame, and it suits a 100 ms flash and a 20 s saver alike. */
export const PARITY_MID_DEFAULT_AT = "50%";

/** How far the JS clock (Playwright's fixed Date) moves for a percentage
 * `--at`, which gives no single time: half the 4 s startup sequence, the
 * longest Date.now-driven animation in Classicy, and far short of the screen
 * saver's shortest idle timeout (1 min). */
export const PARITY_MID_CLOCK_MS = 2000;

/** The mid-time shot's file stem: `<id>@mid`. Story ids never hold `@`. */
export const PARITY_MID_SUFFIX = "@mid";

export const midShotName = (id: string) => `${id}${PARITY_MID_SUFFIX}`;
export const isMidShotName = (name: string) => name.endsWith(PARITY_MID_SUFFIX);

/** `50%` (0-100) or `400ms` / `1.5s`. A bare number is refused: it could be
 * either. */
export function parseMidAt(spec: string): ParityMidAt {
	const m = /^(\d+(?:\.\d+)?)(%|ms|s)$/.exec(spec);
	if (m) {
		const n = Number(m[1]);
		if (m[2] === "%" && n <= 100) return { unit: "%", value: n };
		if (m[2] === "ms") return { unit: "ms", value: n };
		if (m[2] === "s") return { unit: "ms", value: n * 1000 };
	}
	throw new Error(
		`--at must be a percentage of an iteration (0%-100%, e.g. 50%) or a time (e.g. 400ms, 1.5s); got "${spec}"`,
	);
}

/** The JS clock's advance: `--mid-clock` when given, else the `--at` time,
 * else (a percentage) PARITY_MID_CLOCK_MS. */
export const midClockMs = (at: ParityMidAt, override?: number) =>
	override ?? (at.unit === "ms" ? at.value : PARITY_MID_CLOCK_MS);

/** A story gets a mid-time shot when it had animations at ready time, or
 * when it is on the `--mid-stories` list. */
export const selectsMidShot = (
	id: string,
	animationsAtReady: number,
	forced: ReadonlySet<string> = new Set(),
) => animationsAtReady > 0 || forced.has(id);

/** The subset of `effect.getComputedTiming()` the time is computed from. */
export type ParityAnimationTiming = {
	delay?: number;
	duration?: number | string;
	activeDuration?: number;
};

/**
 * The `currentTime` to pause one animation at.
 *
 * A fixed time is used as is, for every animation: the frame that many ms
 * after the story became ready, delays and staggering included.
 *
 * A percentage is taken of one iteration, so a looping animation lands
 * mid-cycle rather than on an iteration boundary, or of the whole active
 * interval when that is shorter (fractional iteration counts). A positive
 * delay is skipped, so a late starter is still caught mid-way; a negative
 * delay is a phase offset and is kept, so staggered elements stay staggered.
 * A zero or non-numeric duration parks the animation at its start.
 */
export function midAnimationTime(
	timing: ParityAnimationTiming,
	at: ParityMidAt,
): number {
	if (at.unit === "ms") return at.value;
	const delay =
		typeof timing.delay === "number" && timing.delay > 0 ? timing.delay : 0;
	const duration =
		typeof timing.duration === "number" &&
		Number.isFinite(timing.duration) &&
		timing.duration > 0
			? timing.duration
			: 0;
	const active =
		typeof timing.activeDuration === "number" && timing.activeDuration >= 0
			? timing.activeDuration
			: duration;
	return delay + (at.value / 100) * Math.min(duration, active);
}

export type ParityFreezableAnimation = {
	effect: { getComputedTiming?: () => ParityAnimationTiming } | null;
	pause: () => void;
	currentTime: unknown;
};

/** Pause every animation at its mid time; returns how many were frozen.
 * Idempotent, so it can run again for animations that started later. */
export function freezeAnimationsAt(
	animations: Iterable<ParityFreezableAnimation>,
	at: ParityMidAt,
): number {
	let frozen = 0;
	for (const a of animations) {
		try {
			const timing = a.effect?.getComputedTiming?.();
			if (!timing) continue;
			a.pause();
			a.currentTime = midAnimationTime(timing, at);
			frozen++;
		} catch {}
	}
	return frozen;
}

/** Page script: defines `window.__parityMid` with `freeze(at)` (every
 * document animation, CSS animations and transitions alike) and `watch(at)`
 * (freeze again whenever an animation or transition starts later, from a
 * capture-phase listener). */
export function midFreezeScript(): string {
	return `(() => {
	const midAnimationTime = ${midAnimationTime.toString()};
	const freezeAnimationsAt = ${freezeAnimationsAt.toString()};
	const freeze = (at) => freezeAnimationsAt(document.getAnimations(), at);
	const watch = (at) => {
		for (const type of ["animationstart", "transitionrun"])
			document.addEventListener(type, () => freeze(at), true);
	};
	window.__parityMid = { freeze, watch };
})();`;
}
