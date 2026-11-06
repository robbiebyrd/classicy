import { execFile } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

// The workspace package Platinum ships as, @classicy/appearance-platinum
// (plan 0015-kxa §3.1, design 0014-ahm "Build and outputs"): its manifest and
// what the packers put in its tarball.

const packageDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(packageDir, "../../..");
const readJson = (file: string) =>
	JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> & {
		name: string;
		version: string;
		license: string;
		files: string[];
		sideEffects: string[];
		exports: Record<string, unknown>;
		peerDependencies: Record<string, string>;
		devDependencies: Record<string, string>;
		publishConfig?: { access?: string };
	};
const pkg = readJson(path.join(packageDir, "package.json"));
const core = readJson(path.join(repoRoot, "package.json"));

describe("packages/appearance/platinum/package.json", () => {
	it("is @classicy/appearance-platinum, an ES module, published publicly", () => {
		expect(pkg.name).toBe("@classicy/appearance-platinum");
		expect(pkg.type).toBe("module");
		expect(pkg.publishConfig?.access).toBe("public");
		expect(pkg.license).toBe(core.license);
	});

	// Lockstep releases: both packages carry one version (design, "Releasing").
	it("carries the core's version", () =>
		expect(pkg.version).toBe(core.version));

	// One copy of the registries (anti-goal): the core is a peer, never a
	// dependency, and the workspace links it for development.
	it("peer-depends on the core and React, and dev-links the core", () => {
		expect(pkg.peerDependencies).toEqual({
			"@classicy/classicy": "workspace:^",
			react: core.peerDependencies.react,
			"react-dom": core.peerDependencies["react-dom"],
		});
		expect(pkg.devDependencies["@classicy/classicy"]).toBe("workspace:*");
		expect(pkg).not.toHaveProperty("dependencies");
	});

	it("publishes dist, the SCSS, the README and the license", () =>
		expect(pkg.files).toEqual(["dist", "src/styles", "README.md", "LICENSE"]));

	// Importing the entry registers Platinum. Its source modules that register
	// at load (the assets and the sound pack) are side effects too, since a
	// bundler that builds the source (the core's interim bundle, Storybook)
	// would otherwise drop `import "./assets/platinumAssets"`.
	it("marks the entry, the registering modules and the styles as side effects", () =>
		expect(pkg.sideEffects).toEqual([
			"./dist/*.js",
			"./src/index.ts",
			"./src/assets/platinumAssets.ts",
			"./src/assets/sounds/platinum.ts",
			"**/*.css",
			"**/*.scss",
		]));

	it("exports the bundles and the SCSS", () => {
		expect(pkg.exports["."]).toEqual({
			import: "./dist/appearance-platinum.es.js",
			require: "./dist/appearance-platinum.umd.js",
		});
		expect(pkg.exports["./scss/*"]).toBe("./src/styles/*");
	});

	it("is a member of the pnpm workspace", () =>
		expect(
			readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8"),
		).toMatch(/^\s*-\s*'packages\/\*\/\*'\s*$/m));
});

// What the packers really put in the tarball. `files` ships src/styles, which
// holds tests too; src/styles/.npmignore keeps them out (npm and pnpm both
// honor a nested .npmignore inside a "files" directory).
type PackedFile = { path: string };
const PACKERS = [
	{
		name: "npm",
		command: "npm",
		args: ["pack", "--dry-run", "--json", "--ignore-scripts"],
		files: (json: unknown) => (json as Array<{ files: PackedFile[] }>)[0].files,
	},
	{
		name: "pnpm",
		command: "pnpm",
		args: ["--config.ignore-scripts=true", "pack", "--dry-run", "--json"],
		files: (json: unknown) => (json as { files: PackedFile[] }).files,
	},
];

const pack = ({ command, args, files }: (typeof PACKERS)[number]) =>
	new Promise<string[] | { unavailable: string }>((done, fail) =>
		execFile(
			command,
			args,
			{ cwd: packageDir, maxBuffer: 64 * 1024 * 1024 },
			(error, stdout, stderr) => {
				if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT")
					return done({ unavailable: `${command} is not on the PATH` });
				if (error) return fail(new Error(`${command} pack failed: ${stderr}`));
				done(files(JSON.parse(stdout)).map((file) => file.path));
			},
		),
	);

const styleSheets = readdirSync(path.join(packageDir, "src/styles"), {
	recursive: true,
})
	.map((file) => String(file).split(path.sep).join("/"))
	.filter((file) => file.endsWith(".scss"))
	.map((file) => `src/styles/${file}`);

describe.each(PACKERS)("the tarball, as $name packs it", (packer) => {
	let packed: string[] | { unavailable: string };
	beforeAll(async () => {
		packed = await pack(packer);
	}, 120_000);
	const files = (skip: (note: string) => never) =>
		Array.isArray(packed) ? packed : skip(packed.unavailable);

	it("ships every stylesheet, the README and the license", ({ skip }) => {
		expect(styleSheets).toContain("src/styles/_mixins.scss");
		expect(files(skip)).toEqual(
			expect.arrayContaining([
				"package.json",
				"README.md",
				"LICENSE",
				...styleSheets,
			]),
		);
	});

	it("ships no test, no other source and nothing from resources/", ({
		skip,
	}) => {
		const shipped = files(skip);
		expect(shipped.filter((file) => /\.test\./.test(file))).toEqual([]);
		expect(
			shipped.filter(
				(file) =>
					file.startsWith("resources/") ||
					(file.startsWith("src/") && !file.startsWith("src/styles/")),
			),
		).toEqual([]);
	});
});
