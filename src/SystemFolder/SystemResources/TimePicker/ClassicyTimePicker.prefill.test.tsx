import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDatePicker } from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker";
import { ClassicyTimePicker } from "@/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker";

const field = (id: string) => document.getElementById(id) as HTMLInputElement;

// The virtual clock the pickers fall back to, set without the reducer's bounds.
const setVirtualClock = (iso: string) =>
	act(() => {
		useAppManager.setState((s) => ({
			...s,
			System: {
				...s.System,
				Manager: {
					...s.System.Manager,
					DateAndTime: { ...s.System.Manager.DateAndTime, dateTime: iso },
				},
			},
		}));
	});

const original = useAppManager.getState().System.Manager.DateAndTime.dateTime;
afterEach(() => setVirtualClock(original));

describe("ClassicyTimePicker and ClassicyDatePicker seeding (#312)", () => {
	it("starts the time picker from the virtual clock, as the date picker does", () => {
		const virtual = new Date(2001, 2, 4, 15, 7, 9);
		setVirtualClock(virtual.toISOString());
		render(
			<>
				<ClassicyTimePicker id="t" />
				<ClassicyDatePicker id="d" />
			</>,
		);
		expect(field("t_hour").value).toBe("3");
		expect(field("t_minutes").value).toBe("7");
		expect(field("t_seconds").value).toBe("9");
		expect(field("d_year").value).toBe("2001");
		expect(field("d_month").value).toBe("3");
	});

	it("re-syncs both pickers when prefillValue changes to a new time", () => {
		const first = new Date(1998, 6, 14, 10, 30, 20);
		const second = new Date(2004, 0, 2, 21, 5, 0);
		const { rerender } = render(
			<>
				<ClassicyTimePicker id="t" prefillValue={first} />
				<ClassicyDatePicker id="d" prefillValue={first} />
			</>,
		);
		rerender(
			<>
				<ClassicyTimePicker id="t" prefillValue={second} />
				<ClassicyDatePicker id="d" prefillValue={second} />
			</>,
		);
		expect(field("t_hour").value).toBe("9");
		expect(field("t_minutes").value).toBe("5");
		expect(field("d_year").value).toBe("2004");
		expect(field("d_month").value).toBe("1");
		expect(field("d_day").value).toBe("2");
	});

	it("keeps the user's edit when the parent re-renders with the same moment", () => {
		const moment = new Date(1998, 6, 14, 10, 30, 20);
		const { rerender } = render(
			<ClassicyTimePicker id="t" prefillValue={moment} />,
		);
		fireEvent.change(field("t_minutes"), { target: { value: "45" } });
		rerender(
			<ClassicyTimePicker id="t" prefillValue={new Date(moment.getTime())} />,
		);
		expect(field("t_minutes").value).toBe("45");
	});
});
