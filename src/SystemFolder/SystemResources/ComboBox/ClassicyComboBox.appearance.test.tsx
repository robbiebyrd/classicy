import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyComboBox } from "@/SystemFolder/SystemResources/ComboBox/ClassicyComboBox";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events ComboBox emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "ComboBox");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const OPTIONS = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyComboBox") as HTMLElement;

describe("ClassicyComboBox appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyComboBox id="cb" options={OPTIONS} disabled />,
		);
		const el = root(container);
		expect(el).toHaveClass("classicyComboBox", "probe-ComboBox", "disabled");
		expect(el.getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits its events", () => {
		const { container } = render(
			<ClassicyComboBox id="cb" options={OPTIONS} />,
		);
		const input = container.querySelector("#cb") as HTMLElement;
		fireEvent.focus(input);
		fireEvent.change(input, { target: { value: "B" } });
		expect(emitted()).toEqual([{ event: "open", detail: undefined }]);
		fireEvent.keyDown(input, { key: "Enter" });
		expect(emitted().slice(1)).toEqual([
			{ event: "change", detail: { value: "b" } },
			{ event: "close", detail: undefined },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyComboBox id="cb" options={OPTIONS} disabled />,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyComboBox disabled");
	});
});
