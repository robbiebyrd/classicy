import "@/__tests__/withPlatinum";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { classicyTabbableElements } from "@/SystemFolder/SystemResources/Keyboard/ClassicyTabbable.internal";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// No keyboard trap on the desktop's icons (story 0228-e9l, re-review 2, K1;
// WCAG 2.2 SC 2.1.2). Tab and Shift-Tab select the icons by name, as the
// Mac OS 8.1 Finder's did, but where 8.1 wrapped from the last name to the
// first, the keyboard leaves the icons for the page's next (previous) stop:
// the host's content around an embedded desktop, the Control Strip and the
// windows. The reviewer's probe, as a regression test.

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }),
	}),
);

beforeEach(() => {
	localStorage.clear();
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});
afterEach(() => {
	act(() => {
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});
});

const icon = (label: string, location: [number, number]) => ({
	appId: `${label}.app`,
	appName: label,
	label,
	icon: "/i.png",
	kind: "app_shortcut",
	location,
	noLaunch: true,
});

/** Leaves the desktop exactly Beta, Alpha and Gamma, in that DOM order. */
const placeIcons = () =>
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Desktop.icons = [
					icon("Beta", [900, 40]),
					icon("Alpha", [900, 200]),
					icon("Gamma", [900, 600]),
				];
				draft.System.Manager.Desktop.selectedIcons = [];
			}),
		);
	});

const focused = () => (document.activeElement as HTMLElement | null)?.id;
const selected = () =>
	useAppManager.getState().System.Manager.Desktop.selectedIcons ?? [];
/** Tab (Shift-Tab) on the focused element; whether the browser's own runs. */
const tab = (shiftKey = false) =>
	fireEvent.keyDown(document.activeElement as Element, {
		key: "Tab",
		shiftKey,
	});

describe("Tab on the desktop's icons leaves at the ends (no keyboard trap)", () => {
	const renderEmbedded = () => {
		const view = render(
			<div>
				<button type="button" id="hostBefore">
					before
				</button>
				<ClassicyAppManagerProvider>
					<ClassicyDesktop controlStrip={false} />
				</ClassicyAppManagerProvider>
				<button type="button" id="hostAfter">
					after
				</button>
			</div>,
		);
		placeIcons();
		return view;
	};

	it("selects by name, then Tab at the last name moves on to the host's next stop", () => {
		renderEmbedded();
		// Shift-Tab from the host's button after the desktop lands on the
		// DOM-last icon.
		(document.getElementById("Gamma.app.shortcut") as HTMLElement).focus();
		const seen: string[] = [];
		for (let i = 0; i < 4; i++) {
			tab();
			seen.push(focused() ?? "");
		}
		expect(seen).toEqual([
			"Alpha.app.shortcut",
			"Beta.app.shortcut",
			"Gamma.app.shortcut",
			"hostAfter",
		]);
		// The selection stays on the last name.
		expect(selected()).toEqual(["Gamma.app"]);
	});

	it("selects backward by name, then Shift-Tab at the first name moves back to the host's previous stop", () => {
		renderEmbedded();
		(document.getElementById("Gamma.app.shortcut") as HTMLElement).focus();
		const seen: string[] = [];
		for (let i = 0; i < 4; i++) {
			tab(true);
			seen.push(focused() ?? "");
		}
		expect(seen).toEqual([
			"Gamma.app.shortcut",
			"Beta.app.shortcut",
			"Alpha.app.shortcut",
			"hostBefore",
		]);
		expect(selected()).toEqual(["Alpha.app"]);
	});

	it("leaves from the desktop itself too, and never wraps", () => {
		renderEmbedded();
		const desktop = document.getElementById("classicyDesktop") as HTMLElement;
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = ["Gamma.app"];
				}),
			);
		});
		desktop.focus();
		expect(tab()).toBe(false);
		expect(focused()).toBe("hostAfter");
		expect(selected()).toEqual(["Gamma.app"]);
		// With nothing selected Tab still selects the first name (8.1).
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = [];
				}),
			);
		});
		desktop.focus();
		tab();
		expect(selected()).toEqual(["Alpha.app"]);
		expect(focused()).toBe("Alpha.app.shortcut");
	});

	it("lets the browser's own Tab leave the page from the last icon when nothing follows the desktop", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		placeIcons();
		(document.getElementById("Alpha.app.shortcut") as HTMLElement).focus();
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = ["Gamma.app"];
				}),
			);
		});
		// Not prevented, from the DOM-last icon: the browser's Tab goes on
		// past the desktop (here, out of the page).
		expect(tab()).toBe(true);
		expect(focused()).toBe("Gamma.app.shortcut");
	});

	it("reaches the Control Strip and the windows from the icons", () => {
		const APP_ID = "T.app";
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<ClassicyApp id={APP_ID} name="T" icon="" showDesktopIcon={false}>
						<ClassicyWindow id="main" appId={APP_ID} title="Main">
							<p>body</p>
						</ClassicyWindow>
					</ClassicyApp>
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Applications.apps[APP_ID] = {
						id: APP_ID,
						name: "T",
						icon: "",
						windows: {},
						open: true,
						focused: true,
						data: {},
					};
				}),
			);
		});
		placeIcons();
		const order = classicyTabbableElements();
		const isIcon = (el: Element) =>
			el.classList.contains("classicyDesktopIcon");
		const firstIcon = order.findIndex(isIcon);
		const lastIcon = order.findLastIndex(isIcon);
		// The icons are one run in the page's order; the windows' controls
		// and the Control Strip are stops outside it, which the browser's own
		// Tab and Shift-Tab walk to from where the icons are left.
		expect(order.slice(firstIcon, lastIcon + 1).every(isIcon)).toBe(true);
		const outside = [
			...order.slice(0, firstIcon),
			...order.slice(lastIcon + 1),
		];
		expect(outside.some((el) => el.closest(".classicyWindow"))).toBe(true);
		expect(outside.some((el) => el.closest(".classicyControlStrip"))).toBe(
			true,
		);
		// Shift-Tab at the first name lands on the stop just before the
		// icons, Tab at the last name on the stop just after them.
		(document.getElementById("Alpha.app.shortcut") as HTMLElement).focus();
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = ["Alpha.app"];
				}),
			);
		});
		expect(tab(true)).toBe(false);
		expect(document.activeElement).toBe(order[firstIcon - 1]);
		(document.getElementById("Gamma.app.shortcut") as HTMLElement).focus();
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.selectedIcons = ["Gamma.app"];
				}),
			);
		});
		expect(tab()).toBe(false);
		expect(document.activeElement).toBe(order[lastIcon + 1]);
		for (const el of [order[firstIcon - 1], order[lastIcon + 1]])
			expect(isIcon(el)).toBe(false);
	});
});
