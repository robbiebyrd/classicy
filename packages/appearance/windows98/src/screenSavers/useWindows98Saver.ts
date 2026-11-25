import { type RefObject, useEffect, useRef } from "react";
import { windows98TimerPeriod } from "./windows98SaverTimer";

/** A running saver: one WM_TIMER at a time, painted when the frame is due. */
export type Windows98SaverMachine = {
	/** One timer tick: move and draw, as the .scr's WM_TIMER handler did. */
	tick(): void;
	/** Paint what the ticks drew since the last paint. */
	flush(): void;
	/**
	 * Draw the still frame shown under reduced motion, in place of
	 * `stillTicks` ticks (Scrolling Marquee's text in mid-screen).
	 */
	still?(): void;
	/** Release what the saver holds (a WebGL context, say). */
	stop?(): void;
};

export type Windows98SaverSetup = {
	/** The interval the .scr asked SetTimer for, in milliseconds. */
	intervalMs: number;
	/**
	 * How many ticks the still frame is drawn after, under reduced motion: the
	 * saver as it looks once it has run a while.
	 */
	stillTicks: number;
	/**
	 * Start the saver on `canvas`, sized `width` by `height` (one canvas pixel
	 * a CSS pixel), or return `null` to draw nothing (no 2D or WebGL context).
	 */
	start(
		canvas: HTMLCanvasElement,
		width: number,
		height: number,
	): Windows98SaverMachine | null;
};

// At most this many ticks catch up in one frame; a longer stall is dropped,
// as a busy Windows dropped WM_TIMER messages rather than queue them.
const MAX_TICKS_PER_FRAME = 4;

/**
 * Run a Windows 98 saver on `canvasRef`'s canvas, sized to the canvas's
 * parent (the saver's root, which fills the overlay):
 *
 * - Ticks at the period Windows 98 really ran its timer at
 *   (`windows98TimerPeriod`), from animation frames, painting once a frame.
 * - Under `prefers-reduced-motion: reduce` it draws one still frame (the
 *   saver after `stillTicks` ticks) and stops; turning the preference on later
 *   stops it where it is, and turning it off resumes it.
 * - It stops while the page is hidden and resumes when it shows again,
 *   without catching up.
 * - It starts over when the canvas's box changes size (Windows restarted a
 *   saver on a display change) or when `key` (the saver's options) changes.
 *
 * The overlay's own reduced-motion pause stops CSS animations only, so a
 * canvas saver owes its own; and the overlay hides the pointer with a
 * stylesheet rule, so nothing here sets a cursor.
 */
export const useWindows98Saver = (
	canvasRef: RefObject<HTMLCanvasElement | null>,
	setup: Windows98SaverSetup,
	key: string,
): void => {
	const setupRef = useRef(setup);
	setupRef.current = setup;
	// biome-ignore lint/correctness/useExhaustiveDependencies: the saver restarts when its options (key) change; the setup is read through the ref
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const doc = canvas.ownerDocument;
		const view = doc.defaultView;
		if (!view) return;
		const box = canvas.parentElement ?? canvas;
		const reduce =
			typeof view.matchMedia === "function"
				? view.matchMedia("(prefers-reduced-motion: reduce)")
				: undefined;
		const { intervalMs, stillTicks } = setupRef.current;
		const period = windows98TimerPeriod(intervalMs);
		let machine: Windows98SaverMachine | null = null;
		let frame = 0;
		let last = 0;
		let carry = 0;
		let size = "";

		const halt = () => {
			if (frame) view.cancelAnimationFrame(frame);
			frame = 0;
			last = 0;
			carry = 0;
		};
		const loop = (now: number) => {
			frame = 0;
			if (!machine) return;
			if (last) carry += now - last;
			last = now;
			let ticks = 0;
			while (carry >= period && ticks < MAX_TICKS_PER_FRAME) {
				machine.tick();
				carry -= period;
				ticks++;
			}
			if (carry >= period) carry = 0;
			if (ticks) machine.flush();
			schedule();
		};
		const schedule = () => {
			if (frame || !machine || reduce?.matches || doc.hidden) return;
			if (typeof view.requestAnimationFrame !== "function") return;
			frame = view.requestAnimationFrame(loop);
		};
		const begin = () => {
			halt();
			machine?.stop?.();
			machine = null;
			const width = Math.max(1, Math.round(box.clientWidth || view.innerWidth));
			const height = Math.max(
				1,
				Math.round(box.clientHeight || view.innerHeight),
			);
			size = `${width}x${height}`;
			canvas.width = width;
			canvas.height = height;
			machine = setupRef.current.start(canvas, width, height);
			if (!machine) return;
			if (reduce?.matches) {
				if (machine.still) machine.still();
				else for (let tick = 0; tick < stillTicks; tick++) machine.tick();
			}
			machine.flush();
			schedule();
		};

		const onVisibility = () => (doc.hidden ? halt() : schedule());
		const onReduce = () => (reduce?.matches ? halt() : schedule());
		doc.addEventListener("visibilitychange", onVisibility);
		reduce?.addEventListener?.("change", onReduce);
		const resize =
			typeof view.ResizeObserver === "function"
				? new view.ResizeObserver(() => {
						const next = `${Math.max(1, Math.round(box.clientWidth || view.innerWidth))}x${Math.max(1, Math.round(box.clientHeight || view.innerHeight))}`;
						if (next !== size) begin();
					})
				: undefined;
		resize?.observe(box);
		begin();
		return () => {
			halt();
			machine?.stop?.();
			machine = null;
			resize?.disconnect();
			reduce?.removeEventListener?.("change", onReduce);
			doc.removeEventListener("visibilitychange", onVisibility);
		};
	}, [canvasRef, key]);
};
