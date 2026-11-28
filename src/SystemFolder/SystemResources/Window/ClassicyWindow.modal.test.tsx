// Platinum's layout, for the DOM snapshot below.
import "@classicy/appearance-platinum";
import { StrictMode, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_DIALOG_CAPTION_LAYOUT,
	TEST_DIALOG_CAPTION_PACKAGE_ID,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { classicyWindowDomSnapshot } from "@/__tests__/windowDomSnapshot";
import { windowsRecord } from "@/__tests__/windowsRecord";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";
import {
	isClassicyWhatsThisActive,
	resetClassicyWhatsThisForTests,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyWindowAlertTypeContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowAlertType.internal";
import {
	type ClassicyWindowModalOwner,
	ClassicyWindowModalOwnerContext,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowModality.internal";
import {
	type ClassicyWindowRegistration,
	registerClassicyWindow,
	runClassicyWindowCommand,
	unregisterClassicyWindow,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";
import { useClassicyWindowShellKeys } from "@/SystemFolder/SystemResources/Window/useClassicyWindowShellKeys.internal";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
// The store's one window: focused or not (the shell keys act on the
// focused window), and its app's display state.
const mockStore = vi.hoisted(() => ({ focused: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => {
		const state = () => ({
			System: {
				Manager: {
					Desktop: { doubleClickTitleToCollapse: true },
					Applications: {
						focusedAppId: mockStore.focused ? "TestApp" : undefined,
						apps: {
							TestApp: {
								id: "TestApp",
								name: "Test App",
								focused: mockStore.focused,
								windows: windowsRecord({
									id: "TestWindow",
									appId: "TestApp",
									collapsed: false,
									focused: mockStore.focused,
									dragging: false,
									moving: false,
									resizing: false,
									zoomed: false,
									closed: false,
									size: [350, 200] as [number, number],
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
		});
		return {
			useAppManager: Object.assign(
				(selector: (state: unknown) => unknown) => selector(state()),
				{ getState: state },
			),
			useAppManagerDispatch: () => mockDispatch,
		};
	},
);

// The store is mocked, so nothing connects the active package id; stand in
// for the store's connection (`Appearance.packageId`).
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

const destroyCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
	);

describe("ClassicyWindow modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("dispatches ClassicyWindowDestroy when a modal window unmounts", () => {
		const { unmount } = render(
			<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
				<p>body</p>
			</ClassicyWindow>,
		);
		expect(destroyCalls()).toHaveLength(0);
		unmount();
		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "TestApp" },
			window: { id: "TestWindow" },
		});
	});

	it("dispatches nothing on unmount for a non-modal window", () => {
		const { unmount } = render(
			<ClassicyWindow id="TestWindow" appId="TestApp" title="Doc">
				<p>body</p>
			</ClassicyWindow>,
		);
		unmount();
		expect(destroyCalls()).toHaveLength(0);
	});
});

describe("ClassicyWindow modal lifecycle under StrictMode", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// StrictMode double-invokes effects on mount in dev: run -> phantom
	// cleanup -> run again, reusing the same component instance (refs
	// survive the phantom cycle). The modal cleanup effect destroys the
	// store record on that phantom teardown; if it doesn't also reset the
	// `windowRegistered` ref, the registration effect's re-run sees the ref
	// already `true` and never re-dispatches ClassicyWindowOpen, so the
	// destroyed record never comes back even though the window stays
	// mounted and visible. This asserts the ref reset keeps registration
	// symmetric with destruction: a ClassicyWindowOpen must follow the
	// phantom ClassicyWindowDestroy.
	it("re-registers after StrictMode's phantom teardown destroys the record", () => {
		render(
			<StrictMode>
				<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
					<p>body</p>
				</ClassicyWindow>
			</StrictMode>,
		);

		const lifecycleTypes = mockDispatch.mock.calls
			.map((c) => (c[0] as { type: string }).type)
			.filter(
				(type) =>
					type === "ClassicyWindowOpen" || type === "ClassicyWindowDestroy",
			);

		expect(lifecycleTypes).toEqual([
			"ClassicyWindowOpen",
			"ClassicyWindowDestroy",
			"ClassicyWindowOpen",
		]);
	});
});

describe("ClassicyWindow modal initialFocusRef (#270)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("hands the focus trap's initial focus to initialFocusRef", () => {
		const Dialog = () => {
			const defaultRef = useRef<HTMLButtonElement | null>(null);
			return (
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					title="Dialog"
					modal
					initialFocusRef={defaultRef}
				>
					<button type="button">Cancel</button>
					<button type="button" ref={defaultRef}>
						OK
					</button>
				</ClassicyWindow>
			);
		};
		render(<Dialog />);

		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "OK" }),
		);
	});
});

