import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Slider emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Slider");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicySlider") as HTMLInputElement;

describe("ClassicySlider appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(<ClassicySlider id="s" value={10} disabled />);
		const el = root(container);
		expect(el).toHaveClass("classicySlider", "probe-Slider", "disabled");
		expect(el.getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits its events", () => {
		const { container } = render(<ClassicySlider id="s" value={10} />);
		fireEvent.change(root(container), { target: { value: "40" } });
		expect(emitted()).toEqual([{ event: "change", detail: { value: 40 } }]);
	});

	it("brackets a pointer drag with dragStart and dragEnd, with or without a ghost", () => {
		for (const ghost of [false, true]) {
			const { container, unmount } = render(
				<ClassicySlider id="s" value={10} ghost={ghost} />,
			);
			const el = root(container);
			fireEvent.pointerDown(el);
			fireEvent.change(el, { target: { value: "40" } });
			fireEvent.pointerUp(el);
			expect(emitted()).toEqual([
				{ event: "dragStart", detail: { value: 10 } },
				{ event: "change", detail: { value: 40 } },
				{ event: "dragEnd", detail: { value: 40 } },
			]);
			unmount();
			probe.events.length = 0;
		}
	});

	it("ends a canceled drag once", () => {
		const { container } = render(<ClassicySlider id="s" value={10} />);
		const el = root(container);
		fireEvent.pointerDown(el);
		fireEvent.pointerCancel(el);
		fireEvent.pointerUp(el);
		expect(emitted().map((e) => e.event)).toEqual(["dragStart", "dragEnd"]);
	});

	it("ends a drag released outside the input once", () => {
		const { container } = render(<ClassicySlider id="s" value={10} />);
		const el = root(container);
		fireEvent.pointerDown(el);
		fireEvent.change(el, { target: { value: "30" } });
		fireEvent.pointerUp(document.body);
		expect(emitted()).toEqual([
			{ event: "dragStart", detail: { value: 10 } },
			{ event: "change", detail: { value: 30 } },
			{ event: "dragEnd", detail: { value: 30 } },
		]);
		// A later release on the input is not a second end.
		fireEvent.pointerUp(el);
		expect(emitted()).toHaveLength(3);
	});

	it("reports keyboard stepping as change, with no drag", () => {
		const { container } = render(<ClassicySlider id="s" value={10} />);
		const el = root(container);
		// A native range input steps on the arrow key and fires `input`.
		fireEvent.keyDown(el, { key: "ArrowRight" });
		fireEvent.change(el, { target: { value: "11" } });
		fireEvent.keyUp(el, { key: "ArrowRight" });
		expect(emitted()).toEqual([{ event: "change", detail: { value: 11 } }]);
	});

	it("emits no drag while disabled", () => {
		const { container } = render(<ClassicySlider id="s" value={10} disabled />);
		const el = root(container);
		fireEvent.pointerDown(el);
		fireEvent.pointerUp(el);
		expect(emitted()).toEqual([]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(<ClassicySlider id="s" value={10} disabled />);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicySlider disabled classicySliderIndicatorDown",
		);
	});
});
