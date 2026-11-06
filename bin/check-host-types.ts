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
// The check packs both packages (`pnpm pack`, as 4.1 publishes them), extracts
// the tarballs into a scratch host's node_modules beside links to the core's
// dependencies and peer dependencies (and their @types) from this checkout,
// and runs `tsc --noEmit` on a host file under each resolution in
// CLASSICY_HOST_RESOLUTIONS, with `skipLibCheck` as hosts set it. Run after
// both builds (the end of `build:source`):
//
//   node bin/check-host-types.ts      exit 1 if any resolution fails
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
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The module settings of each resolution a host may use. */
export const CLASSICY_HOST_RESOLUTIONS = {
	bundler: { module: "esnext", moduleResolution: "bundler" },
	node16: { module: "node16", moduleResolution: "node16" },
	nodenext: { module: "nodenext", moduleResolution: "nodenext" },
} as const;

export type ClassicyHostResolution = keyof typeof CLASSICY_HOST_RESOLUTIONS;

/**
 * The host file: a core type, a core function, Platinum's hooks and its
 * theme data, and a Platinum preset handed back to the core as a
 * `ClassicyTheme`. Under a resolution that misses either package's exports,
 * an import or the assignment fails.
 */
export const CLASSICY_HOST_SOURCE = `import {
	type ClassicyTheme,
	registerClassicyAppearancePackage,
} from "@classicy/classicy";
import {
	platinumAppearanceHooks,
	platinumJson,
} from "@classicy/appearance-platinum";

const theme: ClassicyTheme = platinumJson.presets[0];

export const host = {
	theme,
	register: registerClassicyAppearancePackage,
	hooks: platinumAppearanceHooks,
};
`;

/** The host's tsconfig under `resolution`. */
export const classicyHostTsconfig = (resolution: ClassicyHostResolution) => ({
	compilerOptions: {
		...CLASSICY_HOST_RESOLUTIONS[resolution],
		target: "es2022",
		lib: ["es2022", "dom", "dom.iterable"],
		strict: true,
		skipLibCheck: true,
		noEmit: true,
		types: [],
	},
	files: ["host.ts"],
});

/**
 * The packages a host installs beside `manifest`'s: its dependencies and
 * peer dependencies, each with its DefinitelyTyped package (`@types/he`,
 * `@types/scope__name`).
 */
export const classicyHostDependencies = (manifest: {
	dependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}): string[] =>
	[
		...Object.keys(manifest.dependencies ?? {}),
		...Object.keys(manifest.peerDependencies ?? {}),
	]
		.flatMap((name) => [
			name,
			`@types/${name.startsWith("@") ? name.slice(1).replace("/", "__") : name}`,
		])
		.filter((name, index, all) => all.indexOf(name) === index)
		.sort();

/**
 * Writes the host into `hostDir`: its package.json (`"type": "module"`),
 * host.ts, one tsconfig per resolution, and a link in node_modules to each of
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
	for (const resolution of Object.keys(
		CLASSICY_HOST_RESOLUTIONS,
	) as ClassicyHostResolution[])
		writeFileSync(
			join(hostDir, `tsconfig.${resolution}.json`),
			`${JSON.stringify(classicyHostTsconfig(resolution), null, "\t")}\n`,
		);
	for (const [name, target] of Object.entries(links)) {
		const link = join(hostDir, "node_modules", name);
		mkdirSync(dirname(link), { recursive: true });
		symlinkSync(target, link, "dir");
	}
};

export type ClassicyHostResult = {
	resolution: ClassicyHostResolution;
	status: number | null;
	output: string;
};

/** Runs `tsc` (the path of its bin script) on the host under each resolution. */
export const checkClassicyHost = (
	hostDir: string,
	tsc: string,
): ClassicyHostResult[] =>
	(Object.keys(CLASSICY_HOST_RESOLUTIONS) as ClassicyHostResolution[]).map(
		(resolution) => {
			const result = spawnSync(
				process.execPath,
				[tsc, "-p", `tsconfig.${resolution}.json`, "--pretty", "false"],
				{ cwd: hostDir, encoding: "utf8" },
			);
			return {
				resolution,
				status: result.status,
				output: `${result.stdout}${result.stderr}`.trim(),
			};
		},
	);

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
	const scratch = mkdtempSync(join(tmpdir(), "classicy-host-types-"));
	let failed = false;
	try {
		const host = join(scratch, "host");
		const core = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
		const links = Object.fromEntries(
			classicyHostDependencies(core)
				.map((name) => [name, join(root, "node_modules", name)])
				.filter(([, path]) => existsSync(path))
				.map(([name, path]) => [name, realpathSync(path)]),
		);
		writeClassicyHost(host, links);
		extract(
			pack(root, join(scratch, "pack-core")),
			join(host, "node_modules/@classicy/classicy"),
		);
		extract(
			pack(platinum, join(scratch, "pack-platinum")),
			join(host, "node_modules/@classicy/appearance-platinum"),
		);
		for (const { resolution, status, output } of checkClassicyHost(
			host,
			join(root, "node_modules/typescript/bin/tsc"),
		)) {
			if (status === 0) {
				console.log(
					`host types (${resolution}): both packed packages type-check`,
				);
				continue;
			}
			failed = true;
			console.error(
				`host types (${resolution}): tsc exited ${status} -> check the relative specifiers in dist/types (beforeWriteFile on dts in vite.config.ts):`,
			);
			for (const line of output.split("\n").slice(0, 10))
				console.error(`  ${line}`);
		}
	} finally {
		rmSync(scratch, { recursive: true, force: true });
	}
	process.exit(failed ? 1 : 0);
}
