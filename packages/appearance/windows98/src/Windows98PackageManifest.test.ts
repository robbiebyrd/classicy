import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The workspace package Windows 98 ships as, @classicy/appearance-windows98,
// mirroring System 7's (System7PackageManifest.test.ts): its manifest; its
// exports and its tarball are Windows98PackageExports.test.ts's.

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
		dependencies?: Record<string, string>;
		peerDependencies: Record<string, string>;
		devDependencies: Record<string, string>;
		publishConfig?: { access?: string };
	};
const pkg = readJson(path.join(packageDir, "package.json"));
const core = readJson(path.join(repoRoot, "package.json"));
const platinum = readJson(path.join(packageDir, "../platinum/package.json"));

describe("packages/appearance/windows98/package.json", () => {
	it("is @classicy/appearance-windows98, an ES module, published publicly", () => {
		expect(pkg.name).toBe("@classicy/appearance-windows98");
		expect(pkg.type).toBe("module");
		expect(pkg.publishConfig?.access).toBe("public");
		expect(pkg.license).toBe(core.license);
	});

	// Lockstep releases: every package carries one version.
	it("carries the core's version", () =>
		expect(pkg.version).toBe(core.version));

	// One copy of the registries: the core is a peer, never a dependency, and
	// the workspace links it for development. React as Platinum names it.
	it("peer-depends on the core and React, as Platinum does, and dev-links the core", () => {
		expect(pkg.peerDependencies).toEqual({
			"@classicy/classicy": "workspace:^",
			react: core.peerDependencies.react,
			"react-dom": core.peerDependencies["react-dom"],
		});
		expect(pkg.peerDependencies).toEqual(platinum.peerDependencies);
		expect(pkg.devDependencies).toEqual({
			"@classicy/classicy": "workspace:*",
		});
	});

	// zod, at the core's and Platinum's range: its screen savers' option
	// schemas are zod's, and its bundles carry the zod they were built with,
	// as Platinum's do (its declarations name zod's types).
	it("depends on zod alone, at the core's range, as Platinum does", () => {
		expect(pkg.dependencies).toEqual({ zod: core.dependencies?.zod });
		expect(pkg.dependencies).toEqual(platinum.dependencies);
	});

	// The screen savers' stylesheet index beside the SCSS, which the whole
	// sheet loads (so `./scss/windows98` compiles for a host); and the fonts'
	// readme and license files, which CC BY-SA 3.0 and the readmes require to
	// travel with the faces.
	it("publishes dist, the SCSS, the savers' stylesheet, the fonts' notices, the README and the license", () =>
		expect(pkg.files).toEqual([
			"dist",
			"src/styles",
			"src/screenSavers/*.scss",
			"src/assets/fonts/*.txt",
			"README.md",
			"LICENSE",
		]));

	// Importing the entry registers Windows 98. Its source modules that
	// register at load (the icons, art, wallpapers, cursors and fonts, the
	// sound pack, the screen savers) are side effects too, since a bundler that
	// builds the source (Storybook, the example's dev server) would otherwise
	// drop `import "./assets/windows98Assets"`,
	// `import "./assets/sounds/windows98"` and
	// `import "./screenSavers/windows98ScreenSavers"`.
	it("marks the entry, the registering modules and the styles as side effects", () =>
		expect(pkg.sideEffects).toEqual([
			"./dist/*.js",
			"./src/index.ts",
			"./src/assets/windows98Assets.ts",
			"./src/assets/sounds/windows98.ts",
			"./src/screenSavers/windows98ScreenSavers.ts",
			"**/*.css",
			"**/*.scss",
		]));

	it("is a member of the pnpm workspace", () =>
		expect(
			readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8"),
		).toMatch(/^\s*-\s*'packages\/\*\/\*'\s*$/m));
});
