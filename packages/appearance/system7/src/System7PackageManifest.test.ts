import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// The workspace package System 7 ships as, @classicy/appearance-system7
// (plan 0018-dbd §2.2), mirroring Platinum's (PlatinumPackageManifest.test.ts):
// its manifest; its exports and its tarball are System7PackageExports.test.ts's.

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

describe("packages/appearance/system7/package.json", () => {
	it("is @classicy/appearance-system7, an ES module, published publicly", () => {
		expect(pkg.name).toBe("@classicy/appearance-system7");
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

	// The screen savers bring zod with them (plan 0018-dbd §3.8); until then
	// the package needs nothing a host does not already install.
	it("has no dependencies of its own yet", () =>
		expect(pkg.dependencies).toBeUndefined());

	it("publishes dist, the SCSS, the README and the license", () =>
		expect(pkg.files).toEqual(["dist", "src/styles", "README.md", "LICENSE"]));

	// Importing the entry registers System 7. Its source modules that register
	// at load (the fonts, the sound pack) are side effects too, since a bundler
	// that builds the source (Storybook, the example's dev server) would
	// otherwise drop `import "./assets/system7Assets"`.
	it("marks the entry, the registering modules and the styles as side effects", () =>
		expect(pkg.sideEffects).toEqual([
			"./dist/*.js",
			"./src/index.ts",
			"./src/assets/system7Assets.ts",
			"./src/assets/sounds/system7.ts",
			"**/*.css",
			"**/*.scss",
		]));

	it("is a member of the pnpm workspace", () =>
		expect(
			readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8"),
		).toMatch(/^\s*-\s*'packages\/\*\/\*'\s*$/m));
});
