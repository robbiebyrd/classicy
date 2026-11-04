import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { installClassicyAppearanceProbe } from "@/Appearance/__tests__/appearanceProbe";
import { ClassicyPlacard } from "@/SystemFolder/SystemResources/Placard/ClassicyPlacard";

let probe: ReturnType<typeof installClassicyAppearanceProbe>;

beforeEach(() => {
	probe = installClassicyAppearanceProbe();
});

afterEach(() => {
	probe.uninstall();
});

/** The events Placard emitted after its own `mount`. */
const emitted = () => {
	const own = probe.events.filter((e) => e.component === "Placard");
	return own
		.slice(own.findIndex((e) => e.event === "mount") + 1)
		.map(({ event, detail }) => ({ event, detail }));
};

const ITEMS = [
	{ id: "50", title: "50%" },
	{ id: "100", title: "100%" },
];

const root = (container: HTMLElement) =>
	container.querySelector(".classicyPlacard") as HTMLElement;

describe("ClassicyPlacard appearance", () => {
	it("carries the probe decoration and state classes", () => {
		const { container } = render(<ClassicyPlacard disabled>p</ClassicyPlacard>);
		const el = root(container);
		expect(el).toHaveClass("classicyPlacard", "probe-Placard", "disabled");
		expect(el.getAttribute("data-probe-state")).toBe("disabled");
	});

	it("emits its events", () => {
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "pointer" } },
			{
				event: "release",
				detail: { input: "pointer", lost: false, canceled: false },
			},
		]);
		fireEvent.click(el, { detail: 1 });
		expect(emitted().slice(2)).toEqual([
			{ event: "click", detail: { menu: false, input: "pointer" } },
		]);
	});

	it("opens and closes its menu", () => {
		const { container } = render(
			<ClassicyPlacard menuItems={ITEMS}>100%</ClassicyPlacard>,
		);
		// A pointer press with no mousedown handler of its own: only the click.
		fireEvent.pointerDown(root(container));
		fireEvent.click(root(container), { detail: 1 });
		expect(emitted()).toEqual([
			{ event: "click", detail: { menu: true, input: "pointer" } },
			{ event: "open", detail: { input: "pointer" } },
		]);
		// An open menu keeps the placard pressed, as before (I-R4).
		expect(root(container)).toHaveClass("pressed");
		const item = screen.getByRole("menuitem", { name: "50%" });
		fireEvent.mouseDown(item);
		fireEvent.click(item);
		expect(emitted().slice(2)).toEqual([
			{ event: "close", detail: { input: "pointer" } },
		]);
	});

	it("emits close when an outside press dismisses the menu", () => {
		const { container } = render(
			<ClassicyPlacard menuItems={ITEMS}>100%</ClassicyPlacard>,
		);
		fireEvent.keyDown(root(container), { key: "Enter" });
		fireEvent.click(root(container), { detail: 0 });
		fireEvent.mouseDown(document.body);
		expect(emitted().slice(1)).toEqual([
			{ event: "click", detail: { menu: true, input: "keyboard" } },
			{ event: "open", detail: { input: "keyboard" } },
			{ event: "close", detail: { input: "pointer" } },
		]);
	});

	it("emits press and release for Return and Space", () => {
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
		const el = root(container);
		for (const key of ["Enter", " "]) {
			fireEvent.keyDown(el, { key });
			fireEvent.keyDown(el, { key, repeat: true });
			fireEvent.keyUp(el, { key });
		}
		fireEvent.keyDown(el, { key: "a" });
		fireEvent.keyUp(el, { key: "a" });
		const keyboard = { input: "keyboard" };
		expect(emitted()).toEqual([
			{ event: "press", detail: keyboard },
			{
				event: "release",
				detail: { ...keyboard, lost: false, canceled: false },
			},
			{ event: "press", detail: keyboard },
			{
				event: "release",
				detail: { ...keyboard, lost: false, canceled: false },
			},
		]);
	});

	it("adds nothing when the package returns nothing", () => {
		probe.uninstall();
		const { container } = render(
			<ClassicyPlacard menuItems={ITEMS} disabled>
				p
			</ClassicyPlacard>,
		);
		const el = root(container);
		expect(el.hasAttribute("data-probe-state")).toBe(false);
		expect(el.hasAttribute("style")).toBe(false);
		expect(el.getAttribute("class")).toBe(
			"classicyPlacard disabled classicyPlacardHasMenu",
		);
	});
});

describe("ClassicyPlacard when a press loses its pointer stream", () => {
	afterEach(() => vi.restoreAllMocks());

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends the press in one release that says it was lost, on a %s", (loss) => {
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		expect(el).toHaveClass("pressed");
		losePointerStream(loss);
		expect(el).not.toHaveClass("pressed");
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
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
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
		const { container, unmount } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
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

describe("ClassicyPlacard when a press is let go off the placard", () => {
	it("ends the press in one canceled release, unpressed", () => {
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(document.body);
		expect(el).not.toHaveClass("pressed");
		expect(emitted()).toEqual([
			{ event: "press", detail: { input: "pointer" } },
			{
				event: "release",
				detail: { input: "pointer", lost: false, canceled: true },
			},
		]);
		losePointerStream("blur");
		expect(emitted()).toHaveLength(2);
	});

	it("sends exactly one release per press, over the placard or off it", () => {
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
		const el = root(container);
		const content = el.querySelector(".classicyPlacardContent") as HTMLElement;
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(el);
		content.addEventListener("mouseup", (e) => e.stopPropagation());
		fireEvent.mouseDown(el);
		fireEvent.mouseUp(content);
		expect(el).not.toHaveClass("pressed");
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
		]);
		expect(
			events.filter((e) => e.event === "release").map((e) => e.detail),
		).toEqual([
			{ input: "pointer", lost: false, canceled: false },
			{ input: "pointer", lost: false, canceled: false },
			{ input: "pointer", lost: false, canceled: true },
		]);
	});

	it("still reports a release over it for a press made elsewhere", () => {
		const { container } = render(
			<ClassicyPlacard onClick={() => {}}>p</ClassicyPlacard>,
		);
		fireEvent.mouseUp(root(container));
		expect(emitted()).toEqual([
			{
				event: "release",
				detail: { input: "pointer", lost: false, canceled: false },
			},
		]);
	});
});
