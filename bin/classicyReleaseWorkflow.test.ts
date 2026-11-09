import { spawn, spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// push.yml releases two packages in lockstep (plan 0015-kxa 4.1). `yaml` is
// not a direct dependency, so the workflow is read as text: the file is split
// into its steps (`      - name:` at the steps' indent), and each assertion
// looks at one step's text.
const WORKFLOW = readFileSync(
	resolve(__dirname, "../.github/workflows/push.yml"),
	"utf8",
);

interface Step {
	name: string;
	text: string;
	index: number;
}

const steps: Step[] = WORKFLOW.split(/^(?= {6}- name: )/m)
	.slice(1)
	.map((text, index) => ({
		name: /^ {6}- name: (.*)$/m.exec(text)?.[1].replace(/^'|'$/g, "") ?? "",
		text,
		index,
	}));

const step = (needle: RegExp): Step => {
	const found = steps.find((s) => needle.test(s.name));
	if (!found) throw new Error(`no step matches ${needle}`);
	return found;
};

const ifOf = (s: Step): string => /^ {8}if: (.*)$/m.exec(s.text)?.[1] ?? "";

/** A step's `run: |` script, dedented. */
const scriptOf = (s: Step): string => {
	const at = s.text.indexOf("        run: |\n");
	if (at < 0) throw new Error(`${s.name} has no run block`);
	return s.text
		.slice(at + "        run: |\n".length)
		.split("\n")
		.map((l) => l.replace(/^ {10}/, ""))
		.join("\n");
};

const PLATINUM_PKG = "packages/appearance/platinum/package.json";
const HAS_PLATINUM = `hashFiles('${PLATINUM_PKG}') != ''`;
const NO_PLATINUM = `hashFiles('${PLATINUM_PKG}') == ''`;
const NEW_TAG = "steps.bump_version.outputs.newTag != ''";

describe("push.yml release workflow", () => {
	it("triggers on packages/** and still excludes stories", () => {
		const header = WORKFLOW.slice(0, WORKFLOW.indexOf("workflow_dispatch:"));
		expect(header).toMatch(/^ {6}- 'packages\/\*\*'$/m);
		expect(header).toMatch(/^ {6}- '!\*\*\/\*\.stories\.tsx'$/m);
	});

	// Story 0141-6kd: the codename is committed before the tag, so the one
	// push (branch and tag together) is the last thing that touches the remote
	// before the release is created.
	it("runs the steps in order: bump, sync, codename, tag, release, publish, wait, dispatches", () => {
		const order = [
			/^Bump version/,
			/Sync the Platinum/,
			/^Check trusted publishing/,
			/^Select release codename/,
			/^Update release codename/,
			/^Push the release commit and tag/,
			/^Create GitHub Release/,
			/^Publish to npm$/,
			/^Wait for the release/,
			/^Trigger classicy-web/,
			/^Mint rt911/,
			/^Trigger rt911/,
		].map((re) => step(re).index);
		expect(order).toEqual([...order].sort((a, b) => a - b));
		expect(new Set(order).size).toBe(order.length);
	});

	// Story 0152-alb: FinderAboutThisComputer bakes package.json's version (and
	// its `release` codename) into the bundle at build time, so the published
	// dist/ must be built after every step that edits package.json.
	it("builds the published dist after the bump, sync and codename, before the push", () => {
		const build = step(/^Build Package/);
		for (const re of [
			/^Bump version/,
			/Sync the Platinum/,
			/^Select release codename/,
			/^Update release codename/,
		]) {
			expect(build.index, String(re)).toBeGreaterThan(step(re).index);
		}
		expect(build.index).toBeLessThan(
			step(/^Push the release commit and tag/).index,
		);
		expect(build.index).toBeLessThan(step(/^Publish to npm$/).index);
		expect(build.text).toContain("pnpm build");
		expect(ifOf(build)).toBe(NEW_TAG);
	});

	it("changes nothing the build reads between the build and the publish", () => {
		const build = step(/^Build Package/);
		const publish = step(/^Publish to npm$/);
		for (const s of steps.filter(
			(x) => x.index > build.index && x.index <= publish.index,
		)) {
			expect(s.text, s.name).not.toMatch(
				/pkg set|npm version|pnpm version|git (commit|checkout|reset|pull|rebase|merge)|pnpm (install|build)/,
			);
		}
	});

	it("pins the bump action to a full commit SHA, never a branch", () => {
		const bump = step(/^Bump version/);
		expect(bump.text).toMatch(
			/uses: phips28\/gh-action-bump-version@[0-9a-f]{40}\b/,
		);
		expect(WORKFLOW).not.toMatch(/gh-action-bump-version@master/);
	});

	it("bumps without tagging or pushing, so the tag can follow the sync", () => {
		const bump = step(/^Bump version/);
		expect(bump.text).toMatch(/skip-tag: 'true'/);
		expect(bump.text).toMatch(/skip-push: 'true'/);
	});

	it("matches only BREAKING CHANGE (never the bare word 'major') and takes version-type", () => {
		const bump = step(/^Bump version/);
		const wording = /major-wording: '([^']*)'/.exec(bump.text)?.[1] ?? "";
		expect(wording).toBe("BREAKING CHANGE");
		expect(wording.split(",")).not.toContain("major");
		// biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub expression, not a JS template
		expect(bump.text).toContain("version-type: ${{ inputs.version-type }}");
		expect(WORKFLOW).toMatch(/inputs:\s*\n\s+version-type:/);
	});

	it("does not cancel a release in flight", () => {
		expect(WORKFLOW).toMatch(/cancel-in-progress: false/);
		expect(WORKFLOW).not.toMatch(/cancel-in-progress: true/);
	});

	it("syncs the Platinum version into a commit before the tag, tolerant of no change", () => {
		const sync = step(/Sync the Platinum/);
		expect(sync.text).toContain(PLATINUM_PKG);
		expect(sync.text).toMatch(/pnpm pkg set version=|npm pkg set version=/);
		expect(sync.text).toContain("git add");
		expect(sync.text).toMatch(
			/git diff --cached --quiet \|\| git commit -m "[^"]*\[skip ci\]"/,
		);
		// Pushing and tagging belong to the next step: nothing leaves the
		// runner until both versions agree.
		expect(sync.text).not.toContain("git push");
		expect(sync.text).not.toContain("git tag");
		expect(ifOf(sync)).toContain(NEW_TAG);
		expect(ifOf(sync)).toContain(HAS_PLATINUM);
	});

	it("pushes once, branch and tag together, after the commits are made", () => {
		const tagStep = step(/^Push the release commit and tag/);
		const tag = scriptOf(tagStep);
		const mkTag = tag.indexOf('git tag "$TAG"');
		const push = tag.indexOf("git push --atomic origin HEAD:main");
		expect(mkTag).toBeGreaterThanOrEqual(0);
		expect(push).toBeGreaterThan(mkTag);
		expect(tag).toContain('"refs/tags/$TAG"');
		expect(tag.match(/git push/g)).toHaveLength(1);
		expect(tag).toContain("set -euo pipefail");
		expect(ifOf(tagStep)).toBe(NEW_TAG);
	});

	it("pushes nothing in any step after the one that tags", () => {
		const tagStep = step(/^Push the release commit and tag/);
		for (const s of steps.filter((x) => x.index > tagStep.index)) {
			expect(s.text, s.name).not.toMatch(/git push/);
		}
		// ... and nothing before it pushes either: one push for the release.
		for (const s of steps.filter((x) => x.index < tagStep.index)) {
			expect(s.text, s.name).not.toMatch(/git push/);
		}
	});

	it("never rebases onto a moved main without rebuilding (it fails instead)", () => {
		const tagStep = step(/^Push the release commit and tag/);
		const build = step(/^Build Package/);
		for (const s of steps) {
			if (!/git (pull|rebase|merge)/.test(s.text)) continue;
			// Any step that brings in upstream commits must be followed by a build.
			expect(
				steps.some((x) => x.index > s.index && /pnpm build/.test(x.text)),
				`${s.name} rebases but nothing rebuilds after it`,
			).toBe(true);
		}
		expect(tagStep.text).not.toMatch(/git (pull|rebase|merge)/);
		expect(build.index).toBeLessThan(tagStep.index);
	});

	it("commits the codename before the tag is created", () => {
		const codename = step(/^Update release codename/);
		const tagStep = step(/^Push the release commit and tag/);
		expect(codename.index).toBeLessThan(tagStep.index);
		expect(scriptOf(codename)).toContain("git commit");
		expect(scriptOf(codename)).not.toContain("git push");
	});

	it("publishes both packages recursively with pnpm, not JS-DevTools", () => {
		expect(WORKFLOW).not.toContain("JS-DevTools");
		const publish = step(/^Publish to npm$/);
		expect(publish.text).toContain(
			"pnpm -r publish --filter @classicy/classicy --filter @classicy/appearance-platinum --access public --no-git-checks",
		);
		expect(step(/^Setup Node/).text).toMatch(/registry-url:/);
	});

	// Story 0156-tx7: releases authenticate with npm trusted publishing. pnpm
	// 10 publishes through the npm CLI, which exchanges the job's OIDC token
	// first and falls back to the configured token only when the exchange is
	// refused, so a stored token could only ever be used by a release whose
	// trusted publisher is missing: never, since the check below stops it.
	it("authenticates every publish with OIDC only, never a stored token", () => {
		expect(WORKFLOW).toMatch(
			/^ {4}permissions:\n(?: {6}.*\n)*? {6}id-token: write$/m,
		);
		expect(WORKFLOW).not.toContain("NPM_TOKEN");
		for (const s of [
			step(/^Check trusted publishing/),
			step(/^Publish to npm$/),
			step(/core only/),
		]) {
			// Empty, not unset: setup-node's .npmrc reads ${NODE_AUTH_TOKEN}.
			expect(s.text, s.name).toMatch(/^ {10}NODE_AUTH_TOKEN: ''$/m);
		}
	});

	it("checks trusted publishing for every package before anything is pushed", () => {
		const check = step(/^Check trusted publishing/);
		expect(ifOf(check)).toBe(NEW_TAG);
		// After the sync, so both packages carry the version they will publish;
		// before the build, so a refusal costs seconds, not the build.
		expect(check.index).toBeGreaterThan(step(/Sync the Platinum/).index);
		expect(check.index).toBeLessThan(step(/^Build Package/).index);
		expect(check.index).toBeLessThan(
			step(/^Push the release commit and tag/).index,
		);
		const script = scriptOf(check);
		expect(script).toContain("set -euo pipefail");
		expect(script).toContain("npm publish --dry-run");
		// Every npm publish the check runs is a dry run (messages aside).
		const commands = script
			.split("\n")
			.filter((line) => !/^\s*echo /.test(line))
			.join("\n");
		expect(commands).toContain("npm publish --dry-run");
		expect(commands.match(/npm publish(?! --dry-run)/g)).toBeNull();
		expect(script).not.toMatch(/git (push|tag|commit)/);
	});

	// Story 0156-tx7: the first publish of each package is a placeholder under
	// the `bootstrap` dist-tag, so the release must claim `latest` itself.
	// pnpm 10's recursive publish passes `--tag latest` unless a tag is
	// configured, and nothing configures one.
	it("publishes the release as `latest`: no step or package sets another tag", () => {
		for (const s of [step(/^Publish to npm$/), step(/core only/)]) {
			expect(s.text, s.name).not.toMatch(
				/--tag\b|npm_config_tag|NPM_CONFIG_TAG/i,
			);
		}
		for (const manifest of ["package.json", PLATINUM_PKG]) {
			const pkg = JSON.parse(
				readFileSync(resolve(__dirname, "..", manifest), "utf8"),
			);
			expect(pkg.publishConfig?.tag, manifest).toBeUndefined();
		}
		expect(
			readFileSync(resolve(__dirname, "../pnpm-workspace.yaml"), "utf8"),
		).not.toMatch(/^\s*tag:/m);
		// The wait step then requires `latest` to be the new version.
		expect(scriptOf(step(/^Wait for the release/))).toContain(
			"dist-tags.latest",
		);
	});

	it("keeps the sync, publish and core-only guards mutually consistent", () => {
		const publish = ifOf(step(/^Publish to npm$/));
		const core = ifOf(step(/core only/));
		expect(publish).toContain(NEW_TAG);
		expect(publish).toContain(HAS_PLATINUM);
		expect(publish).not.toContain(NO_PLATINUM);
		expect(core).toContain(NEW_TAG);
		expect(core).toContain(NO_PLATINUM);
		expect(core).not.toContain(HAS_PLATINUM);
		// Same condition as the sync: Platinum is synced exactly when published.
		expect(ifOf(step(/Sync the Platinum/))).toContain(HAS_PLATINUM);
	});

	it("never hard-codes the unscoped `classicy` as an npm package name", () => {
		expect(WORKFLOW).not.toMatch(/npm view "?classicy\b/);
		expect(WORKFLOW).not.toMatch(/--filter "?classicy\b/);
		expect(WORKFLOW).not.toMatch(/NAME="?classicy"?$/m);
		// `(?:@)` keeps this line off the rename scan's leftover patterns
		// (ClassicyPackageExports.test.ts), which forbid the old name followed
		// by a literal "@" anywhere in the tree.
		expect(WORKFLOW).not.toMatch(/(?<![@/\w-])classicy(?:@)\$/);
	});

	it("dispatches downstream only after the wait step", () => {
		const wait = step(/^Wait for the release/);
		const dispatches = steps.filter((x) =>
			/Trigger .* (deploy|bump)/.test(x.name),
		);
		expect(dispatches.length).toBe(2);
		for (const s of dispatches) {
			expect(s.index).toBeGreaterThan(wait.index);
		}
	});
});

