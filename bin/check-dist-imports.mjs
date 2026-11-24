#!/usr/bin/env node
// Nineteen invariants on the core's *published* bundle (and, for invariant 11,
// on the sources it is built from), numbered 1-20: number 12 moved to the
// Platinum package's own dist check, packages/appearance/platinum/bin/
// verify-dist.mjs (plan 0015-kxa §3.4). The first two have shipped
// broken, and no other signal catches any of them. `vite build` in a consumer app
// succeeds either way, and jsdom tests never load our own dist -- these only
// surfaced as production outages.
//
// 1. NO IMPORT SPECIFIER MAY CARRY A VITE QUERY (`?url`, `?raw`, `?worker`).
//    Those queries are a Vite *source* convention, meaningful only while a file
//    is being transformed by vite:asset. A consumer resolving our dist gets a
//    specifier that names no real module. This leaks whenever a
//    rollupOptions.external predicate matches an asset import -- see isExternal
//    in vite.config.ts. Shipped in 0.70.0: rt911's dev server refused to boot
//    (rolldown: "No such file or directory") and its vitest failed to collect
//    62 suites ("does not provide an export named 'default'").
//
// 2. pdfjs-dist AND fflate MUST NOT BE EXTERNAL. The PDF viewer embeds *this
//    repo's* pdf.worker in dist (deflated since plan 0019-fb7, invariant 17;
//    a `?url` data: URI before). pdf.js refuses to run when the worker and API
//    disagree on version, so externalizing the library lets the consumer
//    supply a different API and the two drift. Shipped in 0.70.0-0.70.2:
//    classicy inlined the 6.1.200 worker while rt911 resolved the 6.2.108
//    API, and every PDF failed with "Couldn't load this PDF." -- caught and
//    rendered as UI text, so no console error and no failing test anywhere.
//    fflate, which inflates the worker, is a devDependency: a host has no copy
//    to import.
//
// 3. EACH ENTRY BUNDLE MUST INJECT THE STYLESHEET (#303), and carry no inlined
//    fonts. `import "@classicy/classicy"` is supposed to be enough for the
//    structure stylesheet; if injectCssPlugin stopped matching the CSS asset
//    (it is found by name), the bundles would silently ship unstyled. Fonts
//    belong to an Appearance Package (Platinum's are files in its own dist);
//    a base64 font in the core's bundle means one was pulled in and inlined
//    (every consumer pays for every font).
//
// 4. dist/fonts.js MUST STAY A SELF-CONTAINED NO-OP. `import
//    "@classicy/classicy/fonts"` is the deprecated opt-in from before the
//    fonts became files; existing consumers still import it, so it has to keep
//    resolving. It ships with a .d.ts (the `types` condition of its export)
//    that must exist and stay import-free too, or a TypeScript consumer's
//    side-effect import stops resolving under `noUncheckedSideEffectImports`.
//    Both are emitted assets, not Rollup chunks, so nothing else notices if
//    one goes missing or picks up an import a consumer can't resolve. In
//    named-file mode the two are checked together when either is named.
//
// 5. THE CORE SHIPS NO APPEARANCE PACKAGE (plan 0015-kxa §3.4). The core
//    registers none, and a host that uses another package must pay for none
//    of Platinum: dist/assets holds no font, no sound sprite and no file named
//    like any file of a workspace package (packages/appearance/<id>/src/assets
//    and packages/appearance/<id>/assets: Platinum's art, cursors, wallpapers,
//    fonts and sprites); dist/ holds no package font stylesheet
//    (classicy-<id>.fonts.css) and no package entry shim (the 2.x
//    appearance-platinum.js); and no emitted bundle carries any of those
//    files inlined (its whole base64, findClassicyInlinedFiles; a bundled
//    dependency's few-byte `data:audio` codec probes are not sprites, so the
//    type alone proves nothing). The core's own
//    assets ship as authored: no .webp in dist/assets. Skipped when the
//    caller names files.
//
// 6. THE STYLESHEET MUST DECLARE THE CASCADE LAYER ORDER BEFORE ANY RULE.
//    Every component rule is compiled into `@layer classicy.base`
//    (classicyCssLayerPlugin). The order statement fixes base < package <
//    user; without it first, a host that names `classicy.user` before our
//    stylesheet loads would put its own overrides *under* the base layer.
//    Checked in the injected <style> text of both entry bundles and at the
//    head of dist/classicy.css (linked by strict-CSP hosts).
//
// 7. NO PACKAGE CSS IN THE CORE. An Appearance Package's look is its
//    `@layer classicy.package` stylesheet, which ships in the package's own
//    build (Platinum's verify-dist checks its shape and its strict-CSP twin,
//    dist/classicy-platinum.css). The core registers none (plan 0015-kxa
//    §3.4), so no emitted bundle carries a `@layer classicy.package` block,
//    well-formed or not, dist/ holds no package stylesheet
//    (classicy-<id>.css), and the library stylesheet (dist/classicy.css and
//    the injected text) carries no package look: no package block and no
//    `[data-classicy-appearance=…]` selector.
//
// 8. DIST/TYPES DECLARES THE LIBRARY, NOT ITS TESTS OR BUILD SCRIPTS.
//    vite-plugin-dts emits a .d.ts for every file tsconfig selects, so until
//    its `exclude` named them (CLASSICY_DTS_EXCLUDE in
//    bin/classicyDistTypes.ts) the tarball shipped a declaration for every
//    test, every __tests__ helper, every story and every build script in bin/
//    (dist/types/bin/**), for the root build configs (vite.config.d.ts,
//    vitest.config.d.ts) and for every imported JSON file (package.json.d.ts,
//    platinum.json.d.ts, …). And every relative specifier in a declaration
//    carries its extension (`./ClassicyAppearanceManager.Colors.js`): the
//    package is `"type": "module"`, so a host on `moduleResolution: node16`
//    or `nodenext` resolves no other, and until beforeWriteFile on dts gave
//    them one every core name was missing there (TS2305, 0151-0cc;
//    bin/check-host-types.ts type-checks a packed host). And no declaration
//    map: every .d.ts.map is dead weight for a host (its `sources` point at
//    files the tarball does not hold), so each dts() call passes
//    `compilerOptions: { declarationMap: false }` (plan 0019-fb7 §2.1).
//    And each .d.ts has its .d.cts twin, its relative specifiers ending in
//    .cjs (bin/classicyCommonJsDeclarations.ts): the exports map's `require`
//    types, since a CommonJS TypeScript host on node16 cannot require() the
//    ES-module .d.ts (TS1479; story 0223-a0y). Checked by walking dist/types
//    (skipped when the caller names files).
//
// 9. EVERY STYLESHEET IN DIST/ IS ASCII ONLY, OR OPENS WITH `@charset "UTF-8";`.
//    Strict-CSP hosts link dist/classicy.css and dist/classicy-<id>.css
//    themselves, and a linked file with no BOM, no HTTP charset and no
//    leading `@charset` takes the referring page's encoding: raw UTF-8 from a
//    windows-1252 page turns a package's `content: "✓"` into "âœ“". Vite
//    minifies CSS with esbuild, whose default charset writes non-ASCII raw;
//    `esbuild.charset: "ascii"` in vite.config.ts keeps every glyph an
//    escape. Checked on every dist/*.css (named .css files in named mode).
//
// 10. THE LIBRARY STYLESHEET IS NOTHING BUT `@layer classicy.base` BLOCKS.
//    After the `@charset` and the layer order statement, every top-level item
//    of dist/classicy.css and of the injected text must be a classicy.base
//    block. An unlayered rule between them beats every layer -- the package's
//    look and the host's classicy.user included -- whatever its specificity.
//    Checked in both entry bundles' injected text and dist/classicy.css
//    (those of them named, in named mode).
//
// 11. NO PLAIN .css FILE UNDER src/ HOLDS ANY CSS. classicyCssLayerPlugin
//    wraps only .scss, so a .css file's rules would ship unlayered (invariant
//    10's failure, at its source). Empty and comment-only files pass
//    (src/index.css is empty). Checked on every src/**/*.css and every
//    packages/appearance/<id>/src/**/*.css, a workspace Appearance Package's
//    source (named .css files under either in named mode).
//
// 12. (Moved.) The Platinum font stylesheet, classicy-platinum.fonts.css,
//    ships in @classicy/appearance-platinum and is checked by its
//    bin/verify-dist.mjs (plan 0015-kxa §3.4); invariant 5 checks the core
//    emits no font stylesheet.
//
// 13. THE ENTRY BUNDLES USE THE PRODUCTION JSX RUNTIME. No import of
//    react/jsx-dev-runtime, no jsxDEV() call, and no absolute build-machine
//    path (the working directory, or /home/, /Users/ or C:\\ in a fileName
//    option). A dev transform ships 1,000+ calls carrying the builder's source
//    paths, so the bundle grows and two builds of one source differ by
//    directory (0120-ak4: vite read NODE_ENV=development from the shell).
//    Checked in both entry bundles (those of them named, in named mode).
//
// 14. NO SCREEN SAVER IN THE CORE. The savers, their art and their styles ship
//    in an Appearance Package (plan 0016-vbq): no dist/*.js or dist/*.css
//    carries a `classicySaver*` keyframe or class, and invariant 5 also
//    covers the savers' images (src/screenSavers/**) as files or inlined.
//
// 15. EVERY STYLESHEET KEEPS TO THE BROWSER FLOOR'S CSS MATH (Chrome 120,
//    Safari 16.2, Firefox 113). A declaration calling `round()` or another
//    function the floor lacks is dropped whole there, so each one needs a
//    fallback: an earlier declaration of its property that calls none, or an
//    enclosing `@supports` testing it (bin/classicyCssFloor.ts). The slider's
//    rounded ghost shipped without one and lost its position on Chrome
//    120-124 and Firefox 113-117.
//
// 16. SOURCE MAPS CARRY CLASSICY'S OWN TEXT ONLY (plan 0019-fb7 Part 1). Every
//    dist/*.js.map (both entry bundles' and the pdf-*.js chunk's) has null
//    text for each node_modules/ and embedded asset source, lists every vendor
//    source in x_google_ignoreList, and keeps the text of each src/ source
//    (classicySourceMapTextPlugin, bin/classicySourceMapText.ts): third-party
//    and asset text were half of the core's 22 MB of maps. Skipped when the
//    caller names files.
//
// 17. THE PDF.JS WORKER SHIPS DEFLATED, ONCE PER BUILD, NEVER IN THE ES ENTRY
//    (plan 0019-fb7 Part 2). PDFViewerDocument embeds the worker raw-deflated
//    (`?classicy-deflate`, bin/classicyDeflateAsset.ts) and rebuilds its data:
//    URI when the first PDF opens, so no dist/*.js holds a
//    data:text/javascript URI (the `?url` one was 1.68 MB in each entry
//    bundle). A URI means one with its payload: the bare
//    `data:text/javascript;base64,` prefix the worker source builds its URI
//    from passes, as a bare font prefix passes invariant 3.
//    classicy.umd.js carries exactly one payload, the ES chunks other than
//    classicy.es.js exactly one between them (the lazy worker source, loaded
//    beside pdf.js), and classicy.es.js none: an ES host that never opens a
//    PDF loads none. Each payload inflates to the installed pdfjs-dist
//    legacy worker (`legacy/build/pdf.worker.min.mjs`) byte for byte
//    (invariant 2's reason: the worker and the API come from one place); its
//    modern worker calls Map.prototype.getOrInsertComputed, which the oldest
//    supported browsers (Chrome 120, Safari 16.2, Firefox 113) lack, and is
//    reported by name. The API is the legacy build too: classicy.umd.js and
//    each ES chunk other than the entry that carries pdf.js's API carry
//    core-js's polyfill of that method, and at least one ES chunk carries
//    it. And no bundle but classicy.es.js imports the ES entry: a lazy chunk
//    that did (3.7's worker chunk imported classicyLog) names it as
//    "./classicy.es.js", so a host serving the entry under another URL
//    loads a second copy of the library, or none, on the first PDF. Skipped
//    when the caller names files.

