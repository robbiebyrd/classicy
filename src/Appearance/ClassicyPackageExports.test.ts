import { execFile, execFileSync } from "node:child_process";
import {
	existsSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import * as sass from "sass";
import { beforeAll, describe, expect, it } from "vitest";

// The published surface of the Appearance Packages program: package.json
// `exports`, `files` and `sideEffects`, and the example app that consumes the
// SCSS through them (plan 0005-1b3 §5.1, rulings R4, R11, R13), and the npm
// name the core publishes under (plan 0015-kxa §2.1).

const root = process.cwd();
// The name the core published under through 2.x (plan 0015-kxa §2.1).
const OLD_NAME = "classicy";
const read = (file: string) => readFileSync(path.resolve(root, file), "utf8");
const pkg = JSON.parse(read("package.json")) as {
	name: string;
	publishConfig?: { access?: string };
	exports: Record<string, string | Record<string, string>>;
	files: string[];
	sideEffects: string[];
	scripts: Record<string, string>;
};

// The core publishes as @classicy/classicy from 3.0.0 on (plan 0014-ahm). Only
// the npm name changes: the exports keys, the dist file names and the UMD
// global keep theirs (anti-goal "The rename leaks past npm"; the
// classicyDesktopState key is pinned by ClassicyAppManagerUtils.test.ts).
describe("package.json: the npm name", () => {
	it("publishes as @classicy/classicy, publicly", () => {
		expect(pkg.name).toBe("@classicy/classicy");
		expect(pkg.publishConfig?.access).toBe("public");
	});

	it("keeps every exports key but the two Platinum moved to its package", () =>
		expect(Object.keys(pkg.exports)).toEqual([
			".",
			"./dist/classicy.css",
			"./fonts",
			"./dist/*",
			"./scss/*",
		]));

	it("keeps the UMD global and the dist file names", () => {
		const viteConfig = read("vite.config.ts");
		expect(viteConfig).toMatch(/\bname: "classicy",/);
		expect(viteConfig).toMatch(
			/fileName: \(format\) => `classicy\.\$\{format\}\.js`,/,
		);
	});
});

describe("package.json: the Appearance Packages surface", () => {
	// Platinum is its own package, @classicy/appearance-platinum (plan 0015-kxa
	// §3.4): its entry and its SCSS (`./scss/*`) are that package's exports,
	// and the core's 2.x `./appearance/platinum` subpaths are gone.
	it("exports the vocabulary, and nothing of Platinum's", () => {
		expect(pkg.exports["./scss/*"]).toBe("./src/Appearance/vocabulary/*");
		expect(pkg.exports).not.toHaveProperty("./appearance/platinum");
		expect(pkg.exports).not.toHaveProperty("./appearance/platinum/scss/*");
	});

	it("drops the temporary scss-platinum bridge", () =>
		expect(pkg.exports).not.toHaveProperty("./scss-platinum/*"));

	it("ships src/Appearance, and nothing under packages/", () => {
		expect(pkg.files).toContain("src/Appearance");
		expect(pkg.files.filter((entry) => entry.startsWith("packages"))).toEqual(
			[],
		);
		// Subsumed by src/Appearance, and AppearanceManager/styles is gone.
		expect(pkg.files).not.toContain("src/Appearance/vocabulary");
		expect(pkg.files).not.toContain(
			"src/SystemFolder/ControlPanels/AppearanceManager/styles",
		);
	});

	// Strict-CSP hosts link `@classicy/classicy/dist/classicy.css` (the
	// `./dist/classicy.css` export, and `./dist/*` with `files: ["dist"]`),
	// then Platinum's two from @classicy/appearance-platinum.
	it("serves classicy.css, the strict-CSP structure stylesheet", () => {
		expect(pkg.exports["./dist/classicy.css"]).toBe("./dist/classicy.css");
		expect(pkg.exports["./dist/*"]).toBe("./dist/*");
		expect(pkg.files).toContain("dist");
		expect(pkg.sideEffects).toContain("**/*.css");
	});

	// Platinum's modules are the workspace package's side effects
	// (packages/appearance/platinum/package.json), no longer the core's.
	it("marks nothing of Platinum's as a side effect", () =>
		expect(pkg.sideEffects.filter((entry) => /platinum/i.test(entry))).toEqual(
			[],
		));

	it("points every source export at a directory that exists", () => {
		for (const key of ["./scss/*"]) {
			const target = pkg.exports[key] as string;
			expect(
				existsSync(path.resolve(root, target.replace(/\*$/, ""))),
				key,
			).toBe(true);
		}
	});

	// Only the barrel barrelsby generates is ignored, so editing a
	// hand-written index.ts (Platinum's) rebuilds in watch mode, and a change
	// to Platinum rebuilds its own build, which the core's no longer carries.
	it("rebuilds the core and Platinum in watch mode", () => {
		const watch = pkg.scripts["build:watchsource"];
		expect(watch).not.toContain('--ignore "**/index.ts"');
		expect(watch).toContain('--ignore "src/index.ts"');
		expect(watch).toContain('--watch "packages/appearance/platinum/src/**"');
		expect(watch).toContain(
			'--exec "tsc -b && vite build && pnpm --filter @classicy/appearance-platinum exec vite build"',
		);
	});

	// Two builds, two dist checks (plan 0015-kxa §3.4): the core's, then
	// Platinum's, whose `build` runs its own verify-dist. Then both packed
	// packages type-check in a host under bundler, node16 and nodenext
	// (0151-0cc).
	it("builds and verifies the core, then Platinum, then a host's types", () => {
		expect(pkg.scripts["build:source"]).toBe(
			"pnpm generate-barrels && tsc -b && vite build && pnpm verify:dist && pnpm --filter @classicy/appearance-platinum build && pnpm verify:host-types",
		);
		expect(pkg.scripts["verify:host-types"]).toBe(
			"node bin/check-host-types.ts",
		);
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

// Every .scss file under the directory the SCSS export serves.
const exportedScss = ["./scss/*"].flatMap((key) => {
	const dir = (pkg.exports[key] as string)
		.replace(/^\.\//, "")
		.replace(/\*$/, "");
	return readdirSync(path.resolve(root, dir), { recursive: true })
		.map(String)
		.filter((file) => file.endsWith(".scss"))
		.map((file) => path.posix.join(dir, file.split(path.sep).join("/")));
});

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

	// Platinum ships as its own package (plan 0015-kxa §3.4); verify:dist
	// (invariant 5) keeps its files out of dist/.
	it("ships nothing from packages/ or resources/", ({ skip }) =>
		expect(
			files(skip).filter(
				(file) => file.startsWith("packages/") || file.startsWith("resources/"),
			),
		).toEqual([]));

	it("ships every SCSS file the scss exports serve", ({ skip }) => {
		expect(exportedScss).toEqual(
			expect.arrayContaining(["src/Appearance/vocabulary/_layout.scss"]),
		);
		const shipped = new Set(files(skip));
		expect(exportedScss.filter((file) => !shipped.has(file))).toEqual([]);
	});
});

describe("resources/ lives in the Platinum package folder", () => {
	it("is gone from the root", () => {
		expect(existsSync(path.resolve(root, "resources"))).toBe(false);
	});

	it("holds the HIGOS8 guidelines under the package", () => {
		expect(
			existsSync(
				path.resolve(
					root,
					"packages/appearance/platinum/resources/Apple_HIGOS8_1997_Guidelines.pdf",
				),
			),
		).toBe(true);
	});
});

describe("the SCSS exports, resolved as a host's Sass resolves them", () => {
	// The example app's node_modules/@classicy/classicy is the workspace
	// symlink, so Node's resolution goes through this package.json's `exports`.
	const importer = new sass.NodePackageImporter(path.resolve(root, "example"));
	const compile = (scss: string) =>
		sass.compileString(scss, { importers: [importer] }).css;

	// Platinum's are @classicy/appearance-platinum/scss/* (its own test).
	it("no longer serves Platinum's SCSS", () =>
		expect(() =>
			compile('@use "pkg:@classicy/classicy/appearance/platinum/scss/mixins";'),
		).toThrow(/Can't find stylesheet/));

	it("serves the vocabulary at @classicy/classicy/scss/*", () =>
		expect(
			compile(
				'@use "pkg:@classicy/classicy/scss/layout";\n.a { @include layout.classicy-no-select; }',
			),
		).toContain("user-select: none"));

	it("no longer serves @classicy/classicy/scss-platinum/*", () =>
		expect(() =>
			compile('@use "pkg:@classicy/classicy/scss-platinum/appearance";'),
		).toThrow(/Can't find stylesheet/));

	it("no longer serves the vocabulary under the old name", () =>
		expect(() => compile(`@use "pkg:${OLD_NAME}/scss/layout";`)).toThrow(
			/Can't find stylesheet/,
		));
});

// Review focus "a host bundler" (plan 0015-kxa §3.4, design 0014-ahm): both
// packages' fonts, art, wallpapers and sprites are `new URL("assets/…",
// import.meta.url)` files, which Vite's dependency pre-bundle breaks, so a
// Vite host keeps both out of it. The example app is the reference host.
describe("the example app's Vite config", () => {
	// Loaded as Vite loads it, in a child Node process (esbuild, which
	// bundles the config, cannot run under jsdom), from a CommonJS main
	// module (the config's Sass NodePackageImporter reads require.main).
	it("keeps both packages out of the dev server's pre-bundle", () => {
		const dir = mkdtempSync(path.join(tmpdir(), "classicy-example-config-"));
		try {
			const runner = path.join(dir, "load.cjs");
			writeFileSync(
				runner,
				`import(${JSON.stringify(path.join(root, "node_modules/vite/dist/node/index.js"))}).then(async ({ loadConfigFromFile }) => {
	const loaded = await loadConfigFromFile({ command: "serve", mode: "development" }, "example/vite.config.ts", "example", "silent");
	console.log(JSON.stringify(loaded.config.optimizeDeps?.exclude ?? []));
});
`,
			);
			const exclude = JSON.parse(
				execFileSync(process.execPath, [runner], {
					cwd: root,
					encoding: "utf8",
				}),
			);
			expect(exclude).toEqual(
				expect.arrayContaining([
					"@classicy/classicy",
					"@classicy/appearance-platinum",
				]),
			);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}, 60_000);
});

describe("the example app", () => {
	const browser = read("example/src/Applications/Browser/Browser.scss");
	const blueBox = read("example/src/Applications/BlueBox/BlueBox.scss");

	it("the example app no longer uses the old mixin path", () => {
		expect(browser).not.toContain("scss/appearance");
		expect(browser).not.toContain("scss-platinum");
		expect(browser).toContain(
			"@use '@classicy/appearance-platinum/scss/mixins';",
		);
		expect(browser).toContain(
			"@include mixins.platinum-window-control-box-border;",
		);
	});

	it("drops BlueBox's unused Platinum @use", () =>
		expect(blueBox).not.toMatch(/@use\s+['"](?:@classicy\/)?classicy\//));
});

// No tracked file names the core by its 2.x name (plan 0015-kxa §2.1): not an
// import, a Sass `@use`, a `pkg:` URL, a subpath in prose, a workspace
// dependency (quoted, or a bare YAML key), an `optimizeDeps` entry, an
// install line, a resolver alias or a vitest `vi.mock`-family target. Dated
// records (plans, stories, the superpowers specs) and the lockfile are not
// scanned.
describe("the rename to @classicy/classicy", () => {
	const SKIPPED = [
		"docs/plans/",
		"docs/stories/",
		"docs/superpowers/",
		"pnpm-lock.yaml",
	];
	const TEXT = /\.(?:[cm]?[jt]sx?|json|mdx?|s?css|ya?ml|html|sh|toml)$/;
	// Each alternative is the old name in one specifier position; none of them
	// matches its own spelling here, so this file is scanned like any other.
	const LEFTOVER = new RegExp(
		[
			String.raw`(?:from|import|@use|@forward|require\(|import\()\s*["'\x60](?:pkg:)?classicy["'\x60/]`,
			String.raw`(?<=["'\x60\s(:]|node_modules\/)classicy\/[\w*]`,
			String.raw`"classicy":\s*"workspace`,
			String.raw`\[\s*["']classicy["']\s*\]`,
			String.raw`(?<![\w@/.-])classicy(?:@)`,
			String.raw`\b(?:add|install|remove)\s+classicy(?![\w-])`,
			String.raw`\^classicy(?:\$|\\/)`,
			String.raw`(?<![\w@/.-])classicy["']?:\s*path\.`,
			String.raw`\bvi\.(?:mock|doMock|unmock|importActual|importMock)\(\s*["'\x60]classicy["'\x60/]`,
			String.raw`(?<![\w@/.-])classicy:\s*(?:workspace|link|file):`,
		].join("|"),
	);
	// Release history: 2.x subpaths this release removed, which exist under no
	// other name, so the docs that tell a 2.1.x host what changed keep them.
	const HISTORICAL_DOCS = [
		"README.md",
		"CLAUDE.md",
		"docs/AGENT-REFERENCE.md",
		"docs/RELEASE-NOTES-APPEARANCE-PACKAGES.md",
	];
	const HISTORICAL_PATHS = [
		"scss/appearance",
		"scss/scrollbars",
		"scss/assets",
		"scss/themes.json",
		"scss/fonts",
		"scss-platinum/*",
		"dist/fonts.css",
	].map((subpath) => `${OLD_NAME}/${subpath}`);

	/** `file:line: text` for every line of `text` naming the old package. */
	const leftovers = (file: string, text: string) =>
		text.split("\n").flatMap((line, index) => {
			const scanned = HISTORICAL_DOCS.includes(file)
				? HISTORICAL_PATHS.reduce(
						(rest, historical) => rest.split(historical).join(" "),
						line,
					)
				: line;
			return LEFTOVER.test(scanned)
				? [`${file}:${index + 1}: ${line.trim()}`]
				: [];
		});

	it("finds the old name in each specifier position", () =>
		expect(
			[
				`import { ClassicyApp } from "${OLD_NAME}";`,
				`import "${OLD_NAME}/fonts";`,
				`@use '${OLD_NAME}/appearance/platinum/scss/mixins';`,
				`@use "pkg:${OLD_NAME}/scss/layout";`,
				`the \`${OLD_NAME}/dist/*\` export`,
				`href="/node_modules/${OLD_NAME}/dist/classicy.css"`,
				`"${OLD_NAME}": "workspace:*",`,
				`optimizeDeps: { exclude: ["${OLD_NAME}"] },`,
				`pnpm add ${OLD_NAME}@latest`,
				`npm install ${OLD_NAME} react react-dom`,
				`{ find: /^${OLD_NAME}$/, replacement: source },`,
				`{ find: /^${OLD_NAME}\\/dist\\/classicy\\.css$/, replacement },`,
				`\t\t\t${OLD_NAME}: path.resolve(__dirname, "./src/index.ts"),`,
				`vi.mock("${OLD_NAME}", async (importOriginal) => ({`,
				`// Deliberately NO vi.mock("${OLD_NAME}"): these tests exercise`,
				`await vi.importActual<typeof import("x")>('${OLD_NAME}/fonts')`,
				`      ${OLD_NAME}: workspace:*`,
				`# (\`${OLD_NAME}: workspace:*\` resolves to the built dist/)`,
				`${OLD_NAME}: link:..`,
			].filter((line) => leftovers("x.ts", line).length === 0),
		).toEqual([]));

	it("leaves the names that only contain it alone", () =>
		expect(
			leftovers(
				"x.ts",
				[
					`import { ClassicyApp } from "@classicy/classicy";`,
					`@use "pkg:@classicy/classicy/scss/layout";`,
					"https://github.com/robbiebyrd/classicy/blob/main/README.md",
					"dist/classicy.es.js and dist/classicy-platinum.css",
					'disposition: "classicy"',
					"pnpm --filter classicy-example build",
				].join("\n"),
			),
		).toEqual([]));

	it("keeps 2.x history only in the docs that describe it", () => {
		const line = `@use "${OLD_NAME}/scss/appearance";`;
		expect(leftovers("docs/AGENT-REFERENCE.md", line)).toEqual([]);
		expect(leftovers("example/src/app.scss", line)).toHaveLength(1);
	});

	it("leaves no tracked file on the old name", () => {
		const files = execFileSync("git", ["ls-files", "-z"], {
			cwd: root,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
		})
			.split("\0")
			.filter(
				(file) =>
					TEXT.test(file) &&
					!SKIPPED.some((skipped) => file.startsWith(skipped)) &&
					existsSync(path.resolve(root, file)),
			);
		expect(files.length).toBeGreaterThan(100);
		expect(files.flatMap((file) => leftovers(file, read(file)))).toEqual([]);
	});
});
