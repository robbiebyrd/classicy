import { spawnSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

// Story 0156-tx7: npm adds a trusted publisher only to a package that already
// exists, so each new package is published once by hand, as a placeholder,
// before push.yml can publish it over OIDC. The script is run by the owner;
// these tests run it against a fake npm that records every call.
const ROOT = resolve(__dirname, "..");
const SCRIPT = join(ROOT, "bin/npm-bootstrap-trusted-publishing.sh");
const CORE = join(ROOT, "package.json");
const PLATINUM = join(ROOT, "packages/appearance/platinum/package.json");
const SYSTEM7 = join(ROOT, "packages/appearance/system7/package.json");

const tmp = mkdtempSync(join(tmpdir(), "classicy-bootstrap-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

interface Run {
	status: number | null;
	out: string;
	/** Each npm call as "<args>", publish calls with the placeholder's package.json. */
	calls: string[];
	placeholders: Record<string, Record<string, unknown>>;
	/** Each `sleep` the script ran, by its argument. */
	sleeps: string[];
}

/** A name as a file-name fragment. */
const slug = (name: string) => name.replace(/[^a-z0-9]/g, "_");

/** What `npm trust list <name> --json` prints for one configuration. */
const trustEntry = (
	over: Partial<{
		repository: string;
		file: string;
		environment: string;
		permissions: string[];
	}> = {},
) =>
	JSON.stringify(
		{
			id: "a1b2c3",
			type: "github",
			file: "push.yml",
			repository: "robbiebyrd/classicy",
			permissions: ["createPackage"],
			...over,
		},
		null,
		2,
	);

interface Registry {
	/** Names `npm view <name> name` finds; the rest are E404. */
	existing?: string[];
	/** Every `npm view` fails with ECONNRESET. */
	viewFails?: boolean;
	/** Per name: what `npm view <name>@0.0.0 deprecated` prints (absent: ""). */
	deprecated?: Record<string, string>;
	/** Existing names with no 0.0.0: `npm view <name>@0.0.0 …` is E404. */
	noPlaceholder?: string[];
	/** Per name: what `npm trust list <name> --json` prints (absent: nothing). */
	trustList?: Record<string, string>;
	/** `npm trust list` fails (not logged in, say). */
	trustListFails?: boolean;
	/**
	 * `npm trust list` asks for a one-time password, which npm can do only
	 * with its output on the terminal: `--json` (read by the script) is
	 * EOTP, the plain list (shown to the owner) prints `trustList`'s entry.
	 */
	trustListNeedsOtp?: boolean;
	/** `npm trust github` is refused (the package has a configuration). */
	trustAddFails?: boolean;
	npmVersion?: string;
	/**
	 * How many `npm view`s of a name it just published still 404 before the
	 * registry lists it (a new package is "processed" first); never, if null.
	 */
	lag?: number | null;
	/** Extra environment for the script. */
	env?: Record<string, string>;
}

/**
 * Runs the script with a fake npm that answers from `registry` and records
 * every call; `npm --version` prints `registry.npmVersion`.
 */
const run = (args: string[], opts: Registry = {}): Run => {
	const dir = mkdtempSync(join(tmp, "case-"));
	const bin = join(dir, "bin");
	mkdirSync(bin);
	writeFileSync(join(dir, "existing"), `${(opts.existing ?? []).join("\n")}\n`);
	writeFileSync(
		join(dir, "noplaceholder"),
		`${(opts.noPlaceholder ?? []).join("\n")}\n`,
	);
	for (const [name, text] of Object.entries(opts.deprecated ?? {}))
		writeFileSync(join(dir, `deprecated-${slug(name)}`), text);
	for (const [name, text] of Object.entries(opts.trustList ?? {}))
		writeFileSync(join(dir, `trust-${slug(name)}`), text);
	writeFileSync(
		join(bin, "npm"),
		`#!/bin/bash
if [ "$1" = --version ]; then echo "${opts.npmVersion ?? "11.19.1"}"; exit 0; fi
echo "$*" >> "${dir}/calls"
slug() { printf %s "$1" | tr -c "a-z0-9" _; }
case "$1" in
  view)
    if [ "${opts.viewFails ? 1 : 0}" = 1 ]; then echo "npm error code ECONNRESET" >&2; exit 1; fi
    name="\${2%@0.0.0}"
    lag="${dir}/lag-$(slug "$name")"
    if [ -f "$lag" ]; then
      left=$(cat "$lag")
      if [ "$left" = 0 ]; then rm "$lag"; echo "$name" >> "${dir}/existing"
      elif [ "$left" != never ]; then echo $((left - 1)) > "$lag"; fi
    fi
    if ! grep -qxF -- "$name" "${dir}/existing"; then
      echo "npm error code E404" >&2; echo "npm error 404 Not Found - GET https://registry.npmjs.org/$name" >&2; exit 1
    fi
    if [ "$name" = "$2" ]; then echo "$2"; exit 0; fi
    if grep -qxF -- "$name" "${dir}/noplaceholder"; then
      echo "npm error code E404" >&2; echo "npm error 404 No match found for version 0.0.0" >&2; exit 1
    fi
    cat "${dir}/deprecated-$(slug "$name")" 2>/dev/null; exit 0 ;;
  trust)
    if [ "$2" = list ]; then
      if [ "${opts.trustListFails ? 1 : 0}" = 1 ]; then echo "npm error code E401" >&2; exit 1; fi
      if [ "${opts.trustListNeedsOtp ? 1 : 0}" = 1 ] && [ "$4" = --json ]; then
        echo "npm error code EOTP" >&2; echo "npm error This operation requires a one-time password." >&2; exit 1
      fi
      cat "${dir}/trust-$(slug "$3")" 2>/dev/null; exit 0
    fi
    if [ "${opts.trustAddFails ? 1 : 0}" = 1 ]; then echo "npm error code E409" >&2; exit 1; fi ;;
  publish)
    name=$(node -p 'require("./package.json").name')
    cp package.json "${dir}/placeholder-$(printf %s "$name" | tr -c "a-z0-9" _).json"
    [ -f README.md ] || { echo "no README" >&2; exit 1; }
    case " $* " in *" --dry-run "*) ;; *) echo "${opts.lag === null ? "never" : (opts.lag ?? 0)}" > "${dir}/lag-$(slug "$name")" ;; esac ;;
esac
exit 0
`,
	);
	chmodSync(join(bin, "npm"), 0o755);
	// The wait between polls is recorded, not slept.
	writeFileSync(
		join(bin, "sleep"),
		`#!/bin/bash\necho "$*" >> "${dir}/sleeps"\n`,
	);
	chmodSync(join(bin, "sleep"), 0o755);
	const r = spawnSync("bash", [SCRIPT, ...args], {
		cwd: dir,
		env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ...opts.env },
		encoding: "utf8",
	});
	const callsFile = join(dir, "calls");
	const calls = existsSync(callsFile)
		? readFileSync(callsFile, "utf8").trimEnd().split("\n")
		: [];
	const placeholders: Run["placeholders"] = {};
	for (const name of [
		"@classicy/classicy",
		"@classicy/appearance-platinum",
		"@classicy/appearance-system7",
	]) {
		const f = join(dir, `placeholder-${slug(name)}.json`);
		if (existsSync(f)) placeholders[name] = JSON.parse(readFileSync(f, "utf8"));
	}
	const sleepsFile = join(dir, "sleeps");
	const sleeps = existsSync(sleepsFile)
		? readFileSync(sleepsFile, "utf8").trimEnd().split("\n")
		: [];
	return {
		status: r.status,
		out: r.stdout + r.stderr,
		calls,
		placeholders,
		sleeps,
	};
};

const trustArgs = (name: string) =>
	`trust github ${name} --repo robbiebyrd/classicy --file push.yml --allow-publish`;

describe("bin/npm-bootstrap-trusted-publishing.sh", () => {
	it("is a dry run by default, for the core, Platinum and System 7, changing nothing", () => {
		const r = run([]);
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"publish --access public --tag bootstrap --dry-run",
			`${trustArgs("@classicy/classicy")} --dry-run`,
			"view @classicy/appearance-platinum name",
			"publish --access public --tag bootstrap --dry-run",
			`${trustArgs("@classicy/appearance-platinum")} --dry-run`,
			"view @classicy/appearance-system7 name",
			"publish --access public --tag bootstrap --dry-run",
			`${trustArgs("@classicy/appearance-system7")} --dry-run`,
		]);
		expect(r.calls.some((c) => c.startsWith("deprecate"))).toBe(false);
		expect(r.out).toMatch(/dry run/i);
	});

	it("with --publish, publishes and deprecates each placeholder, then adds its trusted publisher", () => {
		const r = run(["--publish", CORE, PLATINUM]);
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"publish --access public --tag bootstrap",
			"view @classicy/classicy@0.0.0 version",
			expect.stringMatching(
				/^deprecate @classicy\/classicy@0\.0\.0 .*install @classicy\/classicy@3\.0\.0 or later/,
			),
			`${trustArgs("@classicy/classicy")} --yes`,
			"view @classicy/appearance-platinum name",
			"publish --access public --tag bootstrap",
			"view @classicy/appearance-platinum@0.0.0 version",
			expect.stringMatching(
				/^deprecate @classicy\/appearance-platinum@0\.0\.0 .*install @classicy\/appearance-platinum@3\.0\.0 or later/,
			),
			`${trustArgs("@classicy/appearance-platinum")} --yes`,
		]);
		// The 2-day window is the owner's to keep: the script says so.
		expect(r.out).toMatch(/2 days/);
		expect(r.sleeps).toEqual([]);
	});

	// A brand-new package is "processed" before the registry serves it, and
	// `npm deprecate` (and `npm trust`) on it until then is E404, as the
	// owner's first --publish run found.
	it("with --publish, waits for a just-published placeholder to be listed before deprecating it", () => {
		const r = run(["--publish", CORE], { lag: 3 });
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"publish --access public --tag bootstrap",
			"view @classicy/classicy@0.0.0 version",
			"view @classicy/classicy@0.0.0 version",
			"view @classicy/classicy@0.0.0 version",
			"view @classicy/classicy@0.0.0 version",
			expect.stringMatching(/^deprecate @classicy\/classicy@0\.0\.0 /),
			`${trustArgs("@classicy/classicy")} --yes`,
		]);
		expect(r.sleeps).toEqual(["15", "15", "15"]);
		expect(r.out).toMatch(
			/Waiting for the registry to list @classicy\/classicy@0\.0\.0/,
		);
	});

	it("with --publish, stops before deprecating when the placeholder is never listed, saying when to re-run", () => {
		const r = run(["--publish", CORE, PLATINUM], {
			lag: null,
			env: {
				CLASSICY_BOOTSTRAP_WAIT_SECONDS: "60",
				CLASSICY_BOOTSTRAP_POLL_SECONDS: "20",
			},
		});
		expect(r.status).toBe(1);
		expect(r.sleeps).toEqual(["20", "20", "20"]);
		expect(r.calls.some((c) => c.startsWith("deprecate"))).toBe(false);
		expect(r.calls.some((c) => c.startsWith("trust github"))).toBe(false);
		// Platinum is not started: a re-run picks the core up where it stopped.
		expect(r.calls.some((c) => c.includes("appearance-platinum"))).toBe(false);
		expect(r.out).toMatch(
			/@classicy\/classicy@0\.0\.0 is published but not listed after 60s; re-run this script once `npm view @classicy\/classicy version` shows it/,
		);
	});

	it.each([
		["CLASSICY_BOOTSTRAP_POLL_SECONDS", "0"],
		["CLASSICY_BOOTSTRAP_POLL_SECONDS", "1.5"],
		["CLASSICY_BOOTSTRAP_WAIT_SECONDS", "-1"],
		["CLASSICY_BOOTSTRAP_WAIT_SECONDS", "ten"],
	])("refuses %s=%s before calling npm", (key, value) => {
		const r = run(["--publish", CORE], { env: { [key]: value } });
		expect(r.status).toBe(1);
		expect(r.calls).toEqual([]);
		expect(r.out).toMatch(/must be a whole number/);
	});

	// The owner wants `latest` never to point at the placeholder. The CLI sends
	// only the tag it is given; npm's docs do not say whether the registry also
	// sets `latest` on a new package's first version, so the script says what
	// the owner will see either way.
	it("keeps the placeholder off `latest` and says what `latest` reads until the first release", () => {
		for (const args of [[], ["--publish"]]) {
			const r = run(args);
			expect(r.status, r.out).toBe(0);
			const publishes = r.calls.filter((c) => c.startsWith("publish"));
			expect(publishes).toHaveLength(3);
			for (const c of publishes) {
				expect(c).toContain("--tag bootstrap");
				expect(c).not.toMatch(/--tag latest/);
			}
			expect(r.calls.some((c) => c.startsWith("dist-tag"))).toBe(false);
			expect(r.out).toMatch(/`bootstrap` dist-tag/);
			expect(r.out).toMatch(
				/`latest` reads 0\.0\.0 until the 3\.0\.0 and 3\.2\.0 releases/,
			);
			expect(r.out).toMatch(/`latest` stays unset until/);
			expect(r.out).toContain("npm dist-tag ls <name>");
			// Once set, `latest` cannot be removed; the deprecation is the guard.
			expect(r.out).toMatch(/cannot be removed/);
			expect(r.out).toMatch(/deprecation is the guard/);
			expect(r.out).toMatch(/re-running it is safe/i);
		}
	});

	it("publishes a bare 0.0.0 placeholder carrying the package's repository and license", () => {
		const r = run([]);
		const core = JSON.parse(readFileSync(CORE, "utf8"));
		const placeholder = r.placeholders["@classicy/classicy"];
		expect(placeholder).toMatchObject({
			name: "@classicy/classicy",
			version: "0.0.0",
			repository: core.repository,
			license: core.license,
		});
		// Nothing that runs or installs anything.
		for (const key of [
			"scripts",
			"dependencies",
			"peerDependencies",
			"bin",
			"main",
		])
			expect(placeholder, key).not.toHaveProperty(key);
		expect(r.placeholders["@classicy/appearance-platinum"]).toMatchObject({
			name: "@classicy/appearance-platinum",
			version: "0.0.0",
		});
	});

	it("skips the placeholder for a name already on npm, and still deprecates and trusts it", () => {
		const r = run(["--publish", CORE], { existing: ["@classicy/classicy"] });
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"view @classicy/classicy@0.0.0 deprecated",
			expect.stringMatching(/^deprecate @classicy\/classicy@0\.0\.0 /),
			"trust list @classicy/classicy --json",
			`${trustArgs("@classicy/classicy")} --yes`,
		]);
	});

	// Review of fu/0156: the core done, then Platinum's publish failed (a
	// mistyped one-time password); the re-run must not die on the core.
	it("re-runs safely after a partial run: an already deprecated, already trusted package is left alone", () => {
		const r = run(["--publish"], {
			existing: ["@classicy/classicy"],
			deprecated: {
				"@classicy/classicy":
					"Placeholder with no code; install @classicy/classicy@3.0.0 or later.",
			},
			trustList: { "@classicy/classicy": trustEntry() },
		});
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"view @classicy/classicy@0.0.0 deprecated",
			"trust list @classicy/classicy --json",
			"view @classicy/appearance-platinum name",
			"publish --access public --tag bootstrap",
			"view @classicy/appearance-platinum@0.0.0 version",
			expect.stringMatching(
				/^deprecate @classicy\/appearance-platinum@0\.0\.0 /,
			),
			`${trustArgs("@classicy/appearance-platinum")} --yes`,
			"view @classicy/appearance-system7 name",
			"publish --access public --tag bootstrap",
			"view @classicy/appearance-system7@0.0.0 version",
			expect.stringMatching(
				/^deprecate @classicy\/appearance-system7@0\.0\.0 /,
			),
			`${trustArgs("@classicy/appearance-system7")} --yes`,
		]);
		expect(r.out).toMatch(/@classicy\/classicy@0\.0\.0 is already deprecated/);
		expect(r.out).toMatch(/@classicy\/classicy is already trusted/);
	});

	// Controller ruling (plan 0018-dbd, task 2.3): each package's deprecation
	// names its own first release. The core and Platinum shipped in 3.0.0, so
	// they exist on npm and are skipped; System 7 is new and first ships in 3.2.0.
	it("names each package's own first release: 3.0.0 for the core and Platinum, 3.2.0 for System 7", () => {
		const r = run(["--publish"], {
			existing: ["@classicy/classicy", "@classicy/appearance-platinum"],
			trustList: {
				"@classicy/classicy": trustEntry(),
				"@classicy/appearance-platinum": trustEntry(),
			},
		});
		expect(r.status, r.out).toBe(0);
		const deprecations = r.calls.filter((c) => c.startsWith("deprecate"));
		expect(deprecations).toEqual([
			expect.stringMatching(
				/^deprecate @classicy\/classicy@0\.0\.0 .*install @classicy\/classicy@3\.0\.0 or later/,
			),
			expect.stringMatching(
				/^deprecate @classicy\/appearance-platinum@0\.0\.0 .*install @classicy\/appearance-platinum@3\.0\.0 or later/,
			),
			expect.stringMatching(
				/^deprecate @classicy\/appearance-system7@0\.0\.0 .*install @classicy\/appearance-system7@3\.2\.0 or later/,
			),
		]);
		// System 7 alone: the closing notes name only its release.
		const alone = run(["--publish", SYSTEM7]);
		expect(alone.status, alone.out).toBe(0);
		expect(alone.out).toMatch(/until the 3\.2\.0 release/);
		expect(alone.out).not.toContain("3.0.0");
		expect(alone.placeholders["@classicy/appearance-system7"]).toMatchObject({
			name: "@classicy/appearance-system7",
			version: "0.0.0",
		});
	});

	// Review of fu/0156: a publish that went through with a failed deprecate
	// (its one-time password) is deprecated by the re-run.
	it("deprecates a placeholder left undeprecated by an earlier run", () => {
		const r = run(["--publish", CORE], {
			existing: ["@classicy/classicy"],
			trustList: { "@classicy/classicy": trustEntry() },
		});
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"view @classicy/classicy@0.0.0 deprecated",
			expect.stringMatching(
				/^deprecate @classicy\/classicy@0\.0\.0 .*install @classicy\/classicy@3\.0\.0 or later/,
			),
			"trust list @classicy/classicy --json",
		]);
	});

	it("does not deprecate an existing package that has no 0.0.0", () => {
		const r = run(["--publish", CORE], {
			existing: ["@classicy/classicy"],
			noPlaceholder: ["@classicy/classicy"],
		});
		expect(r.status, r.out).toBe(0);
		expect(r.calls.some((c) => c.startsWith("deprecate"))).toBe(false);
		expect(r.calls).toContain(`${trustArgs("@classicy/classicy")} --yes`);
	});

	it("in a dry run, reports an existing placeholder's deprecation and trust without changing them", () => {
		const r = run([], {
			existing: ["@classicy/classicy"],
			trustList: { "@classicy/classicy": trustEntry() },
		});
		expect(r.status, r.out).toBe(0);
		expect(r.calls.some((c) => c.startsWith("deprecate"))).toBe(false);
		expect(r.out).toContain(
			"Would run: npm deprecate @classicy/classicy@0.0.0",
		);
		expect(r.calls).not.toContain(
			`${trustArgs("@classicy/classicy")} --dry-run`,
		);
		expect(r.out).toMatch(/@classicy\/classicy is already trusted/);
	});

	it.each([
		["another repository", { repository: "someone/classicy" }],
		["another workflow", { file: "release.yml" }],
		["an environment", { environment: "npm" }],
		["stage publish only", { permissions: ["createStagedPackage"] }],
	])("stops, revoking nothing, when the package already trusts %s", (_, over) => {
		const r = run(["--publish"], {
			existing: ["@classicy/classicy"],
			deprecated: { "@classicy/classicy": "Placeholder" },
			trustList: { "@classicy/classicy": trustEntry(over) },
		});
		expect(r.status).toBe(1);
		expect(r.out).toMatch(
			/@classicy\/classicy already has a different trusted publisher/,
		);
		expect(r.calls.filter((c) => c.startsWith("trust"))).toEqual([
			"trust list @classicy/classicy --json",
		]);
		// Platinum is not reached.
		expect(r.calls.some((c) => c.includes("appearance-platinum"))).toBe(false);
	});

	it("finds the matching configuration among several", () => {
		const r = run(["--publish", CORE], {
			existing: ["@classicy/classicy"],
			deprecated: { "@classicy/classicy": "Placeholder" },
			trustList: {
				"@classicy/classicy": `\n${trustEntry({ file: "nightly.yml" })}\n\n${trustEntry()}\n`,
			},
		});
		expect(r.status, r.out).toBe(0);
		expect(r.out).toMatch(/@classicy\/classicy is already trusted/);
		expect(r.calls.some((c) => c.startsWith("trust github"))).toBe(false);
	});

	it("stops when it cannot list an existing package's trusted publishers, but a dry run goes on", () => {
		const publish = run(["--publish", CORE], {
			existing: ["@classicy/classicy"],
			deprecated: { "@classicy/classicy": "Placeholder" },
			trustListFails: true,
		});
		expect(publish.status).toBe(1);
		expect(publish.calls.some((c) => c.startsWith("trust github"))).toBe(false);
		const dry = run([CORE], {
			existing: ["@classicy/classicy"],
			trustListFails: true,
		});
		expect(dry.status, dry.out).toBe(0);
		expect(dry.calls).toContain(`${trustArgs("@classicy/classicy")} --dry-run`);
	});

	// The owner's second --publish run: the deprecation went through (npm
	// asked in the browser), then the captured `npm trust list --json` was
	// EOTP, since npm asks for a one-time password only on a terminal.
	it("adds push.yml's trusted publisher when npm needs a one-time password to read the list", () => {
		const r = run(["--publish", CORE], {
			existing: ["@classicy/classicy"],
			trustListNeedsOtp: true,
		});
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"view @classicy/classicy@0.0.0 deprecated",
			expect.stringMatching(/^deprecate @classicy\/classicy@0\.0\.0 /),
			"trust list @classicy/classicy --json",
			`${trustArgs("@classicy/classicy")} --yes`,
		]);
		expect(r.out).toMatch(
			/needs a one-time password to read @classicy\/classicy's trusted publishers/,
		);
	});

	it("when npm refuses that add, shows the list and stops, replacing nothing", () => {
		const r = run(["--publish", CORE, PLATINUM], {
			existing: ["@classicy/classicy"],
			deprecated: { "@classicy/classicy": "Placeholder" },
			trustListNeedsOtp: true,
			trustAddFails: true,
			trustList: { "@classicy/classicy": "push.yml (robbiebyrd/classicy)" },
		});
		expect(r.status).toBe(1);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"view @classicy/classicy@0.0.0 deprecated",
			"trust list @classicy/classicy --json",
			`${trustArgs("@classicy/classicy")} --yes`,
			"trust list @classicy/classicy",
		]);
		expect(r.calls.some((c) => c.includes("revoke"))).toBe(false);
		expect(r.out).toMatch(/push\.yml \(robbiebyrd\/classicy\)/);
		expect(r.out).toMatch(/re-run with the remaining package\.json files only/);
	});

	it("stops before publishing when npm view fails for any reason but a 404", () => {
		const r = run(["--publish"], { viewFails: true });
		expect(r.status).toBe(1);
		expect(r.calls).toEqual(["view @classicy/classicy name"]);
	});

	// `npm trust` arrived in npm 11.15.0 (npm help trust, "Prerequisites").
	it.each([
		["11.14.2", 1],
		["11.15.0", 0],
		["12.0.0", 0],
	])("with npm %s exits %i", (npmVersion, status) => {
		const r = run(["--publish"], { npmVersion });
		expect(r.status, r.out).toBe(status);
		if (status !== 0) {
			expect(r.out).toContain("11.15.0");
			expect(r.calls).toEqual([]);
		}
	});

	it("rejects an unknown option", () => {
		const r = run(["--publsh"]);
		expect(r.status).toBe(1);
		expect(r.calls).toEqual([]);
	});

	it("trusts the workflow that publishes, from the repository both packages name", () => {
		const script = readFileSync(SCRIPT, "utf8");
		const repo = /^REPOSITORY="([^"]+)"$/m.exec(script)?.[1];
		const workflow = /^WORKFLOW="([^"]+)"$/m.exec(script)?.[1];
		expect(repo).toBe("robbiebyrd/classicy");
		expect(workflow).toBe("push.yml");
		const yml = readFileSync(
			join(ROOT, ".github/workflows", workflow ?? ""),
			"utf8",
		);
		expect(yml).toMatch(/^ {6}id-token: write$/m);
		expect(yml).toContain("pnpm -r publish");
		for (const manifest of [CORE, PLATINUM]) {
			const { repository } = JSON.parse(readFileSync(manifest, "utf8"));
			expect(repository.url, manifest).toBe(`https://github.com/${repo}`);
		}
	});
});