// 18. THE ABOUT BOX'S EARTH PICTURE IS EMBEDDED AS WEBP, BYTE FOR BYTE
//    (plan 0019-fb7 §6.6). classicy.es.js and classicy.umd.js each carry
//    exactly one `data:image/webp;base64,` URI, and its payload is
//    assets/img/ui/earth.webp byte for byte: the core's only WebP, so
//    VitePluginImageTools never re-encoded it. Skipped when the caller names
//    files.
//
// 19. THE LIBRARY LOADS IN NODE, SILENTLY (story 0223-a0y). A
//    server-rendering host (Next.js, Remix, Astro) loads the library in Node:
//    classicy.es.js is imported, and classicy.umd.cjs, what `require()`
//    resolves to there, required, each in a child Node process
//    (bin/classicyNodeImport.ts), twice: once with the browser's globals
//    deleted (`document`, `window`, `navigator`, `localStorage` and the
//    rest), and once with Node's own globals but `localStorage` and
//    `sessionStorage` failing on any read, `typeof` included, as Node 25 and
//    later throw or warn on one. Each must load without throwing, without a
//    load-time task throwing, without a process warning and without writing
//    to the console. classicy.umd.cjs is the CommonJS loader
//    bin/classicyUmdLoader.ts writes, a few lines that run classicy.umd.js
//    beside it as CommonJS (in this "type": "module" package Node reads a .js
//    file as an ES module, so the UMD bundle itself cannot be required), and
//    classicy.umd.js requires no Node built-in, which a browser bundler could
//    not resolve (Rollup's `require("url")` for import.meta.url becomes
//    process.getBuiltinModule, bin/classicyUmdNodeUrl.ts), and declares
//    nothing at its top level: a `<script>` page would get it as a global,
//    and it would make every global name the bundle reads a slow lookup
//    under the loader's eval (25 to 60% slower). 3.7.0 threw
//    `document is not defined` on import (a dependency's `browser` entry,
//    bin/classicyNodeEntry.ts), and its UMD bundle could not be required at
//    all. Skipped when the caller names files.
//
// 20. THE ES ENTRY STARTS WITH "use client"; (story 0224-siu). A React Server
//    Components bundler (Next.js's App Router, webpack or Turbopack) treats a
//    module as a client module only when its first statement is the
//    directive; without it a server component that imports ClassicyDesktop
//    evaluates the bundle as a server module, where React has no
//    createContext or hooks, and the host's build fails (3.7.0: every host
//    wrote a "use client" wrapper of its own). Rollup drops a module-level
//    directive from what it bundles, so classicyUseClientPlugin
//    (bin/classicyUseClient.ts) adds it back as a banner: classicy.es.js must
//    begin with exactly `"use client";`, before any comment or import. The
//    UMD bundle and the lazy chunks carry none (they are never where a server
//    module meets a client one), nor do the Appearance Packages (their
//    invariant 12). Checked on classicy.es.js (when named, in named mode).

