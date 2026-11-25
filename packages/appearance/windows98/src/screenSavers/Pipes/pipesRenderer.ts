// 3D Pipes' drawing, in WebGL as the .scr drew in OpenGL 1.1: one white light
// from the upper left behind the viewer, OpenGL's default global ambient
// (0.2), each piece's material lit per vertex and smooth shaded (ambient,
// diffuse, a white specular highlight), a Textured piece's colors multiplied
// by its texture's (GL_MODULATE). The drawing buffer is kept between frames
// (`preserveDrawingBuffer`), so each tick draws only the new pieces, as the
// .scr added them to its picture; a system ends by dissolving the screen to
// black in blocks (scissored clears), as the .scr did.
import { type PipesMesh, pipesPieceMesh } from "./pipesGeometry";
import type { PipesPiece } from "./pipesSystem";

/** An OpenGL material: ambient, diffuse and specular RGB, shininess 0 to 1 (x 128). */
export type PipesMaterial = readonly [
	ambient: readonly [number, number, number],
	diffuse: readonly [number, number, number],
	specular: readonly [number, number, number],
	shininess: number,
];

/**
 * The .scr's materials, its table of the classic teapot materials (sspipes.scr
 * holds 24): the sixteen a Solid pipe picks from at random (emerald, jade,
 * pearl, ruby, turquoise, brass, bronze, copper, gold, silver, cyan, white and
 * yellow plastic, cyan, green and white rubber), each its ambient, diffuse
 * and specular colors and shininess.
 */
export const PIPES_SOLID_MATERIALS: readonly PipesMaterial[] = [
	[
		[0.0215, 0.1745, 0.0215],
		[0.07568, 0.61424, 0.07568],
		[0.633, 0.727811, 0.633],
		0.6,
	],
	[
		[0.135, 0.2225, 0.1575],
		[0.54, 0.89, 0.63],
		[0.316228, 0.316228, 0.316228],
		0.1,
	],
	[
		[0.25, 0.20725, 0.20725],
		[1, 0.829, 0.829],
		[0.296648, 0.296648, 0.296648],
		0.088,
	],
	[
		[0.1745, 0.01175, 0.01175],
		[0.61424, 0.04136, 0.04136],
		[0.727811, 0.626959, 0.626959],
		0.6,
	],
	[
		[0.1, 0.18725, 0.1745],
		[0.396, 0.74151, 0.69102],
		[0.297254, 0.30829, 0.306678],
		0.1,
	],
	[
		[0.329412, 0.223529, 0.027451],
		[0.780392, 0.568627, 0.113725],
		[0.992157, 0.941176, 0.807843],
		0.21794872,
	],
	[
		[0.2125, 0.1275, 0.054],
		[0.714, 0.4284, 0.18144],
		[0.393548, 0.271906, 0.166721],
		0.2,
	],
	[
		[0.19125, 0.0735, 0.0225],
		[0.7038, 0.27048, 0.0828],
		[0.256777, 0.137622, 0.086014],
		0.1,
	],
	[
		[0.24725, 0.1995, 0.0745],
		[0.75164, 0.60648, 0.22648],
		[0.628281, 0.555802, 0.366065],
		0.4,
	],
	[
		[0.19225, 0.19225, 0.19225],
		[0.50754, 0.50754, 0.50754],
		[0.508273, 0.508273, 0.508273],
		0.4,
	],
	[
		[0, 0.1, 0.06],
		[0, 0.50980392, 0.50980392],
		[0.50196078, 0.50196078, 0.50196078],
		0.25,
	],
	[[0, 0, 0], [0.55, 0.55, 0.55], [0.7, 0.7, 0.7], 0.25],
	[[0, 0, 0], [0.5, 0.5, 0], [0.6, 0.6, 0.5], 0.25],
	[[0, 0.05, 0.05], [0.4, 0.5, 0.5], [0.04, 0.7, 0.7], 0.078125],
	[[0, 0.05, 0], [0.4, 0.5, 0.4], [0.04, 0.7, 0.04], 0.078125],
	[[0.05, 0.05, 0.05], [0.5, 0.5, 0.5], [0.7, 0.7, 0.7], 0.078125],
];

