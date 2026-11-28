import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
// Platinum registered: "under Platinum" means the default package is the
// one that draws, not merely the first registered (0015 §1.5).
import "@/__tests__/withPlatinum";
import {
	registerTestRenamePackage,
	TEST_RENAME_PACKAGE_ID,
	TEST_RENAMED_ICON,
} from "@/__tests__/testRenamePackage";
import {
	registerTestTaskbarPackage,
	TEST_DIALOG_CAPTION_LAYOUT,
	TEST_DIALOG_CAPTION_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
const mockTrack = vi.hoisted(() => vi.fn());

// The store is mocked, so nothing connects the active package id; stand in
// for the store's connection (`Appearance.packageId`).
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});

// Real ClassicyWindow is used; only its external hooks are mocked so the
// modal renders (and portals to document.body) without a provider tree.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					// The Desktop slice: the caption buttons' tooltips (a titled
					// dialog layout's) read balloon help's toggle from it.
					Manager: { Desktop: {}, Applications: { apps: {} } },
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: mockTrack, page: vi.fn() }),
	}),
);

const destroyCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
	);

describe("ClassicyAboutWindow modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// ClassicyAboutWindow is always modal={true} — ClassicyWindow's cleanup
	// effect must dispatch ClassicyWindowDestroy for it on unmount (#222/#223),
	// so reopening About from the Apple menu takes focus rather than silently
	// reusing a stale store record.
	it("dispatches ClassicyWindowDestroy for the about window on unmount", () => {
		const { unmount } = render(
			<ClassicyAboutWindow
				appId="Finder.app"
				appName="Finder"
				appIcon="finder.png"
				hideFunc={() => {}}
			/>,
		);
		expect(destroyCalls()).toHaveLength(0);

		unmount();

		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "Finder.app" },
			window: { id: "Finder.app_about" },
		});
	});
});

// HIGOS8 Ch.3 (p.23/p.57): the About box's OK is the default button and a key
// dismisses the box (Return via the default; Escape as the sole acknowledgment).
describe("ClassicyAboutWindow default button + keyboard dismissal", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	const renderAbout = (hideFunc: () => void) =>
		render(
			<ClassicyAboutWindow
				appId="Finder.app"
				appName="Finder"
				appIcon="finder.png"
				hideFunc={hideFunc}
			/>,
		);

	it("marks OK as the default button", () => {
		const { getByRole } = renderAbout(() => {});
		expect(getByRole("button", { name: "OK" })).toHaveClass("default");
	});

	it("dismisses on Escape (routed through the OK button)", () => {
		const { getByRole } = renderAbout(() => {});
		const ok = getByRole("button", { name: "OK" }) as HTMLButtonElement;
		const clickSpy = vi.spyOn(ok, "click");
		fireEvent.keyDown(ok, { key: "Escape" });
		expect(clickSpy).toHaveBeenCalled();
	});
});

// Owner ruling 2: a package's `apps` override shows in the About box; the
// analytics payload keeps the app's own identity (K-D5).
describe("ClassicyAboutWindow under a renaming package", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockTrack.mockClear();
		registerTestRenamePackage();
		activePackage.id = TEST_RENAME_PACKAGE_ID;
	});

	afterEach(() => {
		activePackage.id = "platinum";
		unregisterClassicyAppearancePackage(TEST_RENAME_PACKAGE_ID);
	});

	it("shows the package's name and icon, and tracks the app's own", () => {
		render(
			<ClassicyAboutWindow
				appId="MoviePlayer.app"
				appName="Movie Player"
				appIcon="x.png"
				hideFunc={() => {}}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Media Player" }),
		).toBeInTheDocument();
		expect(screen.queryByText("Movie Player")).toBeNull();
		expect(screen.getByAltText("About")).toHaveAttribute(
			"src",
			TEST_RENAMED_ICON,
		);
		expect(mockTrack).toHaveBeenCalledWith(
			"open",
			expect.objectContaining({
				appId: "MoviePlayer.app",
				appName: "Movie Player",
				appIcon: "x.png",
			}),
		);
	});

	it("shows the app's own name and icon under Platinum", () => {
		activePackage.id = "platinum";
		render(
			<ClassicyAboutWindow
				appId="MoviePlayer.app"
				appName="Movie Player"
				appIcon="x.png"
				hideFunc={() => {}}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Movie Player" }),
		).toBeInTheDocument();
		expect(screen.getByAltText("About")).toHaveAttribute("src", "x.png");
	});
});

// Plan 0020-w98 §6: under a layout whose `dialog.caption` is `"titled"`
// (Windows 98) the About box is captioned "About <name>", as Windows' About
// boxes are (Wine's shell32 `ShellAbout`: "About %s"), and its caption's
// Close box clicks OK, so `hideFunc` gets the real click event its type
// promises. Under Platinum it is untitled and has no Close box.
describe("ClassicyAboutWindow's caption", () => {
	const caption = () =>
		document.querySelector(".classicyWindow > .classicyWindowTitleBar");
	const closeBox = () =>
		caption()?.querySelector<HTMLElement>(".classicyWindowCloseBox") ?? null;
	const renderAbout = (hideFunc: () => void) =>
		render(
			<ClassicyAboutWindow
				appId="Finder.app"
				appName="Finder"
				appIcon="finder.png"
				hideFunc={hideFunc}
			/>,
		);

	afterEach(() => {
		activePackage.id = "platinum";
		unregisterClassicyAppearancePackage(TEST_DIALOG_CAPTION_PACKAGE_ID);
	});

	it("is untitled, with no Close box, under Platinum", () => {
		renderAbout(() => {});
		expect(caption()?.querySelector(".classicyWindowTitleText")).toBeNull();
		expect(closeBox()).toBeNull();
	});

	describe('under dialog.caption: "titled"', () => {
		beforeEach(() => {
			registerTestTaskbarPackage(
				TEST_DIALOG_CAPTION_LAYOUT,
				TEST_DIALOG_CAPTION_PACKAGE_ID,
			);
			activePackage.id = TEST_DIALOG_CAPTION_PACKAGE_ID;
		});

		it("is captioned About and the app's name", () => {
			renderAbout(() => {});
			expect(
				caption()?.querySelector(".classicyWindowTitleText p"),
			).toHaveTextContent("About Finder");
			expect(document.querySelector(".classicyWindow")).toHaveAttribute(
				"aria-label",
				"About Finder",
			);
		});

		it("clicks OK from its Close box, hideFunc receiving the click event", () => {
			const hideFunc = vi.fn();
			renderAbout(hideFunc);
			const ok = screen.getByRole("button", { name: "OK" });
			const clickSpy = vi.spyOn(ok, "click");
			fireEvent.click(closeBox() as HTMLElement);
			expect(clickSpy).toHaveBeenCalledTimes(1);
			expect(hideFunc).toHaveBeenCalledTimes(1);
			const event = hideFunc.mock.calls[0][0] as {
				type: string;
				target: unknown;
			};
			expect(event.type).toBe("click");
			expect(event.target).toBe(ok);
		});
	});
});