import { existsSync, readFileSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { argv, exit } from "node:process";
import { parseAst } from "vite";
import {
	findClassicyPlainCssFiles,
	findClassicyUnlayeredCss,
} from "./classicyBaseCss.ts";
import { classicyBundleSpecifiers } from "./classicyBundleSpecifiers.ts";
import { findClassicyCommonJsDeclarationProblems } from "./classicyCommonJsDeclarations.ts";
import { findClassicyCssFloorProblems } from "./classicyCssFloor.ts";
import { findClassicyExtensionlessSpecifiers } from "./classicyDeclarationSpecifiers.ts";
import { classicyDeflatePayloads } from "./classicyDeflateAsset.ts";
import {
	CLASSICY_PACKAGE_ASSET_FOLDERS,
	findClassicyCorePackageFiles,
	findClassicySaverMarkers,
	isClassicyPackageAssetFile,
} from "./classicyDistAssets.ts";
import { findClassicyCssCharsetProblem } from "./classicyDistCharset.ts";
import { findClassicyDevJsxProblems } from "./classicyDistJsx.ts";
import {
	findClassicyBuildScriptDeclarations,
	findClassicyJsonDeclarations,
	findClassicyTestDeclarations,
} from "./classicyDistTypes.ts";
import { findClassicyNodeImportProblems } from "./classicyNodeImport.ts";
import { findClassicyPackageCssProblems } from "./classicyPackageCss.ts";
import { findClassicySourceMapTextProblems } from "./classicySourceMapText.ts";
import {
	classicyUmdLoaderFile,
	findClassicyUmdLoaderProblems,
} from "./classicyUmdLoader.ts";
import {
	findClassicyUmdNodeBuiltinProblems,
	findClassicyUmdTopLevelDeclarations,
} from "./classicyUmdNodeUrl.ts";
import { findClassicyUseClientProblems } from "./classicyUseClient.ts";

const DIST = "dist";

async function bundles() {
	if (argv.slice(2).length) return argv.slice(2);
	const entries = await readdir(DIST);
	// Every emitted file: not just the entry (a dynamic import like pdfjs is
	// code-split into its own chunk) and not just the ESM build. The UMD build
	// is published too, and 0.70.2's carried a bare `import("pdfjs-dist")` --
	// a `require()` scan alone would have missed it, because Rollup keeps the
	// externalized *dynamic* import as an import() even in UMD output.
	return entries
		.filter((f) => f.endsWith(".js"))
		.sort()
		.map((f) => join(DIST, f));
}

// Each package that must stay bundled, and why.
const MUST_BE_BUNDLED = {
	"pdfjs-dist":
		"its worker is embedded here at build time; the consumer would supply a mismatched API version and every PDF would fail to load.",
	fflate:
		"a devDependency (it inflates the embedded pdf.js worker), so a host has no copy to import.",
};
const bundledPackageOf = (s) =>
	Object.keys(MUST_BE_BUNDLED).find((p) => s === p || s.startsWith(`${p}/`));

let failed = false;
for (const file of await bundles()) {
	const specifiers = classicyBundleSpecifiers(await readFile(file, "utf8"));

	const queried = specifiers.filter((s) => s.includes("?"));
	if (queried.length) {
		failed = true;
		console.error(`${file}: ${queried.length} import(s) carry a Vite query:`);
		for (const s of queried) console.error(`  import "${s}"`);
		console.error(
			"  -> an asset import must stay bundled so vite:asset can inline it; " +
				"exclude the query from isExternal in vite.config.ts.",
		);
	}

	const leaked = specifiers.filter((s) => bundledPackageOf(s));
	if (leaked.length) {
		failed = true;
		console.error(`${file}: externalized a package that must stay bundled:`);
		for (const s of leaked) console.error(`  import "${s}"`);
		for (const p of new Set(leaked.map(bundledPackageOf)))
			console.error(`  -> ${p}: ${MUST_BE_BUNDLED[p]}`);
	}

	if (!queried.length && !leaked.length) {
		console.log(`${file}: ${specifiers.length} import(s), clean`);
	}
}

// Invariant 3: the stylesheet injector is appended to the two entry bundles,
// and neither carries inlined fonts.
const STYLE_ID = '"classicy-styles"';
// A base64 payload, not the bare prefix: a bundled dependency builds
// `data:font/opentype;base64,${...}` URLs at runtime and is not an inlined font.
const INLINED_FONT =
	/data:(?:font\/|application\/font-)[^,"'`]*;base64,[A-Za-z0-9+/=]{16}/;
for (const entry of ["classicy.es.js", "classicy.umd.js"]) {
	const file = join(DIST, entry);
	if (argv.slice(2).length && !argv.slice(2).includes(file)) continue;
	const source = await readFile(file, "utf8");
	if (source.lastIndexOf(`document.getElementById(${STYLE_ID})`) === -1) {
		failed = true;
		console.error(
			`${file}: does not inject its stylesheet -> check injectCssPlugin in vite.config.ts.`,
		);
	} else if (INLINED_FONT.test(source)) {
		failed = true;
		console.error(
			`${file}: inlines fonts as data: URIs -> check noInlineAppearanceAssetsPlugin in vite.config.ts.`,
		);
	} else {
		console.log(`${file}: injects its stylesheet, without inlined fonts`);
	}
}

// Invariant 4: the deprecated fonts entry's no-op shim and its declaration.
for (const shim of ["fonts"]) {
	const pair = [
		{ entry: join(DIST, `${shim}.js`), kind: "script" },
		{ entry: join(DIST, `${shim}.d.ts`), kind: "declaration" },
	];
	if (
		argv.slice(2).length &&
		!pair.some(({ entry }) => argv.slice(2).includes(entry))
	)
		continue;
	for (const { entry, kind } of pair) {
		const source = await readFile(entry, "utf8").catch(() => null);
		if (source === null) {
			failed = true;
			console.error(
				`${entry}: missing -> check injectCssPlugin in vite.config.ts.`,
			);
		} else if (
			/\b(?:import|require)\b/.test(source.replace(/^\s*\/\/.*$/gm, ""))
		) {
			failed = true;
			console.error(
				`${entry}: has an import/require; it must stay a self-contained ${kind}.`,
			);
		} else {
			console.log(`${entry}: self-contained no-op ${kind}`);
		}
	}
}

// Invariant 5: no Appearance Package file in the core's dist, as a file or
// inlined. Skipped when the caller names specific files.
if (!argv.slice(2).length) {
	const distFiles = await readdir(DIST);
	const assets = await readdir(join(DIST, "assets")).catch(() => []);
	// Every file of every workspace package's asset folders, and the images
	// under its src/screenSavers (the savers' art, plan 0016-vbq).
	const packageIds = await readdir(join("packages", "appearance")).catch(
		() => [],
	);
	const packagePaths = (
		await Promise.all(
			packageIds.flatMap((id) => {
				const packageRoot = join("packages", "appearance", id);
				return CLASSICY_PACKAGE_ASSET_FOLDERS.map(async (folder) =>
					(
						await readdir(join(packageRoot, folder), {
							recursive: true,
							withFileTypes: true,
						}).catch(() => [])
					)
						.filter((entry) => entry.isFile())
						.map((entry) => join(entry.parentPath, entry.name))
						.filter((path) => isClassicyPackageAssetFile(path, packageRoot)),
				);
			}),
		)
	).flat();
	const packageFiles = await Promise.all(
		packagePaths.map(async (path) => ({ path, bytes: await readFile(path) })),
	);
	const bundles = await Promise.all(
		distFiles
			.filter((f) => f.endsWith(".js"))
			.map(async (f) => ({
				file: join(DIST, f),
				source: await readFile(join(DIST, f), "utf8"),
			})),
	);
	const problems = findClassicyCorePackageFiles({
		distFiles,
		assets,
		packageFiles,
		bundles,
	});
	if (packageFiles.length === 0) {
		problems.push(
			"packages/appearance: no package asset files found -> run verify:dist from the repository root.",
		);
	}
	// The core's own assets ship as authored: the image plugin must not have
	// rewritten one to WebP.
	for (const f of assets.filter((name) => name.endsWith(".webp")))
		problems.push(
			`${join(DIST, "assets", f)}: a .webp file -> check \`excludes\` on VitePluginImageTools in vite.config.ts.`,
		);
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`${DIST}: none of ${packageFiles.length} workspace package file(s) as a file or inlined in ${bundles.length} bundle(s); ${assets.length} file(s) in dist/assets`,
		);
}

// Invariant 6: the cascade layer order, first, in the injected stylesheet of
// both entry bundles and in the linked dist/classicy.css.
const LAYER_ORDER = "@layer classicy.base, classicy.package, classicy.user;";
// The order statement, exactly once, then the first component stylesheet's
// (minified) layer block. Vite hoists a `@charset` to the top of the CSS: the
// injected text keeps it after the statement (it means nothing in a <style>),
// the linked file before it (it only counts as a file's first bytes).
const CHARSET = '(?:@charset "[^"]*";\\s*)?';
const ORDER = LAYER_ORDER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BASE_BLOCK = "@layer classicy\\.base\\s*\\{";
const INJECTED_START = new RegExp(`^${ORDER}\\n${CHARSET}${BASE_BLOCK}`);
const LINKED_START = new RegExp(`^${CHARSET}${ORDER}\\n${BASE_BLOCK}`);

// The CSS text the injector at `at` writes: its `textContent=` string
// literal, decoded.
function injectedText(source, at) {
	const literal = /\.textContent=("(?:[^"\\]|\\.)*")/.exec(source.slice(at));
	try {
		return literal ? JSON.parse(literal[1]) : "";
	} catch {
		return "";
	}
}
for (const entry of ["classicy.es.js", "classicy.umd.js"]) {
	const file = join(DIST, entry);
	if (argv.slice(2).length && !argv.slice(2).includes(file)) continue;
	const source = await readFile(file, "utf8");
	const at = source.lastIndexOf(`document.getElementById(${STYLE_ID})`);
	if (at === -1) continue; // reported by invariant 3
	if (!INJECTED_START.test(injectedText(source, at))) {
		failed = true;
		console.error(
			`${file}: the injected stylesheet does not start with "${LAYER_ORDER}" exactly once, then a classicy.base block -> check classicyStyleInjector and classicyCssLayerPlugin.`,
		);
	} else {
		console.log(
			`${file}: the injected stylesheet declares the layer order first`,
		);
	}
}
const cssFile = join(DIST, "classicy.css");
if (!argv.slice(2).length || argv.slice(2).includes(cssFile)) {
	const css = await readFile(cssFile, "utf8").catch(() => "");
	if (!LINKED_START.test(css)) {
		failed = true;
		console.error(
			`${cssFile}: does not start with "${LAYER_ORDER}" exactly once, then a classicy.base block -> check injectCssPlugin and classicyCssLayerPlugin.`,
		);
	} else {
		console.log(`${cssFile}: declares the layer order first`);
	}
}

