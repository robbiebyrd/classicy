// A scrollable window draws its scroll bars only while its content overflows.
// The contents box is `overflow: scroll` (both bars) while it overflows on
// either axis and `overflow: auto` (no bars) otherwise, switched by the
// classicyWindowScrollBarsHidden class that ClassicyWindow sets from a
// measurement of the box. jsdom lays nothing out, so the extents are stubbed
// on the element.
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
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

vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));

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
			if (!(this as Element).classList.contains("classicyWindowContents")) {
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
		".classicyWindowContents",
	) as HTMLElement;
	return { container, root, contents };
};

const barsHidden = (root: HTMLElement) =>
	root.classList.contains("classicyWindowScrollBarsHidden");

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

	it("never marks a scrollable={false} window", () => {
		const { root } = renderWindow(FITS, { scrollable: false });
		expect(barsHidden(root)).toBe(false);
		expect(root.classList.contains("classicyWindowNoScroll")).toBe(true);
	});
});
