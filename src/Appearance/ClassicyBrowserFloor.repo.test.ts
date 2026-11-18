import { globSync } from "node:fs";
import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import { findClassicyCssFloorProblems } from "../../bin/classicyCssFloor";

/**
 * The browser floor (README: Chrome 120, Safari 16.2, Firefox 113) for CSS
 * math: every compiled stylesheet in the repo (the core's component sheets,
 * each workspace Appearance Package's stylesheet and Storybook's mirrored
 * package) gives each declaration calling a function newer than the floor,
 * such as `round()`, a fallback the floor parses
 * (bin/classicyCssFloor.ts). verify:dist checks the shipped stylesheets the
 * same way.
 */

// Compiling every sheet takes a few seconds alone; sized for a loaded
// machine, like the cascade scan.
const SCAN_TIMEOUT_MS = 60_000;

const root = process.cwd();
const sheets = [
	...globSync("src/**/*.scss").filter(
		(f) =>
			!f.split(path.sep).includes("Appearance") &&
			!path.basename(f).startsWith("_"),
	),
	...globSync("packages/appearance/*/src/styles/*.scss").filter(
		(f) => !path.basename(f).startsWith("_"),
	),
	"storybook/.storybook/mirrored.scss",
]
	.map((f) => f.split(path.sep).join("/"))
	.sort();

describe("the browser floor's CSS math", () => {
	it("covers the core's sheets and every package's", () => {
		expect(sheets).toContain(
			"src/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
		);
		expect(sheets).toContain(
			"packages/appearance/platinum/src/styles/platinum.scss",
		);
		expect(sheets).toContain(
			"packages/appearance/system7/src/styles/system7.scss",
		);
	});

	it(
		"every declaration calling a newer function has a fallback",
		() => {
			const problems = sheets.flatMap((file) =>
				findClassicyCssFloorProblems(
					file,
					sass.compile(path.resolve(root, file), {
						style: "expanded",
						loadPaths: [path.resolve(root, "src")],
						importers: [new sass.NodePackageImporter()],
					}).css,
				),
			);
			expect(problems).toEqual([]);
		},
		SCAN_TIMEOUT_MS,
	);
});
