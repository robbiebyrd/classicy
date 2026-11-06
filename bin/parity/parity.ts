// The visual parity tools' one entry point. See bin/parity/README.md.
//
//   node bin/parity/parity.ts <command> [options]     (or pnpm parity ...)
//
// Exit codes: 0 when the run is clean (every shot taken, every compare equal),
// 1 when something differs or failed, 2 on a usage or environment error.
// Build script, not library code: it reports through stdout/stderr and exit
// codes. Erasable TypeScript syntax only, so Node runs it directly.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { type ParityOptions, parseParityArgs } from "./parityArgs.ts";
import { compareAeDirs, summarizeAe } from "./parityCompare.ts";
import { parseStoryList, resolveStoryIds } from "./parityStories.ts";

export const PARITY_USAGE = `usage: node bin/parity/parity.ts <command> [options]

Commands
  stories   list the server's story ids (index.json, docs left out)  [--out file]
  shoot     one 1024x768 PNG per story into --out
            [--mid] [--mid-only] [--at 50%|400ms] [--mid-stories file] [--mid-clock ms]
  app       the 4 example-app shots into --out (example dev server)
  compare   <beforeDir> <afterDir>  [--summary file]  (AE, pixel counts)
  help      this text

Options
  --out <path>       output directory (output file for stories)
  --port <n>         server port: Storybook default $SB_PORT, else 6006;
                     app default $EXAMPLE_PORT, else 5173
  --base-url <url>   server origin instead of http://localhost:<port>
                     (app: http://127.0.0.1:<port>)
  --filter <regex>   only story ids / shot names / files that match
  --stories <file>   story ids, one per line, instead of the server's index.json
  --workers <n>      parallel pages (default 4)
  --kind <k>         compare: ae (the only kind)
  --summary <file>   compare: write the full report there
  --mid              shoot: also shoot animated stories mid-animation, <id>@mid.png
                     (stories with animations at ready time, plus --mid-stories)
  --mid-only         shoot: the mid-time shots only, no t=0 set
  --at <t>           shoot: where to pause, a share of each iteration (default
                     50%) or a time after ready (400ms, 1.5s); implies --mid
  --mid-stories <f>  shoot: ids that always get a mid shot; implies --mid
  --mid-clock <ms>   shoot: how far the JS clock moves for the mid shot
                     (default: the --at time, or 2000 for a percentage)

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
				mid: o.mid,
				midStories: o.mid?.stories
					? parseStoryList(readFileSync(o.mid.stories, "utf8"))
					: [],
			});
			io.log(
				`stories ${ids.length} shot ${r.shot} errors ${r.errors.length} unstable ${r.unstable.length}` +
					(o.mid
						? ` mid ${r.mid.length} (at ${o.mid.atSpec}, clock +${o.mid.clockMs}ms)`
						: "") +
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
		case "compare": {
			const [before, after] = o.positionals;
			const report = summarizeAe(compareAeDirs(before, after, o.filter));
			writeReport(o.summary, report.lines);
			for (const l of report.failures) io.log(l);
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
