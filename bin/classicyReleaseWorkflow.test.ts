import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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

const PLATINUM_PKG = "packages/appearance/platinum/package.json";

describe("push.yml release workflow", () => {
	it("triggers on packages/** and still excludes stories", () => {
		const header = WORKFLOW.slice(0, WORKFLOW.indexOf("workflow_dispatch:"));
		expect(header).toMatch(/^ {6}- 'packages\/\*\*'$/m);
		expect(header).toMatch(/^ {6}- '!\*\*\/\*\.stories\.tsx'$/m);
	});

	it("syncs the Platinum package version after the bump, committing [skip ci]", () => {
		const bump = step(/^Bump version/);
		const sync = step(/Platinum.*version/i);
		expect(sync.index).toBeGreaterThan(bump.index);
		expect(sync.text).toContain(PLATINUM_PKG);
		expect(sync.text).toMatch(/pnpm pkg set version=|npm pkg set version=/);
		expect(sync.text).toContain("git add");
		expect(sync.text).toMatch(/git commit -m "[^"]*\[skip ci\]"/);
		expect(sync.text).toContain("git push");
		expect(sync.text).toContain("steps.bump_version.outputs.newTag != ''");
	});

	it("publishes both packages with pnpm, not JS-DevTools", () => {
		expect(WORKFLOW).not.toContain("JS-DevTools/npm-publish");
		const publish = step(/^Publish/);
		expect(publish.text).toContain(
			"pnpm publish --filter @classicy/classicy --filter @classicy/appearance-platinum --access public --no-git-checks",
		);
		// biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub expression, not a JS template
		expect(publish.text).toContain("NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}");
		expect(step(/^Setup Node/).text).toMatch(/registry-url:/);
	});

	it("waits for both packages, by the names in their package.json files", () => {
		const wait = step(/^Wait for the release/);
		expect(wait.text).toContain('require("./package.json").name');
		expect(wait.text).toContain(PLATINUM_PKG);
		expect(wait.text).toMatch(/for NAME in /);
		expect(wait.text).toContain('npm view "$NAME" dist-tags.latest');
	});

	it("dispatches downstream only after the wait step", () => {
		const wait = step(/^Wait for the release/);
		for (const s of steps.filter((x) =>
			/Trigger .* (deploy|bump)/.test(x.name),
		)) {
			expect(s.index).toBeGreaterThan(wait.index);
		}
		expect(steps.some((s) => /Trigger classicy-web/.test(s.name))).toBe(true);
		expect(steps.some((s) => /Trigger rt911/.test(s.name))).toBe(true);
	});

	it("never hard-codes the unscoped `classicy` as an npm package name", () => {
		expect(WORKFLOW).not.toMatch(/npm view "?classicy\b/);
		expect(WORKFLOW).not.toMatch(/--filter "?classicy\b/);
		expect(WORKFLOW).not.toMatch(/NAME="?classicy"?$/m);
		expect(WORKFLOW).not.toMatch(/(?<![@/\w-])classicy@\$/);
	});

	it("pins the major bump wording and offers an explicit version-type", () => {
		const bump = step(/^Bump version/);
		expect(bump.text).toMatch(/major-wording: 'BREAKING CHANGE,major'/);
		// biome-ignore lint/suspicious/noTemplateCurlyInString: a GitHub expression, not a JS template
		expect(bump.text).toContain("version-type: ${{ inputs.version-type }}");
		expect(WORKFLOW).toMatch(/inputs:\s*\n\s+version-type:/);
	});

	it("keeps today's single-package release working until the package exists", () => {
		for (const re of [/Platinum.*version/i, /^Publish to npm$/]) {
			expect(step(re).text).toContain(`hashFiles('${PLATINUM_PKG}')`);
		}
		// The wait loop guards inside its script instead.
		expect(step(/^Wait for the release/).text).toContain(
			"[ -f packages/appearance/platinum/package.json ]",
		);
		expect(step(/core only/).text).toContain(
			`hashFiles('${PLATINUM_PKG}') == ''`,
		);
	});
});