/** The four whites a Textured pipe picks from, the .scr's own. */
export const PIPES_TEXTURED_MATERIALS: readonly PipesMaterial[] = [
	[[0.2, 0.2, 0.2], [1, 1, 1], [1, 1, 1], 0.5],
	[[0.2, 0.2, 0.2], [0.9, 0.9, 0.9], [0.9, 0.9, 0.9], 0.5],
	[[0.3, 0.2, 0.2], [1, 0.9, 0.8], [1, 0.9, 0.8], 0.5],
	[[0.2, 0.2, 0.3], [0.8, 0.9, 1], [0.8, 0.9, 1], 0.5],
];

const VERTEX = `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
uniform mat4 uProjection;
uniform mat4 uView;
uniform mat3 uNormal;
uniform vec3 uLight;
uniform vec3 uAmbient;
uniform vec3 uDiffuse;
uniform vec3 uSpecular;
uniform float uShininess;
varying vec3 vColor;
varying vec2 vUv;
void main() {
	vec3 n = normalize(uNormal * aNormal);
	float d = max(dot(n, uLight), 0.0);
	vec3 h = normalize(uLight + vec3(0.0, 0.0, 1.0));
	float s = d > 0.0 ? pow(max(dot(n, h), 0.0), uShininess) : 0.0;
	vColor = min(uAmbient * 0.2 + uDiffuse * d + uSpecular * s, vec3(1.0));
	vUv = aUv;
	gl_Position = uProjection * uView * vec4(aPosition, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
uniform sampler2D uTexture;
uniform bool uTextured;
varying vec3 vColor;
varying vec2 vUv;
void main() {
	vec3 texel = uTextured ? texture2D(uTexture, vUv).rgb : vec3(1.0);
	gl_FragColor = vec4(vColor * texel, 1.0);
}`;

type Matrix = Float32Array;

const perspective = (
	fovY: number,
	aspect: number,
	near: number,
	far: number,
): Matrix => {
	const f = 1 / Math.tan(fovY / 2);
	return Float32Array.from([
		f / aspect,
		0,
		0,
		0,
		0,
		f,
		0,
		0,
		0,
		0,
		(far + near) / (near - far),
		-1,
		0,
		0,
		(2 * far * near) / (near - far),
		0,
	]);
};

/** A view turned `angle` radians about the vertical axis, `distance` back. */
const view = (angle: number, distance: number): Matrix => {
	const c = Math.cos(angle);
	const s = Math.sin(angle);
	return Float32Array.from([
		c,
		0,
		-s,
		0,
		0,
		1,
		0,
		0,
		s,
		0,
		c,
		0,
		0,
		0,
		-distance,
		1,
	]);
};

export type PipesRenderer = {
	/** Start a picture seen from `angle` radians about the vertical. */
	reset(angle: number, distance: number): void;
	draw(piece: PipesPiece): void;
	/** Clear one block of the screen to black (the dissolve). */
	clearBlock(x: number, y: number, width: number, height: number): void;
	dispose(): void;
};

/**
 * A renderer on `gl`, `width` by `height`, its pieces at `sides` sides, Solid
 * or Textured with `texture` (an image of any size, drawn scaled to a power of
 * two, as gluScaleImage scaled it). Returns `null` when a shader will not
 * compile.
 */
