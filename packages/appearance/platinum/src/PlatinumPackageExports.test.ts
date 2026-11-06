import { execFile, execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as sass from "sass";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// What @classicy/appearance-platinum publishes (plan 0015-kxa §3.4, design
// 0014-ahm "Build and outputs"): its exports, which point at what its own
// build emits (bin/verify-dist.mjs checks that), and what the packers put in
// its tarball, its packed manifest included.

const packageDir = path.resolve(import.meta.dirname, "..");
const repoRoot = path.resolve(packageDir, "../../..");
const pkg = JSON.parse(
	readFileSync(path.join(packageDir, "package.json"), "utf8"),
) as {
	version: string;
	types?: string;
	main?: string;
	module?: string;
	files: string[];
	exports: Record<string, unknown>;
	scripts: Record<string, string>;
};

describe("the exports", () => {
	it("are the bundles with their types, the SCSS and the two strict-CSP stylesheets", () =>
		expect(pkg.exports).toEqual({
			".": {
				types: "./dist/types/index.d.ts",
				import: "./dist/appearance-platinum.es.js",
				require: "./dist/appearance-platinum.umd.js",
			},
			"./scss/*": "./src/styles/*",
			"./classicy-platinum.css": "./dist/classicy-platinum.css",
			"./classicy-platinum.fonts.css": "./dist/classicy-platinum.fonts.css",
		}));

	it("name the types and the bundles at the top level too", () => {
		expect(pkg.types).toBe("./dist/types/index.d.ts");
		expect(pkg.main).toBe("./dist/appearance-platinum.umd.js");
		expect(pkg.module).toBe("./dist/appearance-platinum.es.js");
	});

	it("builds, then verifies the build", () =>
		expect(pkg.scripts.build).toBe("vite build && pnpm verify:dist"));
});

// The SCSS export, resolved as a host's Sass resolves it: the example app's
// node_modules/@classicy/appearance-platinum is the workspace link, so Node's
// resolution goes through this package.json's `exports`.
describe("the SCSS export", () => {
	const importer = new sass.NodePackageImporter(path.join(repoRoot, "example"));
	const compile = (scss: string) =>
		sass.compileString(scss, { importers: [importer] }).css;

	it("serves the Platinum mixins at @classicy/appearance-platinum/scss/mixins", () =>
		expect(
			compile(
				'@use "pkg:@classicy/appearance-platinum/scss/mixins";\n.a { @include mixins.platinum-window-control-box-border; }',
			),
		).toMatch(/^\.a \{[\s\S]*border/));

	it("is no longer served by the core", () =>
		expect(() =>
			compile('@use "pkg:@classicy/classicy/appearance/platinum/scss/mixins";'),
		).toThrow(/Can't find stylesheet/));
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

	it("ships no test, no other source, no build script and nothing from resources/ or assets/", ({
		skip,
	}) => {
		const shipped = files(skip);
		expect(shipped.filter((file) => /\.test\./.test(file))).toEqual([]);
		expect(
			shipped.filter(
				(file) =>
					!["package.json", "README.md", "LICENSE"].includes(file) &&
					!file.startsWith("dist/") &&
					!file.startsWith("src/styles/"),
			),
		).toEqual([]);
	});
});

// pnpm rewrites the workspace protocol when it packs (and publishes): the
// core's peer range becomes `^<version>`, the lockstep version (design
// 0014-ahm decision 5). A `workspace:` range left in the published manifest
// would not install.
describe("the packed package.json, as pnpm packs it", () => {
	let manifest: {
		peerDependencies?: Record<string, string>;
		devDependencies?: Record<string, string>;
	} | null = null;
	let out = "";
	beforeAll(() => {
		out = mkdtempSync(path.join(tmpdir(), "platinum-pack-"));
		try {
			execFileSync(
				"pnpm",
				["--config.ignore-scripts=true", "pack", "--pack-destination", out],
				{ cwd: packageDir, stdio: "pipe" },
			);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
			throw error;
		}
		const [tarball] = readdirSync(out).filter((f) => f.endsWith(".tgz"));
		manifest = JSON.parse(
			execFileSync(
				"tar",
				["-xOzf", path.join(out, tarball), "package/package.json"],
				{
					encoding: "utf8",
				},
			),
		);
	}, 120_000);
	afterAll(() => rmSync(out, { recursive: true, force: true }));

	it("peer-depends on the core at ^<version>", ({ skip }) => {
		if (!manifest) return skip("pnpm is not on the PATH");
		expect(manifest.peerDependencies?.["@classicy/classicy"]).toBe(
			`^${pkg.version}`,
		);
	});

	it("names no workspace: range", ({ skip }) => {
		if (!manifest) return skip("pnpm is not on the PATH");
		expect(JSON.stringify(manifest)).not.toContain("workspace:");
	});
});
