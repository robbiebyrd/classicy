// The visual parity tools' one entry point. See bin/parity/README.md.
//
//   node bin/parity/parity.ts <command> [options]     (or pnpm parity ...)
//
// Exit codes: 0 when the run is clean (every shot taken, every compare equal),
// 1 when something differs or failed, 2 on a usage or environment error.
// Build script, not library code: it reports through stdout/stderr and exit
// codes. Erasable TypeScript syntax only, so Node runs it directly.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type ParityOptions, parseParityArgs } from "./parityArgs.ts";
import { compareAeDirs, summarizeAe } from "./parityCompare.ts";
import { compareDumpDirs } from "./parityDumpCompare.ts";
import { resolveStoryIds } from "./parityStories.ts";

export const PARITY_USAGE = `usage: node bin/parity/parity.ts <command> [options]

Commands
  stories   list the server's story ids (index.json, docs left out)  [--out file]
  shoot     one 1024x768 PNG per story into --out
  app       the 4 example-app shots into --out (example dev server)
  probe     flag stories that render an error, an empty root or a crash screen
  dump      computed-style dump (JSON) per story into --out
  forced    forced-state dumps into --out  [--browser chromium|firefox]
  compare   <beforeDir> <afterDir>  [--kind ae|computed|forced] [--summary file]
  help      this text

Options
  --out <path>       output directory (output file for stories)
  --port <n>         server port: Storybook default $SB_PORT, else 6006;
                     app default $EXAMPLE_PORT, else 5173
  --base-url <url>   server origin instead of http://localhost:<port>
                     (app: http://127.0.0.1:<port>)
  --filter <regex>   only story ids / shot names / states / files that match
  --stories <file>   story ids, one per line, instead of the server's index.json
  --workers <n>      parallel pages (default 4)
  --kind <k>         compare: ae (PNG, default), computed (dump) or forced
  --summary <file>   compare/probe: write the full report there
  --browser <b>      forced: chromium (default) or firefox
  --repo <dir>       checkout the server serves, normalized out of dump URLs
                     (default: the current directory)

Exit codes: 0 clean, 1 differences or failures, 2 usage or environment error.
Environment: PARITY_PLAYWRIGHT overrides the Playwright module.`;

export type ParityIo = { log: (s: string) => void; error: (s: string) => void };

const writeReport = (file: string | undefined, lines: readonly string[]) => {
	if (!file) return;
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, `${lines.join("\n")}\n`);
};

async function run(o: ParityOptions, io: ParityIo): Promise<number> {
	const out = o.out as string;
	switch (o.command) {
		case "help":
			io.log(PARITY_USAGE);
			return 0;
		case "stories": {
			const ids = await resolveStoryIds(o.baseUrl, o.stories, o.filter);
			if (o.out) {
				writeReport(o.out, ids);
				io.log(`stories ${ids.length} -> ${o.out}`);
			} else io.log(ids.join("\n"));
			return 0;
		}
		case "shoot": {
			const { shootStories } = await import("./parityShoot.ts");
			const ids = await resolveStoryIds(o.baseUrl, o.stories, o.filter);
			const r = await shootStories({
				baseUrl: o.baseUrl,
				out,
				ids,
				workers: o.workers,
			});
			io.log(
				`stories ${ids.length} shot ${r.shot} errors ${r.errors.length} unstable ${r.unstable.length}` +
					(r.errors.length ? `\nerrors: ${r.errors.join(" ")}` : "") +
					(r.unstable.length
						? `\nunstable (last frame kept): ${r.unstable.join(" ")}`
						: ""),
			);
			return r.errors.length || ids.length === 0 ? 1 : 0;
		}
		case "app": {
			const { shootApp } = await import("./parityApp.ts");
			const r = await shootApp({ baseUrl: o.baseUrl, out, filter: o.filter });
			io.log(
				`app shots ${r.shot.length} failed ${r.failed.length}${r.failed.length ? ` (${r.failed.join(" ")})` : ""}`,
			);
			return r.failed.length || r.shot.length === 0 ? 1 : 0;
		}
		case "probe": {
			const { probeStories } = await import("./parityProbe.ts");
			const ids = await resolveStoryIds(o.baseUrl, o.stories, o.filter);
			const flagged = await probeStories({
				baseUrl: o.baseUrl,
				ids,
				workers: o.workers,
			});
			const lines = [
				...flagged,
				`probed ${ids.length}, flagged ${flagged.length}`,
			];
			writeReport(o.summary, lines);
			for (const l of lines) io.log(l);
			return flagged.length ? 1 : 0;
		}
		case "dump": {
			const { dumpStories } = await import("./parityDump.ts");
			const ids = await resolveStoryIds(o.baseUrl, o.stories, o.filter);
			const r = await dumpStories({
				baseUrl: o.baseUrl,
				repo: o.repo,
				out,
				ids,
				workers: o.workers,
			});
			io.log(
				`stories ${ids.length} dumped ${r.dumped} errors ${r.errors.length}`,
			);
			return r.errors.length || ids.length === 0 ? 1 : 0;
		}
		case "forced": {
			const { dumpForcedStates } = await import("./parityForced.ts");
			const r = await dumpForcedStates({
				baseUrl: o.baseUrl,
				repo: o.repo,
				out,
				filter: o.filter,
				browser: o.browser,
			});
			io.log(
				`states ${r.ok.length + r.failed.length} ok ${r.ok.length} fail ${r.failed.length}`,
			);
			return r.failed.length || r.ok.length === 0 ? 1 : 0;
		}
		case "compare": {
			const [before, after] = o.positionals;
			const report =
				o.kind === "ae"
					? summarizeAe(compareAeDirs(before, after, o.filter))
					: compareDumpDirs(before, after, o.kind, o.filter);
			writeReport(o.summary, report.lines);
			for (const l of report.failures) io.log(l);
			for (const l of report.lines.filter((l) => l.startsWith("__html")))
				io.log(l);
			io.log(report.lines[report.lines.length - 1]);
			return report.ok ? 0 : 1;
		}
	}
}

export async function runParity(
	argv: readonly string[],
	env: Readonly<Record<string, string | undefined>>,
	io: ParityIo = { log: console.log, error: console.error },
): Promise<number> {
	let o: ParityOptions;
	try {
		o = parseParityArgs(argv, env);
	} catch (e) {
		io.error(`parity: ${e instanceof Error ? e.message : String(e)}`);
		return 2;
	}
	try {
		return await run(o, io);
	} catch (e) {
		io.error(
			`parity ${o.command}: ${e instanceof Error ? e.message : String(e)}`,
		);
		return 2;
	}
}

if (process.argv[1]?.endsWith("parity.ts")) {
	process.exitCode = await runParity(process.argv.slice(2), process.env);
}
