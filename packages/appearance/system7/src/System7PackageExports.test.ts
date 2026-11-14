import { execFile, execFileSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as sass from "sass";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// What @classicy/appearance-system7 publishes (plan 0018-dbd §2.2, as
// Platinum's PlatinumPackageExports.test.ts): its exports, which point at what
// its own build emits (bin/verify-dist.mjs checks that), and what the packers
// put in its tarball, its packed manifest included.

const packageDir = path.resolve(import.meta.dirname, "..");
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
				import: "./dist/appearance-system7.es.js",
				require: "./dist/appearance-system7.umd.js",
			},
			"./scss/*": "./src/styles/*",
			"./classicy-system7.css": "./dist/classicy-system7.css",
			"./classicy-system7.fonts.css": "./dist/classicy-system7.fonts.css",
		}));

	it("name the types and the bundles at the top level too", () => {
		expect(pkg.types).toBe("./dist/types/index.d.ts");
		expect(pkg.main).toBe("./dist/appearance-system7.umd.js");
		expect(pkg.module).toBe("./dist/appearance-system7.es.js");
	});

	it("builds, then verifies the build", () =>
		expect(pkg.scripts.build).toBe("vite build && pnpm verify:dist"));
});

// The SCSS export, resolved as a host's Sass resolves it: a scratch host
// whose node_modules/@classicy/appearance-system7 links this package, so
// Node's resolution goes through this package.json's `exports` (no workspace
// member depends on System 7 yet).
describe("the SCSS export", () => {
	let host = "";
	beforeAll(() => {
		host = mkdtempSync(path.join(tmpdir(), "system7-scss-host-"));
		mkdirSync(path.join(host, "node_modules/@classicy"), { recursive: true });
		writeFileSync(path.join(host, "package.json"), '{"type":"module"}');
		symlinkSync(
			packageDir,
			path.join(host, "node_modules/@classicy/appearance-system7"),
			"dir",
		);
	});
	afterAll(() => rmSync(host, { recursive: true, force: true }));
	const compile = (scss: string) =>
		sass.compileString(scss, {
			importers: [new sass.NodePackageImporter(host)],
		}).css;

	// It ships compiled and is not for host compilation (the README): it
	// loads the screen savers' partials from Platinum's source (their index,
	// screenSavers/_platinumScreenSavers.scss), which neither
	// tarball holds (plan 0018-dbd §3.8), as Platinum's own platinum.scss
	// does. Resolved through the export, it gets as far as their index, past
	// the vocabulary; from the workspace it compiles whole
	// (styles/system7.css.test.ts).
	it("serves the package stylesheet at @classicy/appearance-system7/scss/system7, up to the savers' index", () =>
		expect(() =>
			compile('@use "pkg:@classicy/appearance-system7/scss/system7";'),
		).toThrow(
			/Can't find stylesheet to import\.[\s\S]*load-css\("\.\.\/\.\.\/\.\.\/platinum\/src\/screenSavers\/platinumScreenSavers"\)[\s\S]*appearance-system7\/src\/styles\/_screenSavers\.scss/,
		));

	// A partial that loads nothing of Platinum's compiles through it whole.
	it("serves the partials at @classicy/appearance-system7/scss/<partial>", () =>
		expect(
			compile(
				'@use "pkg:@classicy/appearance-system7/scss/pixel";\n.a { width: pixel.px(3); }',
			),
		).toMatch(/^\.a \{\s*width: calc\(/));

	it("serves nothing outside src/styles", () =>
		expect(() =>
			compile('@use "pkg:@classicy/appearance-system7/scss/../index";'),
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
		expect(styleSheets).toContain("src/styles/system7.scss");
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
		out = mkdtempSync(path.join(tmpdir(), "system7-pack-"));
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