describe("push.yml wait loop, run against a fake npm", () => {
	const root = mkdtempSync(join(tmpdir(), "classicy-wait-"));
	afterAll(() => rmSync(root, { recursive: true, force: true }));
	const script = scriptOf(step(/^Wait for the release/));

	/**
	 * Runs the real script. The fake `npm view <name>` fails (a 404) until it
	 * has been asked `lagFor[name]` times, then prints `3.0.0`; `sleep` is a
	 * no-op.
	 */
	const run = (opts: {
		platinum: boolean;
		lagFor: Record<string, number>;
	}): { status: number | null; calls: string[]; out: string } => {
		const dir = mkdtempSync(join(root, "case-"));
		const bin = join(dir, "bin");
		mkdirSync(bin);
		writeFileSync(
			join(dir, "package.json"),
			JSON.stringify({ name: "@fake/core" }),
		);
		if (opts.platinum) {
			mkdirSync(join(dir, "packages/appearance/platinum"), { recursive: true });
			writeFileSync(
				join(dir, PLATINUM_PKG),
				JSON.stringify({ name: "@fake/platinum" }),
			);
		}
		writeFileSync(
			join(bin, "npm"),
			`#!/bin/bash
name="$2"
echo "$name" >> "${dir}/calls"
n=$(grep -cx -- "$name" "${dir}/calls")
lag=$(cat "${dir}/lag-$(printf %s "$name" | tr -c "a-z0-9" _)" 2>/dev/null || echo 0)
if [ "$n" -gt "$lag" ]; then echo 3.0.0; else exit 1; fi
`,
		);
		for (const [name, lag] of Object.entries(opts.lagFor)) {
			writeFileSync(
				join(dir, `lag-${name.replace(/[^a-z0-9]/g, "_")}`),
				String(lag),
			);
		}
		writeFileSync(join(bin, "sleep"), "#!/bin/bash\nexit 0\n");
		chmodSync(join(bin, "npm"), 0o755);
		chmodSync(join(bin, "sleep"), 0o755);
		const r = spawnSync("bash", ["-c", script], {
			cwd: dir,
			env: {
				...process.env,
				PATH: `${bin}:${process.env.PATH}`,
				TAG: "v3.0.0",
			},
			encoding: "utf8",
		});
		let calls: string[] = [];
		try {
			calls = readFileSync(join(dir, "calls"), "utf8").trim().split("\n");
		} catch {
			// no calls made
		}
		return { status: r.status, calls, out: r.stdout + r.stderr };
	};

	it("waits through a 404 for each package, then succeeds", () => {
		const r = run({
			platinum: true,
			lagFor: { "@fake/core": 1, "@fake/platinum": 2 },
		});
		expect(r.status).toBe(0);
		expect(r.calls.filter((c) => c === "@fake/core")).toHaveLength(2);
		expect(r.calls.filter((c) => c === "@fake/platinum")).toHaveLength(3);
	});

	it("fails when only the core lists, so nothing is dispatched", () => {
		const r = run({
			platinum: true,
			lagFor: { "@fake/core": 0, "@fake/platinum": 1000 },
		});
		expect(r.status).toBe(1);
		expect(r.out).toContain(
			"@fake/platinum@3.0.0 was not listed as latest on npm within 45 minutes",
		);
		expect(r.calls.filter((c) => c === "@fake/platinum")).toHaveLength(90);
	});

	// npm listed @classicy/classicy 3.0.0 on attempt 52 and 3.1.0 on attempt 51
	// of the old 60 (30 minutes): the wait now runs 90 polls, 45 minutes.
	it("waits up to 45 minutes for a package npm is slow to list", () => {
		const r = run({
			platinum: true,
			lagFor: { "@fake/core": 85, "@fake/platinum": 0 },
		});
		expect(r.status, r.out).toBe(0);
		expect(r.out).toContain("@fake/core@3.0.0 is live on npm (attempt 86).");
		expect(r.out).toContain("attempt 85/90");
	});

	it("checks only the core before the Platinum package exists", () => {
		const r = run({ platinum: false, lagFor: {} });
		expect(r.status).toBe(0);
		expect(new Set(r.calls)).toEqual(new Set(["@fake/core"]));
	});
});

