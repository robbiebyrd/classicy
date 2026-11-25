import { describe, expect, it } from "vitest";
import { createWindows98Random } from "../windows98SaverTimer";
import { pipesPieceMesh, pipesSides } from "./pipesGeometry";
import {
	PIPES_SOLID_MATERIALS,
	PIPES_TEXTURED_MATERIALS,
} from "./pipesRenderer";
import {
	BALL_RADIUS,
	ELBOW_BEND,
	FLEX_BEND,
	FLEX_RADIUS,
	MULTIPLE_PIPES,
	PIPE_RADIUS,
	PIPES_PER_SYSTEM,
	type PipesOptions,
	type PipesPiece,
	pipesSystem,
} from "./pipesSystem";

// 3D Pipes' system and meshes, without WebGL: pipes grow through the grid
// node by node, never through a node another holds, turning at their joints,
// until the system is done.

const run = (options: PipesOptions, seed = 1, ticks = 2000) => {
	const system = pipesSystem(
		10,
		8,
		8,
		PIPES_SOLID_MATERIALS.length,
		createWindows98Random(seed),
		options,
	);
	const pieces: PipesPiece[] = [];
	let done = false;
	let tick = 0;
	for (; tick < ticks && !done; tick++) {
		const result = system.tick();
		pieces.push(...result.pieces);
		done = result.done;
	}
	return { system, pieces, done, tick };
};

const traditional: PipesOptions = {
	multiple: false,
	flex: false,
	jointType: "Elbow",
};

describe("3D Pipes' system", () => {
	it("grows its pipes, one at a time, until it is done", () => {
		const { system, pieces, done } = run(traditional);
		expect(done).toBe(true);
		expect(system.pipes.length).toBeLessThanOrEqual(PIPES_PER_SYSTEM);
		expect(system.pipes.every((pipe) => !pipe.alive)).toBe(true);
		expect(pieces.length).toBeGreaterThan(system.pipes.length * 2);
	});

	it("grows one pipe at a time when Single, five when Multiple", () => {
		const single = pipesSystem(
			12,
			12,
			12,
			16,
			createWindows98Random(2),
			traditional,
		);
		const multiple = pipesSystem(12, 12, 12, 16, createWindows98Random(2), {
			...traditional,
			multiple: true,
		});
		for (let i = 0; i < 5; i++) {
			single.tick();
			multiple.tick();
			expect(single.pipes.filter((p) => p.alive).length).toBeLessThanOrEqual(1);
		}
		expect(multiple.pipes.filter((p) => p.alive)).toHaveLength(MULTIPLE_PIPES);
	});

	it("never runs two pipes through one node, nor out of the grid", () => {
		const { pieces } = run({ ...traditional, multiple: true }, 3);
		const centers = new Set<string>();
		for (const piece of pieces)
			if (piece.kind === "cylinder")
				for (const point of [piece.from, piece.to])
					for (const [i, n] of [10, 8, 8].entries()) {
						expect(Math.abs(point[i] ?? 0)).toBeLessThanOrEqual(
							(n - 1) / 2 + 0.5,
						);
					}
		// Every ball is a node a pipe started, turned or ended at: no node
		// takes two.
		for (const piece of pieces)
			if (piece.kind === "ball") {
				const key = piece.center.join(",");
				expect(centers.has(key), key).toBe(false);
				centers.add(key);
			}
	});

	it("bends an elbow from the incoming axis to the outgoing one", () => {
		const { pieces } = run(traditional, 4);
		const elbows = pieces.filter((p) => p.kind === "elbow");
		expect(elbows.length).toBeGreaterThan(0);
		for (const elbow of elbows) {
			if (elbow.kind !== "elbow") continue;
			expect(elbow.bend).toBe(ELBOW_BEND);
			expect(elbow.radius).toBe(PIPE_RADIUS);
			// At right angles.
			const dot = elbow.dirIn.reduce(
				(sum, v, i) => sum + v * (elbow.dirOut[i] ?? 0),
				0,
			);
			expect(dot).toBe(0);
		}
		// Traditional pipes begin and end in a ball.
		expect(
			pieces
				.filter((p) => p.kind === "ball")
				.every((p) => p.kind === "ball" && p.radius === BALL_RADIUS),
		).toBe(true);
	});

	it("turns at balls under Ball, at either under Mixed, and changes with each pipe under Cycle", () => {
		const ball = run({ ...traditional, jointType: "Ball" }, 5).pieces;
		expect(ball.some((p) => p.kind === "elbow")).toBe(false);
		const mixed = run({ ...traditional, jointType: "Mixed" }, 5).pieces;
		expect(mixed.some((p) => p.kind === "elbow")).toBe(true);
		expect(mixed.filter((p) => p.kind === "ball").length).toBeGreaterThan(
			2 * run({ ...traditional, jointType: "Mixed" }, 5).system.pipes.length,
		);
		const cycle = run({ ...traditional, jointType: "Cycle" }, 5).system.pipes;
		expect(cycle.map((pipe) => pipe.joint).slice(0, 4)).toEqual([
			"Elbow",
			"Ball",
			"Elbow",
			"Ball",
		]);
	});

	it("bends a Flex pipe in a wide arc, thinner", () => {
		const { pieces } = run({ ...traditional, flex: true }, 6);
		const elbows = pieces.filter((p) => p.kind === "elbow");
		expect(elbows.length).toBeGreaterThan(0);
		for (const piece of pieces) {
			if (piece.kind === "elbow") expect(piece.bend).toBe(FLEX_BEND);
			if (piece.kind !== "ball") expect(piece.radius).toBe(FLEX_RADIUS);
		}
	});

	it("gives each pipe a material from the list it is handed", () => {
		const { system } = run(traditional, 7);
		for (const pipe of system.pipes) {
			expect(pipe.material).toBeGreaterThanOrEqual(0);
			expect(pipe.material).toBeLessThan(PIPES_SOLID_MATERIALS.length);
		}
	});
});

