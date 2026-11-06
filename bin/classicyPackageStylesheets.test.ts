import { describe, expect, it } from "vitest";
import { classicyPackageStylesheetsPlugin } from "./classicyPackageStylesheets";
import { CLASSICY_LAYER_ORDER } from "./classicyStyleInjector";

// The strict-CSP stylesheets an Appearance Package's own build emits (plan
// 0015-kxa §3.4): dist/classicy-<name>.css from each `?inline` package
// stylesheet module, and dist/classicy-<id>.fonts.css from its font faces.

const PACKAGE =
	'@layer classicy.package{.classicyDesktop[data-classicy-appearance="x"] .a{color:red}}';
const FACES = [
	{
		family: "Geneva",
		file: "Geneva-normal-normal",
		weight: "normal",
		style: "normal",
	},
];
const STYLESHEET_MODULE = "/r/packages/appearance/x/src/styles/x.scss?inline";

type Emitted = { fileName: string; source: string };

/** Runs the plugin's generateBundle over a fake bundle and module graph. */
const run = (
	plugin: ReturnType<typeof classicyPackageStylesheetsPlugin>,
	{
		assets = [] as Array<{ fileName: string; originalFileNames: string[] }>,
		modules = {} as Record<string, string | null>,
	} = {},
) => {
	const emitted: Emitted[] = [];
	const errors: string[] = [];
	const bundle = Object.fromEntries(
		assets.map((asset) => [asset.fileName, { type: "asset", ...asset }]),
	);
	const context = {
		emitFile: (file: Emitted) => emitted.push(file),
		error: (message: string) => {
			errors.push(message);
			throw new Error(message);
		},
		getModuleIds: () => Object.keys(modules)[Symbol.iterator](),
		getModuleInfo: (id: string) => ({ code: modules[id] }),
	};
	const hook = plugin.generateBundle as unknown as (
		this: typeof context,
		options: unknown,
		bundle: unknown,
	) => void;
	try {
		hook.call(context, {}, bundle);
	} catch {
		// reported through `errors`
	}
	return { emitted, errors };
};

describe("classicyPackageStylesheetsPlugin", () => {
	const plugin = classicyPackageStylesheetsPlugin({
		packageId: "x",
		fonts: { faces: FACES, dir: "src/assets/fonts" },
	});

	it("emits the package stylesheet, the layer order first, and the fonts stylesheet", () =>
		expect(
			run(plugin, {
				assets: [
					{
						fileName: "assets/Geneva-normal-normal.woff2",
						originalFileNames: ["src/assets/fonts/Geneva-normal-normal.woff2"],
					},
				],
				modules: {
					[STYLESHEET_MODULE]: `export default ${JSON.stringify(PACKAGE)}`,
					"/r/packages/appearance/x/src/index.ts": "export {}",
				},
			}),
		).toEqual({
			emitted: [
				{
					type: "asset",
					fileName: "classicy-x.css",
					source: `${CLASSICY_LAYER_ORDER}\n${PACKAGE}`,
				},
				{
					type: "asset",
					fileName: "classicy-x.fonts.css",
					source:
						'@font-face{font-family:"Geneva";src:url("assets/Geneva-normal-normal.woff2") format("woff2");font-weight:normal;font-style:normal;font-display:swap}\n',
				},
			],
			errors: [],
		}));

	it("fails the build when a face's font was not emitted", () =>
		expect(run(plugin).errors).toEqual([
			'classicy-x.fonts.css: no emitted file for Geneva-normal-normal.woff2 ("Geneva" normal normal).',
		]));

	it("emits no fonts stylesheet for a package without fonts", () =>
		expect(
			run(classicyPackageStylesheetsPlugin({ packageId: "x" }), {
				modules: {
					[STYLESHEET_MODULE]: `export default ${JSON.stringify(PACKAGE)}`,
				},
			}).emitted.map((file) => file.fileName),
		).toEqual(["classicy-x.css"]));
});
