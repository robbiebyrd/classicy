import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	RENAMED_APPEARANCE_PACKAGE_ID,
	rescopeToRenamed,
} from "./RenamedPackage";

// `?inline` SCSS is "" under vitest, so the registered `css` (Platinum's,
// rescoped) is empty here: Platinum's stylesheet is compiled through the
// sass API instead, and rescoped with the package's own function. vitest's
// root is the repo root.
const platinumCss = sass.compile(
	path.resolve(process.cwd(), "src/Appearance/Platinum/styles/platinum.scss"),
	{ style: "expanded" },
).css;

const renamed = () =>
	getClassicyAppearancePackage(
		RENAMED_APPEARANCE_PACKAGE_ID,
	) as ClassicyAppearancePackage;

const platinum = () =>
	getClassicyAppearancePackage("platinum") as ClassicyAppearancePackage;

/** Any scope attribute value, quoted or not, as one placeholder. */
const scopeless = (css: string) =>
	css.replace(/(data-classicy-appearance=)(["']?)[\w-]+\2/g, "$1$2SCOPE$2");

describe("the Storybook renamed appearance package", () => {
	it("registers with Movie Player and TV.app renamed and re-iconed", () => {
		const pkg = renamed();
		expect(pkg.name).toBe("Renamed (Storybook test)");
		expect(pkg.defaults).toMatchObject({
			id: "renamed-default",
			name: "Renamed",
			package: "renamed",
		});
		expect(pkg.layout).toEqual(platinum().layout);
		expect(Object.keys(pkg.apps ?? {})).toEqual(["MoviePlayer.app", "TV.app"]);
		expect(pkg.apps?.["MoviePlayer.app"]).toEqual({
			name: "Media Player",
			icon: expect.stringMatching(/renamed-media-player.*\.svg/),
			description: "Plays movies and sound.",
		});
		expect(pkg.apps?.["TV.app"]).toEqual({
			name: "Television",
			icon: expect.stringMatching(/renamed-television.*\.svg/),
		});
	});

	it("registers Platinum's registered stylesheet, rescoped", () => {
		expect(renamed().css).toBe(rescopeToRenamed(platinum().css));
	});

	it("is Platinum's compiled look with only the scope attribute value changed", () => {
		const rescoped = rescopeToRenamed(platinumCss);
		const scopes = platinumCss.match(/data-classicy-appearance=platinum\]/g);
		expect(scopes?.length).toBeGreaterThan(0);
		expect(rescoped.match(/data-classicy-appearance=renamed\]/g)).toHaveLength(
			scopes?.length ?? 0,
		);
		expect(rescoped).not.toMatch(/data-classicy-appearance=["']?platinum/);
		expect(rescoped).not.toBe(platinumCss);
		expect(scopeless(rescoped)).toBe(scopeless(platinumCss));
	});

	it("rescopes a quoted scope attribute too", () => {
		expect(
			rescopeToRenamed(
				`.classicyDesktop[data-classicy-appearance="platinum"] a{} [data-classicy-appearance='platinum'] b{}`,
			),
		).toBe(
			`.classicyDesktop[data-classicy-appearance="renamed"] a{} [data-classicy-appearance='renamed'] b{}`,
		);
	});
});
