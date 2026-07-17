import { describe, expect, it } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";

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

	it("applies columns class when columns=true", () => {
		const { container } = render(
			<ClassicyControlGroup label="Group" columns={true}>
				{null}
			</ClassicyControlGroup>,
		);
		// The div wrapping children should have the columns class
		const colDiv = container.querySelector(
			".classicyControlGroupContentColumns",
		);
		expect(colDiv).toBeInTheDocument();
	});

	it("does not apply columns class when columns=false (default)", () => {
		const { container } = render(
			<ClassicyControlGroup label="Group">{null}</ClassicyControlGroup>,
		);
		const colDiv = container.querySelector(
			".classicyControlGroupContentColumns",
		);
		expect(colDiv).not.toBeInTheDocument();
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