describe("push.yml push step, run against a fake git", () => {
	const root = mkdtempSync(join(tmpdir(), "classicy-push-"));
	afterAll(() => rmSync(root, { recursive: true, force: true }));
	const script = scriptOf(step(/^Push the release commit and tag/));

	const run = (
		rejectPush: boolean,
	): { status: number | null; calls: string[]; out: string } => {
		const dir = mkdtempSync(join(root, "case-"));
		const bin = join(dir, "bin");
		mkdirSync(bin);
		writeFileSync(
			join(bin, "git"),
			`#!/bin/bash
echo "$*" >> "${dir}/calls"
if [ "$1" = push ] && [ "${rejectPush ? "1" : "0"}" = 1 ]; then exit 1; fi
exit 0
`,
		);
		chmodSync(join(bin, "git"), 0o755);
		const r = spawnSync("bash", ["-c", script], {
			cwd: dir,
			env: {
				...process.env,
				PATH: `${bin}:${process.env.PATH}`,
				TAG: "v3.0.0",
			},
			encoding: "utf8",
		});
		const calls = readFileSync(join(dir, "calls"), "utf8").trim().split("\n");
		return { status: r.status, calls, out: r.stdout + r.stderr };
	};

	it("tags, then pushes branch and tag in one atomic push", () => {
		const r = run(false);
		expect(r.status).toBe(0);
		expect(r.calls).toEqual([
			"tag v3.0.0",
			"push --atomic origin HEAD:main refs/tags/v3.0.0",
		]);
	});

	it("fails on a rejected push without pulling, rebasing or retrying", () => {
		const r = run(true);
		expect(r.status).toBe(1);
		expect(r.out).toContain("re-run");
		expect(r.calls.filter((c) => c.startsWith("push"))).toHaveLength(1);
		expect(r.calls.some((c) => /pull|rebase|merge/.test(c))).toBe(false);
	});
});

