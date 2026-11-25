import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, renderHook } from "@/__tests__/test-utils";
import type {
	ActionMessage,
	ClassicyStoreSystemDateAndTimeManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { DATE_AND_TIME_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/DateAndTimeManager/ClassicyDateAndTimeManagerManifest";
import { ClassicyDesktopMenuWidgetTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime";
import { useClassicyClockTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/useClassicyClockTime.internal";

// The menu bar's clock (Mac OS 8's, every package with a screen menu bar),
// pinned before its tick moved into `useClassicyClockTime.internal.ts`
// (plan 0020-w98 step 14), so the move leaves its DOM, its click toggle and
// its minute dispatch as they were; then the shared hook's own cases (its
// value, and its two resolutions: the menu bar's seconds, the taskbar's
// minutes).

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

// Wednesday, November 25, 2026, 4:37:12 PM at UTC−5.
const UTC = "2026-11-25T21:37:12.000Z";
const NOW = Date.parse("2026-11-25T12:00:00.000Z");

const setDateAndTime = (
	patch: Partial<ClassicyStoreSystemDateAndTimeManager>,
) =>
	act(() =>
		useAppManager.setState((s) => ({
			...s,
			System: {
				...s.System,
				Manager: {
					...s.System.Manager,
					DateAndTime: { ...s.System.Manager.DateAndTime, ...patch },
				},
			},
		})),
	);

const clock = () =>
	document.querySelector<HTMLLIElement>(".classicyDesktopMenuTime");

const dateTimeSets = () =>
	dispatched.filter((a) => a.type === "ClassicyManagerDateTimeSet");

describe("ClassicyDesktopMenuWidgetTime", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const state = structuredClone(DefaultAppManagerState);
		state.System.Manager.DateAndTime = {
			...state.System.Manager.DateAndTime,
			dateTime: UTC,
			timeZoneOffset: "-5",
			militaryTime: false,
			displaySeconds: true,
			displayPeriod: true,
			displayDay: true,
			displayLongDay: false,
			flashSeparators: true,
			show: true,
			paused: false,
		};
		useAppManager.setState(state, true);
		dispatched.length = 0;
	});

	afterEach(() => {
		vi.useRealTimers();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	describe("its DOM", () => {
		it("is a menu-bar item, the clock part, showing the day, the time with seconds and the period", () => {
			render(<ClassicyDesktopMenuWidgetTime />);
			expect(clock()?.outerHTML).toBe(
				'<li class="classicyMenuItem classicyMenuItemNoImage classicyDesktopMenuTime" data-classicy-part="clock">' +
					"<div>" +
					'<span class="classicyDesktopMenuTimeSeparatorRight">Wed</span>' +
					"<span> 4</span>" +
					'<span><span class="">:</span>37</span>' +
					'<span class="textBlinker">:</span><span>12</span>' +
					'<span class="classicyDesktopMenuTimeSeparatorLeft"> PM</span>' +
					"</div></li>",
			);
		});

		it("blinks the minutes' separator when it shows no seconds, and spells the long day", () => {
			setDateAndTime({ displaySeconds: false, displayLongDay: true });
			render(<ClassicyDesktopMenuWidgetTime />);
			expect(clock()?.innerHTML).toBe(
				"<div>" +
					'<span class="classicyDesktopMenuTimeSeparatorRight">Wednesday</span>' +
					"<span> 4</span>" +
					'<span><span class="textBlinker">:</span>37</span>' +
					'<span class="classicyDesktopMenuTimeSeparatorLeft"> PM</span>' +
					"</div>",
			);
		});

		it("shows 24-hour time with no period, no day and steady separators", () => {
			setDateAndTime({
				militaryTime: true,
				displayDay: false,
				flashSeparators: false,
			});
			render(<ClassicyDesktopMenuWidgetTime />);
			expect(clock()?.innerHTML).toBe(
				"<div>" +
					"<span> 16</span>" +
					'<span><span class="">:</span>37</span>' +
					"<span>:</span><span>12</span>" +
					"</div>",
			);
		});

		it("keeps the separators steady while the clock is paused", () => {
			setDateAndTime({ paused: true });
			render(<ClassicyDesktopMenuWidgetTime />);
			expect(clock()?.querySelector(".textBlinker")).toBeNull();
		});

		it("draws nothing while the clock is hidden", () => {
			setDateAndTime({ show: false });
			const { container } = render(<ClassicyDesktopMenuWidgetTime />);
			expect(container.innerHTML).toBe("");
		});

		it("merges the host's class and style onto its item", () => {
			render(
				<ClassicyDesktopMenuWidgetTime
					className="hostClock"
					style={{ color: "red" }}
				/>,
			);
			expect(clock()).toHaveClass("classicyDesktopMenuTime", "hostClock");
			expect(clock()).toHaveStyle({ color: "rgb(255, 0, 0)" });
		});
	});

	describe("its click toggle", () => {
		it("shows the date on a click, and the time again on the next", () => {
			render(<ClassicyDesktopMenuWidgetTime />);
			const item = clock() as HTMLLIElement;
			fireEvent.click(item);
			expect(item.innerHTML).toBe("<div><span> 11/25/2026</span></div>");
			fireEvent.click(item);
			expect(item.textContent).toBe("Wed 4:37:12 PM");
		});

		it("toggles on Enter and Space", () => {
			render(<ClassicyDesktopMenuWidgetTime />);
			const item = clock() as HTMLLIElement;
			fireEvent.keyDown(item, { key: "Enter" });
			expect(item.textContent).toBe(" 11/25/2026");
			fireEvent.keyDown(item, { key: " " });
			expect(item.textContent).toBe("Wed 4:37:12 PM");
			fireEvent.keyDown(item, { key: "a" });
			expect(item.textContent).toBe("Wed 4:37:12 PM");
		});

		it("opens the Date & Time control panel on a double-click", () => {
			render(<ClassicyDesktopMenuWidgetTime />);
			fireEvent.doubleClick(clock() as HTMLLIElement);
			const open = dispatched.find((a) => a.type === "ClassicyAppOpen");
			expect(open).toMatchObject({
				app: {
					id: DATE_AND_TIME_MANAGER_APP_ID,
					name: "Date and Time Manager",
				},
			});
		});
	});

	describe("its tick", () => {
		it("advances the seconds on the wall clock", () => {
			render(<ClassicyDesktopMenuWidgetTime />);
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(clock()?.textContent).toBe("Wed 4:37:13 PM");
			act(() => {
				vi.advanceTimersByTime(9000);
			});
			expect(clock()?.textContent).toBe("Wed 4:37:22 PM");
		});

		it("writes the store once a minute, on the minute", () => {
			render(<ClassicyDesktopMenuWidgetTime />);
			act(() => {
				vi.advanceTimersByTime(47_000);
			});
			expect(dateTimeSets()).toHaveLength(0);
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(dateTimeSets()).toHaveLength(1);
			expect(useAppManager.getState().System.Manager.DateAndTime.dateTime).toBe(
				"2026-11-25T21:38:00.000Z",
			);
			expect(clock()?.textContent).toBe("Wed 4:38:00 PM");
			act(() => {
				vi.advanceTimersByTime(59_000);
			});
			expect(dateTimeSets()).toHaveLength(1);
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(dateTimeSets()).toHaveLength(2);
			expect(useAppManager.getState().System.Manager.DateAndTime.dateTime).toBe(
				"2026-11-25T21:39:00.000Z",
			);
		});

		it("stands still while paused, and goes on from the paused moment", () => {
			render(<ClassicyDesktopMenuWidgetTime />);
			setDateAndTime({ paused: true });
			act(() => {
				vi.advanceTimersByTime(120_000);
			});
			expect(clock()?.textContent).toBe("Wed 4:37:12 PM");
			expect(dateTimeSets()).toHaveLength(0);
			setDateAndTime({ paused: false });
			act(() => {
				vi.advanceTimersByTime(3000);
			});
			expect(clock()?.textContent).toBe("Wed 4:37:15 PM");
		});

		it("shows a time the store is set to at once", () => {
			render(<ClassicyDesktopMenuWidgetTime />);
			setDateAndTime({ dateTime: "2026-11-26T03:05:09.000Z" });
			expect(clock()?.textContent).toBe("Wed 10:05:09 PM");
			setDateAndTime({ timeZoneOffset: "0" });
			expect(clock()?.textContent).toBe("Thu 3:05:09 AM");
		});

		it("keeps ticking while the clock is hidden", () => {
			setDateAndTime({ show: false });
			render(<ClassicyDesktopMenuWidgetTime />);
			act(() => {
				vi.advanceTimersByTime(48_000);
			});
			expect(dateTimeSets()).toHaveLength(1);
		});

		it("stops on unmount", () => {
			const { unmount } = render(<ClassicyDesktopMenuWidgetTime />);
			unmount();
			act(() => {
				vi.advanceTimersByTime(120_000);
			});
			expect(dateTimeSets()).toHaveLength(0);
		});
	});
});

describe("useClassicyClockTime", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		const state = structuredClone(DefaultAppManagerState);
		state.System.Manager.DateAndTime = {
			...state.System.Manager.DateAndTime,
			dateTime: UTC,
			timeZoneOffset: "-5",
			paused: false,
		};
		useAppManager.setState(state, true);
		dispatched.length = 0;
	});

	afterEach(() => {
		vi.useRealTimers();
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("is the store's time shifted by its offset, read from the UTC fields", () => {
		const { result } = renderHook(() => useClassicyClockTime());
		expect(result.current.toISOString()).toBe("2026-11-25T16:37:12.000Z");
		expect(result.current.getUTCHours()).toBe(16);
	});

	it("changes each second by default", () => {
		const { result } = renderHook(() => useClassicyClockTime());
		const first = result.current;
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current).not.toBe(first);
		expect(result.current.toISOString()).toBe("2026-11-25T16:37:13.000Z");
	});

	it('changes only when the minute turns at the "minute" resolution, and writes the store as often', () => {
		const { result } = renderHook(() =>
			useClassicyClockTime({ resolution: "minute" }),
		);
		const first = result.current;
		act(() => {
			vi.advanceTimersByTime(47_000);
		});
		expect(result.current).toBe(first);
		expect(dateTimeSets()).toHaveLength(0);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(result.current.toISOString()).toBe("2026-11-25T16:38:00.000Z");
		expect(dateTimeSets()).toHaveLength(1);
		const turned = result.current;
		act(() => {
			vi.advanceTimersByTime(59_000);
		});
		expect(result.current).toBe(turned);
		expect(dateTimeSets()).toHaveLength(1);
	});

	it("follows a new time zone at once", () => {
		const { result } = renderHook(() =>
			useClassicyClockTime({ resolution: "minute" }),
		);
		act(() =>
			useAppManager.setState((s) => ({
				...s,
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						DateAndTime: {
							...s.System.Manager.DateAndTime,
							timeZoneOffset: "9",
						},
					},
				},
			})),
		);
		expect(result.current.toISOString()).toBe("2026-11-26T06:37:12.000Z");
	});
});