export const createPipesRenderer = (
	gl: WebGLRenderingContext,
	width: number,
	height: number,
	sides: number,
	texture: HTMLImageElement | null,
	materials: readonly PipesMaterial[],
): PipesRenderer | null => {
	const shader = (type: number, source: string) => {
		const s = gl.createShader(type);
		if (!s) return null;
		gl.shaderSource(s, source);
		gl.compileShader(s);
		return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
	};
	const vertex = shader(gl.VERTEX_SHADER, VERTEX);
	const fragment = shader(gl.FRAGMENT_SHADER, FRAGMENT);
	const program = gl.createProgram();
	if (!vertex || !fragment || !program) return null;
	gl.attachShader(program, vertex);
	gl.attachShader(program, fragment);
	gl.linkProgram(program);
	if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
	// biome-ignore lint/correctness/useHookAtTopLevel: WebGL's useProgram, not a React hook
	gl.useProgram(program);
	const uniform = (name: string) => gl.getUniformLocation(program, name);
	const attribute = (name: string) => gl.getAttribLocation(program, name);
	const buffers = {
		position: gl.createBuffer(),
		normal: gl.createBuffer(),
		uv: gl.createBuffer(),
		index: gl.createBuffer(),
	};
	gl.viewport(0, 0, width, height);
	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(0, 0, 0, 1);
	gl.uniformMatrix4fv(
		uniform("uProjection"),
		false,
		perspective(Math.PI / 2, width / height, 0.1, 100),
	);
	// The light, in view space: from the upper left, behind the viewer.
	const light = [-0.5, 0.7, 1];
	const norm = Math.hypot(...light);
	gl.uniform3fv(
		uniform("uLight"),
		light.map((v) => v / norm),
	);
	gl.uniform1i(uniform("uTextured"), texture ? 1 : 0);
	if (texture) {
		// A power of two, so the texture repeats (WebGL 1 repeats no other).
		const scaled = texture.ownerDocument.createElement("canvas");
		scaled.width = 128;
		scaled.height = 128;
		scaled.getContext("2d")?.drawImage(texture, 0, 0, 128, 128);
		gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, scaled);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.uniform1i(uniform("uTexture"), 0);
	}
	const bind = (
		buffer: WebGLBuffer | null,
		name: string,
		data: Float32Array,
		size: number,
	) => {
		const at = attribute(name);
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
		gl.enableVertexAttribArray(at);
		gl.vertexAttribPointer(at, size, gl.FLOAT, false, 0, 0);
	};
	const drawMesh = (mesh: PipesMesh) => {
		if (mesh.indices.length === 0) return;
		bind(buffers.position, "aPosition", mesh.positions, 3);
		bind(buffers.normal, "aNormal", mesh.normals, 3);
		bind(buffers.uv, "aUv", mesh.uvs, 2);
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.index);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.DYNAMIC_DRAW);
		gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
	};
	return {
		reset(angle, distance) {
			gl.disable(gl.SCISSOR_TEST);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			const matrix = view(angle, distance);
			gl.uniformMatrix4fv(uniform("uView"), false, matrix);
			gl.uniformMatrix3fv(
				uniform("uNormal"),
				false,
				Float32Array.from([
					matrix[0] ?? 1,
					matrix[1] ?? 0,
					matrix[2] ?? 0,
					matrix[4] ?? 0,
					matrix[5] ?? 1,
					matrix[6] ?? 0,
					matrix[8] ?? 0,
					matrix[9] ?? 0,
					matrix[10] ?? 1,
				]),
			);
		},
		draw(piece) {
			const [ambient, diffuse, specular, shininess] = materials[
				piece.material % materials.length
			] ??
				materials[0] ?? [[0, 0, 0], [1, 1, 1], [1, 1, 1], 0.5];
			gl.disable(gl.SCISSOR_TEST);
			gl.uniform3fv(uniform("uAmbient"), ambient);
			gl.uniform3fv(uniform("uDiffuse"), diffuse);
			gl.uniform3fv(uniform("uSpecular"), specular);
			gl.uniform1f(uniform("uShininess"), Math.max(1, shininess * 128));
			drawMesh(pipesPieceMesh(piece, sides));
		},
		clearBlock(x, y, w, h) {
			gl.enable(gl.SCISSOR_TEST);
			gl.scissor(x, y, w, h);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			gl.disable(gl.SCISSOR_TEST);
		},
		dispose() {
			gl.deleteProgram(program);
			gl.deleteShader(vertex);
			gl.deleteShader(fragment);
			for (const buffer of Object.values(buffers)) gl.deleteBuffer(buffer);
		},
	};
};