// Invariant 7: no package CSS in the core. With named files, only those are
// checked (a .js file as a bundle, a .css file by name).
{
	const named = argv.slice(2);
	const distFiles = named.length ? [] : await readdir(DIST);
	const jsFiles = named.length
		? named.filter((f) => f.endsWith(".js"))
		: distFiles.filter((f) => f.endsWith(".js")).map((f) => join(DIST, f));
	const PACKAGE_CSS_FILE = /^classicy-[a-z0-9]+(?:-[a-z0-9]+)*\.css$/;
	const packageFiles = named.length
		? named.filter((f) => PACKAGE_CSS_FILE.test(f.split(/[\\/]/).pop()))
		: distFiles
				.filter((f) => PACKAGE_CSS_FILE.test(f))
				.map((f) => join(DIST, f));
	const read = async (file) => ({ file, text: await readFile(file, "utf8") });
	const bundles = await Promise.all(jsFiles.map(read));
	const baseStylesheets = bundles.flatMap(({ file, text }) => {
		const at = text.lastIndexOf(`document.getElementById(${STYLE_ID})`);
		return at === -1
			? []
			: [
					{
						file: `${file} (injected stylesheet)`,
						css: injectedText(text, at),
					},
				];
	});
	if (!named.length || named.includes(cssFile)) {
		const css = await readFile(cssFile, "utf8").catch(() => null);
		if (css !== null) baseStylesheets.push({ file: cssFile, css });
	}
	const problems = [
		...findClassicyPackageCssProblems({
			layerOrder: LAYER_ORDER,
			bundles: bundles.map(({ file, text }) => ({ file, source: text })),
			baseStylesheets,
			packageStylesheets: [],
			// Every bundle: the core registers no package.
			packageFreeBundles: bundles.map(({ file }) => file),
		}),
		...packageFiles.map(
			(file) =>
				`${file}: a package stylesheet in the core's dist -> the core ships no Appearance Package; a package's strict-CSP stylesheet ships in its own dist (Platinum's in @classicy/appearance-platinum).`,
		),
	];
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`package CSS: none in ${bundles.length} bundle(s), ${baseStylesheets.length} library stylesheet(s) or dist/`,
		);
}

