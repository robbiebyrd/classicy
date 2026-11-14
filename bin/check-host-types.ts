// The published packages, type-checked as a TypeScript host sees them (story
// 0151-0cc). Both are `"type": "module"`, so a host on `moduleResolution:
// node16` or `nodenext` reads their declarations as ES modules and resolves a
// relative specifier only with its extension: `export * from "./…"` in
// dist/types resolves to nothing there, and every name behind it is missing
// (TS2305: Module '"@classicy/classicy"' has no exported member
// 'ClassicyTheme'), although `bundler` resolution, the repo's own, finds them.
// No other check reads the declarations the way a host does: verify:dist and
// Platinum's verify-dist scan them as text.
//
// A host also installs only what the packages declare (story 0153-k0e): a
// declaration importing a devDependency (`@mdxeditor/editor`) or a package
// whose types are a devDependency (`howler` without `@types/howler`) resolves
// to nothing there, an `any` under `skipLibCheck` and an error without it.
//
// The check packs the packages (`pnpm pack`, as 4.1 publishes them: the core,
// Platinum and System 7, plan 0018-dbd §2.2), extracts
// the tarballs into a scratch host's node_modules beside links, from this
// checkout, to the packages' dependencies and peer dependencies and nothing
// else (an `@types/…` package only when it is itself one of them). It fails
// on any package a packed declaration imports that its package does not
// declare, then runs `tsc --noEmit` on a host file under each mode in
// CLASSICY_HOST_MODES: `skipLibCheck` as most hosts set it, and once
// (`bundler-lib-check`) without it, so every declaration is checked. Run
// after the builds (the end of `build:source`):
//
//   node bin/check-host-types.ts      exit 1 if any import or mode fails
//
// Build script, not library code: it reports through stdout/stderr and exit
// codes. Erasable TypeScript syntax only, so Node runs it directly.
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { isBuiltin } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	classicyPackageOfSpecifier,
	findClassicyBareSpecifiers,
} from "./classicyDeclarationSpecifiers.ts";

/**
 * The compiler settings of each mode a host may type-check in: each
 * resolution with `skipLibCheck`, and bundler without it.
 */
export const CLASSICY_HOST_MODES = {
	bundler: {
		module: "esnext",
		moduleResolution: "bundler",
		skipLibCheck: true,
	},
	"bundler-lib-check": {
		module: "esnext",
		moduleResolution: "bundler",
		skipLibCheck: false,
	},
	node16: { module: "node16", moduleResolution: "node16", skipLibCheck: true },
	nodenext: {
		module: "nodenext",
		moduleResolution: "nodenext",
		skipLibCheck: true,
	},
} as const;

export type ClassicyHostMode = keyof typeof CLASSICY_HOST_MODES;

/** The fields of a package.json the host reads. */
export type ClassicyHostManifest = {
	name?: string;
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
};

/**
 * The host file: a core type, a core function, Platinum's hooks and its
 * theme data, System 7's sound pack and theme data, and a preset of each
 * handed back to the core as a `ClassicyTheme`. Under a resolution that
 * misses any package's exports, an import or an assignment fails.
 */
export const CLASSICY_HOST_SOURCE = `import {
	type ClassicySoundPack,
	type ClassicyTheme,
	registerClassicyAppearancePackage,
} from "@classicy/classicy";
import {
	platinumAppearanceHooks,
	platinumJson,
} from "@classicy/appearance-platinum";
import { system7Json, system7SoundPack } from "@classicy/appearance-system7";

const theme: ClassicyTheme = platinumJson.presets[0];
const system7Theme: ClassicyTheme = system7Json.presets[0];
const sounds: ClassicySoundPack = system7SoundPack;

export const host = {
	theme,
	system7Theme,
	sounds,
	register: registerClassicyAppearancePackage,
	hooks: platinumAppearanceHooks,
};
`;

/** The host's tsconfig under `mode`. */
export const classicyHostTsconfig = (mode: ClassicyHostMode) => ({
	compilerOptions: {
		...CLASSICY_HOST_MODES[mode],
		target: "es2022",
		lib: ["es2022", "dom", "dom.iterable"],
		strict: true,
		noEmit: true,
		types: [],
	},
	files: ["host.ts"],
});

/** What `manifest` declares a host installs: its dependencies and peers. */
const declaredBy = (manifest: ClassicyHostManifest): string[] => [
	...Object.keys(manifest.dependencies ?? {}),
	...Object.keys(manifest.peerDependencies ?? {}),
];

