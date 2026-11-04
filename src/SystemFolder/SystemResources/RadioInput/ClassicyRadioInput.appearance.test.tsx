import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
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
			{ event: "release", detail: { itemId: "b", lost: false } },
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
			{ event: "release", detail: { itemId: "b", lost: false } },
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
		// The default align is "rows" (story 0087-p2w), which adds no modifier class.
		expect(el.getAttribute("class")).toBe("classicyRadioInputGroup");
	});
});

describe("ClassicyRadioInput when a press loses its pointer stream", () => {
	afterEach(() => vi.restoreAllMocks());

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends the press in one release that says it was lost, on a %s", (loss) => {
		const { container } = render(
			<ClassicyRadioInput name="r" inputs={INPUTS} />,
		);
		const el = container.querySelector("#b") as HTMLElement;
		fireEvent.mouseDown(el);
		losePointerStream(loss);
		expect(emitted()).toEqual([
			{ event: "press", detail: { itemId: "b" } },
			{
				event: "release",
				detail: { itemId: "b", input: "pointer", lost: true },
			},
		]);
		// A second loss, or the release that finally comes elsewhere, ends
		// nothing more.
		losePointerStream(loss);
		fireEvent.mouseUp(document.body);
		expect(emitted()).toHaveLength(2);
	});

	it("sends no lost release for a press already released, here or elsewhere", () => {
		const { container } = render(
			<ClassicyRadioInput name="r" inputs={INPUTS} />,
		);
		const el = container.querySelector("#b") as HTMLElement;
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		losePointerStream("blur");
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(document.body);
		losePointerStream("pointercancel");
		expect(emitted().filter((e) => e.event === "release")).toHaveLength(1);
	});

	it("watches the pointer stream only while a press lasts", () => {
		const live = trackPointerStreamListeners();
		const { container, unmount } = render(
			<ClassicyRadioInput name="r" inputs={INPUTS} />,
		);
		const el = container.querySelector("#b") as HTMLElement;
		expect(live.size).toBe(0);
		fireEvent.mouseDown(el);
		expect(live.size).toBe(3);
		fireEvent.mouseUp(el);
		expect(live.size).toBe(0);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(document.body);
		expect(live.size).toBe(0);
		fireEvent.mouseDown(el);
		losePointerStream("hidden");
		expect(live.size).toBe(0);
		fireEvent.mouseDown(el);
		unmount();
		expect(live.size).toBe(0);
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends a press on an item's label in one lost release, on a %s", (loss) => {
		const { container } = render(
			<ClassicyRadioInput name="r" inputs={INPUTS} />,
		);
		fireEvent.mouseDown(
			container.querySelector('label[for="b"]') as HTMLElement,
		);
		losePointerStream(loss);
		expect(emitted()).toEqual([
			{ event: "press", detail: { itemId: "b" } },
			{
				event: "release",
				detail: { itemId: "b", input: "pointer", lost: true },
			},
		]);
	});
});
