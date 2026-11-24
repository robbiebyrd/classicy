// A divider above an item starts a new group in the open menu (Find File's
// location and date pop-ups, story 0227-815).
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

describe("ClassicyPopUpMenu dividers", () => {
	it("draws a separator before each dividerBefore item but the first, and keeps the items in order", () => {
		const onChange = vi.fn();
		render(
			<div id="classicyDesktop">
				<ClassicyPopUpMenu
					id="where"
					selected="local"
					onChangeFunc={(e) => onChange(e.target.value)}
					options={[
						{ value: "all", label: "on all disks", dividerBefore: true },
						{ value: "local", label: "on local disks" },
						{ value: "desktop", label: "on the desktop", dividerBefore: true },
						{ value: "disk", label: "on the disk", dividerBefore: true },
					]}
				/>
			</div>,
		);
		fireEvent.click(document.getElementById("where") as HTMLElement);
		const list = screen.getByRole("listbox");
		const children = Array.from(list.children).map((el) =>
			el.getAttribute("role") === "option"
				? el.textContent
				: el.tagName === "HR"
					? "—"
					: "?",
		);
		expect(children).toEqual([
			"on all disks",
			"on local disks",
			"—",
			"on the desktop",
			"—",
			"on the disk",
		]);
		// A listbox holds options only: the dividers are drawn, not announced
		// (fix round 1, M9).
		for (const hr of Array.from(list.querySelectorAll("hr"))) {
			expect(hr.getAttribute("role")).toBe("presentation");
			expect(hr.hasAttribute("aria-orientation")).toBe(false);
		}
		expect(within(list).queryAllByRole("separator")).toEqual([]);
		fireEvent.click(within(list).getByText("on the desktop"));
		expect(onChange).toHaveBeenCalledWith("desktop");
	});
});