// Plan 0020-w98 §8: under Platinum's layout a modal draws exactly this root,
// frame and title bar: no Close box when it is not closable, and a fixed
// alert keeps `classicyWindowModalFixed`. Every shell flag is absent here, so
// no step of the plan may change them.
describe("ClassicyWindow modal DOM under Platinum's layout", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("draws a movable modal's root and title bar as before", () => {
		render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Dialog"
				modal
				closable={false}
				collapsable={false}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		const root = document.querySelector(".classicyWindow") as HTMLElement;
		expect(classicyWindowDomSnapshot(root)).toMatchInlineSnapshot(`
			"root: <div id="TestApp_TestWindow" role="application" aria-label="Dialog" style="width: 350px; height: 200px; left: 110px; top: 110px; min-width: 300px; min-height: 0px;" class="classicyWindow classicyWindowDocument active classicyWindowModal classicyWindowModalFront classicyWindowScrollBarsHidden"></div>
			children:
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-top" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-right" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-bottom" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-left" role="presentation"></div>
			  <div class="classicyWindowTitleBar classicyWindowTitleBarModal"></div>
			  <div class="classicyWindowContentsModal"></div>
			  <div class="classicyWindowResizer classicyWindowResizerDimmed" role="presentation"></div>
			titleBar:
			<div class="classicyWindowTitleBar classicyWindowTitleBarModal">
			<div class="classicyWindowTitle" role="presentation">
			<div class="classicyWindowTitleLeft"></div>
			<div class="classicyWindowIcon">
			<img alt="Dialog" src="/assets/img/icons/system/files/file.png"></div>
			<div class="classicyWindowTitleText">
			<p>Dialog</p></div>
			<div class="classicyWindowTitleRight"></div></div></div>"
		`);
	});

	it("draws a fixed alert's root and title bar as before", () => {
		render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title=""
				modal
				type="error"
				closable={false}
				collapsable={false}
				zoomable={false}
			>
				<p>body</p>
			</ClassicyWindow>,
		);
		const root = document.querySelector(".classicyWindow") as HTMLElement;
		expect(classicyWindowDomSnapshot(root)).toMatchInlineSnapshot(`
			"root: <div id="TestApp_TestWindow" role="application" style="width: 350px; height: 200px; left: 110px; top: 110px; min-width: 300px; min-height: 0px;" class="classicyWindow classicyWindowDocument active classicyWindowModal classicyWindowRed classicyWindowModalFixed classicyWindowScrollBarsHidden"></div>
			children:
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-top" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-right" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-bottom" role="presentation"></div>
			  <div class="classicyWindowFrameEdge classicyWindowFrameEdge-left" role="presentation"></div>
			  <div class="classicyWindowTitleBar classicyWindowTitleBarModal"></div>
			  <div class="classicyWindowContentsModal"></div>
			  <div class="classicyWindowResizer classicyWindowResizerDimmed" role="presentation"></div>
			titleBar:
			<div class="classicyWindowTitleBar classicyWindowTitleBarModal">
			<div class="classicyWindowTitle" role="presentation">
			<div class="classicyWindowTitleCenter"></div></div></div>"
		`);
	});
});

