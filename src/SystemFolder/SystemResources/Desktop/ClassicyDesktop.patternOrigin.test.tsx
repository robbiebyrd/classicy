// Story 0219-c62: a package that names elements by selector
// (`layout.patternOrigin.elements`) has the desktop publish the origin on
// the matching elements outside every window (the menu bar, open menus).
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { stubClassicyClientRects } from "@/__tests__/withClientRects";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
// Registers Platinum's sound pack, which the default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

const PACKAGE = "test-desktop-pattern-elements";

const register = (withElements: boolean) =>
	registerClassicyAppearancePackage({
		id: PACKAGE,
		name: "Desktop Pattern Elements",
		css: "",
		defaults: {
			...getTheme("default"),
			id: `${PACKAGE}-default`,
			package: PACKAGE,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			...(withElements && {
				patternOrigin: {
					elements: [{ selector: ".classicyDesktopMenuBar", origin: "window" }],
				},
			}),
		},
	});

const menuBarOrigin = () => {
	const bar = document.querySelector(".classicyDesktopMenuBar") as HTMLElement;
	expect(bar).not.toBeNull();
	return bar.style.getPropertyValue("--classicy-pattern-origin-x");
};

describe("ClassicyDesktop and a package's patternOrigin.elements", () => {
	beforeEach(() => stubClassicyClientRects());
	beforeEach(() => resetClassicyAppearancePackagesForTests());
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const renderDesktop = () =>
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);

	it("publishes the origin on the matching elements outside every window", () => {
		register(true);
		renderDesktop();
		expect(menuBarOrigin()).toMatch(/^-?\d+px$/);
	});

	it("publishes nothing without the declaration", () => {
		register(false);
		renderDesktop();
		expect(menuBarOrigin()).toBe("");
	});
});
