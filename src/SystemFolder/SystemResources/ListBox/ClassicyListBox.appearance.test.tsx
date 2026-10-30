import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyListBox } from "@/SystemFolder/SystemResources/ListBox/ClassicyListBox";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events ListBox emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "ListBox");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyListBox") as HTMLElement;

describe("ClassicyListBox appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyListBox id="l" options={OPTIONS} disabled />,
		);
		const el = root(container);
		expect(el).toHaveClass("classicyListBox", "probe-ListBox", "disabled");
		expect(el.getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits its events", () => {
		render(<ClassicyListBox id="l" options={OPTIONS} />);
		const beta = screen.getByRole("option", { name: "Beta" });
		fireEvent.mouseDown(beta);
		fireEvent.click(beta);
		// Clicking a row focuses it first, so focus enters the list.
		expect(emitted()).toEqual([
			{ event: "focus", detail: { input: "pointer" } },
			{
				event: "select",
				detail: { value: "b", selected: true, input: "pointer" },
			},
		]);
	});

	it("emits select for keyboard selection", () => {
		render(<ClassicyListBox id="l" options={OPTIONS} />);
		const alpha = screen.getByRole("option", { name: "Alpha" });
		fireEvent.keyDown(document.body, { key: "Tab" });
		// Real focus, so the arrow's move to Beta stays inside the list.
		act(() => alpha.focus());
		fireEvent.keyDown(alpha, { key: " " });
		fireEvent.keyDown(alpha, { key: "ArrowDown" });
		expect(emitted()).toEqual([
			{ event: "focus", detail: { input: "keyboard" } },
			{
				event: "select",
				detail: { value: "a", selected: true, input: "keyboard" },
			},
			{
				event: "select",
				detail: { value: "b", selected: true, input: "keyboard" },
			},
		]);
	});

	it("reports a Ctrl-click deselect as selected: false", () => {
		render(
			<ClassicyListBox
				id="l"
				options={OPTIONS}
				selectionMode="multi"
				selected={["a", "b"]}
			/>,
		);
		const beta = screen.getByRole("option", { name: "Beta" });
		// The modifier goes down before the pointer: still a pointer click.
		fireEvent.keyDown(beta, { key: "Control", ctrlKey: true });
		fireEvent.mouseDown(beta, { ctrlKey: true });
		fireEvent.click(beta, { ctrlKey: true });
		expect(emitted().filter((e) => e.event === "select")).toEqual([
			{
				event: "select",
				detail: { value: "b", selected: false, input: "pointer" },
			},
		]);
	});

	it("emits focus and blur when focus enters and leaves the list", () => {
		render(
			<>
				<ClassicyListBox id="l" options={OPTIONS} />
				<button type="button">outside</button>
			</>,
		);
		const [alpha, beta] = screen.getAllByRole("option");
		fireEvent.keyDown(document.body, { key: "Tab" });
		fireEvent.focus(alpha);
		// Moving between rows stays inside the list: no blur/focus pair.
		fireEvent.blur(alpha, { relatedTarget: beta });
		fireEvent.focus(beta, { relatedTarget: alpha });
		const outside = screen.getByRole("button", { name: "outside" });
		fireEvent.mouseDown(outside);
		fireEvent.blur(beta, { relatedTarget: outside });
		expect(emitted()).toEqual([
			{ event: "focus", detail: { input: "keyboard" } },
			{ event: "blur", detail: { input: "pointer" } },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyListBox id="l" options={OPTIONS} disabled />,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyListBox disabled");
	});
});
