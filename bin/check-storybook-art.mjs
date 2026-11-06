// verify:storybook (run after `storybook build`): every .svg/.png under an
// Appearance Package's assets that the static Storybook emitted is
// byte-identical to its source. Fails when the image plugin rewrote any.
import { readdir, readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { findAlteredStorybookArt } from "./classicyStorybookArt.ts";

const STATIC = join("storybook", "storybook-static");
const ROOTS = ["src/Appearance", "packages/appearance"];
const ART = /\.(?:svg|png)$/;

const walk = async (dir) => {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true }).catch(
		() => [],
	)) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "node_modules") out.push(...(await walk(path)));
		} else out.push(path);
	}
	return out;
};

const load = async (paths) =>
	Promise.all(
		paths.map(async (p) => ({ name: basename(p), bytes: await readFile(p) })),
	);

const sourcePaths = (await Promise.all(ROOTS.map(walk)))
	.flat()
	.filter((p) => /[\\/]assets[\\/]/.test(p) && ART.test(p));
const emittedPaths = (await walk(STATIC)).filter((p) => ART.test(p));

const { altered, checked } = findAlteredStorybookArt(
	await load(sourcePaths),
	await load(emittedPaths),
);

if (!checked.length) {
	console.error(
		`${STATIC}: no package art found to compare -> run \`pnpm build:storybook\` first.`,
	);
	process.exit(1);
}
if (altered.length) {
	console.error(
		`${STATIC}: ${altered.length} package art file(s) differ from their source (${altered.join(", ")}) -> check \`excludes\` on VitePluginImageTools in storybook/.storybook/main.ts.`,
	);
	process.exit(1);
}
console.log(
	`${STATIC}: ${checked.length} package art file(s) byte-identical to their source`,
);