/**
 * The packages a host installs beside the `manifests`' own: their
 * dependencies and peer dependencies, and nothing else. A package's types
 * come with it only when they ship in it or its `@types/…` package is itself
 * declared; a devDependency never reaches a host.
 */
export const classicyHostDependencies = (
	...manifests: ClassicyHostManifest[]
): string[] => {
	const own = new Set(manifests.map((manifest) => manifest.name));
	return manifests
		.flatMap(declaredBy)
		.filter((name, index, all) => !own.has(name) && all.indexOf(name) === index)
		.sort();
};

/**
 * The host's links (name → directory) to each of the `manifests`' declared
 * packages present in `nodeModules`, by real path, so their own dependencies
 * resolve through pnpm's store.
 */
export const classicyHostLinks = (
	nodeModules: string,
	...manifests: ClassicyHostManifest[]
): Record<string, string> =>
	Object.fromEntries(
		classicyHostDependencies(...manifests)
			.map((name) => [name, join(nodeModules, name)])
			.filter(([, path]) => existsSync(path))
			.map(([name, path]) => [name, realpathSync(path)]),
	);

export type ClassicyUndeclaredImport = { file: string; specifier: string };

/**
 * Each package specifier a declaration under `typesDir` imports that
 * `manifest` does not declare (a dependency or peer), other than a Node
 * built-in or the package's own name: a host has no such package, so the
 * declaration's type is `any` under `skipLibCheck` and an error without it.
 * `file` is relative to `typesDir`.
 */
export const findClassicyUndeclaredImports = (
	typesDir: string,
	manifest: ClassicyHostManifest,
): ClassicyUndeclaredImport[] => {
	const declared = new Set([...declaredBy(manifest), manifest.name]);
	return (readdirSync(typesDir, { recursive: true }) as string[])
		.filter((file) => file.endsWith(".d.ts"))
		.sort()
		.flatMap((file) =>
			findClassicyBareSpecifiers(readFileSync(join(typesDir, file), "utf8"))
				.filter(
					(specifier) =>
						!isBuiltin(specifier) &&
						!declared.has(classicyPackageOfSpecifier(specifier)),
				)
				.map((specifier) => ({ file: file.split("\\").join("/"), specifier })),
		);
};

/**
 * Writes the host into `hostDir`: its package.json (`"type": "module"`),
 * host.ts, one tsconfig per mode, and a link in node_modules to each of
 * `links` (name → directory). The packages under test are put in its
 * node_modules by the caller.
 */
export const writeClassicyHost = (
	hostDir: string,
	links: Record<string, string>,
) => {
	mkdirSync(join(hostDir, "node_modules"), { recursive: true });
	writeFileSync(
		join(hostDir, "package.json"),
		`${JSON.stringify({ name: "classicy-host", private: true, type: "module" }, null, "\t")}\n`,
	);
	writeFileSync(join(hostDir, "host.ts"), CLASSICY_HOST_SOURCE);
	for (const mode of Object.keys(CLASSICY_HOST_MODES) as ClassicyHostMode[])
		writeFileSync(
			join(hostDir, `tsconfig.${mode}.json`),
			`${JSON.stringify(classicyHostTsconfig(mode), null, "\t")}\n`,
		);
	for (const [name, target] of Object.entries(links)) {
		const link = join(hostDir, "node_modules", name);
		mkdirSync(dirname(link), { recursive: true });
		symlinkSync(target, link, "dir");
	}
};

export type ClassicyHostResult = {
	mode: ClassicyHostMode;
	status: number | null;
	output: string;
};

/** Runs `tsc` (the path of its bin script) on the host under each mode. */
export const checkClassicyHost = (
	hostDir: string,
	tsc: string,
): ClassicyHostResult[] =>
	(Object.keys(CLASSICY_HOST_MODES) as ClassicyHostMode[]).map((mode) => {
		const result = spawnSync(
			process.execPath,
			[tsc, "-p", `tsconfig.${mode}.json`, "--pretty", "false"],
			{ cwd: hostDir, encoding: "utf8" },
		);
		return {
			mode,
			status: result.status,
			output: `${result.stdout}${result.stderr}`.trim(),
		};
	});

/**
 * `tsc`'s error lines in `output`, one per distinct message: the first file
 * that reports it, then how many more do (`react` without its types is one
 * line, not one per declaration). Other lines are kept as they are.
 */
