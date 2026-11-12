// A scrollable window draws its scroll bars only while its content overflows.
// The contents are a ClassicyScrollArea: both of Classicy's bars are drawn
// while the content overflows on either axis and none otherwise (the window
// then has the classicyWindowScrollBarsHidden class), from a measurement of
// the scrolling viewport. jsdom lays nothing out, so the extents are stubbed
// on the element.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { act, render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: {
							apps: {
								TestApp: {
									id: "TestApp",
									focused: false,
									windows: windowsRecord({
										id: "TestWindow",
										appId: "TestApp",
										collapsed: false,
										focused: false,
										dragging: false,
										moving: false,
										resizing: false,
										zoomed: false,
										closed: false,
										size: [425, 300] as [number, number],
										position: [110, 110] as [number, number],
										minimumSize: [0, 0] as [number, number],
										menuBar: [] as unknown[],
										default: false,
									}),
								},
							},
						},
					},
				},
			}),
		useAppManagerDispatch: () => vi.fn(),
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
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

type Extent = {
	clientWidth: number;
	clientHeight: number;
	scrollWidth: number;
	scrollHeight: number;
};

const FITS: Extent = {
	clientWidth: 400,
	clientHeight: 250,
	scrollWidth: 400,
	scrollHeight: 250,
};
const OVERFLOWS_TALL: Extent = { ...FITS, scrollHeight: 900 };
const OVERFLOWS_WIDE: Extent = { ...FITS, scrollWidth: 900 };

// The contents box is measured in a layout effect, before any test code can
// reach the element, so its extents are stubbed on the prototype and read
// back per element from a WeakMap; `setExtent` changes them afterwards.
const extents = new WeakMap<Element, Extent>();
let defaultExtent: Extent = FITS;
const originals = new Map<keyof Extent, PropertyDescriptor | undefined>();
for (const key of [
	"clientWidth",
	"clientHeight",
	"scrollWidth",
	"scrollHeight",
] as const) {
	originals.set(
		key,
		Object.getOwnPropertyDescriptor(HTMLElement.prototype, key) ??
			Object.getOwnPropertyDescriptor(Element.prototype, key),
	);
	Object.defineProperty(HTMLElement.prototype, key, {
		configurable: true,
		get() {
			if (!(this as Element).classList.contains("classicyScrollAreaViewport")) {
				return 0;
			}
			return (extents.get(this as Element) ?? defaultExtent)[key];
		},
	});
}

afterEach(() => {
	defaultExtent = FITS;
});

const renderWindow = (
	extent: Extent,
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) => {
	defaultExtent = extent;
	const { container } = render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test" {...props}>
			<p>Hello</p>
		</ClassicyWindow>,
	);
	const root = container.querySelector(".classicyWindow") as HTMLElement;
	const contents = container.querySelector(
		".classicyWindowContents .classicyScrollAreaViewport",
	) as HTMLElement;
	return { container, root, contents };
};

// Hidden: the window says so, and no bar is drawn. Shown: both bars.
const barsHidden = (root: HTMLElement) => {
	const bars = root.querySelectorAll(
		'.classicyWindowContents [data-classicy-part="scrollbar"]',
	);
	const hidden = root.classList.contains("classicyWindowScrollBarsHidden");
	expect(bars.length).toBe(hidden ? 0 : 2);
	return hidden;
};