/** A workspace laid out like the repo: the core at the root, Platinum below. */
const makeWorkspace = (root: string, platinum: boolean): string => {
	const dir = mkdtempSync(join(root, "case-"));
	writeFileSync(
		join(dir, "package.json"),
		JSON.stringify({ name: "@fake/core", version: "3.0.0" }),
	);
	if (platinum) {
		mkdirSync(join(dir, "packages/appearance/platinum"), { recursive: true });
		writeFileSync(
			join(dir, PLATINUM_PKG),
			JSON.stringify({ name: "@fake/platinum", version: "3.0.0" }),
		);
	}
	return dir;
};

describe("push.yml trusted-publishing check, run against a fake npm", () => {
	const root = mkdtempSync(join(tmpdir(), "classicy-trust-"));
	afterAll(() => rmSync(root, { recursive: true, force: true }));
	// Read per test, so a missing step fails each test, not the file.
	const script = () => scriptOf(step(/^Check trusted publishing/));

	/**
	 * Runs the real script. The fake `npm --version` prints `npmVersion`; the
	 * fake `npm publish --dry-run` logs what npm 11 logs at verbose level: a
	 * successful OIDC exchange for the packages in `trusted`, a refused one
	 * (and the dry run's "requires you to be logged in" warning, exit 0, as
	 * npm does) for the others.
	 */
	const run = (opts: {
		platinum: boolean;
		trusted: string[];
		npmVersion?: string;
	}): { status: number | null; calls: string[]; out: string } => {
		const dir = makeWorkspace(root, opts.platinum);
		const bin = join(dir, "bin");
		mkdirSync(bin);
		writeFileSync(join(dir, "trusted"), `${opts.trusted.join("\n")}\n`);
		writeFileSync(
			join(bin, "npm"),
			`#!/bin/bash
if [ "$1" = --version ]; then echo "${opts.npmVersion ?? "11.19.1"}"; exit 0; fi
echo "\${PWD#${dir}} $*" >> "${dir}/calls"
name=$(node -p 'require("./package.json").name')
if grep -qxF -- "$name" "${dir}/trusted"; then
  echo "npm verbose oidc Successfully retrieved and set token" >&2
else
  echo "npm verbose oidc Failed token exchange request with body message: no trust" >&2
  echo "npm warn publish This command requires you to be logged in (dry-run)" >&2
fi
exit 0
`,
		);
		chmodSync(join(bin, "npm"), 0o755);
		const r = spawnSync("bash", ["-c", script()], {
			cwd: dir,
			env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
			encoding: "utf8",
		});
		let calls: string[] = [];
		try {
			// trimEnd: the root's call starts with a space (an empty folder).
			calls = readFileSync(join(dir, "calls"), "utf8").trimEnd().split("\n");
		} catch {
			// npm publish was never run
		}
		return { status: r.status, calls, out: r.stdout + r.stderr };
	};

	const both = ["@fake/core", "@fake/platinum"];

	it("passes when both packages exchange their OIDC token, dry-running each in its own folder", () => {
		const r = run({ platinum: true, trusted: both });
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toHaveLength(2);
		expect(r.calls[0]).toMatch(/^ publish --dry-run /);
		expect(r.calls[1]).toMatch(
			/^\/packages\/appearance\/platinum publish --dry-run /,
		);
		for (const c of r.calls) expect(c).toContain("--ignore-scripts");
	});

	it("fails, naming the package, when one package has no trusted publisher", () => {
		const r = run({ platinum: true, trusted: ["@fake/core"] });
		expect(r.status).toBe(1);
		expect(r.out).toContain("@fake/platinum");
		expect(r.out).toContain("no trust");
		expect(r.out).toMatch(/Nothing was pushed/);
		expect(r.out).not.toMatch(/::error::[^\n]*@fake\/core\b/);
	});

	it("checks every package before failing, so one run names them all", () => {
		const r = run({ platinum: true, trusted: [] });
		expect(r.status).toBe(1);
		expect(r.calls).toHaveLength(2);
		expect(r.out).toMatch(/::error::[^\n]*@fake\/core\b/);
		expect(r.out).toMatch(/::error::[^\n]*@fake\/platinum\b/);
	});

	it("checks only the core before the Platinum package exists", () => {
		const r = run({ platinum: false, trusted: ["@fake/core"] });
		expect(r.status, r.out).toBe(0);
		expect(r.calls).toHaveLength(1);
	});

	// npm 11.5.1 is the first CLI that exchanges the token (docs.npmjs.com,
	// "Trusted publishing"); pnpm 10 publishes through whatever npm is on PATH.
	it.each([
		["10.9.4", 1],
		["11.4.2", 1],
		["11.5.0", 1],
		["11.5.1", 0],
		["11.10.0", 0],
		["12.0.0", 0],
	])("with npm %s exits %i", (npmVersion, status) => {
		const r = run({ platinum: true, trusted: both, npmVersion });
		expect(r.status, r.out).toBe(status);
		if (status !== 0) {
			expect(r.out).toContain(`npm ${npmVersion}`);
			expect(r.out).toContain("11.5.1");
			expect(r.calls).toEqual([]);
		}
	});
});