// Invariant 8: no declarations for tests, test helpers or stories. Skipped
// when the caller names specific files.
if (!argv.slice(2).length) {
	const typesDir = join(DIST, "types");
	const declarations = await readdir(typesDir, { recursive: true }).catch(
		() => null,
	);
	const shipped =
		declarations === null ? [] : findClassicyTestDeclarations(declarations);
	const scripts =
		declarations === null
			? []
			: findClassicyBuildScriptDeclarations(declarations);
	const json =
		declarations === null ? [] : findClassicyJsonDeclarations(declarations);
	const listed = (paths) =>
		`${paths.slice(0, 5).join(", ")}${paths.length > 5 ? ", …" : ""}`;
	const maps = (declarations ?? [])
		.map(String)
		.filter((file) => file.endsWith(".d.ts.map"))
		.sort();
	if (maps.length) {
		failed = true;
		console.error(
			`${typesDir}: ${maps.length} declaration map(s) (${listed(maps)}) -> each dts() call must pass compilerOptions: { declarationMap: false }.`,
		);
	}
	if (declarations === null) {
		failed = true;
		console.error(`${typesDir}: missing -> check dts in vite.config.ts.`);
	}
	if (shipped.length) {
		failed = true;
		console.error(
			`${typesDir}: ${shipped.length} declaration(s) of tests, test helpers or stories (${listed(shipped)}) -> check CLASSICY_DTS_EXCLUDE in bin/classicyDistTypes.ts.`,
		);
	}
	if (scripts.length) {
		failed = true;
		console.error(
			`${typesDir}: ${scripts.length} declaration(s) of build scripts in bin/ or root build configs (${listed(scripts)}) -> check CLASSICY_DTS_EXCLUDE in bin/classicyDistTypes.ts.`,
		);
	}
	if (json.length) {
		failed = true;
		console.error(
			`${typesDir}: ${json.length} declaration(s) of imported JSON (${listed(json)}) -> check CLASSICY_DTS_EXCLUDE in bin/classicyDistTypes.ts.`,
		);
	}
	let bare = 0;
	for (const declaration of (declarations ?? [])
		.filter((file) => file.endsWith(".d.ts"))
		.sort()) {
		const file = join(typesDir, declaration);
		const specifiers = findClassicyExtensionlessSpecifiers(
			await readFile(file, "utf8"),
		);
		if (!specifiers.length) continue;
		bare++;
		failed = true;
		console.error(
			`${file}: relative specifier(s) without an extension (${listed(specifiers.map((s) => JSON.stringify(s)))}) -> a node16 or nodenext host resolves none of them; check beforeWriteFile on dts in vite.config.ts.`,
		);
	}
	const twins =
		declarations === null
			? []
			: findClassicyCommonJsDeclarationProblems(
					typesDir,
					declarations.map(String),
					(file) => readFileSync(join(typesDir, file), "utf8"),
				);
	for (const problem of twins) console.error(problem);
	if (twins.length) failed = true;
	if (
		declarations !== null &&
		!shipped.length &&
		!scripts.length &&
		!json.length &&
		!bare &&
		!twins.length
	) {
		console.log(
			`${typesDir}: ${declarations.length} file(s), none for a test, test helper, story, build script in bin/, root build config or imported JSON; every relative specifier with its extension; every .d.ts with its .d.cts twin for require()`,
		);
	}
}

