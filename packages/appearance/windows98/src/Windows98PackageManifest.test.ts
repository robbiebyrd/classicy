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

	// The package needs nothing a host does not already install: no screen
	// savers, so not even zod comes along.
	it("has no dependencies of its own", () =>
		expect(pkg.dependencies).toBeUndefined());

	it("publishes dist, the SCSS, the README and the license", () =>
		expect(pkg.files).toEqual(["dist", "src/styles", "README.md", "LICENSE"]));

	// Importing the entry registers Windows 98. Its source module that
	// registers at load (the sound pack) is a side effect too, since a bundler
	// that builds the source (Storybook, the example's dev server) would
	// otherwise drop `import "./assets/sounds/windows98"`.
	it("marks the entry, the registering module and the styles as side effects", () =>
		expect(pkg.sideEffects).toEqual([
			"./dist/*.js",
			"./src/index.ts",
			"./src/assets/sounds/windows98.ts",
			"**/*.css",
			"**/*.scss",
		]));

	it("is a member of the pnpm workspace", () =>
		expect(
			readFileSync(path.join(repoRoot, "pnpm-workspace.yaml"), "utf8"),
		).toMatch(/^\s*-\s*'packages\/\*\/\*'\s*$/m));
});
