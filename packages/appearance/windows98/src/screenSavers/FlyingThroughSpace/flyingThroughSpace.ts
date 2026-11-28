// Flying Through Space (ssstars.scr, "Starfield Simulation"), its WM_TIMER
// handler: stars fly out of the center of the screen toward the viewer, each
// a white square growing from one pixel to four as it nears, erased each tick
// by drawing its last square in black (PatBlt BLACKNESS and WHITENESS). Every
// star starts at depth 2560 at a random spot (x and y alike taken modulo the
// screen's width, as the .scr took them), and the warp speed accelerates from
// a standstill by one depth unit a tick up to ten times the Warp speed
// option.
import type { Windows98Surface } from "../windows98SaverSurface";
import type { Windows98Random } from "../windows98SaverTimer";

/** The depth a star starts at. */
const FAR = 0xa00;

export type FlyingThroughSpaceOptions = {
	/** Warp speed, 1 (Slow) to 20 (Fast). */
	warpSpeed: number;
	/** Number of stars, 10 to 200. */
	density: number;
};

type Star = { x: number; y: number; z: number };

/** The star field, drawing on `surface`. */
export const flyingThroughSpace = (
	surface: Windows98Surface,
	random: Windows98Random,
	{ warpSpeed, density }: FlyingThroughSpaceOptions,
) => {
	const width = surface.width;
	const height = surface.height;
	const cx = Math.trunc(width / 2);
	const cy = Math.trunc(height / 2);
	const target = warpSpeed * 10;
	let speed = 0;
	const spawn = (star: Star) => {
		star.x = (random() % width) - cx;
		star.y = (random() % width) - cy;
		star.z = FAR;
	};
	const stars: Star[] = Array.from({ length: density }, () => {
		const star = { x: 0, y: 0, z: FAR };
		spawn(star);
		return star;
	});
	const sx = (star: Star) => cx + Math.trunc((star.x * FAR) / star.z);
	const sy = (star: Star) => cy + Math.trunc((star.y * FAR) / star.z);
	const side = (star: Star) => Math.trunc((FAR - star.z) / 640) + 1;
	return {
		stars,
		get speed() {
			return speed;
		},
		tick(): void {
			if (speed < target) speed++;
			else if (speed > target) speed--;
			for (const star of stars) {
				const erase = side(star);
				surface.fillRect(sx(star), sy(star), erase, erase, 0x000000);
				star.z = Math.max(0, star.z - speed);
				if (star.z === 0) spawn(star);
				let x = sx(star);
				let y = sy(star);
				if (x < 0 || y < 0 || x > width || y > height) {
					spawn(star);
					x = sx(star);
					y = sy(star);
				}
				const draw = side(star);
				surface.fillRect(x, y, draw, draw, 0xffffff);
			}
		},
		flush: () => surface.flush(),
	};
};
