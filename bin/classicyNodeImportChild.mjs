import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Loads one bundle as a server-rendering host would (bin/classicyNodeImport.ts
// runs it):
//   node bin/classicyNodeImportChild.mjs <file> <import|require> <browserless|node> [settle ms]
// Exits 0 when the bundle loads cleanly; otherwise exits 1 and writes the
// reason on stdout, one line. Plain JavaScript, not TypeScript: Node 22 warns
// when it strips types, and a warning fails the check.
//
// Two environments:
// - `browserless`: the browser's globals deleted, those Node defines
//   (`navigator`; `localStorage` and `sessionStorage` from 25) included, so a
//   bare load-time read of any of them throws, as on a server without them.
// - `node`: Node's own globals kept, as a real server has them, except that
//   `localStorage` and `sessionStorage` become accessors that fail the check
//   on any read, `typeof` included. That models Node 25 and later on any
//   Node: there, with no --localstorage-file, reading them throws (25.2),
//   hands back an object without setItem (25.5) or warns (26).
// Both fail on a load-time throw, a throwing load-time task, a process
// warning (process.emitWarning, which goes to stderr, not the console) and
// any console output, during the load and `settle` ms after it.

// Long enough for the store's 500 ms persistence debounce to fire.
const DEFAULT_SETTLE_MS = 750;
const BROWSER_GLOBALS = [
	"window",
	"self",
	"document",
	"navigator",
	"location",
	"localStorage",
	"sessionStorage",
];
const STORAGE = ["localStorage", "sessionStorage"];

const [file, kind, environment, settle] = process.argv.slice(2);
const settleMs = settle === undefined ? DEFAULT_SETTLE_MS : Number(settle);
/** @param {string} reason */
const fail = (reason) => {
	process.stdout.write(`${reason.replace(/\s+/g, " ").trim()}\n`);
	process.exit(1);
};
if (
	!file ||
	(kind !== "import" && kind !== "require") ||
	(environment !== "browserless" && environment !== "node") ||
	!Number.isFinite(settleMs)
)
	fail(
		"usage: classicyNodeImportChild.mjs <file> <import|require> <browserless|node> [settle ms]",
	);

/** @param {unknown} error */
const describe = (error) => {
	if (!(error instanceof Error)) return String(error);
	const frame = error.stack
		?.split("\n")
		.find((line) => /^\s+at /.test(line))
		?.trim();
	return `${error.name}: ${error.message}${frame ? ` (${frame})` : ""}`;
};
/** @param {Error} error */
const callerOf = (error) =>
	error.stack
		?.split("\n")
		.filter((line) => /^\s+at /.test(line))
		.slice(1)
		.find((line) => !line.includes("classicyNodeImportChild"))
		?.trim();

if (environment === "browserless")
	for (const name of BROWSER_GLOBALS) Reflect.deleteProperty(globalThis, name);
else
	for (const name of STORAGE)
		Object.defineProperty(globalThis, name, {
			configurable: true,
			enumerable: true,
			get() {
				const read = new Error(`${name} read`);
				fail(
					`reads ${name} while it loads${callerOf(read) ? ` (${callerOf(read)})` : ""}: from Node 25 that read throws, or warns, on a server`,
				);
				throw read;
			},
		});

process.on("uncaughtException", (error) =>
	fail(`a load-time task throws ${describe(error)}`),
);
process.on("unhandledRejection", (error) =>
	fail(`a load-time promise rejects with ${describe(error)}`),
);
process.on("warning", (warning) =>
	fail(`raises a process warning while it loads: ${describe(warning)}`),
);

/** @type {string[]} */
const logged = [];
for (const method of ["log", "info", "debug", "warn", "error"])
	console[method] = (...args) => {
		logged.push(
			`console.${method}(${args
				.map((arg) => (arg instanceof Error ? describe(arg) : String(arg)))
				.join(" ")
				.slice(0, 300)})`,
		);
	};

const path = resolve(file);
try {
	if (kind === "require") createRequire(pathToFileURL(path))(path);
	else await import(pathToFileURL(path).href);
} catch (error) {
	fail(`throws ${describe(error)}`);
}
await new Promise((done) => setTimeout(done, settleMs));
if (logged.length) fail(`logs while it loads: ${logged.join("; ")}`);
// Exit now: a timer the bundle left running must not hold the check open.
process.exit(0);