// Plan 0020-w98 §6, "Dialog and message box captions". Under every layout
// but `dialog.caption: "titled"` a modal's caption is Mac OS 8's: the title
// it is given, a Close box only when closable, an alert fixed in place, and
// `onCaptionClose` read nowhere. Under the flag (Windows 98) every modal's
// caption is titled (its app's display name when untitled), has a Close box
// (closing a closable modal, running `onCaptionClose` for any other, drawn
// unavailable with neither) and moves the dialog, an alert included (WIG
// Ch.8, pp.145, 164, 166); ALT+F4 and the pop-up menu's Close follow the
// Close box. Every other window is unaffected.
describe("ClassicyWindow modal captions (dialog.caption)", () => {
	const root = () =>
		document.getElementById("TestApp_TestWindow") as HTMLElement;
	const closeBox = () =>
		root().querySelector<HTMLElement>(
			":scope > .classicyWindowTitleBar .classicyWindowCloseBox",
		);
	const titleText = () =>
		root().querySelector(".classicyWindowTitleText p")?.textContent ??
		undefined;
	const tooltipText = () =>
		document.querySelector(".classicyBalloonHelpContent")?.textContent ??
		undefined;
	const dispatched = (type: string) =>
		mockDispatch.mock.calls
			.map((c) => c[0] as { type: string; moving?: boolean })
			.filter((a) => a.type === type);
	// Presses the caption and moves past the drag threshold.
	const dragCaption = () => {
		const caption = root().querySelector(
			":scope > .classicyWindowTitleBar .classicyWindowTitle",
		) as HTMLElement;
		fireEvent.mouseDown(caption, { button: 0, clientX: 150, clientY: 115 });
		fireEvent.mouseMove(document, { clientX: 170, clientY: 135 });
		fireEvent.mouseMove(root(), { clientX: 170, clientY: 135 });
	};
	const ShellKeys = () => {
		useClassicyWindowShellKeys(true);
		return null;
	};
	const altF4 = () =>
		fireEvent.keyDown(document.body, { key: "F4", code: "F4", altKey: true });

	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockStore.focused = false;
	});

	afterEach(() => {
		vi.useRealTimers();
		activePackage.id = "platinum";
		unregisterClassicyAppearancePackage(TEST_DIALOG_CAPTION_PACKAGE_ID);
	});

	describe("under Platinum's layout (no dialog.caption)", () => {
		it("draws no Close box on a non-closable modal and never runs onCaptionClose", () => {
			const onCaptionClose = vi.fn();
			render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					title="Dialog"
					modal
					closable={false}
					onCaptionClose={onCaptionClose}
				>
					<p>body</p>
				</ClassicyWindow>,
			);
			expect(closeBox()).toBeNull();
			let ran = true;
			act(() => {
				ran = runClassicyWindowCommand("TestApp", "TestWindow", {
					type: "close",
				});
			});
			expect(ran).toBe(false);
			expect(onCaptionClose).not.toHaveBeenCalled();
		});

		it("keeps an untitled modal untitled", () => {
			render(
				<ClassicyWindow id="TestWindow" appId="TestApp" modal>
					<p>body</p>
				</ClassicyWindow>,
			);
			expect(titleText()).toBeUndefined();
			expect(root()).not.toHaveAttribute("aria-label");
		});

		it("keeps an alert fixed: the caption arms no move", () => {
			render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					modal
					type="error"
					closable={false}
				>
					<p>body</p>
				</ClassicyWindow>,
			);
			expect(root()).toHaveClass("classicyWindowModalFixed");
			dragCaption();
			expect(dispatched("ClassicyWindowMove")).toEqual([]);
		});

		it("shows no caption-button tooltip", () => {
			vi.useFakeTimers();
			render(
				<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
					<p>body</p>
				</ClassicyWindow>,
			);
			fireEvent.mouseEnter(closeBox() as HTMLElement);
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(tooltipText()).toBeUndefined();
		});
	});

	describe('under dialog.caption: "titled" (Windows 98\'s)', () => {
		beforeEach(() => {
			registerTestTaskbarPackage(
				TEST_DIALOG_CAPTION_LAYOUT,
				TEST_DIALOG_CAPTION_PACKAGE_ID,
			);
			activePackage.id = TEST_DIALOG_CAPTION_PACKAGE_ID;
		});

		it("titles an untitled modal with its app's name, its accessible name following", () => {
			render(
				<ClassicyWindow id="TestWindow" appId="TestApp" modal>
					<p>body</p>
				</ClassicyWindow>,
			);
			expect(titleText()).toBe("Test App");
			expect(root()).toHaveAttribute("aria-label", "Test App");
		});

		it("titles it with the package's display name for the app", () => {
			unregisterClassicyAppearancePackage(TEST_DIALOG_CAPTION_PACKAGE_ID);
			registerClassicyAppearancePackage({
				id: TEST_DIALOG_CAPTION_PACKAGE_ID,
				name: "Dialog captions",
				css: "",
				defaults: {
					...getTheme("default"),
					id: `${TEST_DIALOG_CAPTION_PACKAGE_ID}-default`,
					package: TEST_DIALOG_CAPTION_PACKAGE_ID,
				},
				layout: TEST_DIALOG_CAPTION_LAYOUT,
				apps: { TestApp: { name: "Shown Name" } },
			});
			render(
				<ClassicyWindow id="TestWindow" appId="TestApp" modal>
					<p>body</p>
				</ClassicyWindow>,
			);
			expect(titleText()).toBe("Shown Name");
		});

		it("keeps a modal's own title, and leaves other windows untitled", async () => {
			const { unmount } = render(
				<ClassicyWindow id="TestWindow" appId="TestApp" title="Dialog" modal>
					<p>body</p>
				</ClassicyWindow>,
			);
			expect(titleText()).toBe("Dialog");
			unmount();
			const documentWindow = render(
				<ClassicyWindow id="TestWindow" appId="TestApp" closable={false}>
					<p>body</p>
				</ClassicyWindow>,
			);
			expect(titleText()).toBeUndefined();
			expect(root()).not.toHaveAttribute("aria-label");
			// A document window's Close box is as it was: none when not closable.
			expect(closeBox()).toBeNull();
			// A document window closes on the tick after it unmounts: let it
			// here, so its close is not a later test's.
			documentWindow.unmount();
			await act(async () => {
				await new Promise((resolve) => setTimeout(resolve, 0));
			});
		});

		it("runs onCaptionClose from a non-closable modal's Close box", () => {
			const onCaptionClose = vi.fn();
			render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					title="Dialog"
					modal
					closable={false}
					onCaptionClose={onCaptionClose}
				>
					<p>body</p>
				</ClassicyWindow>,
			);
			const box = closeBox() as HTMLElement;
			expect(box).not.toHaveClass("disabled");
			expect(box).not.toHaveAttribute("aria-disabled");
			fireEvent.click(box);
			fireEvent.keyDown(box, { key: "Enter" });
			expect(onCaptionClose).toHaveBeenCalledTimes(2);
			// The dialog's own button path closes it, not the window's.
			expect(dispatched("ClassicyWindowClose")).toEqual([]);
		});

		it("closes a closable modal from its Close box, as before", () => {
			const onCaptionClose = vi.fn();
			render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					title="Dialog"
					modal
					onCaptionClose={onCaptionClose}
				>
					<p>body</p>
				</ClassicyWindow>,
			);
			fireEvent.click(closeBox() as HTMLElement);
			expect(dispatched("ClassicyWindowClose")).toHaveLength(1);
			expect(onCaptionClose).not.toHaveBeenCalled();
		});

		it("draws the Close box unavailable without onCaptionClose, and it does nothing", () => {
			render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					modal
					type="error"
					closable={false}
				>
					<p>body</p>
				</ClassicyWindow>,
			);
			const box = closeBox() as HTMLElement;
			expect(box).toHaveClass("disabled");
			expect(box).toHaveAttribute("aria-disabled", "true");
			fireEvent.click(box);
			expect(dispatched("ClassicyWindowClose")).toEqual([]);
			let ran = true;
			act(() => {
				ran = runClassicyWindowCommand("TestApp", "TestWindow", {
					type: "close",
				});
			});
			expect(ran).toBe(false);
		});

		it("moves an alert and a movable={false} modal by the caption", () => {
			const { unmount } = render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					modal
					type="error"
					closable={false}
				>
					<p>body</p>
				</ClassicyWindow>,
			);
			// Its red band (the error type) is kept; only the fixed class goes.
			expect(root()).toHaveClass("classicyWindowRed");
			expect(root()).not.toHaveClass("classicyWindowModalFixed");
			dragCaption();
			expect(
				dispatched("ClassicyWindowMove").some((a) => a.moving === true),
			).toBe(true);
			unmount();
			mockDispatch.mockClear();
			render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					title="Fixed"
					modal
					movable={false}
				>
					<p>body</p>
				</ClassicyWindow>,
			);
			expect(root()).not.toHaveClass("classicyWindowModalFixed");
			dragCaption();
			expect(
				dispatched("ClassicyWindowMove").some((a) => a.moving === true),
			).toBe(true);
		});

		it("runs onCaptionClose on ALT+F4, and does nothing on a Yes/No alert's", () => {
			mockStore.focused = true;
			const onCaptionClose = vi.fn();
			const { unmount } = render(
				<ClassicyContextualMenuProvider>
					<ShellKeys />
					<ClassicyWindow
						id="TestWindow"
						appId="TestApp"
						modal
						closable={false}
						onCaptionClose={onCaptionClose}
					>
						<p>body</p>
					</ClassicyWindow>
				</ClassicyContextualMenuProvider>,
			);
			altF4();
			expect(onCaptionClose).toHaveBeenCalledTimes(1);
			unmount();
			render(
				<ClassicyContextualMenuProvider>
					<ShellKeys />
					<ClassicyWindow
						id="TestWindow"
						appId="TestApp"
						modal
						type="error"
						closable={false}
					>
						<p>body</p>
					</ClassicyWindow>
				</ClassicyContextualMenuProvider>,
			);
			altF4();
			expect(dispatched("ClassicyWindowClose")).toEqual([]);
			expect(root()).toBeInTheDocument();
		});

		it("enables the pop-up menu's Close by the Close box, and runs onCaptionClose from it", async () => {
			const onCaptionClose = vi.fn();
			const menuTitles = () =>
				Array.from(
					document.querySelectorAll<HTMLLIElement>(
						".classicyContextMenuWrapper li.classicyMenuItem",
					),
					(li) =>
						`${li.classList.contains("disabled") ? "!" : ""}${li.querySelector(":scope > p")?.textContent ?? ""}`,
				);
			const caption = () =>
				root().querySelector(":scope > .classicyWindowTitleBar") as Element;
			const { unmount } = render(
				<ClassicyContextualMenuProvider>
					<ClassicyWindow
						id="TestWindow"
						appId="TestApp"
						modal
						type="error"
						closable={false}
					>
						<p>body</p>
					</ClassicyWindow>
				</ClassicyContextualMenuProvider>,
			);
			fireEvent.contextMenu(caption(), { clientX: 150, clientY: 115 });
			// An alert moves under the flag; a Yes/No one cannot close.
			expect(menuTitles()).toEqual(["Move", "!Close"]);
			unmount();
			render(
				<ClassicyContextualMenuProvider>
					<ClassicyWindow
						id="TestWindow"
						appId="TestApp"
						modal
						type="error"
						closable={false}
						onCaptionClose={onCaptionClose}
					>
						<p>body</p>
					</ClassicyWindow>
				</ClassicyContextualMenuProvider>,
			);
			fireEvent.contextMenu(caption(), { clientX: 150, clientY: 115 });
			expect(menuTitles()).toEqual(["Move", "Close"]);
			// Chosen, as a click chooses an item: its flash ends, the menu
			// closes and the item's action runs on the next frame.
			const close = document.getElementById(
				"TestApp_TestWindow_system_close",
			) as HTMLLIElement;
			fireEvent.click(close);
			dispatchAnimationEnd(close);
			await waitFor(() => expect(onCaptionClose).toHaveBeenCalledTimes(1));
			expect(dispatched("ClassicyWindowClose")).toEqual([]);
		});

		it("names the Close box in a tooltip after 500 ms (window.captionTooltips)", () => {
			vi.useFakeTimers();
			render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					modal
					closable={false}
					onCaptionClose={vi.fn()}
				>
					<p>body</p>
				</ClassicyWindow>,
			);
			fireEvent.mouseEnter(closeBox() as HTMLElement);
			act(() => {
				vi.advanceTimersByTime(499);
			});
			expect(tooltipText()).toBeUndefined();
			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(tooltipText()).toBe("Close");
		});

		it("leaves Escape as it was: a non-closable modal beeps and runs no onCaptionClose", () => {
			const onCaptionClose = vi.fn();
			render(
				<ClassicyWindow
					id="TestWindow"
					appId="TestApp"
					modal
					closable={false}
					onCaptionClose={onCaptionClose}
				>
					<button type="button">OK</button>
				</ClassicyWindow>,
			);
			fireEvent.keyDown(screen.getByRole("button", { name: "OK" }), {
				key: "Escape",
			});
			expect(onCaptionClose).not.toHaveBeenCalled();
			expect(mockPlayer).toHaveBeenCalledWith({
				type: "ClassicySoundPlayError",
			});
		});
	});
});

