import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

// verify:dist's server-import invariant (story 0223-a0y): a server-rendering
// host (Next.js, Remix, Astro) imports the bundles in Node, where there is no
// DOM, so each entry bundle must load there cleanly. Each is loaded twice, in
// a child Node process of its own (bin/classicyNodeImportChild.mjs):
// - with the browser's globals deleted, `navigator` and Node 25's storage
//   included, so a bare load-time read of `document`, `window`,
//   `localStorage` or `navigator` throws, as on a server without them;
// - with Node's own globals, as a real server has them, and `localStorage`
//   and `sessionStorage` as accessors that fail on any read, `typeof`
//   included, as Node 25 and later throw or warn on that read.
// Either fails when the load throws, when a load-time task (a timer, a
// promise) throws, on a process warning, or when anything reaches the console
// while the bundle loads and for a moment after, the time a debounced write
// takes to fire.

/** How each bundle is loaded: `import` for an ES bundle, `require` for the
 * UMD one, as a CommonJS host's `require()` reaches it. */
export type ClassicyNodeImportKind = "import" | "require";

export type ClassicyNodeImportBundle = {
	file: string;
	kind: ClassicyNodeImportKind;
};

/** The two environments each bundle loads in (see above). */
export const CLASSICY_NODE_IMPORT_ENVIRONMENTS = {
	browserless: "with no browser globals",
	node: "with Node's own globals",
} as const;
export type ClassicyNodeImportEnvironment =
	keyof typeof CLASSICY_NODE_IMPORT_ENVIRONMENTS;

const CHILD = join(import.meta.dirname, "classicyNodeImportChild.mjs");
const run = promisify(execFile);

/**
 * The problems loading each bundle in Node: one message per bundle and
 * environment that does not load cleanly, naming the file, how it was loaded,
 * where, and what went wrong, in the order given (the children run at once).
 * `cwd` is where the paths are relative to; `settleMs`, how long each child
 * waits after the load for load-time tasks: 750 ms by default, or
 * `CLASSICY_NODE_IMPORT_SETTLE_MS` (the dist checks' fixture tests set it to
 * 0); `node`, the Node binary to run (this one by default).
 */
export async function findClassicyNodeImportProblems(
	bundles: ReadonlyArray<ClassicyNodeImportBundle>,
	{
		cwd = process.cwd(),
		settleMs = process.env.CLASSICY_NODE_IMPORT_SETTLE_MS,
		node = process.execPath,
		environments = ["browserless", "node"],
	}: {
		cwd?: string;
		settleMs?: number | string;
		node?: string;
		environments?: ReadonlyArray<ClassicyNodeImportEnvironment>;
	} = {},
): Promise<string[]> {
	const results = await Promise.all(
		bundles.flatMap(({ file, kind }) =>
			environments.map(async (environment) => {
				const args = [CHILD, file, kind, environment];
				if (settleMs !== undefined) args.push(String(settleMs));
				try {
					await run(node, args, { cwd, timeout: 60_000 });
					return null;
				} catch (error) {
					const { stdout, stderr, message } = error as {
						stdout?: string;
						stderr?: string;
						message: string;
					};
					const reason = stdout?.trim() || stderr?.trim() || message;
					return `${file}: does not ${kind} cleanly in Node ${CLASSICY_NODE_IMPORT_ENVIRONMENTS[environment]}: ${reason} -> a module reads a browser global or Node's storage, warns or logs while it loads; guard it with \`typeof window\` (never \`typeof localStorage\`) or move it into the function that needs it, as a server-rendering host imports the bundle in Node (bin/classicyNodeImport.ts).`;
				}
			}),
		),
	);
	return results.filter((problem) => problem !== null);
}
