import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	checkClassicyHost,
	classicyHostDependencies,
	classicyHostTsconfig,
	writeClassicyHost,
} from "./check-host-types";

// bin/check-host-types.ts packs both packages and type-checks a host against
// them under each resolution (the end of `build:source`, story 0151-0cc).
// Here the same host and the same tsc run against two tiny hand-written
// packages, `"type": "module"` like the real ones, whose declarations
// re-export through a dotted module name with or without `.js`.

const TSC = resolve("node_modules/typescript/bin/tsc");
const root = mkdtempSync(join(tmpdir(), "classicy-host-types-test-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

const write = (dir: string, files: Record<string, string>) => {
	for (const [file, text] of Object.entries(files)) {
		mkdirSync(dirname(join(dir, file)), { recursive: true });
		writeFileSync(join(dir, file), text);
	}
};

const manifest = (name: string) =>
	JSON.stringify({
		name,
		type: "module",
		exports: { ".": { types: "./types/index.d.ts" } },
	});

let run = 0;
/** A host whose packages re-export with `extension` ("" or ".js"). */
const host = (extension: string) => {
	const dir = join(root, `case-${run++}`);
	writeClassicyHost(dir, {});
	write(join(dir, "node_modules/@classicy/classicy"), {
		"package.json": manifest("@classicy/classicy"),
		"types/index.d.ts": `export * from './Manager.Colors${extension}';\n`,
		"types/Manager.Colors.d.ts": [
			"export type ClassicyTheme = { id: string; name: string };",
			"export declare const registerClassicyAppearancePackage: (id: string) => void;",
		].join("\n"),
	});
	write(join(dir, "node_modules/@classicy/appearance-platinum"), {
		"package.json": manifest("@classicy/appearance-platinum"),
		"types/index.d.ts": `export * from './hooks${extension}';\n`,
		"types/hooks.d.ts": [
			"import type { ClassicyTheme } from '@classicy/classicy';",
			"export declare const platinumAppearanceHooks: object;",
			"export declare const platinumJson: { presets: ReadonlyArray<Readonly<ClassicyTheme>> };",
		].join("\n"),
	});
	return Object.fromEntries(
		checkClassicyHost(dir, TSC).map(({ resolution, status, output }) => [
			resolution,
			{ status, output },
		]),
	);
};

describe("check-host-types.ts", () => {
	it(
		"passes declarations whose relative specifiers carry .js, under every resolution",
		() =>
			expect(host(".js")).toEqual({
				bundler: { status: 0, output: "" },
				node16: { status: 0, output: "" },
				nodenext: { status: 0, output: "" },
			}),
		60_000,
	);

	it("fails extensionless specifiers under node16 and nodenext, not bundler", () => {
		const results = host("");
		expect(results.bundler).toEqual({ status: 0, output: "" });
		for (const resolution of ["node16", "nodenext"]) {
			expect(results[resolution].status, resolution).toBe(2);
			expect(results[resolution].output, resolution).toContain(
				`error TS2305: Module '"@classicy/classicy"' has no exported member 'ClassicyTheme'.`,
			);
			expect(results[resolution].output, resolution).toContain(
				`error TS2305: Module '"@classicy/appearance-platinum"' has no exported member 'platinumJson'.`,
			);
		}
	}, 60_000);

	it("checks under bundler, node16 and nodenext, with skipLibCheck", () => {
		expect(classicyHostTsconfig("node16").compilerOptions).toMatchObject({
			module: "node16",
			moduleResolution: "node16",
			skipLibCheck: true,
			strict: true,
		});
		expect(classicyHostTsconfig("bundler").compilerOptions).toMatchObject({
			moduleResolution: "bundler",
		});
		expect(classicyHostTsconfig("nodenext").compilerOptions).toMatchObject({
			moduleResolution: "nodenext",
		});
	});

	it("installs the dependencies and peer dependencies, each with its @types", () =>
		expect(
			classicyHostDependencies({
				dependencies: { he: "^1", "@tanstack/react-table": "^8" },
				peerDependencies: { react: "^19", he: "^1" },
			}),
		).toEqual([
			"@tanstack/react-table",
			"@types/he",
			"@types/react",
			"@types/tanstack__react-table",
			"he",
			"react",
		]));
});
