import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

// verify:dist's server-import invariant (story 0223-a0y): a server-rendering
// host (Next.js, Remix, Astro) imports the bundles in Node, where there is no
// DOM, so each entry bundle must load there. Each is loaded in a child Node
// process of its own (bin/classicyNodeImportChild.ts) with the browser's
// globals deleted, so a load-time read of `document`, `window`,
// `localStorage` or `navigator` throws as it does on a server (Node itself
// defines `navigator`, and from 25 `localStorage`). The child fails when the
// load throws, when a load-time task (a timer, a promise) throws, or when
// anything is logged to console.error or console.warn while the bundle loads
// and for a moment after, the time a debounced write takes to fire.

/** How each bundle is loaded: `import` for an ES bundle, `require` for the
 * UMD one, as a CommonJS host's `require()` reaches it. */
export type ClassicyNodeImportKind = "import" | "require";

export type ClassicyNodeImportBundle = {
	file: string;
	kind: ClassicyNodeImportKind;
};

const CHILD = join(import.meta.dirname, "classicyNodeImportChild.ts");
const run = promisify(execFile);

/**
 * The problems loading each bundle in Node: one message per bundle that does
 * not load cleanly, naming the file, how it was loaded and what went wrong,
 * in the order given (the children run at once). `cwd` is where the paths are
 * relative to; `settleMs`, how long each child waits after the load for
 * load-time tasks: 750 ms by default, or `CLASSICY_NODE_IMPORT_SETTLE_MS`
 * (the dist checks' fixture tests set it to 0).
 */
export async function findClassicyNodeImportProblems(
	bundles: ReadonlyArray<ClassicyNodeImportBundle>,
	{
		cwd = process.cwd(),
		settleMs = process.env.CLASSICY_NODE_IMPORT_SETTLE_MS,
	}: { cwd?: string; settleMs?: number | string } = {},
): Promise<string[]> {
	const results = await Promise.all(
		bundles.map(async ({ file, kind }) => {
			const args = [CHILD, file, kind];
			if (settleMs !== undefined) args.push(String(settleMs));
			try {
				await run(process.execPath, args, { cwd, timeout: 60_000 });
				return null;
			} catch (error) {
				const { stdout, stderr, message } = error as {
					stdout?: string;
					stderr?: string;
					message: string;
				};
				const reason = stdout?.trim() || stderr?.trim() || message;
				return `${file}: does not ${kind} cleanly in Node with no browser globals: ${reason} -> a module reads a browser global (document, window, localStorage, navigator) or logs while it loads; guard it with \`typeof\` or move it into the function that needs it, as a server-rendering host imports the bundle in Node (bin/classicyNodeImport.ts).`;
			}
		}),
	);
	return results.filter((problem) => problem !== null);
}