export const summarizeClassicyTscOutput = (output: string): string[] => {
	const seen = new Map<string, { line: string; count: number }>();
	const other: string[] = [];
	for (const line of output.split("\n")) {
		const error = /^(.*?)\(\d+,\d+\): (error TS\d+: .*)$/.exec(line);
		if (error === null) {
			if (line.trim() !== "" && !/^\s/.test(line)) other.push(line);
			continue;
		}
		const entry = seen.get(error[2]);
		if (entry === undefined) seen.set(error[2], { line, count: 1 });
		else entry.count++;
	}
	return [
		...[...seen.values()].map(({ line, count }) =>
			count === 1 ? line : `${line} (and ${count - 1} more)`,
		),
		...other,
	];
};

/** Packs the package in `packageDir` with pnpm into `out`; the tarball's path. */
const pack = (packageDir: string, out: string): string => {
	mkdirSync(out, { recursive: true });
	const result = spawnSync(
		"pnpm",
		["--config.ignore-scripts=true", "pack", "--pack-destination", out],
		{ cwd: packageDir, encoding: "utf8" },
	);
	if (result.status !== 0)
		throw new Error(`pnpm pack in ${packageDir} failed:\n${result.stderr}`);
	const tarballs = readdirSync(out).filter((file) => file.endsWith(".tgz"));
	if (tarballs.length !== 1)
		throw new Error(`pnpm pack in ${packageDir}: ${tarballs.length} tarballs`);
	return join(out, tarballs[0]);
};

/** Extracts `tarball` (npm's `package/` prefix stripped) into `dir`. */
const extract = (tarball: string, dir: string) => {
	mkdirSync(dir, { recursive: true });
	const result = spawnSync(
		"tar",
		["-xzf", tarball, "-C", dir, "--strip-components=1"],
		{ encoding: "utf8" },
	);
	if (result.status !== 0)
		throw new Error(`tar ${tarball} failed:\n${result.stderr}`);
};

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const root = fileURLToPath(new URL("..", import.meta.url));
	const platinum = join(root, "packages/appearance/platinum");
	const system7 = join(root, "packages/appearance/system7");
	const scratch = mkdtempSync(join(tmpdir(), "classicy-host-types-"));
	let failed = false;
	try {
		const host = join(scratch, "host");
		const packed = {
			"@classicy/classicy": join(host, "node_modules/@classicy/classicy"),
			"@classicy/appearance-platinum": join(
				host,
				"node_modules/@classicy/appearance-platinum",
			),
			"@classicy/appearance-system7": join(
				host,
				"node_modules/@classicy/appearance-system7",
			),
		};
		extract(
			pack(root, join(scratch, "pack-core")),
			packed["@classicy/classicy"],
		);
		extract(
			pack(platinum, join(scratch, "pack-platinum")),
			packed["@classicy/appearance-platinum"],
		);
		extract(
			pack(system7, join(scratch, "pack-system7")),
			packed["@classicy/appearance-system7"],
		);
		// The packed manifests: what a host's install reads (workspace ranges
		// already replaced by versions).
		const manifests = Object.values(packed).map(
			(dir) =>
				JSON.parse(
					readFileSync(join(dir, "package.json"), "utf8"),
				) as ClassicyHostManifest,
		);
		writeClassicyHost(
			host,
			classicyHostLinks(join(root, "node_modules"), ...manifests),
		);
		for (const [index, dir] of Object.values(packed).entries()) {
			const undeclared = findClassicyUndeclaredImports(
				join(dir, "dist/types"),
				manifests[index],
			);
			if (undeclared.length === 0) {
				console.log(
					`host imports (${manifests[index].name}): every package dist/types imports is a dependency or peer`,
				);
				continue;
			}
			failed = true;
			console.error(
				`host imports (${manifests[index].name}): ${undeclared.length} import(s) of a package hosts do not install -> declare it, or keep its types off the public surface:`,
			);
			for (const { file, specifier } of undeclared)
				console.error(`  dist/types/${file}: "${specifier}"`);
		}
		for (const { mode, status, output } of checkClassicyHost(
			host,
			join(root, "node_modules/typescript/bin/tsc"),
		)) {
			if (status === 0) {
				console.log(`host types (${mode}): the packed packages type-check`);
				continue;
			}
			failed = true;
			console.error(
				`host types (${mode}): tsc exited ${status} -> check the relative specifiers in dist/types (beforeWriteFile on dts in vite.config.ts) and that every package a declaration imports, with its types, is a dependency or peer:`,
			);
			for (const line of summarizeClassicyTscOutput(output).slice(0, 20))
				console.error(`  ${line}`);
		}
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
	process.exit(failed ? 1 : 0);
}
