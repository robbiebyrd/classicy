import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events BevelButton emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "BevelButton");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyBevelButton") as HTMLElement;

describe("ClassicyBevelButton appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(
			<ClassicyBevelButton mode="toggle" on>
				B
			</ClassicyBevelButton>,
		);
		const el = root(container);
		expect(el).toHaveClass(
			"classicyBevelButton",
			"probe-BevelButton",
			"checked",
		);
		expect(el.getAttribute("data-probe-state")).toBe("checked");
	});

	it("emits its events", () => {
		const { container } = render(
			<ClassicyBevelButton mode="toggle">B</ClassicyBevelButton>,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		fireEvent.click(el);
		expect(emitted().map((e) => e.event)).toEqual([
			"press",
			"release",
			"click",
		]);
	});

	it("emits open and close around its pop-up", () => {
		const { container } = render(
			<ClassicyBevelButton mode="popup" menuItems={[{ id: "a", title: "A" }]}>
				B
			</ClassicyBevelButton>,
		);
		const el = root(container);
		fireEvent.mouseDown(el, { button: 0 });
		expect(emitted()).toEqual([
			{ event: "press", detail: undefined },
			{ event: "open", detail: { trigger: "click" } },
		]);
		fireEvent.mouseDown(el, { button: 0 });
		expect(emitted().map((e) => e.event)).toEqual([
			"press",
			"open",
			"press",
			"close",
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyBevelButton mode="toggle" on>
				B
			</ClassicyBevelButton>,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicyBevelButton checked classicyBevelButtonBevelMedium classicyBevelButtonModeToggle",
		);
	});
});