describe("ClassicyWindow scroll bars appear only on overflow", () => {
	it("hides the bars while the content fits", () => {
		const { root } = renderWindow(FITS);
		expect(barsHidden(root)).toBe(true);
		expect(root.classList.contains("classicyWindowNoScroll")).toBe(false);
	});

	it("shows both bars when the content is taller than the box", () => {
		const { root } = renderWindow(OVERFLOWS_TALL);
		expect(barsHidden(root)).toBe(false);
	});

	it("shows both bars when the content is wider than the box", () => {
		const { root } = renderWindow(OVERFLOWS_WIDE);
		expect(barsHidden(root)).toBe(false);
	});

	it("ignores a 1px rounding difference", () => {
		const { root } = renderWindow({ ...FITS, scrollHeight: 251 });
		expect(barsHidden(root)).toBe(true);
	});

	it("re-measures when the content changes", async () => {
		const { root, contents } = renderWindow(FITS);
		expect(barsHidden(root)).toBe(true);

		extents.set(contents, OVERFLOWS_TALL);
		await act(async () => {
			contents.querySelector("p")?.append(document.createElement("span"));
			// MutationObserver callbacks run as a microtask.
			await Promise.resolve();
		});
		expect(barsHidden(root)).toBe(false);

		extents.set(contents, FITS);
		await act(async () => {
			contents.querySelector("span")?.remove();
			await Promise.resolve();
		});
		expect(barsHidden(root)).toBe(true);
	});

	it("keeps the bars for a window with a placard", () => {
		const { root } = renderWindow(FITS, { placard: <span>Placard</span> });
		expect(barsHidden(root)).toBe(false);
	});

	it("never marks a scrollable={false} window, and draws no bars", () => {
		const { root } = renderWindow(OVERFLOWS_TALL, { scrollable: false });
		expect(root.classList.contains("classicyWindowScrollBarsHidden")).toBe(
			false,
		);
		expect(root.classList.contains("classicyWindowNoScroll")).toBe(true);
		expect(root.querySelector('[data-classicy-part="scrollbar"]')).toBeNull();
		expect(
			root
				.querySelector(".classicyScrollAreaViewport")
				?.classList.contains("classicyScrollAreaViewportClipped"),
		).toBe(true);
	});

	it("draws the axis that fits as an empty track", () => {
		const { root } = renderWindow(OVERFLOWS_TALL);
		const horizontal = root.querySelector(".classicyScrollBarHorizontal");
		const vertical = root.querySelector(".classicyScrollBarVertical");
		expect(horizontal?.classList.contains("fits")).toBe(true);
		expect(vertical?.classList.contains("fits")).toBe(false);
	});

	it("draws its bars inactive while the window is inactive", () => {
		// The mocked store's window is not focused.
		const { root } = renderWindow(OVERFLOWS_TALL);
		for (const bar of root.querySelectorAll(
			'[data-classicy-part="scrollbar"]',
		)) {
			expect(bar.classList.contains("inactive")).toBe(true);
		}
	});

	it("draws a utility window's bars active: a windoid is always active", () => {
		const { root } = renderWindow(OVERFLOWS_TALL, { windowType: "utility" });
		for (const bar of root.querySelectorAll(
			'[data-classicy-part="scrollbar"]',
		)) {
			expect(bar.classList.contains("inactive")).toBe(false);
		}
	});
});

// A package whose layout keeps the bars in the fits state (System 7, HIG
// p.160): a document window with a size box draws both bars whether or not
// its content overflows.
describe("ClassicyWindow scroll bars under a package that keeps them while the content fits", () => {
	beforeEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage({
			id: "test-fits-bars",
			name: "Fits Bars",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-fits-bars-default",
				package: "test-fits-bars",
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				scrollBar: { fitsBars: "shown" },
			},
		});
	});
	afterEach(() => resetClassicyAppearancePackagesForTests());

	it("draws both bars, each fits, while the content fits", () => {
		const { root } = renderWindow(FITS);
		expect(barsHidden(root)).toBe(false);
		for (const bar of root.querySelectorAll(
			'[data-classicy-part="scrollbar"]',
		)) {
			expect(bar.classList.contains("fits")).toBe(true);
		}
		// Both bars: the corner where they meet, under the size box.
		expect(
			root.querySelector('[data-classicy-part="scroll-corner"]'),
		).not.toBeNull();
	});

	it("keeps drawing them when the content overflows", () => {
		const { root } = renderWindow(OVERFLOWS_TALL);
		expect(barsHidden(root)).toBe(false);
	});

	it("leaves a window with no size box (not a document window) bare", () => {
		const { root } = renderWindow(FITS, { resizable: false });
		expect(barsHidden(root)).toBe(true);
	});

	it("leaves a utility window bare", () => {
		const { root } = renderWindow(FITS, { windowType: "utility" });
		expect(barsHidden(root)).toBe(true);
	});

	it("draws none in a scrollable={false} window", () => {
		const { root } = renderWindow(FITS, { scrollable: false });
		expect(root.querySelector('[data-classicy-part="scrollbar"]')).toBeNull();
	});
});
