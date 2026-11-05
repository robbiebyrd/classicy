// Test Pack: a second Appearance Package for the Appearance Manager stories,
// registered at module scope (as in the Packages and Options tab tests), so
// the Packages list shows two rows and the Options tab shows a package's own
// knobs, apart from Platinum's six families (Platinum declares knobs too
// since H 2.1). It borrows Platinum's look — Platinum's stylesheet re-scoped
// to its own id — so a switch to it changes what the panel offers, not how
// the desktop looks. Only ClassicyAppearanceManager.stories.tsx imports it,
// and the registration lasts for the iframe's lifetime, so shoot those
// stories in a fresh page.
import "@/Appearance/Platinum";
import type {
	ClassicyAppearanceKnobs,
	ClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { classicyKnobsToSchema } from "@/Appearance/ClassicyAppearancePackageSchema";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import {
	type ClassicyTheme,
	getTheme,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";

/** The Test Pack's id. */
export const TEST_PACK_ID = "test-pack";

const testPackKnobs: ClassicyAppearanceKnobs = {
	controlStrip: {
		cellHeight: { label: "Cell height", min: 1, max: 512, default: 22 },
		tabWidth: { label: "Tab width", min: 4, max: 40, default: 12 },
	},
	menuBar: {
		barHeight: { label: "Menu bar height", min: 10, max: 60, default: 20 },
	},
};

const testPackTheme = (
	base: ClassicyTheme,
	id: string,
	name: string,
): ClassicyTheme => ({
	...base,
	id,
	name,
	package: TEST_PACK_ID,
	measurements: {
		...base.measurements,
		// Its own control strip family replaces Platinum's, so it declares
		// the look-only knob Platinum's control strip art reads,
		// `--control-strip-bevel-width`: the core floor carries structural
		// knobs only (0015 §1.1), and a package that uses Platinum's look
		// must declare Platinum's look-only knobs itself.
		controlStrip: { cellHeight: 22, tabWidth: 12, bevelWidth: 1 },
		menuBar: { barHeight: 20 },
	},
});

const platinum = getClassicyAppearancePackage(PLATINUM_APPEARANCE_PACKAGE_ID);
const testPackDefaults = testPackTheme(
	getTheme("default"),
	TEST_PACK_ID,
	"Test Pack",
);

/** The package as registered. */
export const TEST_PACK: ClassicyAppearancePackage = {
	id: TEST_PACK_ID,
	name: "Test Pack",
	css: (platinum?.css ?? "").replace(
		/(\[data-classicy-appearance=)("?)platinum\2\]/g,
		`$1$2${TEST_PACK_ID}$2]`,
	),
	defaults: testPackDefaults,
	presets: [
		testPackDefaults,
		testPackTheme(getTheme("azul"), `${TEST_PACK_ID}-azul`, "Test Pack Azul"),
	],
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
	knobs: testPackKnobs,
	options: classicyKnobsToSchema(testPackKnobs),
};

registerClassicyAppearancePackage(TEST_PACK);
