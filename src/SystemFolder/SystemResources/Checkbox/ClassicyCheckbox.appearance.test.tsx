import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Checkbox emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Checkbox");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyCheckbox") as HTMLElement;

describe("ClassicyCheckbox appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(<ClassicyCheckbox id="c" checked />);
		const el = root(container);
		expect(el.tagName).toBe("INPUT");
		expect(el).toHaveClass("classicyCheckbox", "probe-Checkbox", "checked");
		expect(el.getAttribute("data-probe-state")).toBe("checked");
	});

	it("emits its events", () => {
		const { container } = render(<ClassicyCheckbox id="c" />);
		fireEvent.click(root(container));
		expect(emitted()).toEqual([{ event: "change", detail: { checked: true } }]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(<ClassicyCheckbox id="c" checked />);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyCheckbox checked");
	});
});
