import { describe, expect, it } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import {
	ClassicyControlGroup,
	ClassicyControlGroupFormRow,
	ClassicyControlGroupStack,
} from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";

describe("ClassicyControlGroup", () => {
	it("renders label as a legend element", () => {
		render(
			<ClassicyControlGroup label="Settings">{null}</ClassicyControlGroup>,
		);
		expect(screen.getByText("Settings").tagName).toBe("LEGEND");
	});

	it("renders children inside the fieldset", () => {
		render(
			<ClassicyControlGroup label="Group">
				<span>Child content</span>
			</ClassicyControlGroup>,
		);
		expect(screen.getByText("Child content")).toBeInTheDocument();
	});

	it("marks the group as a column of a shared row when columns=true", () => {
		const { container } = render(
			<ClassicyControlGroup label="Group" columns={true}>
				{null}
			</ClassicyControlGroup>,
		);
		// The fieldset carries the class that lets it grow to share the row.
		expect(
			container.querySelector("fieldset.classicyControlGroupFieldsetColumns"),
		).toBeInTheDocument();
	});

	it("does not mark the group as a column when columns=false (default)", () => {
		const { container } = render(
			<ClassicyControlGroup label="Group">{null}</ClassicyControlGroup>,
		);
		expect(
			container.querySelector(".classicyControlGroupFieldsetColumns"),
		).not.toBeInTheDocument();
	});

	it("renders no legend element when label is empty string", () => {
		const { container } = render(
			<ClassicyControlGroup label="">{null}</ClassicyControlGroup>,
		);
		expect(container.querySelector("legend")).not.toBeInTheDocument();
	});

	it("renders no legend element when no title props are provided", () => {
		const { container } = render(
			<ClassicyControlGroup>{null}</ClassicyControlGroup>,
		);
		expect(container.querySelector("legend")).not.toBeInTheDocument();
		expect(container.querySelector("fieldset")).not.toHaveClass(
			"classicyControlGroupFieldsetLabeled",
		);
	});

	it("applies the labeled modifier class when a label is present", () => {
		const { container } = render(
			<ClassicyControlGroup label="Settings">{null}</ClassicyControlGroup>,
		);
		expect(container.querySelector("fieldset")).toHaveClass(
			"classicyControlGroupFieldsetLabeled",
		);
	});

	it("omits the labeled modifier class when label is empty string", () => {
		const { container } = render(
			<ClassicyControlGroup label="">{null}</ClassicyControlGroup>,
		);
		expect(container.querySelector("fieldset")).not.toHaveClass(
			"classicyControlGroupFieldsetLabeled",
		);
	});

	it("gives the legend the default theme background color", () => {
		render(
			<ClassicyControlGroup label="Settings">{null}</ClassicyControlGroup>,
		);
		const legend = screen.getByText("Settings") as HTMLElement;
		expect(legend.style.backgroundColor).toBe("var(--color-system-03)");
	});

	it("gives the legend a custom background color when the prop is provided", () => {
		render(
			<ClassicyControlGroup label="Settings" backgroundColor="#ffffff">
				{null}
			</ClassicyControlGroup>,
		);
		const legend = screen.getByText("Settings") as HTMLElement;
		expect(legend.style.backgroundColor).toBe("rgb(255, 255, 255)");
	});

	// --- Variant (#201: primary vs secondary) ---

	it("applies the primary variant class by default", () => {
		const { container } = render(
			<ClassicyControlGroup label="Settings">{null}</ClassicyControlGroup>,
		);
		const fieldset = container.querySelector("fieldset");
		expect(fieldset).toHaveClass("classicyControlGroupFieldsetPrimary");
		expect(fieldset).not.toHaveClass("classicyControlGroupFieldsetSecondary");
	});

	it("applies the secondary variant class when variant='secondary'", () => {
		const { container } = render(
			<ClassicyControlGroup label="Settings" variant="secondary">
				{null}
			</ClassicyControlGroup>,
		);
		const fieldset = container.querySelector("fieldset");
		expect(fieldset).toHaveClass("classicyControlGroupFieldsetSecondary");
		expect(fieldset).not.toHaveClass("classicyControlGroupFieldsetPrimary");
	});

	// --- Rich titles (#201: ReactNode / checkbox / pop-up-menu titles) ---

	it("renders a ReactNode title in the legend, overriding label", () => {
		render(
			<ClassicyControlGroup
				label="ignored"
				title={<span data-testid="node-title">Custom</span>}
			>
				{null}
			</ClassicyControlGroup>,
		);
		const legend = screen.getByTestId("node-title").closest("legend");
		expect(legend).toBeInTheDocument();
		expect(screen.queryByText("ignored")).not.toBeInTheDocument();
	});

	it("renders a checkbox in the legend via checkboxTitle", () => {
		const { container } = render(
			<ClassicyControlGroup
				checkboxTitle={{ id: "cb-title", checked: true, label: "Enable" }}
			>
				{null}
			</ClassicyControlGroup>,
		);
		const legend = container.querySelector("legend");
		expect(legend).toBeInTheDocument();
		expect(legend?.querySelector("input[type='checkbox']")).toBeInTheDocument();
		expect(container.querySelector("fieldset")).toHaveClass(
			"classicyControlGroupFieldsetLabeled",
		);
	});

	it("renders a pop-up menu in the legend via popUpMenuTitle", () => {
		const { container } = render(
			<ClassicyControlGroup
				popUpMenuTitle={{
					id: "popup-title",
					options: [{ value: "a", label: "Alpha" }],
					selected: "a",
				}}
			>
				{null}
			</ClassicyControlGroup>,
		);
		const legend = container.querySelector("legend");
		expect(legend).toBeInTheDocument();
		// The pop-up menu button now renders as a custom control carrying its id
		// (the native <select> was removed in the HIG pop-up-menu rework).
		expect(legend?.querySelector("#popup-title")).toBeInTheDocument();
	});

	it("prefers a checkbox title over a pop-up-menu title", () => {
		const { container } = render(
			<ClassicyControlGroup
				checkboxTitle={{ id: "cb", checked: true, label: "Enable" }}
				popUpMenuTitle={{
					id: "popup",
					options: [{ value: "a", label: "Alpha" }],
				}}
			>
				{null}
			</ClassicyControlGroup>,
		);
		const legend = container.querySelector("legend");
		expect(legend?.querySelector("input[type='checkbox']")).toBeInTheDocument();
		// The pop-up-menu title is suppressed, so its control (id "popup") is absent.
		expect(legend?.querySelector("#popup")).not.toBeInTheDocument();
	});
});

