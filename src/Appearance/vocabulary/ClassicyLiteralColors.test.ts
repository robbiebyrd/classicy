import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";

/**
 * Every literal color the reskinning audit (§2.1) found in Classicy's SCSS is
 * a theme token, or a `classicy-tint`/`-shade`/`-alpha` of one
 * (`_color.scss`), so a theme or package recolors it. Each replaced
 * declaration is pinned on the compiled stylesheet, where the look now lives:
 * the base sheet for the overlays and stragglers, the Platinum package for the
 * scroll-bar shading and the icon halftone.
 */
const compileFile = (file: string) =>
	sass.compile(path.resolve(process.cwd(), file), { style: "expanded" }).css;
const compileSource = (source: string) =>
	sass.compileString(source, {
		loadPaths: [path.resolve(process.cwd(), "src")],
		style: "expanded",
	}).css;

const SYSTEM = "src/SystemFolder/SystemResources";
const windowCss = compileFile(`${SYSTEM}/Window/ClassicyWindow.scss`);
const alert = compileFile(`${SYSTEM}/Alert/ClassicyAlert.scss`);
const fileInput = compileFile(`${SYSTEM}/FileInput/ClassicyFileInput.scss`);
const icon = compileFile(`${SYSTEM}/Icon/ClassicyIcon.scss`);
const desktopIcon = compileFile(`${SYSTEM}/Desktop/ClassicyDesktopIcon.scss`);
const progressBar = compileFile(
	`${SYSTEM}/ProgressBar/ClassicyProgressBar.scss`,
);
const controlGroup = compileFile(
	`${SYSTEM}/ControlGroup/ClassicyControlGroup.scss`,
);
const quickTime = compileFile(`${SYSTEM}/QuickTime/QuickTimeMovieEmbed.scss`);
const finderAbout = compileFile(
	"src/SystemFolder/Finder/FinderAboutThisComputer.scss",
);
const webViewer = compileFile("src/SystemFolder/WebViewer/WebViewer.scss");
// The scroll-bar look is a mixin file: include it on a stand-in selector.
const scrollbarsFixture = compileSource(
	`@use "Appearance/Platinum/styles/scrollbars" as s;\n.x { @include s.platinum-scrollbars; }`,
);
// The halftone is in the Platinum icon partials: include both at the root.
const halftone = compileSource(
	`@use "Appearance/Platinum/styles/components/Icon";
@use "Appearance/Platinum/styles/components/DesktopIcon";
@include Icon.icon;
@include DesktopIcon.desktopIcon;`,
);

