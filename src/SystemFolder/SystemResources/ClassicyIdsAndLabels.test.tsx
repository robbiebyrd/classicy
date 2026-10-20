import { describe, expect, it } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyDatePicker } from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import { ClassicyTimePicker } from "@/SystemFolder/SystemResources/TimePicker/ClassicyTimePicker";
import { ClassicyTriangle } from "@/SystemFolder/SystemResources/Triangle/ClassicyTriangle";

// Every id in the document, with how often it occurs.
const duplicateIds = (root: ParentNode) => {
	const counts = new Map<string, number>();
	for (const el of root.querySelectorAll("[id]")) {
		counts.set(el.id, (counts.get(el.id) ?? 0) + 1);
	}
	return [...counts].filter(([, n]) => n > 1).map(([id]) => id);
};

describe("duplicate DOM ids (#309)", () => {
	it("draws triangles without ids", () => {
		const { container } = render(
			<>
				<ClassicyTriangle />
				<ClassicyTriangle />
			</>,
		);
		expect(container.querySelectorAll("svg[id]")).toHaveLength(0);
	});

	it("gives each time picker's am/pm pop-up its own id", () => {
		const { container } = render(
			<>
				<ClassicyTimePicker id="start" />
				<ClassicyTimePicker id="end" />
			</>,
		);
		expect(container.querySelector("#start_ampm")).not.toBeNull();
		expect(container.querySelector("#end_ampm")).not.toBeNull();
		expect(duplicateIds(container)).toEqual([]);
	});

	it("keeps two tab strips with the same titles apart", () => {
		const tabs = () => [
			{ title: "General", children: <p>General pane</p> },
			{ title: "Sharing", children: <p>Sharing pane</p> },
		];
		const { container } = render(
			<>
				<ClassicyTabs tabs={tabs()} />
				<ClassicyTabs tabs={tabs()} />
			</>,
		);
		expect(duplicateIds(container)).toEqual([]);
		for (const tab of screen.getAllByRole("tab")) {
			const panel = document.getElementById(
				tab.getAttribute("aria-controls") ?? "",
			);
			expect(panel?.getAttribute("aria-labelledby")).toBe(tab.id);
		}
	});
});

describe("labels that point at real elements (#310)", () => {
	it("points the date picker's label at the month field and names the group", () => {
		render(<ClassicyDatePicker id="due" labelTitle="Due date" />);
		const label = screen.getByText("Due date");
		expect(document.getElementById(label.getAttribute("for") ?? "")?.id).toBe(
			"due_month",
		);
		expect(screen.getByRole("group", { name: "Due date" })).toBeInTheDocument();
	});

	it("points the time picker's label at the hour field and names the group", () => {
		render(<ClassicyTimePicker id="alarm" labelTitle="Alarm" />);
		const label = screen.getByText("Alarm");
		expect(document.getElementById(label.getAttribute("for") ?? "")?.id).toBe(
			"alarm_hour",
		);
		expect(screen.getByRole("group", { name: "Alarm" })).toBeInTheDocument();
	});

	it("renders a radio group as a radiogroup named by its title", () => {
		render(
			<ClassicyRadioInput
				name="speed"
				label="Speed"
				inputs={[
					{ id: "slow", label: "Slow" },
					{ id: "fast", label: "Fast" },
				]}
			/>,
		);
		const group = screen.getByRole("radiogroup", { name: "Speed" });
		expect(group).toContainElement(screen.getByRole("radio", { name: "Fast" }));
		expect(screen.getByText("Speed")).not.toHaveAttribute("for");
	});

	it("only makes a label row a button when it is clickable", () => {
		const { container, rerender } = render(
			<ClassicyControlLabel label="Name" labelFor="name" />,
		);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
		expect(container.querySelector("[tabindex]")).toBeNull();
		rerender(
			<ClassicyControlLabel
				label="Name"
				labelFor="name"
				onClickFunc={() => {}}
			/>,
		);
		expect(screen.getByRole("button")).toHaveAttribute("tabindex", "0");
	});
});
