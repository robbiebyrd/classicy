// 3D Pipes (sspipes.scr) running: its pipe system (pipesSystem.ts) drawn by
// WebGL (pipesRenderer.ts), one node a tick, a finished system dissolving to
// black block by block before the next starts, seen from a new angle (the
// .scr turned its view up to 75 degrees either way about the vertical).
import type { Windows98SaverMachine } from "../useWindows98Saver";
import type { Windows98Random } from "../windows98SaverTimer";
import { pipesSides } from "./pipesGeometry";
import {
	createPipesRenderer,
	PIPES_SOLID_MATERIALS,
	PIPES_TEXTURED_MATERIALS,
	type PipesRenderer,
} from "./pipesRenderer";
import { type PipesOptions, pipesSystem } from "./pipesSystem";

export type PipesSaverOptions = PipesOptions & {
	/** Resolution, 0 (Min) to 200 (Max). */
	resolution: number;
	/** The Textured surface's image URL, or `null` for Solid. */
	texture: string | null;
};

/** The grid's nodes down and deep; across, as many more as the screen is wide. */
const NODES = 12;
/** Ticks the dissolve takes. */
const DISSOLVE_TICKS = 24;
/** The ticks a still frame grows. */
const STILL_TICKS = 160;

/** 3D Pipes on `canvas`, `width` by `height`, or `null` without WebGL. */
export const pipes = (
	canvas: HTMLCanvasElement,
	width: number,
	height: number,
	random: Windows98Random,
	options: PipesSaverOptions,
): Windows98SaverMachine | null => {
	const gl = canvas.getContext("webgl", {
		alpha: false,
		antialias: false,
		depth: true,
		preserveDrawingBuffer: true,
	}) as WebGLRenderingContext | null;
	if (!gl) return null;
	const nx = Math.min(32, Math.max(8, Math.round((NODES * width) / height)));
	// Far enough back that the grid's front fills the 90-degree view.
	const distance = NODES / 2 + NODES / 2 + 1;
	const materials = options.texture
		? PIPES_TEXTURED_MATERIALS
		: PIPES_SOLID_MATERIALS;
	let image: HTMLImageElement | null = null;
	if (options.texture) {
		image = canvas.ownerDocument.createElement("img");
		image.decoding = "async";
		image.src = options.texture;
	}
	let renderer: PipesRenderer | null = null;
	let system: ReturnType<typeof pipesSystem> | null = null;
	let dissolve: Array<[number, number]> | null = null;
	let stillWanted = false;
	const block = Math.max(8, Math.round(Math.min(width, height) / 40));

	const newSystem = () => {
		system = pipesSystem(nx, NODES, NODES, materials.length, random, options);
		const angle = (((random() % 151) - 75) * Math.PI) / 180;
		renderer?.reset(angle, distance);
	};
	const ready = (): boolean => {
		if (renderer) return true;
		if (gl.isContextLost()) return false;
		if (image && !(image.complete && image.naturalWidth > 0)) return false;
		renderer = createPipesRenderer(
			gl,
			width,
			height,
			pipesSides(options.resolution),
			image,
			materials,
		);
		if (!renderer) return false;
		newSystem();
		return true;
	};
	const grow = () => {
		if (!system || !renderer) return false;
		const { pieces, done } = system.tick();
		for (const piece of pieces) renderer.draw(piece);
		return done;
	};
	const drawStill = () => {
		if (!ready()) return;
		for (let tick = 0; tick < STILL_TICKS; tick++) if (grow()) break;
	};
	image?.addEventListener("load", () => {
		if (stillWanted) drawStill();
	});
	const onLost = (event: Event) => {
		event.preventDefault();
		renderer = null;
		system = null;
		dissolve = null;
	};
	canvas.addEventListener("webglcontextlost", onLost);

	return {
		tick() {
			if (!ready() || !renderer) return;
			if (dissolve) {
				const batch = Math.ceil(dissolve.length / DISSOLVE_TICKS) || 1;
				for (const [x, y] of dissolve.splice(0, batch))
					renderer.clearBlock(x, y, block, block);
				if (dissolve.length === 0) {
					dissolve = null;
					newSystem();
				}
				return;
			}
			if (!grow()) return;
			const blocks: Array<[number, number]> = [];
			for (let y = 0; y < height; y += block)
				for (let x = 0; x < width; x += block) blocks.push([x, y]);
			for (let i = blocks.length - 1; i > 0; i--) {
				const j = random() % (i + 1);
				const swap = blocks[i] as [number, number];
				blocks[i] = blocks[j] as [number, number];
				blocks[j] = swap;
			}
			dissolve = blocks;
		},
		still() {
			stillWanted = true;
			drawStill();
		},
		flush() {},
		stop() {
			canvas.removeEventListener("webglcontextlost", onLost);
			renderer?.dispose();
			// The context stays the canvas's: a restart (a new size, new
			// options) draws on it again.
			renderer = null;
		},
	};
};
