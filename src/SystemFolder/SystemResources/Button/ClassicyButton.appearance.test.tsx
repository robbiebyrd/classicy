import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	KEY_PRESS_LOSSES,
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { act, fireEvent, render } from "@/__tests__/test-utils";
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
			{
				event: "release",
				detail: { input: "pointer", lost: false, canceled: false },
			},
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
			{
				event: "release",
				detail: { input: "keyboard", lost: false, canceled: false },
			},
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
			{
				event: "release",
				detail: { input: "pointer", lost: true, canceled: true },
			},
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
		const releases = emitted().filter((e) => e.event === "release");
		expect(releases.map((e) => e.detail)).toEqual([
			{ input: "pointer", lost: false, canceled: false },
			{ input: "pointer", lost: false, canceled: true },
		]);
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

describe("ClassicyButton when a press is let go off the button", () => {
	it("ends the press in one canceled release", () => {
		const { container } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(document.body);
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "pointer" } },
			{
				event: "release",
				detail: { input: "pointer", lost: false, canceled: true },
			},
		]);
		// A loss after it ends nothing more.
		losePointerStream("blur");
		expect(emitted()).toHaveLength(2);
	});

	it("sends exactly one release per press, over the button or off it", () => {
		const { container } = render(
			<ClassicyButton>
				OK <span>label</span>
			</ClassicyButton>,
		);
		const el = root(container);
		const label = el.querySelector("span") as HTMLElement;
		// Over the button, over a child of it, and over a child that stops
		// the mouseup before the button hears it.
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(label);
		label.addEventListener("mouseup", (e) => e.stopPropagation());
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(label);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(document.body);
		const events = emitted().filter(
			(e) => e.event === "press" || e.event === "release",
		);
		expect(events.map((e) => e.event)).toEqual([
			"press",
			"release",
			"press",
			"release",
			"press",
			"release",
			"press",
			"release",
		]);
		expect(
			events.filter((e) => e.event === "release").map((e) => e.detail),
		).toEqual([
			{ input: "pointer", lost: false, canceled: false },
			{ input: "pointer", lost: false, canceled: false },
			{ input: "pointer", lost: false, canceled: false },
			{ input: "pointer", lost: false, canceled: true },
		]);
	});

	it("still reports a release over it for a press made elsewhere", () => {
		const { container } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
		fireEvent.mouseUp(el);
		expect(emitted()).toEqual([
			{
				event: "release",
				detail: { input: "pointer", lost: false, canceled: false },
			},
		]);
	});
});

describe("ClassicyButton when a keyboard press never gets its keyup", () => {
	afterEach(() => vi.restoreAllMocks());

	const KEYS = [" ", "Enter"] as const;
	const cases = KEY_PRESS_LOSSES.flatMap((loss) =>
		KEYS.map((key) => [loss, key] as const),
	);

	it.each(
		cases,
	)("ends the press in one lost release on a %s, and ignores the late keyup (%j)", (loss, key) => {
		const onClickFunc = vi.fn();
		const { container } = render(
			<ClassicyButton onClickFunc={onClickFunc}>OK</ClassicyButton>,
		);
		const el = root(container);
		el.focus();
		fireEvent.keyDown(el, { key });
		expect(el).toHaveClass("classicyButtonKeyActive", "pressed");
		losePointerStream(loss);
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "keyboard" } },
			{
				event: "release",
				detail: { input: "keyboard", lost: true, canceled: true },
			},
		]);
		// The pressed look goes with the press.
		expect(el).not.toHaveClass("classicyButtonKeyActive");
		expect(el).not.toHaveClass("pressed");
		// A second loss, or the keyup arriving late, adds nothing; the keyup
		// is prevented, so the browser does not click the button for it.
		losePointerStream(loss);
		expect(fireEvent.keyUp(el, { key })).toBe(false);
		expect(emitted()).toHaveLength(2);
		expect(onClickFunc).not.toHaveBeenCalled();
	});

	it("cancels a press, not lost, when focus moves off the button", () => {
		const { container } = render(
			<>
				<ClassicyButton>OK</ClassicyButton>
				<button type="button">Other</button>
			</>,
		);
		const el = root(container);
		el.focus();
		fireEvent.keyDown(el, { key: " " });
		act(() =>
			(
				container.querySelector("button:not(.classicyButton)") as HTMLElement
			).focus(),
		);
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "keyboard" } },
			{
				event: "release",
				detail: { input: "keyboard", lost: false, canceled: true },
			},
		]);
		expect(el).not.toHaveClass("classicyButtonKeyActive");
		// Focus back before the key is let go: the keyup ends nothing.
		el.focus();
		expect(fireEvent.keyUp(el, { key: " " })).toBe(false);
		losePointerStream("blur");
		expect(emitted()).toHaveLength(2);
	});

	it("keeps an ordinary keyboard press as it was", () => {
		const { container } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
		el.focus();
		fireEvent.keyDown(el, { key: " " });
		// Not prevented: the browser clicks the button on Space's keyup.
		expect(fireEvent.keyUp(el, { key: " " })).toBe(true);
		losePointerStream("blur");
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "keyboard" } },
			{
				event: "release",
				detail: { input: "keyboard", lost: false, canceled: false },
			},
		]);
	});

	it("watches window focus only while a keyboard press lasts", () => {
		const live = trackPointerStreamListeners();
		const { container, unmount } = render(<ClassicyButton>OK</ClassicyButton>);
		const el = root(container);
		el.focus();
		fireEvent.keyDown(el, { key: "Enter" });
		expect(live.size).toBe(2);
		fireEvent.keyUp(el, { key: "Enter" });
		expect(live.size).toBe(0);
		fireEvent.keyDown(el, { key: "Enter" });
		losePointerStream("hidden");
		expect(live.size).toBe(0);
		fireEvent.keyDown(el, { key: " " });
		unmount();
		expect(live.size).toBe(0);
	});
});