// --- Form layout helpers (HIGOS8 Ch.3 "Layout Guidelines") ---

describe("ClassicyControlGroup — form layout helpers", () => {
	it("applies the form-content grid class when layout='form'", () => {
		const { container } = render(
			<ClassicyControlGroup label="Group" layout="form">
				<span>Row</span>
			</ClassicyControlGroup>,
		);
		expect(
			container.querySelector("fieldset > .classicyControlGroupFormContent"),
		).toBeInTheDocument();
	});

	it("renders a ClassicyControlGroupFormRow as a full-width row", () => {
		const { container } = render(
			<ClassicyControlGroup label="Group" layout="form">
				<ClassicyControlGroupFormRow>
					<span>Spans both columns</span>
				</ClassicyControlGroupFormRow>
			</ClassicyControlGroup>,
		);
		const row = container.querySelector(
			".classicyControlGroupFormContent > .classicyControlGroupFormRow",
		);
		expect(row).toBeInTheDocument();
		expect(row).not.toHaveClass("classicyControlGroupFormRowEnd");
		expect(screen.getByText("Spans both columns")).toBeInTheDocument();
	});

	it("right-aligns a form row's content with justify='end'", () => {
		const { container } = render(
			<ClassicyControlGroupFormRow justify="end">
				<button type="button">Test</button>
			</ClassicyControlGroupFormRow>,
		);
		expect(container.querySelector(".classicyControlGroupFormRow")).toHaveClass(
			"classicyControlGroupFormRowEnd",
		);
	});

	it("stacks group boxes inside a ClassicyControlGroupStack", () => {
		const { container } = render(
			<ClassicyControlGroupStack className="extra">
				<ClassicyControlGroup label="One">{null}</ClassicyControlGroup>
				<ClassicyControlGroup label="Two">{null}</ClassicyControlGroup>
			</ClassicyControlGroupStack>,
		);
		const stack = container.querySelector(".classicyControlGroupStack");
		expect(stack).toBeInTheDocument();
		expect(stack).toHaveClass("extra");
		expect(
			stack?.querySelectorAll(":scope > fieldset.classicyControlGroupFieldset"),
		).toHaveLength(2);
	});
});
