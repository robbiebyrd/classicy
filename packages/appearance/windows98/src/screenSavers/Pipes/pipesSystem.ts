// 3D Pipes (sspipes.scr, OpenGL), its pipe system: pipes grow through a grid
// of nodes one node a tick, each running straight or turning a right angle
// into a free neighbor, never into a node a pipe holds, until none is free;
// then the next pipe starts at a free node. "Single" grows one pipe at a time,
// "Multiple" five at once. A Traditional pipe turns at a joint, a quarter
// torus ("Elbow") or a ball ("Ball"), "Mixed" taking either at each turn and
// "Cycle" changing from one to the other with each new pipe, and begins and
// ends in a ball; a Flex pipe bends in a wide arc. Every pipe takes its own
// material. Once the grid has taken its pipes, the screen dissolves to black
// and a new system starts, seen from a new angle.
//
// The pieces it yields are what the renderer draws (pipesGeometry.ts): a
// cylinder, a ball, an elbow; positions are node coordinates, the grid
// centered on the origin, one unit between nodes.
import type { Windows98Random } from "../windows98SaverTimer";

export type PipesOptions = {
	/** Five pipes at once, or one. */
	multiple: boolean;
	/** Flex pipes, or Traditional ones. */
	flex: boolean;
	jointType: "Elbow" | "Ball" | "Mixed" | "Cycle";
};

export type Vector = readonly [number, number, number];

export type PipesPiece =
	| {
			kind: "cylinder";
			from: Vector;
			to: Vector;
			radius: number;
			material: number;
	  }
	| { kind: "ball"; center: Vector; radius: number; material: number }
	| {
			kind: "elbow";
			/** Where the bend starts, on the incoming axis. */
			from: Vector;
			/** The incoming and outgoing directions, unit axes. */
			dirIn: Vector;
			dirOut: Vector;
			/** The bend's radius, axis to axis. */
			bend: number;
			radius: number;
			material: number;
	  };

/** A Traditional pipe's radius, a ball joint's, an elbow's bend (node spacing 1). */
export const PIPE_RADIUS = 0.1875;
export const BALL_RADIUS = PIPE_RADIUS * 1.5;
export const ELBOW_BEND = PIPE_RADIUS * 1.5;
/** A Flex pipe's radius and bend. */
export const FLEX_RADIUS = 0.15;
export const FLEX_BEND = 0.5;
/** How many pipes "Multiple" grows at once. */
export const MULTIPLE_PIPES = 5;
/** How many pipes a system grows before it dissolves. */
export const PIPES_PER_SYSTEM = 24;
/** The chance a pipe that may run straight on does. */
const STRAIGHT_ON = 0.8;

const DIRECTIONS: readonly Vector[] = [
	[1, 0, 0],
	[-1, 0, 0],
	[0, 1, 0],
	[0, -1, 0],
	[0, 0, 1],
	[0, 0, -1],
];

const add = (a: Vector, b: Vector, k = 1): Vector => [
	a[0] + b[0] * k,
	a[1] + b[1] * k,
	a[2] + b[2] * k,
];
const same = (a: Vector, b: Vector) =>
	a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

type Pipe = {
	node: Vector;
	dir: Vector;
	/** Where the next straight piece starts. */
	exit: Vector;
	material: number;
	joint: "Elbow" | "Ball";
	alive: boolean;
};

/**
 * A pipe system in a grid of `nx` by `ny` by `nz` nodes. `materials` is how
 * many materials a pipe may take (the renderer's list), `random` returns 0 to
 * 65535.
 */