const rule = (css: string, selector: string): Record<string, string> => {
	const match = css.match(
		new RegExp(
			`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
			"m",
		),
	);
	if (!match) throw new Error(`no rule for ${selector}`);
	return Object.fromEntries(
		match[1]
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line && !line.startsWith("/"))
			.map((line) => {
				const [prop, ...rest] = line.replace(/;$/, "").split(":");
				return [prop.trim(), rest.join(":").trim()];
			}),
	);
};

describe("literal colors are theme tokens (G 1.2)", () => {
	it("ClassicyWindow red title bar uses the error tint", () =>
		expect(windowCss).toContain(
			"background-color: color-mix(in srgb, var(--color-error), white 80%);",
		));

	it("ClassicyAlert movable title bar uses the same tint", () =>
		expect(alert).toContain(
			"background-color: color-mix(in srgb, var(--color-error), white 80%);",
		));

	it("FileInput error text is a 20% shade of --color-error", () =>
		expect(fileInput).toContain(
			"color: color-mix(in srgb, var(--color-error), black 20%);",
		));

	it("icon label overlays are alpha tokens", () => {
		for (const css of [icon, desktopIcon]) {
			expect(css).toContain(
				"background: color-mix(in srgb, var(--color-white) 50%, transparent);",
			);
			expect(css).toContain(
				"background: color-mix(in srgb, var(--color-black) 50%, transparent);",
			);
			expect(css).not.toMatch(/rgba\(/);
		}
	});

	it("scrollbar track shading is alpha tokens", () => {
		expect(scrollbarsFixture).toContain(
			"color-mix(in srgb, var(--color-black) 25%, transparent)",
		);
		expect(scrollbarsFixture).toContain(
			"color-mix(in srgb, var(--color-white) 25%, transparent)",
		);
		for (const track of [
			".x::-webkit-scrollbar-track:vertical",
			".x::-webkit-scrollbar-track:horizontal",
		])
			expect(rule(scrollbarsFixture, track)["box-shadow"], track).toMatch(
				/inset var\(--control-frame-width\) 0 0 color-mix\(in srgb, var\(--color-black\) 25%, transparent\), inset calc\(var\(--window-border-size\) \* -2\) 0 0 color-mix\(in srgb, var\(--color-white\) 25%, transparent\)$/,
			);
	});

	it("About This Computer borders are a 10% shade of system-04", () => {
		expect(finderAbout).toContain(
			"border: var(--window-border-size) solid color-mix(in srgb, var(--color-system-04), black 10%);",
		);
		expect(finderAbout).toContain(
			"border-top: var(--window-border-size) solid color-mix(in srgb, var(--color-system-04), black 10%);",
		);
		expect(finderAbout).toContain(
			"filter: drop-shadow(var(--finder-about-banner-shadow-offset) var(--finder-about-banner-shadow-offset) var(--finder-about-banner-shadow-blur) color-mix(in srgb, var(--color-white) 50%, transparent));",
		);
	});

	it("ControlGroup groove is a 6% tint of system-01", () =>
		expect(controlGroup).toContain(
			"groove color-mix(in srgb, var(--color-system-01), white 6%)",
		));

	it("the WebViewer frame and the progress-bar mask stop are the white token", () => {
		expect(webViewer).toContain("background-color: var(--color-white);");
		expect(progressBar).toContain(
			"mask: linear-gradient(0deg, var(--color-black), var(--color-white), var(--color-black)) luminance;",
		);
	});

	it("the QuickTime controller glyph shadow is an alpha token", () =>
		expect(quickTime).toContain(
			"filter: drop-shadow(var(--window-border-size) var(--window-border-size) 0px color-mix(in srgb, var(--color-black) 50%, transparent));",
		));

	it("halftone is a token-painted mask on ::before", () => {
		for (const mask of [".classicyIconMask", ".classicyDesktopIconMask"]) {
			expect(halftone).toContain(`${mask}::before {`);
			const before = rule(halftone, `${mask}::before`);
			expect(before["background-color"], mask).toBe("var(--color-black)");
			expect(before["mask-size"], mask).toBe("7%");
			expect(before["mask-repeat"], mask).toBe("repeat");
			// The registered `halftone` system art when a package publishes it,
			// else the built-in dot pattern.
			expect(before["mask-image"], mask).toMatch(
				/^var\(--classicy-art-halftone, url\('data:image\/svg\+xml,<svg [^']* fill="black" [^']*'\)\)$/,
			);
			expect(rule(halftone, mask)["background-image"], mask).toBeUndefined();
			expect(rule(halftone, mask).position, mask).toBe("relative");
		}
	});

	it("no literal color remains in the audited files", () => {
		const audited = {
			window: windowCss,
			alert,
			fileInput,
			icon,
			desktopIcon,
			progressBar,
			controlGroup,
			quickTime,
			finderAbout,
			webViewer,
			scrollbarsFixture,
			halftone,
		};
		for (const [name, css] of Object.entries(audited)) {
			const stripped = css
				// Comments are prose ("Otherwise white in Chrome"), data URIs are art.
				.replace(/\/\*[\s\S]*?\*\//g, "")
				.replace(/url\([^)]*\)/g, "")
				// Only the helper shapes (classicy-tint/-shade/-alpha): a token
				// mixed with white, black or transparent. A literal used as the
				// mixed color still fails.
				.replace(
					/color-mix\(in srgb, var\(--[\w-]+\)(\s+\d+%)?,\s*(white|black|transparent)(\s+\d+%)?\)/g,
					"",
				);
			expect(stripped, name).not.toMatch(
				/#[0-9a-f]{3,8}\b|rgba?\(|(^|[\s:,(])(white|black)([\s;,)]|$)/im,
			);
		}
	});
});
