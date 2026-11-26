// An indented row (Find File's path pane, story 0227-815).
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassicyListBox } from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";

describe("ClassicyListBox option depth", () => {
	it("publishes each row's depth for its indent, and nothing at depth 0", () => {
		render(
			<ClassicyListBox
				id="path"
				options={[
					{ value: "a", label: "Macintosh HD" },
					{ value: "b", label: "Documents", depth: 1 },
					{ value: "c", label: "Read Me.txt", depth: 2 },
				]}
			/>,
		);
		const rows = Array.from(
			document.querySelectorAll<HTMLElement>('[role="option"]'),
		);
		expect(
			rows.map((r) => r.style.getPropertyValue("--classicy-listbox-depth")),
		).toEqual(["", "1", "2"]);
	});
});