// Invariant 9: each linked stylesheet decodes the same under any page
// encoding. With named files, only the named .css files.
{
	const named = argv.slice(2);
	const cssFiles = named.length
		? named.filter((f) => f.endsWith(".css"))
		: (await readdir(DIST))
				.filter((f) => f.endsWith(".css"))
				.sort()
				.map((f) => join(DIST, f));
	let clean = 0;
	for (const file of cssFiles) {
		const problem = findClassicyCssCharsetProblem(file, await readFile(file));
		if (problem) {
			failed = true;
			console.error(problem);
		} else clean++;
	}
	if (clean === cssFiles.length)
		console.log(
			`stylesheet charset: ${clean} .css file(s), each ASCII only or opening with @charset "UTF-8"`,
		);
}

// Invariant 10: the library stylesheet holds only classicy.base blocks.
{
	const named = argv.slice(2);
	const sheets = [];
	for (const entry of ["classicy.es.js", "classicy.umd.js"]) {
		const file = join(DIST, entry);
		if (named.length && !named.includes(file)) continue;
		const source = await readFile(file, "utf8").catch(() => null);
		const at =
			source === null
				? -1
				: source.lastIndexOf(`document.getElementById(${STYLE_ID})`);
		if (at === -1) continue; // reported by invariant 3
		sheets.push({
			file: `${file} (injected stylesheet)`,
			css: injectedText(source, at),
		});
	}
	if (!named.length || named.includes(cssFile)) {
		const css = await readFile(cssFile, "utf8").catch(() => null);
		if (css !== null) sheets.push({ file: cssFile, css });
	}
	const problems = sheets.flatMap(({ file, css }) =>
		findClassicyUnlayeredCss(file, css, LAYER_ORDER),
	);
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else if (sheets.length)
		console.log(
			`library stylesheet: ${sheets.length} stylesheet(s), every rule inside @layer classicy.base`,
		);
}

// Invariant 11: no plain .css file under src/ (or a package's src/) holds CSS.
{
	const named = argv.slice(2);
	const roots = [
		"src",
		...(await readdir(join("packages", "appearance")).catch(() => []))
			.sort()
			.map((id) => join("packages", "appearance", id, "src")),
	];
	const paths = named.length
		? named.filter((f) =>
				/^(?:src|packages[\\/]appearance[\\/][^\\/]+[\\/]src)[\\/].*\.css$/.test(
					f,
				),
			)
		: (
				await Promise.all(
					roots.map(async (root) =>
						(
							await readdir(root, { recursive: true }).catch(() => [])
						)
							.filter((f) => f.endsWith(".css"))
							.sort()
							.map((f) => join(root, f)),
					),
				)
			).flat();
	const files = await Promise.all(
		paths.map(async (path) => ({ path, text: await readFile(path, "utf8") })),
	);
	const problems = findClassicyPlainCssFiles(files);
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else if (files.length)
		console.log(
			`src/ and packages/appearance/*/src/: ${files.length} plain .css file(s), none with CSS`,
		);
}

// Invariant 13: the production JSX runtime, with no build-machine paths.
for (const entry of ["classicy.es.js", "classicy.umd.js"]) {
	const file = join(DIST, entry);
	if (argv.slice(2).length && !argv.slice(2).includes(file)) continue;
	const source = await readFile(file, "utf8");
	const problems = findClassicyDevJsxProblems(file, source, process.cwd());
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else console.log(`${file}: production JSX runtime, no build-machine paths`);
}

// Invariant 14: no screen saver in the core. Named files are checked as given;
// otherwise every dist/*.js and dist/*.css.
{
	const named = argv.slice(2).filter((f) => /\.(?:js|css)$/.test(f));
	const files = argv.slice(2).length
		? named
		: (await readdir(DIST))
				.filter((f) => /\.(?:js|css)$/.test(f))
				.map((f) => join(DIST, f));
	const problems = findClassicySaverMarkers(
		await Promise.all(
			files.map(async (file) => ({ file, text: await readFile(file, "utf8") })),
		),
	);
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`screen savers: no classicySaver name in ${files.length} bundle(s) or stylesheet(s)`,
		);
}

// Invariant 15: the browser floor's CSS math, in each stylesheet (the named
// .css files, in named mode).
{
	const named = argv.slice(2);
	const cssFiles = named.length
		? named.filter((f) => f.endsWith(".css"))
		: (await readdir(DIST))
				.filter((f) => f.endsWith(".css"))
				.sort()
				.map((f) => join(DIST, f));
	let clean = 0;
	for (const file of cssFiles) {
		const problems = findClassicyCssFloorProblems(
			file,
			await readFile(file, "utf8"),
		);
		for (const problem of problems) console.error(problem);
		if (problems.length) failed = true;
		else clean++;
	}
	if (clean === cssFiles.length)
		console.log(
			`browser floor: ${clean} .css file(s), every newer CSS math function with a fallback`,
		);
}

// Invariant 16: source maps carry Classicy's own text only. Skipped when the
// caller names specific files.
if (!argv.slice(2).length) {
	const maps = (await readdir(DIST))
		.filter((f) => f.endsWith(".js.map"))
		.sort()
		.map((f) => join(DIST, f));
	const problems = [];
	for (const file of maps)
		problems.push(
			...findClassicySourceMapTextProblems(await readFile(file, "utf8"), file),
		);
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`source maps: ${maps.length} dist/*.js.map file(s), each with Classicy's own text and no third-party or asset text`,
		);
}

