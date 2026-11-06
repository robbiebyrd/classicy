import { spawnSync } from "node:child_process";
import {
	chmodSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

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
		// biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub expression, not a JS template
		expect(publish.text).toContain("NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}");
		expect(step(/^Setup Node/).text).toMatch(/registry-url:/);
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
		expect(r.out).toContain("@fake/platinum@3.0.0 was not listed");
		expect(r.calls.filter((c) => c === "@fake/platinum")).toHaveLength(60);
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