const npmSupportsOidc = (() => {
	const v = spawnSync("npm", ["--version"], { encoding: "utf8" }).stdout;
	const [major, minor, patch] = v.trim().split(".").map(Number);
	return (
		major > 11 || (major === 11 && (minor > 5 || (minor === 5 && patch >= 1)))
	);
})();

// The fake npm above only proves the script's logic. This runs the real npm
// CLI, as the runner does, against a fake GitHub id-token endpoint and a fake
// registry, so the line the check looks for is the one npm really logs.
describe.skipIf(!npmSupportsOidc)(
	"push.yml trusted-publishing check, run against the real npm and a fake registry",
	() => {
		const root = mkdtempSync(join(tmpdir(), "classicy-trust-npm-"));
		// Read per test, so a missing step fails each test, not the file.
		const script = () => scriptOf(step(/^Check trusted publishing/));
		const requests: string[] = [];
		let trusted = new Set<string>();
		let server: Server;
		let port = 0;

		// The id token's payload says the repository is private, so npm skips
		// its provenance lookup and the fake needs no visibility endpoint.
		const idToken = `e30.${Buffer.from('{"repository_visibility":"private"}').toString("base64url")}.sig`;

		beforeAll(async () => {
			server = createServer((req, res) => {
				requests.push(`${req.method} ${req.url}`);
				const send = (code: number, body: object) => {
					res.writeHead(code, { "content-type": "application/json" });
					res.end(JSON.stringify(body));
				};
				req.resume();
				req.on("end", () => {
					if (req.url?.startsWith("/idtoken"))
						return send(200, { value: idToken });
					const m = /^\/-\/npm\/v1\/oidc\/token\/exchange\/package\/(.+)$/.exec(
						req.url ?? "",
					);
					if (m && req.method === "POST") {
						const name = decodeURIComponent(m[1]);
						return trusted.has(name)
							? send(201, { token: "short-lived" })
							: send(404, { message: `no trusted publisher for ${name}` });
					}
					return send(404, { error: "Not found" });
				});
			});
			await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
			port = (server.address() as AddressInfo).port;
		});
		afterAll(async () => {
			await new Promise((done) => server.close(done));
			rmSync(root, { recursive: true, force: true });
		});

		const run = async (
			names: string[],
		): Promise<{ status: number | null; out: string }> => {
			trusted = new Set(names);
			requests.length = 0;
			const dir = makeWorkspace(root, true);
			// What setup-node writes for registry-url, pointed at the fake.
			const npmrc = join(dir, "user.npmrc");
			writeFileSync(
				npmrc,
				`//127.0.0.1:${port}/:_authToken=\${NODE_AUTH_TOKEN}\nregistry=http://127.0.0.1:${port}/\n`,
			);
			const env: NodeJS.ProcessEnv = { ...process.env };
			for (const key of Object.keys(env)) {
				if (/^(npm_|NPM_|ACTIONS_|GITHUB_|GITLAB|CIRCLE)/i.test(key))
					delete env[key];
			}
			Object.assign(env, {
				GITHUB_ACTIONS: "true",
				ACTIONS_ID_TOKEN_REQUEST_URL: `http://127.0.0.1:${port}/idtoken?api-version=2.0`,
				ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
				NPM_CONFIG_USERCONFIG: npmrc,
				npm_config_cache: join(dir, "npm-cache"),
				NODE_AUTH_TOKEN: "",
			});
			return new Promise((done) => {
				const child = spawn("bash", ["-c", script()], { cwd: dir, env });
				let out = "";
				child.stdout.on("data", (d) => (out += d));
				child.stderr.on("data", (d) => (out += d));
				child.on("close", (status) => done({ status, out }));
			});
		};

		it("passes when the registry exchanges both packages' tokens", async () => {
			const r = await run(["@fake/core", "@fake/platinum"]);
			expect(r.status, r.out).toBe(0);
			expect(requests).toContain(
				"POST /-/npm/v1/oidc/token/exchange/package/@fake%2fcore",
			);
			expect(requests).toContain(
				"POST /-/npm/v1/oidc/token/exchange/package/@fake%2fplatinum",
			);
			// A dry run uploads nothing.
			expect(requests.some((r) => r.startsWith("PUT"))).toBe(false);
		}, 60_000);

		it("fails when the registry refuses one package's exchange", async () => {
			const r = await run(["@fake/core"]);
			expect(r.status).toBe(1);
			expect(r.out).toContain("no trusted publisher for @fake/platinum");
		}, 60_000);
	},
);
