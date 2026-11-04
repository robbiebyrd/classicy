import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { fireEvent, render } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Button emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Button");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const root = (container: HTMLElement) =>
	container.querySelector(".classicyButton") as HTMLElement;

describe("ClassicyButton appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(<ClassicyButton depressed>OK</ClassicyButton>);
		const el = root(container);
		expect(el).toHaveClass("classicyButton", "probe-Button", "pressed");
		expect(el.getAttribute("data-probe-state")).toBe("pressed");
	});

	it("emits its events", () => {
		const { container } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		fireEvent.click(el, { detail: 1 });
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "pointer" } },
			{ event: "release", detail: { input: "pointer", lost: false } },
			{ event: "click", detail: { input: "pointer" } },
		]);
	});

	it("emits press and release for keyboard activation", () => {
		const { container } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
		fireEvent.keyDown(el, { key: "Enter" });
		// Enter clicks on keydown; the click has no pointer behind it.
		fireEvent.click(el, { detail: 0 });
		fireEvent.keyUp(el, { key: "Enter" });
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "keyboard" } },
			{ event: "click", detail: { input: "keyboard" } },
			{ event: "release", detail: { input: "keyboard", lost: false } },
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(<ClassicyButton depressed>OK</ClassicyButton>);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicyButton pressed classicyButtonPaddingMd classicyButtonMarginMd",
		);
	});
});

describe("ClassicyButton when a press loses its pointer stream", () => {
	afterEach(() => vi.restoreAllMocks());

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends the press in one release that says it was lost, on a %s", (loss) => {
		const { container } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
		fireEvent.mouseDown(el);
		losePointerStream(loss);
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "pointer" } },
			{ event: "release", detail: { input: "pointer", lost: true } },
		]);
		// A second loss, or the release that finally comes elsewhere, ends
		// nothing more.
		losePointerStream(loss);
		fireEvent.mouseUp(document.body);
		expect(emitted()).toHaveLength(2);
	});

	it("sends no lost release for a press already released, here or elsewhere", () => {
		const { container } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
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
		const { container, unmount } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
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
});
