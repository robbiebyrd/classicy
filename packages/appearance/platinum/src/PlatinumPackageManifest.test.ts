import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The workspace package Platinum ships as, @classicy/appearance-platinum
// (plan 0015-kxa §3.1, design 0014-ahm "Build and outputs"): its manifest;
// its exports and its tarball are PlatinumPackageExports.test.ts's.

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
		dependencies: Record<string, string>;
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
	});

	// The screen savers' config schemas import zod (plan 0016-vbq §2.1), and
	// so do their declarations: Platinum declares it at the core's range, its
	// one dependency.
	it("depends on zod alone, at the core's range", () =>
		expect(pkg.dependencies).toEqual({ zod: core.dependencies.zod }));

	it("publishes dist, the SCSS, the README and the license", () =>
		expect(pkg.files).toEqual(["dist", "src/styles", "README.md", "LICENSE"]));

	// Importing the entry registers Platinum. Its source modules that register
	// at load (the assets, the sound pack, the screen savers and the Logo
	// saver's logos) are side effects too, since a
	// bundler that builds the source (Storybook, the example's dev server)
	// would otherwise drop `import "./assets/platinumAssets"`.
	it("marks the entry, the registering modules and the styles as side effects", () =>
		expect(pkg.sideEffects).toEqual([
			"./dist/*.js",
			"./src/index.ts",
			"./src/assets/platinumAssets.ts",
			"./src/assets/sounds/platinum.ts",
			"./src/screenSavers/platinumScreenSavers.ts",
			"./src/screenSavers/Logo/ClassicyScreenSaverLogoRegistry.ts",
			"**/*.css",
			"**/*.scss",
		]));

	it("is a member of the pnpm workspace", () =>
		expect(
			readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8"),
		).toMatch(/^\s*-\s*'packages\/\*\/\*'\s*$/m));
});