// Plan 0020-w98 E3 (the shell addendum's B17): under the Windows shell a
// modal an inactive app opens while the user is not working in the page
// (no transient user activation) asks to open in the background: its
// ClassicyWindowOpen carries `background`, and it takes no focus until the
// store focuses it. With the user active, under a layout without a
// taskbar, or where the browser has no User Activation API, it opens as
// before.
describe("ClassicyWindow modal opened in the background", () => {
	const setActivation = (isActive: boolean | undefined) =>
		Object.defineProperty(navigator, "userActivation", {
			configurable: true,
			value: isActive === undefined ? undefined : { isActive },
		});
	const openCalls = () =>
		mockDispatch.mock.calls
			.map((c) => c[0] as { type: string; window?: { background?: unknown } })
			.filter((a) => a.type === "ClassicyWindowOpen");
	// The dialog's default button, its initial focus (as a bundled alert
	// hands it its default button).
	const okButton = () => screen.getByRole("button", { name: "OK" });
	const focusInDialog = () => document.activeElement === okButton();
	const Dialog = () => {
		const defaultRef = useRef<HTMLButtonElement | null>(null);
		return (
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Dialog"
				modal
				initialFocusRef={defaultRef}
			>
				<button type="button">Cancel</button>
				<button type="button" ref={defaultRef}>
					OK
				</button>
			</ClassicyWindow>
		);
	};

	beforeEach(() => {
		mockDispatch.mockClear();
		mockStore.focused = false;
		registerTestTaskbarPackage();
		activePackage.id = TEST_TASKBAR_PACKAGE_ID;
	});

	afterEach(() => {
		setActivation(undefined);
		mockStore.focused = false;
		activePackage.id = "platinum";
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
	});

	it("asks for the background and takes no focus, under the shell with the user idle", () => {
		setActivation(false);
		render(<Dialog />);
		expect(openCalls()[0]?.window?.background).toBe(true);
		expect(focusInDialog()).toBe(false);
	});

	it("takes the focus once the store focuses it", () => {
		setActivation(false);
		const { rerender } = render(<Dialog />);
		expect(focusInDialog()).toBe(false);
		mockStore.focused = true;
		rerender(<Dialog />);
		expect(focusInDialog()).toBe(true);
	});

	it.each([
		["the user is active", true],
		["the browser has no User Activation API", undefined],
	])("opens as before when %s", (_name, active) => {
		setActivation(active);
		render(<Dialog />);
		expect(openCalls()[0]?.window).not.toHaveProperty("background");
		expect(focusInDialog()).toBe(true);
	});

	it("opens as before when its app is the focused one", () => {
		setActivation(false);
		mockStore.focused = true;
		render(<Dialog />);
		expect(openCalls()[0]?.window).not.toHaveProperty("background");
	});

	it("opens as before under a layout without a taskbar", () => {
		setActivation(false);
		activePackage.id = "platinum";
		render(<Dialog />);
		expect(openCalls()[0]?.window).not.toHaveProperty("background");
		expect(focusInDialog()).toBe(true);
	});
});

