import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyAssistant } from "@/SystemFolder/SystemResources/Assistant/ClassicyAssistant";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Assistant emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Assistant");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyAssistant") as HTMLElement;

const pages = [
	{ title: "One", content: <p>1</p> },
	{ title: "Two", content: <p>2</p> },
	{ title: "Three", content: <p>3</p>, canAdvance: () => false },
];

describe("ClassicyAssistant appearance", () => {
	it("carries the probe decoration and no state classes", () => {
		const { container } = render(<ClassicyAssistant pages={pages} />);
		const el = root(container);
		expect(el).toHaveClass("classicyAssistant", "probe-Assistant");
		expect(el.getAttribute("data-probe-state")).toBe("");
	});

	it("emits change { page } for the Next arrow and the arrow keys", () => {
		const { container } = render(<ClassicyAssistant pages={pages} />);
		const next = screen.getByRole("button", { name: "Next page" });
		fireEvent.mouseDown(next);
		fireEvent.click(next);
		fireEvent.keyDown(root(container), { key: "ArrowLeft" });
		expect(emitted()).toEqual([
			{ event: "change", detail: { page: 1, input: "pointer" } },
			{ event: "change", detail: { page: 0, input: "keyboard" } },
		]);
	});

	it("emits nothing for a refused or a no-op move", () => {
		const { container } = render(
			<ClassicyAssistant pages={pages} initialPage={2} />,
		);
		// The last page refuses to advance, and there is no page after it.
		fireEvent.keyDown(root(container), { key: "ArrowRight" });
		expect(emitted()).toEqual([]);
	});

	it("puts the consumer style after the package's", () => {
		probe.uninstall();
		probe = installClassicyAppearanceProbe({
			on: { mount: () => ({ style: { marginTop: 1, marginLeft: 3 } }) },
		});
		const { container } = render(
			<ClassicyAssistant pages={pages} style={{ marginTop: 7 }} />,
		);
		const el = root(container);
		expect(el.style.marginLeft).toBe("3px");
		expect(el.style.marginTop).toBe("7px");
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyAssistant pages={pages} className="host" />,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe("classicyAssistant host");
	});
});
