import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { produce } from "immer";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuWidgetTime } from "@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime";

// The menu-bar clock and the keyboard (integration review G round 6, the
// controller's ruling): its Enter and Space handler could never run, since
// nothing in it took the focus. It is a Tab stop now, a button whose name
// says what it toggles (WCAG 2.1.1, which wins over Mac OS 8.1, whose menu
// bar had no keyboard path at all); a pointer press still takes no keyboard
// focus, as the bar's titles take none.

// Wednesday, November 25, 2026, 3:14:44 PM, in the clock's own time zone.
const AT = new Date(Date.UTC(2026, 10, 25, 15, 14, 44));

beforeEach(() => {
	act(() => {
		useAppManager.setState(
			produce(DefaultAppManagerState, (draft) => {
				const clock = draft.System.Manager.DateAndTime;
				clock.dateTime = AT.toISOString();
				clock.timeZoneOffset = "0";
				clock.paused = true;
				clock.show = true;
				clock.displayDay = true;
				clock.displayLongDay = false;
				clock.displaySeconds = true;
				clock.displayPeriod = true;
				clock.militaryTime = false;
			}),
			true,
		);
	});
});

const renderClock = () => {
	render(
		<ul>
			<ClassicyDesktopMenuWidgetTime />
		</ul>,
	);
	return document.querySelector('[data-classicy-part="clock"]') as HTMLElement;
};

describe("the menu-bar clock as a Tab stop", () => {
	it("is a button the Tab key reaches, named for what it toggles and described by what it shows", async () => {
		const user = userEvent.setup();
		const clock = renderClock();
		const button = within(clock).getByRole("button", {
			name: "Clock: show the date",
		});
		expect(button.tagName).toBe("BUTTON");
		// The item stays an item of the bar's list, the button inside it.
		expect(clock.tagName).toBe("LI");
		expect(clock).not.toHaveAttribute("role");
		// What it shows, to the minute, so a focused clock is not described
		// anew every second.
		expect(button).toHaveAttribute("aria-description", "Wed 3:14 PM");
		expect(button.textContent).toBe("Wed 3:14:44 PM");
		await user.tab();
		expect(document.activeElement).toBe(button);
	});

	it("Enter shows the date and Space the time again", async () => {
		const user = userEvent.setup();
		const clock = renderClock();
		const button = within(clock).getByRole("button");
		button.focus();
		await user.keyboard("{Enter}");
		expect(clock.textContent).toBe(" 11/25/2026");
		expect(button).toHaveAccessibleName("Clock: show the time");
		expect(button).toHaveAttribute("aria-description", "11/25/2026");
		await user.keyboard(" ");
		expect(clock.textContent).toBe("Wed 3:14:44 PM");
		expect(button).toHaveAccessibleName("Clock: show the date");
		// The focus stays on the clock.
		expect(document.activeElement).toBe(button);
	});

	it("a pointer press toggles it and takes no keyboard focus", async () => {
		const user = userEvent.setup();
		const clock = renderClock();
		const outside = document.createElement("button");
		document.body.append(outside);
		outside.focus();
		// The press is prevented, so the browser moves no focus to the clock.
		expect(
			fireEvent.mouseDown(screen.getByRole("button", { name: /Clock/ })),
		).toBe(false);
		await user.click(within(clock).getByRole("button"));
		expect(clock.textContent).toBe(" 11/25/2026");
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});
});
