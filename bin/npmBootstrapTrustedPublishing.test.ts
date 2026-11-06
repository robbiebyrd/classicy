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

const tmp = mkdtempSync(join(tmpdir(), "classicy-bootstrap-"));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));

interface Run {
	status: number | null;
	out: string;
	/** Each npm call as "<args>", publish calls with the placeholder's package.json. */
	calls: string[];
	placeholders: Record<string, Record<string, unknown>>;
}

/**
 * Runs the script with a fake npm. `npm view <name>` succeeds for names in
 * `existing`, fails with E404 for the rest, or with ECONNRESET for every name
 * when `viewFails`; `npm --version` prints `npmVersion`.
 */
const run = (
	args: string[],
	opts: { existing?: string[]; viewFails?: boolean; npmVersion?: string } = {},
): Run => {
	const dir = mkdtempSync(join(tmp, "case-"));
	const bin = join(dir, "bin");
	mkdirSync(bin);
	writeFileSync(join(dir, "existing"), `${(opts.existing ?? []).join("\n")}\n`);
	writeFileSync(
		join(bin, "npm"),
		`#!/bin/bash
if [ "$1" = --version ]; then echo "${opts.npmVersion ?? "11.19.1"}"; exit 0; fi
echo "$*" >> "${dir}/calls"
case "$1" in
  view)
    if [ "${opts.viewFails ? 1 : 0}" = 1 ]; then echo "npm error code ECONNRESET" >&2; exit 1; fi
    if grep -qxF -- "$2" "${dir}/existing"; then echo "$2"; exit 0; fi
    echo "npm error code E404" >&2; echo "npm error 404 Not Found - GET https://registry.npmjs.org/$2" >&2; exit 1 ;;
  publish)
    name=$(node -p 'require("./package.json").name')
    cp package.json "${dir}/placeholder-$(printf %s "$name" | tr -c "a-z0-9" _).json"
    [ -f README.md ] || { echo "no README" >&2; exit 1; } ;;
esac
exit 0
`,
	);
	chmodSync(join(bin, "npm"), 0o755);
	const r = spawnSync("bash", [SCRIPT, ...args], {
		cwd: dir,
		env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
		encoding: "utf8",
	});
	const callsFile = join(dir, "calls");
	const calls = existsSync(callsFile)
		? readFileSync(callsFile, "utf8").trimEnd().split("\n")
		: [];
	const placeholders: Run["placeholders"] = {};
	for (const name of ["@classicy/classicy", "@classicy/appearance-platinum"]) {
		const f = join(dir, `placeholder-${name.replace(/[^a-z0-9]/g, "_")}.json`);
		if (existsSync(f)) placeholders[name] = JSON.parse(readFileSync(f, "utf8"));
	}
	return { status: r.status, out: r.stdout + r.stderr, calls, placeholders };
};

const trustArgs = (name: string) =>
	`trust github ${name} --repo robbiebyrd/classicy --file push.yml --allow-publish`;

describe("bin/npm-bootstrap-trusted-publishing.sh", () => {
	it("is a dry run by default, for the core and Platinum, changing nothing", () => {
		const r = run([]);
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			"publish --access public --tag bootstrap --dry-run",
			`${trustArgs("@classicy/classicy")} --dry-run`,
			"view @classicy/appearance-platinum name",
			"publish --access public --tag bootstrap --dry-run",
			`${trustArgs("@classicy/appearance-platinum")} --dry-run`,
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
			expect.stringMatching(
				/^deprecate @classicy\/classicy@0\.0\.0 .*install @classicy\/classicy@3\.0\.0 or later/,
			),
			`${trustArgs("@classicy/classicy")} --yes`,
			"view @classicy/appearance-platinum name",
			"publish --access public --tag bootstrap",
			expect.stringMatching(
				/^deprecate @classicy\/appearance-platinum@0\.0\.0 .*install @classicy\/appearance-platinum@3\.0\.0 or later/,
			),
			`${trustArgs("@classicy/appearance-platinum")} --yes`,
		]);
		// The 2-day window is the owner's to keep: the script says so.
		expect(r.out).toMatch(/2 days/);
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
			expect(publishes).toHaveLength(2);
			for (const c of publishes) {
				expect(c).toContain("--tag bootstrap");
				expect(c).not.toMatch(/--tag latest/);
			}
			expect(r.calls.some((c) => c.startsWith("dist-tag"))).toBe(false);
			expect(r.out).toMatch(/`bootstrap` dist-tag/);
			expect(r.out).toMatch(/`latest` reads 0\.0\.0 until the 3\.0\.0 release/);
			expect(r.out).toMatch(/`latest` stays unset until/);
			expect(r.out).toContain("npm view <name> dist-tags");
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

	it("skips the placeholder for a name already on npm, and still adds the trusted publisher", () => {
		const r = run(["--publish", CORE], { existing: ["@classicy/classicy"] });
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toEqual([
			"view @classicy/classicy name",
			`${trustArgs("@classicy/classicy")} --yes`,
		]);
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