// Invariant 17: the pdf.js worker ships deflated, once in the UMD bundle and
// once in the ES build's lazy chunks, never in the ES entry. Skipped when the
// caller names specific files.
if (!argv.slice(2).length) {
	const localRequire = createRequire(import.meta.url);
	const worker = await readFile(
		localRequire.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs"),
	);
	const modernWorker = await readFile(
		localRequire.resolve("pdfjs-dist/build/pdf.worker.min.mjs"),
	);
	// A URI with its payload, not the bare prefix: the worker source keeps
	// `"data:text/javascript;base64,"` to build its URI from at runtime.
	const WORKER_DATA_URI = /data:text\/javascript[^,"'`]*,[^"'`\s]{16}/;
	const esEntry = join(DIST, "classicy.es.js");
	const umdEntry = join(DIST, "classicy.umd.js");
	const files = (await readdir(DIST))
		.filter((f) => f.endsWith(".js"))
		.sort()
		.map((f) => join(DIST, f));
	const problems = [];
	// Each bundle's payloads, inflated; null for one that does not inflate
	// (reported, and left out of the counts).
	const payloads = new Map();
	for (const file of files) {
		const source = await readFile(file, "utf8");
		if (WORKER_DATA_URI.test(source))
			problems.push(
				`${file}: carries a data:text/javascript URI -> the pdf.js worker is embedded deflated (\`?classicy-deflate\`, bin/classicyDeflateAsset.ts), never as a \`?url\` data: URI.`,
			);
		try {
			payloads.set(file, classicyDeflatePayloads(source));
		} catch (error) {
			payloads.set(file, null);
			problems.push(
				`${file}: carries a deflated pdf.js worker that does not inflate (${error.message}) -> check classicyDeflateAssetPlugin in vite.config.ts.`,
			);
		}
	}
	const count = (file) => (payloads.get(file) ?? []).length;
	if (payloads.get(umdEntry) !== null && count(umdEntry) !== 1)
		problems.push(
			`${umdEntry}: carries ${count(umdEntry)} deflated pdf.js workers, not 1 -> check the \`?classicy-deflate\` import in ClassicyPdfWorkerSource.internal.ts and classicyDeflateAssetPlugin in vite.config.ts.`,
		);
	if (count(esEntry))
		problems.push(
			`${esEntry}: carries ${count(esEntry)} deflated pdf.js worker(s) -> the ES entry carries none: PDFViewerDocument loads the worker source with import(), beside pdf.js, in a lazy chunk.`,
		);
	const chunks = files.filter((f) => f !== esEntry && f !== umdEntry);
	const carriers = chunks.filter((f) => count(f));
	const inChunks = chunks.reduce((sum, f) => sum + count(f), 0);
	if (chunks.every((f) => payloads.get(f) !== null) && inChunks !== 1)
		problems.push(
			`${DIST}: the ES chunks other than ${esEntry} carry ${inChunks} deflated pdf.js workers, not 1 (${carriers.join(", ") || "none"}) -> PDFViewerDocument loads the worker source with import(), beside pdf.js, in a lazy chunk.`,
		);
	for (const file of [umdEntry, ...chunks, esEntry])
		for (const payload of payloads.get(file) ?? [])
			if (payload.equals(modernWorker))
				problems.push(
					`${file}: its deflated pdf.js worker is pdfjs-dist's modern build (${payload.length} bytes), not its legacy build (${worker.length} bytes) -> the modern build calls Map.prototype.getOrInsertComputed, which the oldest supported browsers (Chrome 120, Safari 16.2, Firefox 113) lack: import pdfjs-dist/legacy/build/pdf.worker.min.mjs?classicy-deflate in ClassicyPdfWorkerSource.internal.ts.`,
				);
			else if (!payload.equals(worker))
				problems.push(
					`${file}: its deflated pdf.js worker (${payload.length} bytes) is not the installed pdfjs-dist legacy worker (${worker.length} bytes) -> check the \`?classicy-deflate\` import in ClassicyPdfWorkerSource.internal.ts.`,
				);
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`pdf.js worker: deflated once in ${umdEntry} and once in the ES chunks (${carriers.join(", ")}), each equal to the installed pdfjs-dist legacy worker (${worker.length} bytes), never in ${esEntry}; no data:text/javascript URI in ${files.length} bundle(s)`,
		);

	// pdf.js's API is its legacy build. That build carries core-js, and
	// core-js's polyfill of Map.prototype.getOrInsertComputed is the call
	//   $({ target: 'Map', proto: true, real: true, forced: IS_PURE }, {
	//     getOrInsertComputed: function getOrInsertComputed(key, callbackfn) {
	// (legacy/build/pdf.mjs), which the ES chunk keeps as
	// `{ target: "Map", proto: !0, … }, {\n getOrInsertComputed: function(`
	// and the minified UMD bundle as
	// `{target:"Map",proto:!0,real:!0,forced:o},{getOrInsertComputed:function(`.
	// What it matches survives any minifier: object keys and a string value,
	// which are never renamed (only whitespace, quotes and `true` change; a
	// method shorthand is accepted too). The modern build calls the method
	// natively and holds no such call. A bundle carries pdf.js's API when it
	// holds the text of getDocument's argument check, in both builds.
	const LEGACY_PDFJS =
		/\btarget\s*:\s*(["'`])Map\1\s*,\s*proto\s*:[^{}]*\}\s*,\s*\{\s*getOrInsertComputed\s*(?::\s*function\b|\()/;
	const PDFJS_API = "getDocument - expected either";
	const apiProblems = [];
	const legacyIn = [];
	const text = new Map();
	for (const file of files) text.set(file, await readFile(file, "utf8"));
	const modern = (file) =>
		`${file}: carries the pdf.js API's modern build, not its legacy build (no core-js polyfill of Map.prototype.getOrInsertComputed) -> import pdfjs-dist/legacy/build/pdf.mjs in PDFViewerDocument.tsx: the modern build calls the method natively, and the oldest supported browsers (Chrome 120, Safari 16.2, Firefox 113) lack it.`;
	const umdText = text.get(umdEntry) ?? "";
	if (!umdText.includes(PDFJS_API))
		apiProblems.push(
			`${umdEntry}: carries no pdf.js API -> the UMD bundle carries pdfjs-dist/legacy/build/pdf.mjs inline (PDFViewerDocument's import()).`,
		);
	else if (!LEGACY_PDFJS.test(umdText)) apiProblems.push(modern(umdEntry));
	else legacyIn.push(umdEntry);
	const pdfChunks = chunks.filter((f) => text.get(f).includes(PDFJS_API));
	if (!pdfChunks.length)
		apiProblems.push(
			`${DIST}: no ES chunk other than ${esEntry} carries the pdf.js API -> PDFViewerDocument loads pdfjs-dist/legacy/build/pdf.mjs with import(), in a lazy chunk.`,
		);
	for (const file of pdfChunks)
		if (LEGACY_PDFJS.test(text.get(file))) legacyIn.push(file);
		else apiProblems.push(modern(file));
	for (const problem of apiProblems) console.error(problem);
	if (apiProblems.length) failed = true;
	else
		console.log(
			`pdf.js API: the legacy build (core-js's Map.prototype.getOrInsertComputed polyfill) in ${legacyIn.join(" and ")}`,
		);

	// No bundle but the ES entry imports it: a static import, a re-export or
	// an import() whose specifier, read from the bundle's folder, names
	// dist/classicy.es.js.
	const ENTRY_SPECIFIER =
		/(?:^|[;}\n])\s*(?:import|export)\s*(?:[^"'`;]*?\bfrom\s*)?(["'`])([^"'`\n]+)\1|\bimport\(\s*(["'`])([^"'`\n]+)\3\s*\)/g;
	const entryProblems = [];
	const others = files.filter((f) => f !== esEntry);
	for (const file of others) {
		const named = new Set();
		for (const m of text.get(file).matchAll(ENTRY_SPECIFIER)) {
			const specifier = m[2] ?? m[4];
			if (!specifier.startsWith(".")) continue;
			const target = join(dirname(file), specifier.split(/[?#]/)[0]);
			if (target === esEntry) named.add(specifier);
		}
		for (const specifier of named)
			entryProblems.push(
				`${file}: imports the ES entry ("${specifier}") -> a lazy chunk imports nothing of classicy.es.js, or a host serving the entry under another URL (a query string, a CDN redirect, a renamed file) loads a second copy of the library, or none: keep the chunk's modules free of Classicy imports (ClassicyPdfWorkerSource.internal.ts imports only fflate and the deflated worker).`,
			);
	}
	for (const problem of entryProblems) console.error(problem);
	if (entryProblems.length) failed = true;
	else
		console.log(
			`lazy chunks: none of ${others.length} bundle(s) other than ${esEntry} imports the ES entry`,
		);
}

// Invariant 18: both entry bundles embed assets/img/ui/earth.webp, once and
// byte for byte. Skipped when the caller names specific files.
if (!argv.slice(2).length) {
	const EARTH = "assets/img/ui/earth.webp";
	const earth = await readFile(EARTH).catch(() => null);
	const problems = [];
	if (!earth)
		problems.push(`${EARTH}: missing -> the core's earth WebP source is gone.`);
	else
		for (const file of [
			join(DIST, "classicy.es.js"),
			join(DIST, "classicy.umd.js"),
		]) {
			const source = await readFile(file, "utf8").catch(() => null);
			if (source === null) {
				problems.push(`${file}: missing, so it cannot embed the earth WebP.`);
				continue;
			}
			const uris = [
				...source.matchAll(/data:image\/webp;base64,([A-Za-z0-9+/=]*)/g),
			].map((m) => Buffer.from(m[1], "base64"));
			if (uris.length !== 1 || !uris[0].equals(earth))
				problems.push(
					`${file}: carries ${uris.length} data:image/webp URI(s)${uris.length === 1 ? ` (${uris[0].length} bytes)` : ""}, not exactly one equal to ${EARTH} (${earth.length} bytes) -> the earth WebP must embed byte-identical: exclude it from VitePluginImageTools in vite.config.ts, and keep ui("earth.webp") in ClassicyIcons.ts.`,
				);
		}
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`earth WebP: ${EARTH} (${earth.length} bytes) embedded byte-identical, once, in classicy.es.js and classicy.umd.js`,
		);
}

// Invariant 19: the library loads in Node with no browser globals, the UMD
// bundle through its CommonJS loader. Skipped when the caller names files.
if (!argv.slice(2).length) {
	const loader = join(DIST, classicyUmdLoaderFile("classicy.umd.js"));
	const entries = [
		{ file: join(DIST, "classicy.es.js"), kind: "import" },
		{ file: loader, kind: "require" },
	];
	const read = (file) => (existsSync(file) ? readFileSync(file, "utf8") : null);
	const umd = join(DIST, "classicy.umd.js");
	const problems = [
		...findClassicyUmdLoaderProblems(
			loader,
			"classicy.umd.js",
			"@classicy/classicy",
			read,
		),
		...findClassicyUmdNodeBuiltinProblems(umd, read(umd) ?? ""),
		...findClassicyUmdTopLevelDeclarations(umd, read(umd) ?? "", parseAst),
	];
	if (!problems.length)
		problems.push(...(await findClassicyNodeImportProblems(entries)));
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`server import: ${entries.map(({ file, kind }) => `${file} (${kind})`).join(" and ")} load in Node with no browser globals and with Node's own, silently; ${loader} is the CommonJS loader of classicy.umd.js, which requires no Node built-in and declares nothing at its top level`,
		);
}

// Invariant 20: the ES entry's first statement is "use client";.
for (const entry of ["classicy.es.js"]) {
	const file = join(DIST, entry);
	if (argv.slice(2).length && !argv.slice(2).includes(file)) continue;
	const problems = findClassicyUseClientProblems(
		file,
		existsSync(file) ? readFileSync(file, "utf8") : null,
	);
	for (const problem of problems) console.error(problem);
	if (problems.length) failed = true;
	else
		console.log(
			`${file}: starts with "use client";, a client module to a React Server Components bundler`,
		);
}

if (failed) exit(1);
