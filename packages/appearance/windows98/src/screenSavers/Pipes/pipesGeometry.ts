// 3D Pipes' pieces as triangle meshes: positions, normals (smooth shaded, as
// the .scr's OpenGL drew them) and texture coordinates (round the pipe, and
// along it in node units, so a Textured pipe's stripes run on unbroken).
import type { PipesPiece, Vector } from "./pipesSystem";

export type PipesMesh = {
	positions: Float32Array;
	normals: Float32Array;
	uvs: Float32Array;
	indices: Uint16Array;
};

/** Sides round a pipe at a Resolution of 0 (Min) to 200 (Max). */
export const pipesSides = (resolution: number): number =>
	6 + Math.round((Math.min(200, Math.max(0, resolution)) / 200) * 18);

const sub = (a: Vector, b: Vector): Vector => [
	a[0] - b[0],
	a[1] - b[1],
	a[2] - b[2],
];
const scale = (a: Vector, k: number): Vector => [a[0] * k, a[1] * k, a[2] * k];
const cross = (a: Vector, b: Vector): Vector => [
	a[1] * b[2] - a[2] * b[1],
	a[2] * b[0] - a[0] * b[2],
	a[0] * b[1] - a[1] * b[0],
];
const dot = (a: Vector, b: Vector) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const length = (a: Vector) => Math.hypot(a[0], a[1], a[2]);
const unit = (a: Vector): Vector => scale(a, 1 / (length(a) || 1));

/** Two unit vectors across `axis`, and the axis itself. */
const basis = (axis: Vector): [Vector, Vector] => {
	const helper: Vector = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
	const u = unit(cross(axis, helper));
	return [u, cross(axis, u)];
};

class MeshBuilder {
	positions: number[] = [];
	normals: number[] = [];
	uvs: number[] = [];
	indices: number[] = [];
	vertex(position: Vector, normal: Vector, u: number, v: number): number {
		this.positions.push(...position);
		this.normals.push(...normal);
		this.uvs.push(u, v);
		return this.positions.length / 3 - 1;
	}
	/** Quads between rings of `columns` + 1 vertices, row by row from `first`. */
	grid(first: number, rows: number, columns: number): void {
		for (let row = 0; row < rows; row++)
			for (let col = 0; col < columns; col++) {
				const a = first + row * (columns + 1) + col;
				const b = a + columns + 1;
				this.indices.push(a, b, a + 1, a + 1, b, b + 1);
			}
	}
	build(): PipesMesh {
		return {
			positions: Float32Array.from(this.positions),
			normals: Float32Array.from(this.normals),
			uvs: Float32Array.from(this.uvs),
			indices: Uint16Array.from(this.indices),
		};
	}
}

const cylinder = (
	mesh: MeshBuilder,
	from: Vector,
	to: Vector,
	radius: number,
	sides: number,
) => {
	const axis = unit(sub(to, from));
	const [u, w] = basis(axis);
	const first = mesh.positions.length / 3;
	for (const end of [from, to]) {
		const along = dot(end, axis);
		for (let side = 0; side <= sides; side++) {
			const angle = (side / sides) * 2 * Math.PI;
			const normal: Vector = [
				u[0] * Math.cos(angle) + w[0] * Math.sin(angle),
				u[1] * Math.cos(angle) + w[1] * Math.sin(angle),
				u[2] * Math.cos(angle) + w[2] * Math.sin(angle),
			];
			mesh.vertex(
				[
					end[0] + normal[0] * radius,
					end[1] + normal[1] * radius,
					end[2] + normal[2] * radius,
				],
				normal,
				side / sides,
				along,
			);
		}
	}
	mesh.grid(first, 1, sides);
};

const ball = (
	mesh: MeshBuilder,
	center: Vector,
	radius: number,
	sides: number,
) => {
	const stacks = Math.max(3, Math.round(sides / 2));
	const first = mesh.positions.length / 3;
	for (let stack = 0; stack <= stacks; stack++) {
		const polar = (stack / stacks) * Math.PI;
		for (let slice = 0; slice <= sides; slice++) {
			const azimuth = (slice / sides) * 2 * Math.PI;
			const normal: Vector = [
				Math.sin(polar) * Math.cos(azimuth),
				Math.cos(polar),
				Math.sin(polar) * Math.sin(azimuth),
			];
			mesh.vertex(
				[
					center[0] + normal[0] * radius,
					center[1] + normal[1] * radius,
					center[2] + normal[2] * radius,
				],
				normal,
				slice / sides,
				stack / stacks,
			);
		}
	}
	mesh.grid(first, stacks, sides);
};

const elbow = (
	mesh: MeshBuilder,
	from: Vector,
	dirIn: Vector,
	dirOut: Vector,
	bend: number,
	radius: number,
	sides: number,
) => {
	const center: Vector = [
		from[0] + dirOut[0] * bend,
		from[1] + dirOut[1] * bend,
		from[2] + dirOut[2] * bend,
	];
	const binormal = cross(dirIn, dirOut);
	const steps = Math.max(2, Math.round(sides / 2));
	const start = dot(from, dirIn);
	const first = mesh.positions.length / 3;
	for (let step = 0; step <= steps; step++) {
		const t = (step / steps) * (Math.PI / 2);
		const radial: Vector = [
			-dirOut[0] * Math.cos(t) + dirIn[0] * Math.sin(t),
			-dirOut[1] * Math.cos(t) + dirIn[1] * Math.sin(t),
			-dirOut[2] * Math.cos(t) + dirIn[2] * Math.sin(t),
		];
		const spine: Vector = [
			center[0] + radial[0] * bend,
			center[1] + radial[1] * bend,
			center[2] + radial[2] * bend,
		];
		for (let side = 0; side <= sides; side++) {
			const angle = (side / sides) * 2 * Math.PI;
			const normal: Vector = [
				radial[0] * Math.cos(angle) + binormal[0] * Math.sin(angle),
				radial[1] * Math.cos(angle) + binormal[1] * Math.sin(angle),
				radial[2] * Math.cos(angle) + binormal[2] * Math.sin(angle),
			];
			mesh.vertex(
				[
					spine[0] + normal[0] * radius,
					spine[1] + normal[1] * radius,
					spine[2] + normal[2] * radius,
				],
				normal,
				side / sides,
				start + t * bend,
			);
		}
	}
	mesh.grid(first, steps, sides);
};

/** One piece's mesh at `sides` sides round. */
export const pipesPieceMesh = (piece: PipesPiece, sides: number): PipesMesh => {
	const mesh = new MeshBuilder();
	if (piece.kind === "cylinder") {
		if (length(sub(piece.to, piece.from)) > 1e-6)
			cylinder(mesh, piece.from, piece.to, piece.radius, sides);
	} else if (piece.kind === "ball")
		ball(mesh, piece.center, piece.radius, sides);
	else
		elbow(
			mesh,
			piece.from,
			piece.dirIn,
			piece.dirOut,
			piece.bend,
			piece.radius,
			sides,
		);
	return mesh.build();
};