// Hand-off C8 (the remaining chapters' audit's 12.2, B.5; WIG Ch.8
// "Appearance and Behavior", p.145; Ch.12 "Context-Sensitive Help", p.273):
// under `balloonHelp.contextHelp` "whatsThis" (Windows 98) a dialog whose
// content holds a described control draws the "?" caption box, and its press
// starts the What's This? mode over the window; a message box, a dialog
// with nothing described, a document window and every other layout draw
// none.
describe("ClassicyWindow's What's This? box (C8)", () => {
	const WHATS_THIS_PACKAGE_ID = "test-whats-this";
	const helpBox = () =>
		document.querySelector<HTMLElement>(
			'#TestApp_TestWindow [data-classicy-control="help"]',
		);
	const useWhatsThis = () => {
		registerTestTaskbarPackage(
			{
				...TEST_DIALOG_CAPTION_LAYOUT,
				balloonHelp: { contextHelp: "whatsThis" },
			},
			WHATS_THIS_PACKAGE_ID,
		);
		activePackage.id = WHATS_THIS_PACKAGE_ID;
	};
	const dialog = (
		props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
		described = true,
	) => (
		<ClassicyWindow
			id="TestWindow"
			appId="TestApp"
			title="Dialog"
			modal
			{...props}
		>
			{described ? (
				<ClassicyBalloonHelp content="Names the file.">
					<span>Name</span>
				</ClassicyBalloonHelp>
			) : (
				<span>Name</span>
			)}
		</ClassicyWindow>
	);
	beforeEach(() => {
		mockDispatch.mockClear();
	});
	afterEach(() => {
		resetClassicyWhatsThisForTests();
		activePackage.id = "platinum";
		unregisterClassicyAppearancePackage(WHATS_THIS_PACKAGE_ID);
	});

	it("draws the box on a dialog with described content, and its press starts the mode over the window", () => {
		useWhatsThis();
		render(dialog());
		const wrapper = helpBox() as HTMLElement;
		expect(wrapper).not.toBeNull();
		expect(wrapper.hasAttribute("data-classicy-whats-this")).toBe(true);
		fireEvent.click(
			wrapper.querySelector(".classicyWindowHelpBox") as HTMLElement,
		);
		expect(isClassicyWhatsThisActive()).toBe(true);
		// The command again ends it.
		fireEvent.click(
			wrapper.querySelector(".classicyWindowHelpBox") as HTMLElement,
		);
		expect(isClassicyWhatsThisActive()).toBe(false);
	});

	it("draws none on a dialog with nothing described, a message box or a document window", () => {
		useWhatsThis();
		const { unmount } = render(dialog({}, false));
		expect(helpBox()).toBeNull();
		unmount();
		const alert = render(
			<ClassicyWindowAlertTypeContext.Provider value="caution">
				{dialog()}
			</ClassicyWindowAlertTypeContext.Provider>,
		);
		expect(helpBox()).toBeNull();
		alert.unmount();
		render(dialog({ modal: false }));
		expect(helpBox()).toBeNull();
	});

	it("draws none under Platinum's layout", () => {
		render(dialog());
		expect(helpBox()).toBeNull();
	});

	// A property sheet (WIG Ch.8 "Property Sheets", p.145) is modeless and
	// carries the box: `contextHelp`.
	it("draws the box on a modeless window with contextHelp and described content", () => {
		useWhatsThis();
		const { unmount } = render(dialog({ modal: false, contextHelp: true }));
		expect(helpBox()).not.toBeNull();
		unmount();
		render(dialog({ modal: false, contextHelp: true }, false));
		expect(helpBox()).toBeNull();
	});

	it("draws none for contextHelp under Platinum's layout", () => {
		render(dialog({ modal: false, contextHelp: true }));
		expect(helpBox()).toBeNull();
	});
});

