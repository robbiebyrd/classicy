import { execFile } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import * as sass from "sass";
import { beforeAll, describe, expect, it } from "vitest";

// The published surface of the Appearance Packages program: package.json
// `exports`, `files` and `sideEffects`, and the example app that consumes the
// SCSS through them (plan 0005-1b3 §5.1, rulings R4, R11, R13).

const root = process.cwd();
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8");
const pkg = JSON.parse(read("package.json")) as {
	exports: Record<string, string | Record<string, string>>;
	files: string[];
	sideEffects: string[];
	scripts: Record<string, string>;
};

describe("package.json: the Appearance Packages surface", () => {
	it("exports the vocabulary, the Platinum entry and its scss", () => {
		expect(pkg.exports["./scss/*"]).toBe("./src/Appearance/vocabulary/*");
		// R4: the main bundle registers Platinum, so the entry is an emitted
		// no-op shim (the dist/fonts.js pattern), not the TypeScript source.
		expect(pkg.exports["./appearance/platinum"]).toEqual({
			types: "./dist/appearance-platinum.d.ts",
			default: "./dist/appearance-platinum.js",
		});
		expect(pkg.exports["./appearance/platinum/scss/*"]).toBe(
			"./src/Appearance/Platinum/styles/*",
		);
	});

	it("drops the temporary scss-platinum bridge", () =>
		expect(pkg.exports).not.toHaveProperty("./scss-platinum/*"));

	it("ships src/Appearance", () => {
		expect(pkg.files).toContain("src/Appearance");
		// Subsumed by src/Appearance, and AppearanceManager/styles is gone.
		expect(pkg.files).not.toContain("src/Appearance/vocabulary");
		expect(pkg.files).not.toContain(
			"src/SystemFolder/ControlPanels/AppearanceManager/styles",
		);
	});

	it("marks the Platinum entry as a side effect", () => {
		expect(pkg.sideEffects).toContain("./src/Appearance/Platinum/index.ts");
		expect(pkg.sideEffects).toContain("./dist/appearance-platinum.js");
	});

	it("points every source export at a directory that exists", () => {
		for (const key of ["./scss/*", "./appearance/platinum/scss/*"]) {
			const target = pkg.exports[key] as string;
			expect(
				existsSync(path.resolve(root, target.replace(/\*$/, ""))),
				key,
			).toBe(true);
		}
	});

	// Only the barrel barrelsby generates is ignored, so editing the
	// hand-written src/Appearance/Platinum/index.ts rebuilds in watch mode.
	it("rebuilds in watch mode when a hand-written index.ts changes", () => {
		const watch = pkg.scripts["build:watchsource"];
		expect(watch).not.toContain('--ignore "**/index.ts"');
		expect(watch).toContain('--ignore "src/index.ts"');
	});
});

// What the packers really put in the tarball. pnpm 10 ignores a "!" pattern
// in `files` (npm 11 honors it), so the tests and `__tests__` helpers under
// src/Appearance are kept out by src/Appearance/.npmignore, which both honor.
// Each packer runs once, without lifecycle scripts (`prepare` runs husky).
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

/** The packed paths, or why the packer could not run (it is not installed). */
const pack = ({ command, args, files }: (typeof PACKERS)[number]) =>
	new Promise<string[] | { unavailable: string }>((done, fail) =>
		execFile(
			command,
			args,
			{ cwd: root, maxBuffer: 64 * 1024 * 1024 },
			(error, stdout, stderr) => {
				if ((error as NodeJS.ErrnoException | null)?.code === "ENOENT")
					return done({ unavailable: `${command} is not on the PATH` });
				if (error) return fail(new Error(`${command} pack failed: ${stderr}`));
				done(files(JSON.parse(stdout)).map((file) => file.path));
			},
		),
	);

// Every .scss file under the directories the SCSS exports serve.
const exportedScss = ["./scss/*", "./appearance/platinum/scss/*"].flatMap(
	(key) => {
		const dir = (pkg.exports[key] as string)
			.replace(/^\.\//, "")
			.replace(/\*$/, "");
		return readdirSync(path.resolve(root, dir), { recursive: true })
			.map(String)
			.filter((file) => file.endsWith(".scss"))
			.map((file) => path.posix.join(dir, file.split(path.sep).join("/")));
	},
);

describe.each(PACKERS)("the tarball, as $name packs it", (packer) => {
	let packed: string[] | { unavailable: string };
	beforeAll(async () => {
		packed = await pack(packer);
	}, 120_000);
	const files = (skip: (note: string) => never) =>
		Array.isArray(packed) ? packed : skip(packed.unavailable);

	it("ships no test, test helper or story from src/", ({ skip }) => {
		const source = files(skip).filter((file) => file.startsWith("src/"));
		expect(source.length).toBeGreaterThan(0);
		expect(
			source.filter((file) =>
				/(?:^|\/)__tests__\/|\.test\.|\.stories\./.test(file),
			),
		).toEqual([]);
	});

	it("ships every SCSS file the scss exports serve", ({ skip }) => {
		expect(exportedScss).toEqual(
			expect.arrayContaining([
				"src/Appearance/vocabulary/_layout.scss",
				"src/Appearance/Platinum/styles/_mixins.scss",
			]),
		);
		const shipped = new Set(files(skip));
		expect(exportedScss.filter((file) => !shipped.has(file))).toEqual([]);
	});
});

describe("the SCSS exports, resolved as a host's Sass resolves them", () => {
	// The example app's node_modules/classicy is the workspace symlink, so
	// Node's resolution goes through this package.json's `exports`.
	const importer = new sass.NodePackageImporter(path.resolve(root, "example"));
	const compile = (scss: string) =>
		sass.compileString(scss, { importers: [importer] }).css;

	it("serves the Platinum mixins at classicy/appearance/platinum/scss/mixins", () =>
		expect(
			compile(
				'@use "pkg:classicy/appearance/platinum/scss/mixins";\n.a { @include mixins.platinum-window-control-box-border; }',
			),
		).toMatch(/^\.a \{[\s\S]*border/));

	it("serves the vocabulary at classicy/scss/*", () =>
		expect(
			compile(
				'@use "pkg:classicy/scss/layout";\n.a { @include layout.classicy-no-select; }',
			),
		).toContain("user-select: none"));

	it("no longer serves classicy/scss-platinum/*", () =>
		expect(() =>
			compile('@use "pkg:classicy/scss-platinum/appearance";'),
		).toThrow(/Can't find stylesheet/));
});

describe("the example app", () => {
	const browser = read("example/src/Applications/Browser/Browser.scss");
	const blueBox = read("example/src/Applications/BlueBox/BlueBox.scss");

	it("the example app no longer uses the old mixin path", () => {
		expect(browser).not.toContain("scss/appearance");
		expect(browser).not.toContain("scss-platinum");
		expect(browser).toContain(
			"@use 'classicy/appearance/platinum/scss/mixins';",
		);
		expect(browser).toContain(
			"@include mixins.platinum-window-control-box-border;",
		);
	});

	it("drops BlueBox's unused Platinum @use", () =>
		expect(blueBox).not.toMatch(/@use\s+['"]classicy\//));
});
