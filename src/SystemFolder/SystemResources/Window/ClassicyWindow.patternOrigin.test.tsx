// Story 0219-c62: a package that names elements by selector
// (`layout.patternOrigin.elements`) has every window publish the origin on
// the matching elements it holds.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { stubClassicyClientRects } from "@/__tests__/withClientRects";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
// Registers Platinum's sound pack, which the default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

// Real ClassicyWindow is used; only its external hooks are mocked. apps: {}
// means no persisted window record, so `ws` always falls back to the
// freshly-resolved (and now clamped) position -- the same shape
// ClassicyAlert.test.tsx uses, and the case this bug actually affects (a
// brand-new alert has no store entry to already hold a corrected position).
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: { apps: {} },
					},
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => mockPlayer,
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

const PACKAGE = "test-window-pattern-elements";

const content = (
	<ClassicyWindow id="W" appId="TestApp" title="Test" initialSize={[300, 200]}>
		<span className="dim">dimmed</span>
	</ClassicyWindow>
);

const originOf = (container: HTMLElement) => {
	const dim = container.querySelector(".dim") as HTMLElement;
	return dim.style.getPropertyValue("--classicy-pattern-origin-x");
};

describe("ClassicyWindow and a package's patternOrigin.elements", () => {
	beforeEach(() => {
		stubClassicyClientRects();
		resetClassicyAppearancePackagesForTests();
	});
	afterEach(() => resetClassicyAppearancePackagesForTests());

	it("publishes the origin on the matching elements it holds", () => {
		registerClassicyAppearancePackage({
			id: PACKAGE,
			name: "Window Pattern Elements",
			css: "",
			defaults: {
				...getTheme("default"),
				id: `${PACKAGE}-default`,
				package: PACKAGE,
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				patternOrigin: { elements: [{ selector: ".dim", origin: "window" }] },
			},
		});
		const { container } = render(content);
		expect(originOf(container)).toMatch(/^-?\d+px$/);
	});

	it("publishes nothing without the declaration", () => {
		const { container } = render(content);
		expect(originOf(container)).toBe("");
	});
});