// `layout.window.utilityTitle` (Windows 98's tool windows, whose small
// caption carries the title): a palette's bar draws its title text before
// its band; under Platinum's layout (no flag) the bar stays one title-less
// band, and a document window's bar is the same either way.
describe("ClassicyWindow's utility title (window.utilityTitle)", () => {
	const UTILITY_TITLE_PACKAGE_ID = "test-utility-title";
	const titleParts = () =>
		[
			...(document.querySelector(
				"#TestApp_TestWindow > .classicyWindowTitleBar .classicyWindowTitle",
			)?.children ?? []),
		].map((child) => child.className);
	const palette = (windowType?: "utility") => (
		<ClassicyWindow
			id="TestWindow"
			appId="TestApp"
			title="Tools"
			windowType={windowType}
		>
			<p>body</p>
		</ClassicyWindow>
	);

	beforeEach(() => {
		mockDispatch.mockClear();
		mockStore.focused = false;
	});

	afterEach(() => {
		activePackage.id = "platinum";
		unregisterClassicyAppearancePackage(UTILITY_TITLE_PACKAGE_ID);
	});

	it("draws a palette's title under the flag", () => {
		registerTestTaskbarPackage(
			{
				...TEST_DIALOG_CAPTION_LAYOUT,
				window: { ...TEST_DIALOG_CAPTION_LAYOUT.window, utilityTitle: true },
			},
			UTILITY_TITLE_PACKAGE_ID,
		);
		activePackage.id = UTILITY_TITLE_PACKAGE_ID;
		render(palette("utility"));
		expect(titleParts()).toEqual([
			"classicyWindowTitleText",
			"classicyWindowTitleCenter",
		]);
		expect(
			document.querySelector("#TestApp_TestWindow .classicyWindowTitleText p"),
		).toHaveTextContent("Tools");
	});

	it("draws none under Platinum's layout", () => {
		render(palette("utility"));
		expect(titleParts()).toEqual(["classicyWindowTitleCenter"]);
	});

	it("leaves a document window's bar as it was under the flag", () => {
		registerTestTaskbarPackage(
			{
				...TEST_DIALOG_CAPTION_LAYOUT,
				window: { ...TEST_DIALOG_CAPTION_LAYOUT.window, utilityTitle: true },
			},
			UTILITY_TITLE_PACKAGE_ID,
		);
		activePackage.id = UTILITY_TITLE_PACKAGE_ID;
		render(palette());
		expect(titleParts()).toEqual([
			"classicyWindowTitleLeft",
			"classicyWindowIcon",
			"classicyWindowTitleText",
			"classicyWindowTitleRight",
		]);
	});
});

