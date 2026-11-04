import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
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
			{ event: "release", detail: { lost: false } },
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

describe("ClassicyBevelButton when a press loses its pointer stream", () => {
	afterEach(() => vi.restoreAllMocks());

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends the press in one release that says it was lost, on a %s", (loss) => {
		const { container } = render(
			<ClassicyBevelButton mode="toggle">B</ClassicyBevelButton>,
		);
		const el = root(container);
		fireEvent.mouseDown(el);
		expect(el).toHaveClass("pressed");
		losePointerStream(loss);
		expect(el).not.toHaveClass("pressed");
		expect(emitted()).toEqual([
			{ event: "press", detail: undefined },
			{ event: "release", detail: { input: "pointer", lost: true } },
		]);
		// A second loss, or the release that finally comes elsewhere, ends
		// nothing more.
		losePointerStream(loss);
		fireEvent.mouseUp(document.body);
		expect(emitted()).toHaveLength(2);
	});

	it("sends no lost release for a press already released, here or elsewhere", () => {
		const { container } = render(
			<ClassicyBevelButton mode="toggle">B</ClassicyBevelButton>,
		);
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
		const { container, unmount } = render(
			<ClassicyBevelButton mode="toggle">B</ClassicyBevelButton>,
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

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends a held menu press in one lost release, choosing nothing, on a %s", (loss) => {
		const onPick = vi.fn();
		const { container } = render(
			<ClassicyBevelButton
				mode="popup"
				menuItems={[{ id: "a", title: "A", onClickFunc: onPick }]}
				popupHoldDelayMs={0}
			>
				B
			</ClassicyBevelButton>,
		);
		fireEvent.mouseDown(root(container), { button: 0 });
		losePointerStream(loss);
		expect(container.ownerDocument.querySelector('[role="menu"]')).toBeNull();
		fireEvent.mouseUp(document.body);
		expect(onPick).not.toHaveBeenCalled();
		expect(emitted()).toEqual([
			{ event: "press", detail: undefined },
			{ event: "open", detail: { trigger: "click", input: "pointer" } },
			{ event: "release", detail: { input: "pointer", lost: true } },
			{ event: "close", detail: { input: "pointer" } },
		]);
	});

	it("ends a press-and-hold lost before its delay in one lost release, opening nothing", async () => {
		const { container } = render(
			<ClassicyBevelButton
				mode="push"
				menuItems={[{ id: "a", title: "A" }]}
				popupHoldDelayMs={20}
			>
				B
			</ClassicyBevelButton>,
		);
		fireEvent.mouseDown(root(container), { button: 0 });
		losePointerStream("blur");
		await new Promise((resolve) => setTimeout(resolve, 40));
		expect(emitted()).toEqual([
			{ event: "press", detail: undefined },
			{ event: "release", detail: { input: "pointer", lost: true } },
		]);
	});

	it("sends no release for a sticky menu that outlives its click", () => {
		const { container } = render(
			<ClassicyBevelButton
				mode="popup"
				menuItems={[{ id: "a", title: "A" }]}
				popupHoldDelayMs={10_000}
			>
				B
			</ClassicyBevelButton>,
		);
		const el = root(container);
		fireEvent.mouseDown(el, { button: 0 });
		fireEvent.mouseUp(el, { button: 0 });
		losePointerStream("blur");
		expect(
			container.ownerDocument.querySelector('[role="menu"]'),
		).not.toBeNull();
		expect(emitted().filter((e) => e.event === "release")).toEqual([
			{ event: "release", detail: { lost: false } },
		]);
	});

	it("ends a press that dismisses a sticky menu in one lost release", () => {
		const { container } = render(
			<ClassicyBevelButton
				mode="popup"
				menuItems={[{ id: "a", title: "A" }]}
				popupHoldDelayMs={10_000}
			>
				B
			</ClassicyBevelButton>,
		);
		const el = root(container);
		fireEvent.mouseDown(el, { button: 0 });
		fireEvent.mouseUp(el, { button: 0 });
		// Pressing again closes the menu; that press is lost before release.
		fireEvent.mouseDown(el, { button: 0 });
		losePointerStream("pointercancel");
		expect(emitted().filter((e) => e.event === "release")).toEqual([
			{ event: "release", detail: { lost: false } },
			{ event: "release", detail: { input: "pointer", lost: true } },
		]);
	});

	it("sends no release when a pending hold, already let go elsewhere, is lost", async () => {
		const { container } = render(
			<ClassicyBevelButton
				mode="push"
				menuItems={[{ id: "a", title: "A" }]}
				popupHoldDelayMs={20}
			>
				B
			</ClassicyBevelButton>,
		);
		fireEvent.mouseDown(root(container), { button: 0 });
		fireEvent.mouseUp(document.body);
		// The press has ended, though its hold is still pending; the loss
		// cancels the hold and owes no release.
		losePointerStream("blur");
		await new Promise((resolve) => setTimeout(resolve, 40));
		expect(emitted()).toEqual([{ event: "press", detail: undefined }]);
	});

	it("ends a press released over an element that stops the mouseup", () => {
		const { container } = render(
			<ClassicyBevelButton mode="toggle">B</ClassicyBevelButton>,
		);
		const stopper = document.createElement("div");
		stopper.addEventListener("mouseup", (e) => e.stopPropagation());
		document.body.append(stopper);
		fireEvent.mouseDown(root(container));
		fireEvent.mouseUp(stopper);
		losePointerStream("blur");
		expect(emitted()).toEqual([{ event: "press", detail: undefined }]);
		stopper.remove();
	});

	it("leaves no document mouseup listener behind when it unmounts mid-press", () => {
		const add = vi.spyOn(document, "addEventListener");
		const remove = vi.spyOn(document, "removeEventListener");
		const { container, unmount } = render(
			<ClassicyBevelButton mode="toggle">B</ClassicyBevelButton>,
		);
		fireEvent.mouseDown(root(container));
		const added = add.mock.calls.filter(
			([type, , options]) => type === "mouseup" && options === true,
		);
		expect(added).toHaveLength(1);
		unmount();
		expect(
			remove.mock.calls.filter(
				([type, listener, options]) =>
					type === "mouseup" && listener === added[0][1] && options === true,
			),
		).toHaveLength(1);
	});

	it("watches the pointer stream once for a new press over a pending hold", () => {
		const live = trackPointerStreamListeners();
		const { container, unmount } = render(
			<ClassicyBevelButton
				mode="push"
				menuItems={[{ id: "a", title: "A" }]}
				popupHoldDelayMs={10_000}
			>
				B
			</ClassicyBevelButton>,
		);
		const el = root(container);
		fireEvent.mouseDown(el, { button: 0 });
		// Let go elsewhere: the hold is still pending, and still watched.
		fireEvent.mouseUp(document.body);
		expect(live.size).toBe(3);
		fireEvent.mouseDown(el, { button: 0 });
		expect(live.size).toBe(3);
		unmount();
		expect(live.size).toBe(0);
	});
});