describe("3D Pipes' materials", () => {
	it("are the .scr's sixteen for Solid and four whites for Textured", () => {
		expect(PIPES_SOLID_MATERIALS).toHaveLength(16);
		expect(PIPES_TEXTURED_MATERIALS).toHaveLength(4);
		// Emerald first, as the .scr's table has it.
		expect(PIPES_SOLID_MATERIALS[0]?.[1]).toEqual([0.07568, 0.61424, 0.07568]);
	});
});

describe("3D Pipes' meshes", () => {
	it("round a pipe in 6 sides at Min and 24 at Max", () => {
		expect([0, 100, 200].map(pipesSides)).toEqual([6, 15, 24]);
	});

	it("build a cylinder, a ball and an elbow with unit normals, on their surfaces", () => {
		const pieces: PipesPiece[] = [
			{
				kind: "cylinder",
				from: [0, 0, 0],
				to: [0, 0, 2],
				radius: 0.25,
				material: 0,
			},
			{ kind: "ball", center: [1, 1, 1], radius: 0.5, material: 0 },
			{
				kind: "elbow",
				from: [0, 0, 0],
				dirIn: [1, 0, 0],
				dirOut: [0, 1, 0],
				bend: 0.5,
				radius: 0.2,
				material: 0,
			},
		];
		for (const piece of pieces) {
			const mesh = pipesPieceMesh(piece, 8);
			expect(mesh.indices.length % 3).toBe(0);
			expect(Math.max(...mesh.indices)).toBeLessThan(mesh.positions.length / 3);
			for (let i = 0; i < mesh.normals.length; i += 3)
				expect(
					Math.hypot(
						mesh.normals[i] ?? 0,
						mesh.normals[i + 1] ?? 0,
						mesh.normals[i + 2] ?? 0,
					),
				).toBeCloseTo(1, 5);
		}
		const ball = pipesPieceMesh(pieces[1] as PipesPiece, 8);
		for (let i = 0; i < ball.positions.length; i += 3)
			expect(
				Math.hypot(
					(ball.positions[i] ?? 0) - 1,
					(ball.positions[i + 1] ?? 0) - 1,
					(ball.positions[i + 2] ?? 0) - 1,
				),
			).toBeCloseTo(0.5, 5);
		// The elbow's last ring is centered where the outgoing pipe starts.
		const elbow = pipesPieceMesh(pieces[2] as PipesPiece, 8);
		const ring = elbow.positions.slice(-9 * 3);
		const center = [0, 1, 2].map((axis) => {
			let sum = 0;
			for (let i = 0; i < 8; i++) sum += ring[i * 3 + axis] ?? 0;
			return sum / 8;
		});
		expect(center[0]).toBeCloseTo(0.5, 5);
		expect(center[1]).toBeCloseTo(0.5, 5);
		expect(center[2]).toBeCloseTo(0, 5);
	});
});