export const pipesSystem = (
	nx: number,
	ny: number,
	nz: number,
	materials: number,
	random: Windows98Random,
	{ multiple, flex, jointType }: PipesOptions,
) => {
	const taken = new Uint8Array(nx * ny * nz);
	const index = ([x, y, z]: Vector) => (z * ny + y) * nx + x;
	const inside = ([x, y, z]: Vector) =>
		x >= 0 && y >= 0 && z >= 0 && x < nx && y < ny && z < nz;
	const free = (node: Vector) => inside(node) && !taken[index(node)];
	const center = ([x, y, z]: Vector): Vector => [
		x - (nx - 1) / 2,
		y - (ny - 1) / 2,
		z - (nz - 1) / 2,
	];
	const chance = () => random() / 65536;
	const pick = <T>(list: readonly T[]): T | undefined =>
		list[random() % Math.max(1, list.length)];
	const pipes: Pipe[] = [];
	let started = 0;
	let cycle: "Elbow" | "Ball" = "Ball";
	const radius = flex ? FLEX_RADIUS : PIPE_RADIUS;

	/** Start a pipe at a free node with a free neighbor; false if none is found. */
	const start = (out: PipesPiece[]): boolean => {
		for (let attempt = 0; attempt < 64; attempt++) {
			const node: Vector = [random() % nx, random() % ny, random() % nz];
			if (!free(node)) continue;
			const dirs = DIRECTIONS.filter((d) => free(add(node, d)));
			const dir = pick(dirs);
			if (!dir) continue;
			taken[index(node)] = 1;
			taken[index(add(node, dir))] = 1;
			if (jointType === "Cycle") cycle = cycle === "Elbow" ? "Ball" : "Elbow";
			const pipe: Pipe = {
				node: add(node, dir),
				dir,
				exit: center(node),
				material: random() % materials,
				joint:
					jointType === "Cycle"
						? cycle
						: jointType === "Ball"
							? "Ball"
							: "Elbow",
				alive: true,
			};
			pipes.push(pipe);
			started++;
			out.push({
				kind: "ball",
				center: center(node),
				radius: flex ? FLEX_RADIUS : BALL_RADIUS,
				material: pipe.material,
			});
			return true;
		}
		return false;
	};

	/** Grow `pipe` into its node: the piece there, and its next direction. */
	const grow = (pipe: Pipe, out: PipesPiece[]) => {
		const here = center(pipe.node);
		const ahead = add(pipe.node, pipe.dir);
		const turns = DIRECTIONS.filter(
			(d) =>
				!same(d, pipe.dir) &&
				!same(d, [-pipe.dir[0], -pipe.dir[1], -pipe.dir[2]]) &&
				free(add(pipe.node, d)),
		);
		const next =
			free(ahead) && (turns.length === 0 || chance() < STRAIGHT_ON)
				? pipe.dir
				: pick(turns);
		if (!next) {
			out.push({
				kind: "cylinder",
				from: pipe.exit,
				to: here,
				radius,
				material: pipe.material,
			});
			out.push({
				kind: "ball",
				center: here,
				radius: flex ? FLEX_RADIUS : BALL_RADIUS,
				material: pipe.material,
			});
			pipe.alive = false;
			return;
		}
		if (same(next, pipe.dir)) {
			out.push({
				kind: "cylinder",
				from: pipe.exit,
				to: here,
				radius,
				material: pipe.material,
			});
			pipe.exit = here;
		} else {
			const joint = flex
				? "Flex"
				: jointType === "Mixed"
					? chance() < 0.5
						? "Elbow"
						: "Ball"
					: pipe.joint;
			if (joint === "Ball") {
				out.push({
					kind: "cylinder",
					from: pipe.exit,
					to: here,
					radius,
					material: pipe.material,
				});
				out.push({
					kind: "ball",
					center: here,
					radius: BALL_RADIUS,
					material: pipe.material,
				});
				pipe.exit = here;
			} else {
				const bend = joint === "Flex" ? FLEX_BEND : ELBOW_BEND;
				const from = add(here, pipe.dir, -bend);
				out.push({
					kind: "cylinder",
					from: pipe.exit,
					to: from,
					radius,
					material: pipe.material,
				});
				out.push({
					kind: "elbow",
					from,
					dirIn: pipe.dir,
					dirOut: next,
					bend,
					radius,
					material: pipe.material,
				});
				pipe.exit = add(here, next, bend);
			}
		}
		pipe.dir = next;
		pipe.node = add(pipe.node, next);
		taken[index(pipe.node)] = 1;
	};

	return {
		get pipes(): readonly Pipe[] {
			return pipes;
		},
		get started() {
			return started;
		},
		isTaken: (node: Vector) => !free(node) && inside(node),
		/**
		 * One tick: each living pipe grows a node, and a pipe starts where one
		 * may. Returns the pieces to draw, and whether the system is done (its
		 * pipes all grown, or no room for the next).
		 */
		tick(): { pieces: PipesPiece[]; done: boolean } {
			const out: PipesPiece[] = [];
			for (const pipe of pipes) if (pipe.alive) grow(pipe, out);
			const living = pipes.filter((pipe) => pipe.alive).length;
			const wanted = multiple ? MULTIPLE_PIPES : 1;
			let room = true;
			for (let n = living; n < wanted && started < PIPES_PER_SYSTEM; n++)
				if (!start(out)) {
					room = false;
					break;
				}
			const done =
				pipes.every((pipe) => !pipe.alive) &&
				(started >= PIPES_PER_SYSTEM || !room);
			return { pieces: out, done };
		},
	};
};
