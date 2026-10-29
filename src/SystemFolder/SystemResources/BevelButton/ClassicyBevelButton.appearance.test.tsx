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
		fireEvent.click(el, { detail: 1 });
		// press/release come from the mouse only, so they carry no input.
		expect(emitted()).toEqual([
			{ event: "press", detail: undefined },
			{ event: "release", detail: undefined },
			{ event: "click", detail: { input: "pointer" } },
		]);
	});

	it("reports keyboard clicks, opens and closes", () => {
		const { container } = render(
			<ClassicyBevelButton mode="popup" menuItems={[{ id: "a", title: "A" }]}>
				B
			</ClassicyBevelButton>,
		);
		const el = root(container);
		fireEvent.keyDown(el, { key: "Enter" });
		fireEvent.click(el, { detail: 0 });
		fireEvent.keyDown(el, { key: "Enter" });
		fireEvent.click(el, { detail: 0 });
		expect(emitted()).toEqual([
			{ event: "click", detail: { input: "keyboard" } },
			{ event: "open", detail: { trigger: "click", input: "keyboard" } },
			{ event: "click", detail: { input: "keyboard" } },
			{ event: "close", detail: { input: "keyboard" } },
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
			{ event: "open", detail: { trigger: "click", input: "pointer" } },
		]);
		fireEvent.mouseDown(el, { button: 0 });
		expect(emitted().slice(2)).toEqual([
			{ event: "press", detail: undefined },
			{ event: "close", detail: { input: "pointer" } },
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
