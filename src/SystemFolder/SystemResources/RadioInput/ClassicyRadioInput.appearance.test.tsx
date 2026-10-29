import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events RadioInput emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "RadioInput");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const INPUTS = [
	{ id: "a", label: "A" },
	{ id: "b", label: "B" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyRadioInputGroup") as HTMLElement;

describe("ClassicyRadioInput appearance", () => {
	// Ruling I-R4: the group root passes the hook exactly the (empty) state it
	// passed classicyStateClasses before, so `disabled` stays on the items.
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyRadioInput name="r" disabled inputs={INPUTS} />,
		);
		const el = root(container);
		expect(el).toHaveClass("classicyRadioInputGroup", "probe-RadioInput");
		expect(el).not.toHaveClass("disabled");
		expect(el.getAttribute("data-probe-state")).toBe("");
		expect(container.querySelector(".classicyRadioInputWrapper")).toHaveClass(
			"disabled",
		);
	});

	it("emits its events", () => {
		const { container } = render(
			<ClassicyRadioInput name="r" inputs={INPUTS} />,
		);
		const b = container.querySelector("#b") as HTMLElement;
		fireEvent.mouseDown(b);
		fireEvent.mouseUp(b);
		expect(emitted()).toEqual([
			{ event: "press", detail: { itemId: "b" } },
			{ event: "release", detail: { itemId: "b" } },
		]);
		fireEvent.click(b);
		// press/release come from the mouse only, so they carry no input.
		expect(emitted()[2]).toEqual({
			event: "change",
			detail: { itemId: "b", input: "pointer" },
		});
		expect(emitted()).toHaveLength(3);
	});

	it("reports an arrow-key change as keyboard input", () => {
		const { container } = render(
			<ClassicyRadioInput name="r" inputs={INPUTS} />,
		);
		const a = container.querySelector("#a") as HTMLElement;
		// The arrow checks the next item, which fires its click and change.
		fireEvent.keyDown(a, { key: "ArrowDown" });
		fireEvent.click(container.querySelector("#b") as HTMLElement);
		expect(emitted()).toEqual([
			{ event: "change", detail: { itemId: "b", input: "keyboard" } },
		]);
	});

	it("emits press and release from an item's label", () => {
		const { container } = render(
			<ClassicyRadioInput name="r" inputs={INPUTS} />,
		);
		const label = container.querySelector('label[for="b"]') as HTMLElement;
		fireEvent.mouseDown(label);
		fireEvent.mouseUp(label);
		expect(emitted()).toEqual([
			{ event: "press", detail: { itemId: "b" } },
			{ event: "release", detail: { itemId: "b" } },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyRadioInput name="r" disabled inputs={INPUTS} />,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicyRadioInputGroup classicyRadioInputGroupColumns",
		);
	});
});
