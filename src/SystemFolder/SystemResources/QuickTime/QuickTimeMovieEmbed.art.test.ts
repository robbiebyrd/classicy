import { describe, expect, it } from "vitest";
import {
	compileScss,
	cssRuleLookup,
	PLATINUM_ROOT,
	parseCssRules,
} from "@/__tests__/compiledCss";

/**
 * The QuickTime controller's slider thumbs are Platinum art: the seek bar's
 * and the volume pop-up's thumb draw the registered `quickTimeThumbSlider` and
 * `quickTimeVolumeSlider` (`--classicy-art-quick-time-*`) as image layers in
 * the package. The base sheet keeps only their geometry, so a package can
 * replace the thumbs and a package with no look draws none. The thumb's drop
 * shadow and the volume track's bevel are package look too.
 */

const base = compileScss(
	"src/SystemFolder/SystemResources/QuickTime/QuickTimeMovieEmbed.scss",
);
const platinum = compileScss("src/Appearance/Platinum/styles/platinum.scss");

const baseRule = cssRuleLookup(parseCssRules(base));
const packageRule = cssRuleLookup(parseCssRules(platinum), PLATINUM_ROOT);

const SEEK_THUMB =
	".quickTimePlayerVideoControlsProgressBar::-webkit-slider-thumb";
const VOLUME_THUMB =
	".quickTimePlayerVideoControlsVolumeBar::-webkit-slider-thumb";
const VOLUME_TRACK =
	".quickTimePlayerVideoControlsVolumeBar::-webkit-slider-runnable-track";

describe("QuickTime slider thumb art", () => {
	it("the base sheet embeds no art and no data: URI", () => {
		expect(base).not.toMatch(/url\(|data:|classicy-art/);
	});

	it("the base thumbs keep their geometry and the shorthands' longhands", () => {
		expect(baseRule(SEEK_THUMB)).toMatchObject({
			"background-repeat": "no-repeat",
			"background-size": "contain",
		});
		// The volume thumb's old `background:` shorthand reset the shared
		// `contain` to `auto`; the reset is explicit now.
		expect(baseRule(VOLUME_THUMB)).toMatchObject({
			"background-repeat": "no-repeat",
			"background-size": "auto",
		});
		expect(baseRule(SEEK_THUMB)).not.toHaveProperty("filter");
		expect(baseRule(VOLUME_TRACK)).not.toHaveProperty("border");
		expect(baseRule(VOLUME_TRACK)).not.toHaveProperty("box-shadow");
	});

	it("Platinum draws the thumbs from the registered art variables", () => {
		expect(packageRule(SEEK_THUMB)["background-image"]).toBe(
			"var(--classicy-art-quick-time-thumb-slider)",
		);
		expect(packageRule(VOLUME_THUMB)["background-image"]).toBe(
			"var(--classicy-art-quick-time-volume-slider)",
		);
	});

	it("Platinum carries the thumb's drop shadow and the volume track's bevel", () => {
		expect(packageRule(SEEK_THUMB).filter).toMatch(
			/^drop-shadow\(.*var\(--color-system-06\)\)$/s,
		);
		expect(packageRule(VOLUME_TRACK)).toMatchObject({
			border: "var(--window-border-size) solid var(--color-theme-04)",
		});
		expect(packageRule(VOLUME_TRACK)["box-shadow"]).toMatch(
			/^inset .*var\(--color-theme-04\),\s*inset .*var\(--color-theme-06\)$/s,
		);
	});
});
