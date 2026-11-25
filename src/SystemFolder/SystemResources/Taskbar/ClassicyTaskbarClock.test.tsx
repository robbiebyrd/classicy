import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "@/__tests__/withPlatinum";
import { dispatchAnimationEnd } from "@/__tests__/animationEnd";
import { act, fireEvent, render, waitFor } from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_MINIMIZE_LAYOUT,
	TEST_MINIMIZE_PACKAGE_ID,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import type {
	ActionMessage,
	ClassicyStoreSystemDateAndTimeManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppWindow } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import {
	DATE_AND_TIME_MANAGER_APP_ID,
	DATE_AND_TIME_MANAGER_APP_NAME,
} from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerManifest";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { CLASSICY_CONTROL_STRIP_MODULE_IDS } from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import { ClassicyTaskbar } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbar";
import {
	classicyTaskbarClockDateTime,
	classicyTaskbarClockLongDate,
	classicyTaskbarClockMenuItems,
	classicyTaskbarClockTime,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarClock.internal";
import { CLASSICY_TASKBAR_MENU_IDS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarMenu.internal";
import { CLASSICY_TASKBAR_TOOLTIP_DELAY_MS } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarTasks.internal";
import {
	type ClassicyWindowRegistration,
	registerClassicyWindow,
	unregisterClassicyWindow,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowRegistry.internal";

// Plan 0020-w98 §2, "The clock": the taskbar's clock at the status area's
// right end (WIG Ch.3 "The Status Area", p.16; Ch.10 "Status Notification",
// p.211, Figure 10.2), in Windows' short time format with the long date as
// its tooltip (ReactOS `trayclock.cpp`), a double-click opening Date & Time
// and button 2 the taskbar's menu with Adjust Date/Time first.

const dispatched = vi.hoisted((): ActionMessage[] => []);
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const { recordingAppManagerUtils } = await import(
			"@/__tests__/recordingAppManagerUtils"
		);
		return recordingAppManagerUtils(await importOriginal(), dispatched);
	},
);

/** A moment whose UTC fields read the local time, as the clock hook gives it. */
const local = (iso: string) => new Date(`${iso}Z`);

describe("classicyTaskbarClockTime", () => {
	it("is Windows' US short time without seconds, h:mm AM", () => {
		expect(classicyTaskbarClockTime(local("2026-11-25T16:37:12"), false)).toBe(
			"4:37 PM",
		);
		expect(classicyTaskbarClockTime(local("2026-11-25T09:07:59"), false)).toBe(
			"9:07 AM",
		);
		expect(classicyTaskbarClockTime(local("2026-11-25T00:05:00"), false)).toBe(
			"12:05 AM",
		);
		expect(classicyTaskbarClockTime(local("2026-11-25T12:00:00"), false)).toBe(
			"12:00 PM",
		);
		expect(classicyTaskbarClockTime(local("2026-11-25T23:59:00"), false)).toBe(
			"11:59 PM",
		);
	});

	it("is HH:mm on a 24-hour clock", () => {
		expect(classicyTaskbarClockTime(local("2026-11-25T16:37:12"), true)).toBe(
			"16:37",
		);
		expect(classicyTaskbarClockTime(local("2026-11-25T09:07:00"), true)).toBe(
			"09:07",
		);
		expect(classicyTaskbarClockTime(local("2026-11-25T00:05:00"), true)).toBe(
			"00:05",
		);
	});
});

describe("classicyTaskbarClockLongDate", () => {
	it("is Windows' US long date, dddd, MMMM dd, yyyy", () => {
		expect(classicyTaskbarClockLongDate(local("2026-11-25T16:37:00"))).toBe(
			"Wednesday, November 25, 2026",
		);
		// The day keeps two digits (Wine enu.nls, LOCALE_SLONGDATE).
		expect(classicyTaskbarClockLongDate(local("2026-11-05T23:59:00"))).toBe(
			"Thursday, November 05, 2026",
		);
		expect(classicyTaskbarClockLongDate(local("2027-01-01T00:00:00"))).toBe(
			"Friday, January 01, 2027",
		);
	});
});

describe("classicyTaskbarClockDateTime", () => {
	it("is the local date and time shown, to the minute", () => {
		expect(classicyTaskbarClockDateTime(local("2026-11-25T16:37:12"))).toBe(
			"2026-11-25T16:37",
		);
		expect(classicyTaskbarClockDateTime(local("2027-01-01T00:05:00"))).toBe(
			"2027-01-01T00:05",
		);
	});
});

describe("classicyTaskbarClockMenuItems", () => {
	it("is Adjust Date/Time, the menu's default item", () => {
		const onAdjust = () => {};
		expect(classicyTaskbarClockMenuItems(onAdjust)).toEqual([
			{
				id: CLASSICY_TASKBAR_MENU_IDS.adjustDateTime,
				title: "Adjust Date/Time",
				isDefault: true,
				onClickFunc: onAdjust,
			},
		]);
	});
});

// Wednesday, November 25, 2026, 4:37:12 PM at UTC−5.
const UTC = "2026-11-25T21:37:12.000Z";
const NOW = Date.parse("2026-11-25T12:00:00.000Z");
const BUILT_INS: string[] = Object.values(CLASSICY_CONTROL_STRIP_MODULE_IDS);

const setDateAndTime = (
	patch: Partial<ClassicyStoreSystemDateAndTimeManager>,
) =>
	act(() =>
		useAppManager.setState((s) =>
			produce(s, (draft) => {
				Object.assign(draft.System.Manager.DateAndTime, patch);
			}),
		),
	);

const clock = () =>
	document.querySelector<HTMLTimeElement>("time.classicyTaskbarClock");
const balloonText = () =>
	document.querySelector(".classicyBalloonHelpContent")?.textContent;
const contextMenu = () => document.querySelector(".classicyContextMenuWrapper");
const menuItem = (id: string) => document.getElementById(id);
const dateTimeSets = () =>
	dispatched.filter((a) => a.type === "ClassicyManagerDateTimeSet");
const dateAndTimeOpens = () =>
	dispatched.filter(
		(a) =>
			a.type === "ClassicyAppOpen" &&
			(a.app as { id?: string } | undefined)?.id ===
				DATE_AND_TIME_MANAGER_APP_ID,
	);

const resetStore = () => {
	const state = structuredClone(DefaultAppManagerState);
	state.System.Manager.DateAndTime = {
		...state.System.Manager.DateAndTime,
		dateTime: UTC,
		timeZoneOffset: "-5",
		militaryTime: false,
		show: true,
		paused: false,
	};
	useAppManager.setState(state, true);
};

describe("the taskbar's clock", () => {
	const renderTaskbar = () =>
		render(
			<ClassicyContextualMenuProvider>
				<div className="classicyDesktop" id="classicyDesktop">
					<ClassicyTaskbar disabledModules={BUILT_INS} />
				</div>
			</ClassicyContextualMenuProvider>,
		);

	beforeEach(() => {
		localStorage.clear();
		resetStore();
		registerTestTaskbarPackage();
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: TEST_TASKBAR_PACKAGE_ID,
			}),
		);
		dispatched.length = 0;
	});

	afterEach(() => {
		vi.useRealTimers();
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
		unregisterClassicyAppearancePackage(TEST_MINIMIZE_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	describe("structure", () => {
		it("ends the status area: a <time>, the clock part, after the extensions' region", () => {
			renderTaskbar();
			const tray = document.querySelector(".classicyTaskbarTray");
			const last = tray?.lastElementChild;
			expect(last).toBe(clock());
			expect(last?.previousElementSibling).toHaveAttribute(
				"id",
				"classicyDesktopMenuExtensions",
			);
			const time = clock() as HTMLTimeElement;
			expect(time.tagName).toBe("TIME");
			expect(time.className).toBe("classicyTaskbarClock");
			expect(time).toHaveAttribute("data-classicy-part", "clock");
			expect(time).toHaveAttribute("dateTime", "2026-11-25T16:37");
			expect(time).toHaveAttribute(
				"aria-label",
				"Wednesday, November 25, 2026, 4:37 PM",
			);
			expect(time.textContent).toBe("4:37 PM");
			// Never a tab stop: the taskbar's clock is not a control.
			expect(time).not.toHaveAttribute("tabindex");
		});

		it("draws the time on a 24-hour clock as HH:mm", () => {
			setDateAndTime({ militaryTime: true });
			renderTaskbar();
			expect(clock()?.textContent).toBe("16:37");
			expect(clock()).toHaveAttribute(
				"aria-label",
				"Wednesday, November 25, 2026, 16:37",
			);
		});

		it("ignores the Mac clock's seconds, day and flashing separators", () => {
			setDateAndTime({
				displaySeconds: true,
				displayDay: true,
				displayLongDay: true,
				flashSeparators: true,
				displayPeriod: false,
			});
			renderTaskbar();
			expect(clock()?.textContent).toBe("4:37 PM");
			expect(clock()?.children).toHaveLength(0);
		});

		it("is hidden while the Date & Time control panel hides the clock, the status area kept", () => {
			setDateAndTime({ show: false });
			renderTaskbar();
			expect(clock()).toBeNull();
			expect(document.querySelector(".classicyTaskbarTray")).not.toBeNull();
			setDateAndTime({ show: true });
			expect(clock()?.textContent).toBe("4:37 PM");
		});

		it("stays when the status area shows no module", () => {
			act(() =>
				dispatch({
					type: "ClassicyDesktopControlStripSetVisible",
					visible: false,
				}),
			);
			renderTaskbar();
			expect(document.querySelector(".classicyTaskbarTrayIcon")).toBeNull();
			expect(clock()).not.toBeNull();
		});
	});

	describe("the time", () => {
		it("turns with the minute and writes the store once, on the minute", () => {
			vi.useFakeTimers();
			vi.setSystemTime(NOW);
			renderTaskbar();
			act(() => {
				vi.advanceTimersByTime(47_000);
			});
			expect(clock()?.textContent).toBe("4:37 PM");
			expect(dateTimeSets()).toHaveLength(0);
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(clock()?.textContent).toBe("4:38 PM");
			expect(clock()).toHaveAttribute("dateTime", "2026-11-25T16:38");
			expect(dateTimeSets()).toHaveLength(1);
			expect(useAppManager.getState().System.Manager.DateAndTime.dateTime).toBe(
				"2026-11-25T21:38:00.000Z",
			);
		});

		it("keeps the store on time while it is hidden", () => {
			vi.useFakeTimers();
			vi.setSystemTime(NOW);
			setDateAndTime({ show: false });
			renderTaskbar();
			act(() => {
				vi.advanceTimersByTime(48_000);
			});
			expect(dateTimeSets()).toHaveLength(1);
		});

		it("shows a time the store is set to at once, and stands still while paused", () => {
			vi.useFakeTimers();
			vi.setSystemTime(NOW);
			renderTaskbar();
			setDateAndTime({ dateTime: "2026-11-26T05:05:00.000Z" });
			expect(clock()?.textContent).toBe("12:05 AM");
			expect(clock()).toHaveAttribute(
				"aria-label",
				"Thursday, November 26, 2026, 12:05 AM",
			);
			setDateAndTime({ paused: true });
			act(() => {
				vi.advanceTimersByTime(180_000);
			});
			expect(clock()?.textContent).toBe("12:05 AM");
		});
	});

	describe("the tooltip", () => {
		it("is the long date after 500 ms, Balloon Help off, and goes at a press", () => {
			vi.useFakeTimers();
			vi.setSystemTime(NOW);
			act(() =>
				dispatch({
					type: "ClassicyDesktopSetBalloonHelp",
					disableBalloonHelp: true,
				}),
			);
			renderTaskbar();
			const time = clock() as HTMLTimeElement;
			fireEvent.mouseEnter(time);
			act(() => {
				vi.advanceTimersByTime(CLASSICY_TASKBAR_TOOLTIP_DELAY_MS - 1);
			});
			expect(balloonText()).toBeUndefined();
			act(() => {
				vi.advanceTimersByTime(1);
			});
			expect(balloonText()).toBe("Wednesday, November 25, 2026");
			expect(time).toHaveAttribute("aria-describedby");
			fireEvent.mouseDown(time, { button: 0 });
			expect(balloonText()).toBeUndefined();
		});

		it("goes when the pointer leaves", () => {
			vi.useFakeTimers();
			vi.setSystemTime(NOW);
			renderTaskbar();
			const time = clock() as HTMLTimeElement;
			fireEvent.mouseEnter(time);
			act(() => {
				vi.advanceTimersByTime(CLASSICY_TASKBAR_TOOLTIP_DELAY_MS);
			});
			expect(balloonText()).toBe("Wednesday, November 25, 2026");
			fireEvent.mouseLeave(time);
			expect(balloonText()).toBeUndefined();
		});
	});

	describe("the pointer", () => {
		it("does nothing on a click, and takes no focus from a press", () => {
			renderTaskbar();
			const time = clock() as HTMLTimeElement;
			const press = new MouseEvent("mousedown", {
				bubbles: true,
				cancelable: true,
				button: 0,
			});
			time.dispatchEvent(press);
			expect(press.defaultPrevented).toBe(true);
			fireEvent.click(time, { detail: 1 });
			expect(time.textContent).toBe("4:37 PM");
			expect(dispatched.filter((a) => a.type === "ClassicyAppOpen")).toEqual(
				[],
			);
			expect(contextMenu()).toBeNull();
		});

		it("opens the Date & Time control panel on a double-click", () => {
			renderTaskbar();
			fireEvent.doubleClick(clock() as HTMLTimeElement);
			expect(dateAndTimeOpens()).toHaveLength(1);
			expect(dateAndTimeOpens()[0]).toMatchObject({
				app: {
					id: DATE_AND_TIME_MANAGER_APP_ID,
					name: DATE_AND_TIME_MANAGER_APP_NAME,
				},
			});
			expect(
				useAppManager.getState().System.Manager.Applications.apps[
					DATE_AND_TIME_MANAGER_APP_ID
				]?.open,
			).toBe(true);
		});
	});

	describe("button 2", () => {
		it("opens the taskbar's menu with Adjust Date/Time first, bold, then the taskbar's own items", () => {
			renderTaskbar();
			const event = new MouseEvent("contextmenu", {
				bubbles: true,
				cancelable: true,
				clientX: 600,
				clientY: 470,
			});
			act(() => {
				(clock() as HTMLTimeElement).dispatchEvent(event);
			});
			expect(event.defaultPrevented).toBe(true);
			expect(contextMenu()).not.toBeNull();
			const adjust = menuItem(CLASSICY_TASKBAR_MENU_IDS.adjustDateTime);
			expect(adjust).toHaveTextContent("Adjust Date/Time");
			expect(adjust).toHaveClass("default");
			const minimizeAll = menuItem(CLASSICY_TASKBAR_MENU_IDS.minimizeAll);
			const properties = menuItem(CLASSICY_TASKBAR_MENU_IDS.properties);
			expect(minimizeAll).not.toBeNull();
			expect(minimizeAll).not.toHaveClass("default");
			expect(properties).not.toBeNull();
			// Adjust Date/Time, a divider, the arrangements, a divider,
			// Minimize All Windows, a divider, Properties, with no Help item
			// and no Toolbars ▸ (the band site's, not the status area's).
			expect(
				Array.from(adjust?.parentElement?.children ?? []).map(
					(child) => child.id || child.tagName.toLowerCase(),
				),
			).toEqual([
				CLASSICY_TASKBAR_MENU_IDS.adjustDateTime,
				"hr",
				CLASSICY_TASKBAR_MENU_IDS.cascade,
				CLASSICY_TASKBAR_MENU_IDS.tileHorizontally,
				CLASSICY_TASKBAR_MENU_IDS.tileVertically,
				"hr",
				CLASSICY_TASKBAR_MENU_IDS.minimizeAll,
				"hr",
				CLASSICY_TASKBAR_MENU_IDS.properties,
			]);
			expect(document.getElementById("contextual-help")).toBeNull();
		});

		it("runs Adjust Date/Time, which opens the Date & Time control panel", async () => {
			renderTaskbar();
			fireEvent.contextMenu(clock() as HTMLTimeElement, {
				clientX: 600,
				clientY: 470,
			});
			const adjust = menuItem(
				CLASSICY_TASKBAR_MENU_IDS.adjustDateTime,
			) as HTMLElement;
			fireEvent.click(adjust);
			dispatchAnimationEnd(adjust);
			await waitFor(() => expect(dateAndTimeOpens()).toHaveLength(1));
			expect(contextMenu()).toBeNull();
		});

		it("offers the Undo Minimize All the taskbar's background offers: the taskbar's one menu", async () => {
			registerTestTaskbarPackage(
				TEST_MINIMIZE_LAYOUT,
				TEST_MINIMIZE_PACKAGE_ID,
			);
			act(() =>
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: TEST_MINIMIZE_PACKAGE_ID,
				}),
			);
			act(() =>
				useAppManager.setState((state) =>
					produce(state, (draft) => {
						draft.System.Manager.Applications.apps["T.app"] = {
							id: "T.app",
							name: "T",
							icon: "",
							open: true,
							windows: windowsRecord({
								id: "main",
								closed: false,
								size: [100, 100],
								position: [0, 0],
								minimumSize: [0, 0],
							}),
						};
					}),
				),
			);
			const registration: ClassicyWindowRegistration = registerClassicyWindow({
				appId: "T.app",
				windowId: "main",
				title: "Main",
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
			});
			try {
				renderTaskbar();
				fireEvent.contextMenu(
					document.querySelector(".classicyTaskbar") as HTMLElement,
					{ clientX: 300, clientY: 470 },
				);
				const minimizeAll = menuItem(
					CLASSICY_TASKBAR_MENU_IDS.minimizeAll,
				) as HTMLElement;
				fireEvent.click(minimizeAll);
				dispatchAnimationEnd(minimizeAll);
				await waitFor(() =>
					expect(
						getAppWindow(
							useAppManager.getState().System.Manager.Applications.apps[
								"T.app"
							],
							"main",
						)?.collapsed,
					).toBe(true),
				);
				fireEvent.contextMenu(clock() as HTMLTimeElement, {
					clientX: 600,
					clientY: 470,
				});
				expect(
					menuItem(CLASSICY_TASKBAR_MENU_IDS.adjustDateTime),
				).not.toBeNull();
				expect(menuItem(CLASSICY_TASKBAR_MENU_IDS.undo)).toHaveTextContent(
					"Undo Minimize All",
				);
				// Minimize All Windows stays, dimmed with nothing left to
				// minimize (explorer's menu holds both items).
				expect(menuItem(CLASSICY_TASKBAR_MENU_IDS.minimizeAll)).toHaveClass(
					"disabled",
				);
			} finally {
				unregisterClassicyWindow(registration);
			}
		});
	});

	describe("on a desktop", () => {
		it("is the only clock: the headless screen bar draws none", () => {
			render(
				<ClassicyAppManagerProvider>
					<ClassicyDesktop startupScreen={false} />
				</ClassicyAppManagerProvider>,
			);
			expect(
				document.querySelectorAll("time.classicyTaskbarClock"),
			).toHaveLength(1);
			expect(document.querySelector(".classicyDesktopMenuTime")).toBeNull();
			expect(
				document.querySelectorAll('[data-classicy-part="clock"]'),
			).toHaveLength(1);
		});
	});
});
