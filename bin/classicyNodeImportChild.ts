import { createRequire } from "node:module";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Loads one bundle as a server-rendering host would, in a Node with none of
// the browser's globals (bin/classicyNodeImport.ts runs it):
//   node bin/classicyNodeImportChild.ts <file> <import|require> [settle ms]
// Exits 0 when the bundle loads cleanly; otherwise exits 1 and writes the
// reason on stdout, one line.

// Long enough for the store's 500 ms persistence debounce to fire.
const DEFAULT_SETTLE_MS = 750;
// Node defines `navigator` (21+) and `localStorage`/`sessionStorage` (25+);
// the others are absent, and deleting them is a no-op.
const BROWSER_GLOBALS = [
	"window",
	"self",
	"document",
	"navigator",
	"location",
	"localStorage",
	"sessionStorage",
];

const [file, kind, settle] = process.argv.slice(2);
const settleMs = settle === undefined ? DEFAULT_SETTLE_MS : Number(settle);
const fail = (reason: string): never => {
	process.stdout.write(`${reason.replace(/\s+/g, " ").trim()}\n`);
	process.exit(1);
};
if (
	!file ||
	(kind !== "import" && kind !== "require") ||
	!Number.isFinite(settleMs)
)
	fail("usage: classicyNodeImportChild.ts <file> <import|require> [settle ms]");

for (const name of BROWSER_GLOBALS) Reflect.deleteProperty(globalThis, name);

const describe = (error: unknown): string => {
	if (!(error instanceof Error)) return String(error);
	const frame = error.stack
		?.split("\n")
		.find((line) => /^\s+at /.test(line))
		?.trim();
	return `${error.name}: ${error.message}${frame ? ` (${frame})` : ""}`;
};
process.on("uncaughtException", (error) =>
	fail(`a load-time task throws ${describe(error)}`),
);
process.on("unhandledRejection", (error) =>
	fail(`a load-time promise rejects with ${describe(error)}`),
);

const logged: string[] = [];
for (const method of ["log", "info", "debug", "warn", "error"] as const)
	console[method] = (...args: unknown[]) => {
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
