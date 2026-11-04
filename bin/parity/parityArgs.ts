// Command-line parsing for bin/parity/parity.ts. Pure: the caller passes the
// argv and the environment, so the defaults are testable.
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import {
	midClockMs,
	PARITY_MID_DEFAULT_AT,
	type ParityMidAt,
	parseMidAt,
} from "./parityMidTime.ts";

export const PARITY_COMMANDS = [
	"help",
	"stories",
	"shoot",
	"app",
	"probe",
	"dump",
	"forced",
	"compare",
] as const;
export type ParityCommand = (typeof PARITY_COMMANDS)[number];

/** What `compare` compares: screenshots by AE, computed dumps or forced dumps. */
export type ParityCompareKind = "ae" | "computed" | "forced";
export type ParityBrowserKind = "chromium" | "firefox";

/** shoot's mid-time shots (`<id>@mid.png`), on when any mid flag is given. */
export type ParityMidOptions = {
	at: ParityMidAt;
	/** `--at` as typed, for the report. */
	atSpec: string;
	/** How far the JS clock (the fixed Date) moves before the shot. */
	clockMs: number;
	/** Skip the t=0 shots. */
	only: boolean;
	/** Story ids that always get a mid shot, beside the auto-detected ones. */
	stories?: string;
};

export type ParityOptions = {
	command: ParityCommand;
	positionals: string[];
	/** Output directory (shoot, app, dump, forced) or file (stories). */
	out?: string;
	/** Server origin, no trailing slash: `--base-url`, else built from the port. */
	baseUrl: string;
	/** Applied to story ids (shoot, dump, probe, stories), shot names (app),
	 * state names (forced) and file names (compare). */
	filter?: RegExp;
	/** A story-id list, one per line, instead of the server's index.json. */
	stories?: string;
	workers: number;
	/** compare: also write the full report here. probe: write the report here. */
	summary?: string;
	kind: ParityCompareKind;
	browser: ParityBrowserKind;
	/** The checkout the server serves; its path is normalized out of dumps. */
	repo: string;
	mid?: ParityMidOptions;
};

const WRITERS: readonly ParityCommand[] = ["shoot", "app", "dump", "forced"];

const regex = (flag: string, source: string | undefined) => {
	if (source === undefined || source === "") return undefined;
	try {
		return new RegExp(source);
	} catch (e) {
		throw new Error(`${flag}: invalid regular expression: ${String(e)}`);
	}
};

const oneOf = <T extends string>(
	flag: string,
	value: string | undefined,
	allowed: readonly T[],
	fallback: T,
): T => {
	if (value === undefined) return fallback;
	if ((allowed as readonly string[]).includes(value)) return value as T;
	throw new Error(
		`${flag} must be one of ${allowed.join(", ")} (got ${value})`,
	);
};

export function parseParityArgs(
	argv: readonly string[],
	env: Readonly<Record<string, string | undefined>>,
): ParityOptions {
	const { values, positionals } = parseArgs({
		args: [...argv],
		allowPositionals: true,
		strict: true,
		options: {
			out: { type: "string" },
			port: { type: "string" },
			"base-url": { type: "string" },
			filter: { type: "string" },
			stories: { type: "string" },
			workers: { type: "string" },
			summary: { type: "string" },
			kind: { type: "string" },
			browser: { type: "string" },
			repo: { type: "string" },
			mid: { type: "boolean" },
			"mid-only": { type: "boolean" },
			at: { type: "string" },
			"mid-stories": { type: "string" },
			"mid-clock": { type: "string" },
			help: { type: "boolean", short: "h" },
		},
	});
	const [name = "help", ...rest] = values.help ? ["help"] : positionals;
	if (!(PARITY_COMMANDS as readonly string[]).includes(name))
		throw new Error(`unknown command: ${name} (try: parity help)`);
	const command = name as ParityCommand;

	if (WRITERS.includes(command) && !values.out)
		throw new Error(`${command} needs --out <dir>`);
	if (command === "compare" && rest.length !== 2)
		throw new Error("compare needs <beforeDir> <afterDir>");

	const workers = Number(values.workers ?? 4);
	if (!Number.isInteger(workers) || workers < 1)
		throw new Error(
			`--workers must be a positive integer (got ${values.workers})`,
		);

	const midAsked =
		values.mid ||
		values["mid-only"] ||
		values.at !== undefined ||
		values["mid-stories"] !== undefined ||
		values["mid-clock"] !== undefined;
	if (midAsked && command !== "shoot")
		throw new Error(
			"--mid, --mid-only, --at, --mid-stories and --mid-clock belong to shoot",
		);
	let mid: ParityMidOptions | undefined;
	if (midAsked) {
		const atSpec = values.at ?? PARITY_MID_DEFAULT_AT;
		const at = parseMidAt(atSpec);
		const clock = values["mid-clock"];
		if (clock !== undefined && !/^\d+$/.test(clock))
			throw new Error(
				`--mid-clock must be a whole number of ms, 0 or more (got ${clock})`,
			);
		mid = {
			at,
			atSpec,
			clockMs: midClockMs(at, clock === undefined ? undefined : Number(clock)),
			only: values["mid-only"] === true,
			stories: values["mid-stories"],
		};
	}

	const app = command === "app";
	const port =
		values.port ??
		(app ? (env.EXAMPLE_PORT ?? "5173") : (env.SB_PORT ?? "6006"));
	const baseUrl = (
		values["base-url"] ?? `http://${app ? "127.0.0.1" : "localhost"}:${port}`
	).replace(/\/+$/, "");

	return {
		command,
		positionals: rest,
		out: values.out,
		baseUrl,
		filter: regex("--filter", values.filter),
		stories: values.stories,
		workers,
		summary: values.summary,
		kind: oneOf("--kind", values.kind, ["ae", "computed", "forced"], "ae"),
		browser: oneOf(
			"--browser",
			values.browser,
			["chromium", "firefox"],
			"chromium",
		),
		repo: resolve(values.repo ?? process.cwd()),
		mid,
	};
}