// The shell addendum's B18 (WIG Ch.10 "Message Notification", p.212,
// "Modeless Interaction", p.214; Ch.8 "Modeless vs. Modal", p.147): under
// `dialog.modality: "application"` a modal blocks its own app alone.
describe("ClassicyWindow application-modal dialogs (dialog.modality)", () => {
	const APP_MODAL_PACKAGE_ID = "test-application-modal";
	const made: ClassicyWindowRegistration[] = [];
	const elements: HTMLElement[] = [];
	// A modeless window of `appId` in the registry, with a root drawn at
	// 0,0 400 x 300 (jsdom lays nothing out).
	const ownWindow = (appId: string, windowId: string) => {
		const el = document.createElement("div");
		el.id = `${appId}_${windowId}`;
		el.className = "classicyWindow";
		el.getBoundingClientRect = () =>
			({ left: 0, top: 0, right: 400, bottom: 300 }) as DOMRect;
		const inner = document.createElement("button");
		inner.textContent = `${windowId} button`;
		el.appendChild(inner);
		document.body.appendChild(el);
		elements.push(el);
		made.push(
			registerClassicyWindow({
				appId,
				windowId,
				title: windowId,
				icon: "",
				modal: false,
				windowType: "document",
				closable: true,
				zoomable: true,
				collapsable: true,
				resizable: true,
				movable: true,
				geometry: () => undefined,
				run: () => true,
			}),
		);
		return el;
	};
	const scrim = () => document.querySelector(".classicyWindowModalScrim");
	const beeps = () =>
		mockPlayer.mock.calls.filter(
			(c) => (c[0] as { type: string }).type === "ClassicySoundPlayError",
		).length;
	const focusCalls = () =>
		mockDispatch.mock.calls
			.map((c) => c[0] as { type: string; window?: { id?: string } })
			.filter((a) => a.type === "ClassicyWindowFocus");
	const Dialog = ({
		type,
		owner,
	}: {
		type?: "default" | "error";
		owner?: ClassicyWindowModalOwner;
	}) => (
		<ClassicyWindowModalOwnerContext.Provider value={owner}>
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Dialog"
				modal
				type={type}
			>
				<button type="button">OK</button>
			</ClassicyWindow>
		</ClassicyWindowModalOwnerContext.Provider>
	);
	const useApplicationModality = () => {
		registerTestTaskbarPackage(
			{
				...TEST_DIALOG_CAPTION_LAYOUT,
				dialog: { caption: "titled", modality: "application" },
			},
			APP_MODAL_PACKAGE_ID,
		);
		activePackage.id = APP_MODAL_PACKAGE_ID;
	};

	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockStore.focused = false;
	});

	afterEach(() => {
		for (const registration of made.splice(0))
			unregisterClassicyWindow(registration);
		for (const el of elements.splice(0)) el.remove();
		activePackage.id = "platinum";
		mockStore.focused = false;
		unregisterClassicyAppearancePackage(APP_MODAL_PACKAGE_ID);
	});

	describe('under "application" (Windows 98\'s)', () => {
		beforeEach(useApplicationModality);

		it("draws no scrim and makes its own app's other windows inert, not another app's", () => {
			const owner = ownWindow("TestApp", "Owner");
			const other = ownWindow("OtherApp", "Other");
			const { unmount } = render(<Dialog />);
			expect(scrim()).toBeNull();
			expect(owner).toHaveAttribute("inert");
			expect(other).not.toHaveAttribute("inert");
			// The dialog itself stays usable.
			expect(document.getElementById("TestApp_TestWindow")).not.toHaveAttribute(
				"inert",
			);
			unmount();
			expect(owner).not.toHaveAttribute("inert");
		});

		it("makes a window of its app that opens meanwhile inert too", () => {
			render(<Dialog />);
			const later = ownWindow("TestApp", "Later");
			expect(later).toHaveAttribute("inert");
		});

		it("beeps and focuses the dialog on a press over an owner window, and leaves other presses alone", () => {
			const owner = ownWindow("TestApp", "Owner");
			const other = ownWindow("OtherApp", "Other");
			render(<Dialog />);
			mockDispatch.mockClear();
			const blocked = fireEvent.mouseDown(
				owner.querySelector("button") as HTMLElement,
				{ button: 0, clientX: 20, clientY: 20 },
			);
			expect(blocked).toBe(false);
			expect(beeps()).toBe(1);
			expect(focusCalls().map((a) => a.window?.id)).toEqual(["TestWindow"]);
			expect(document.activeElement).toHaveTextContent("OK");
			// A browser hands a press on an inert window to what lies under it:
			// the desktop there counts as the owner window.
			const desktop = document.createElement("div");
			desktop.id = "classicyDesktop";
			document.body.appendChild(desktop);
			elements.push(desktop);
			fireEvent.mouseDown(desktop, { button: 0, clientX: 30, clientY: 30 });
			expect(beeps()).toBe(2);
			fireEvent.mouseDown(desktop, { button: 0, clientX: 600, clientY: 500 });
			expect(beeps()).toBe(2);
			// The dialog and another app's window take their presses.
			mockPlayer.mockClear();
			expect(
				fireEvent.mouseDown(screen.getByRole("button", { name: "OK" }), {
					button: 0,
				}),
			).toBe(true);
			expect(
				fireEvent.mouseDown(other.querySelector("button") as HTMLElement, {
					button: 0,
					clientX: 500,
					clientY: 500,
				}),
			).toBe(true);
			expect(beeps()).toBe(0);
		});

		it("keeps the modal-front band only while its app is focused", () => {
			const { rerender } = render(<Dialog />);
			const root = () =>
				document.getElementById("TestApp_TestWindow") as HTMLElement;
			expect(root()).not.toHaveClass("classicyWindowModalFront");
			mockStore.focused = true;
			rerender(<Dialog />);
			expect(root()).toHaveClass("classicyWindowModalFront");
		});

		it("keeps the scrim for an error alert and a system-modal dialog", () => {
			const owner = ownWindow("TestApp", "Owner");
			const { unmount } = render(<Dialog type="error" />);
			expect(scrim()).not.toBeNull();
			expect(owner).not.toHaveAttribute("inert");
			unmount();
			render(<Dialog owner="system" />);
			expect(scrim()).not.toBeNull();
			expect(owner).not.toHaveAttribute("inert");
		});

		it("blocks nothing for a dialog the taskbar owns (Run)", () => {
			const owner = ownWindow("TestApp", "Owner");
			render(<Dialog owner="taskbar" />);
			expect(scrim()).toBeNull();
			expect(owner).not.toHaveAttribute("inert");
			fireEvent.mouseDown(owner.querySelector("button") as HTMLElement, {
				button: 0,
			});
			expect(beeps()).toBe(0);
		});
	});

	describe("under Platinum's layout (no dialog.modality)", () => {
		it("draws the scrim for every modal and makes nothing inert, as before", () => {
			const owner = ownWindow("TestApp", "Owner");
			render(<Dialog />);
			expect(scrim()).not.toBeNull();
			expect(owner).not.toHaveAttribute("inert");
			expect(document.getElementById("TestApp_TestWindow")).toHaveClass(
				"classicyWindowModalFront",
			);
			fireEvent.mouseDown(owner.querySelector("button") as HTMLElement, {
				button: 0,
			});
			expect(beeps()).toBe(0);
		});

		it('keeps the scrim under dialog.caption "titled" alone', () => {
			registerTestTaskbarPackage(
				TEST_DIALOG_CAPTION_LAYOUT,
				APP_MODAL_PACKAGE_ID,
			);
			activePackage.id = APP_MODAL_PACKAGE_ID;
			render(<Dialog />);
			expect(scrim()).not.toBeNull();
		});
	});
});
