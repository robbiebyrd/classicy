import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Input emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Input");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyInput") as HTMLElement;

describe("ClassicyInput appearance", () => {
	// Ruling I-R4: the field passes the hook exactly the (empty) state it
	// emitted before; `isDefault` keeps its own deprecated modifier class.
	it("carries the probe decoration and state classes", () => {
		const { container } = render(<ClassicyInput id="i" isDefault />);
		const el = root(container);
		expect(el.tagName).toBe("INPUT");
		expect(el).toHaveClass(
			"classicyInput",
			"probe-Input",
			"classicyInputDefault",
		);
		expect(el).not.toHaveClass("default");
		expect(el.getAttribute("data-probe-state")).toBe("");
	});

	it("emits its events", () => {
		const { container } = render(<ClassicyInput id="i" />);
		const el = root(container);
		// Clicked into, typed in, tabbed out of. Text entry has no pointer
		// path, so `change` carries no input.
		fireEvent.mouseDown(el);
		fireEvent.focus(el);
		fireEvent.keyDown(el, { key: "a" });
		fireEvent.change(el, { target: { value: "a" } });
		fireEvent.keyDown(el, { key: "Tab" });
		fireEvent.blur(el);
		expect(emitted()).toEqual([
			{ event: "focus", detail: { input: "pointer" } },
			{ event: "change", detail: { value: "a" } },
			{ event: "blur", detail: { input: "keyboard" } },
		]);
	});

	it("reports a tabbed-in focus and a clicked-away blur", () => {
		const { container } = render(<ClassicyInput id="i" />);
		const el = root(container);
		fireEvent.keyDown(document.body, { key: "Tab" });
		fireEvent.focus(el);
		fireEvent.mouseDown(document.body);
		fireEvent.blur(el);
		expect(emitted()).toEqual([
			{ event: "focus", detail: { input: "keyboard" } },
			{ event: "blur", detail: { input: "pointer" } },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(<ClassicyInput id="i" isDefault />);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyInput classicyInputDefault");
	});
});
