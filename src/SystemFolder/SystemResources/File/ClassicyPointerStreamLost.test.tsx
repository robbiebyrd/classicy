import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	KEY_PRESS_LOSSES,
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	onClassicyPointerStreamLost,
	onClassicyWindowFocusLost,
	useClassicyKeyPress,
	useClassicyPointerPress,
	useClassicyPointerStreamLost,
} from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";

afterEach(() => vi.restoreAllMocks());

describe("onClassicyPointerStreamLost", () => {
	it.each(POINTER_STREAM_LOSSES)("reports a %s", (loss) => {
		const onLost = vi.fn();
		const stop = onClassicyPointerStreamLost(onLost);
		losePointerStream(loss);
		expect(onLost).toHaveBeenCalledOnce();
		// Called with nothing: the event is not the caller's business.
		expect(onLost).toHaveBeenCalledWith();
		stop();
	});

	it("ignores a visibilitychange that leaves the page visible", () => {
		const onLost = vi.fn();
		const stop = onClassicyPointerStreamLost(onLost);
		document.dispatchEvent(new Event("visibilitychange"));
		expect(onLost).not.toHaveBeenCalled();
		stop();
	});

	it("hears a pointercancel even when an element stops it", () => {
		document.body.innerHTML = `<div id="stopper"></div>`;
		const stopper = document.getElementById("stopper") as HTMLElement;
		stopper.addEventListener("pointercancel", (e) => e.stopPropagation());
		const onLost = vi.fn();
		const stop = onClassicyPointerStreamLost(onLost);
		stopper.dispatchEvent(new Event("pointercancel", { bubbles: true }));
		expect(onLost).toHaveBeenCalledOnce();
		stop();
		document.body.innerHTML = "";
	});

	it("removes every listener it added when stopped, and reports nothing after", () => {
		const live = trackPointerStreamListeners();
		const onLost = vi.fn();
		const stop = onClassicyPointerStreamLost(onLost);
		expect(live.size).toBe(3);
		stop();
		expect(live.size).toBe(0);
		for (const loss of POINTER_STREAM_LOSSES) losePointerStream(loss);
		expect(onLost).not.toHaveBeenCalled();
		// Stopping twice is harmless.
		stop();
	});
});

describe("useClassicyPointerStreamLost", () => {
	const Probe = ({
		active,
		onLost,
	}: {
		active: boolean;
		onLost: () => void;
	}) => {
		useClassicyPointerStreamLost(active, onLost);
		return null;
	};

	it("watches only while active", () => {
		const live = trackPointerStreamListeners();
		const onLost = vi.fn();
		const { rerender, unmount } = render(
			<Probe active={false} onLost={onLost} />,
		);
		expect(live.size).toBe(0);
		losePointerStream("blur");
		expect(onLost).not.toHaveBeenCalled();

		rerender(<Probe active onLost={onLost} />);
		expect(live.size).toBe(3);
		losePointerStream("blur");
		expect(onLost).toHaveBeenCalledOnce();

		rerender(<Probe active={false} onLost={onLost} />);
		expect(live.size).toBe(0);

		rerender(<Probe active onLost={onLost} />);
		unmount();
		expect(live.size).toBe(0);
	});

	it("calls the latest callback without re-subscribing", () => {
		const live = trackPointerStreamListeners();
		const first = vi.fn();
		const second = vi.fn();
		const { rerender, unmount } = render(<Probe active onLost={first} />);
		const subscribed = [...live];
		rerender(<Probe active onLost={second} />);
		expect([...live]).toEqual(subscribed);
		losePointerStream("hidden");
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledOnce();
		unmount();
	});
});

describe("useClassicyPointerPress", () => {
	// A control whose press is watched from its mousedown. Its own mouseup
	// reports a release only when the press did not already report it there
	// (`releasedOver`): a release with no press of its own behind it.
	const Pressable = ({
		onLost,
		onRelease,
		onStray = () => {},
	}: {
		onLost: () => void;
		onRelease: (canceled: boolean) => void;
		onStray?: () => void;
	}) => {
		const { watchPress, releasedOver } = useClassicyPointerPress();
		const ref = useRef<HTMLButtonElement>(null);
		return (
			<button
				ref={ref}
				type="button"
				onMouseDown={() =>
					watchPress({
						isOver: (target) =>
							target instanceof Node && !!ref.current?.contains(target),
						onRelease,
						onLost,
					})
				}
				onMouseUp={(e) => {
					if (!releasedOver(e.nativeEvent)) onStray();
				}}
			>
				Press <span>inside</span>
			</button>
		);
	};
	const setup = () => {
		const live = trackPointerStreamListeners();
		const onLost = vi.fn();
		const onRelease = vi.fn();
		const onStray = vi.fn();
		const view = render(
			<Pressable onLost={onLost} onRelease={onRelease} onStray={onStray} />,
		);
		const button = view.getByRole("button");
		return { ...view, live, onLost, onRelease, onStray, button };
	};

	it.each(
		POINTER_STREAM_LOSSES,
	)("reports a press lost on a %s once, then stops watching", (loss) => {
		const { live, onLost, onRelease, button } = setup();
		expect(live.size).toBe(0);
		fireEvent.mouseDown(button);
		expect(live.size).toBe(3);
		losePointerStream(loss);
		expect(onLost).toHaveBeenCalledOnce();
		expect(live.size).toBe(0);
		// A second loss, or the release that finally comes, reports nothing.
		losePointerStream(loss);
		fireEvent.mouseUp(document.body);
		fireEvent.mouseUp(button);
		expect(onLost).toHaveBeenCalledOnce();
		expect(onRelease).not.toHaveBeenCalled();
	});

	it("reports a release over the control once, not canceled, and its own mouseup hears it was reported", () => {
		const { live, onLost, onRelease, onStray, button, getByText } = setup();
		fireEvent.mouseDown(button);
		fireEvent.mouseUp(button);
		expect(onRelease).toHaveBeenCalledExactlyOnceWith(false);
		expect(onStray).not.toHaveBeenCalled();
		expect(live.size).toBe(0);
		// Over a child of the control counts as over it.
		fireEvent.mouseDown(button);
		fireEvent.mouseUp(getByText("inside"));
		expect(onRelease).toHaveBeenNthCalledWith(2, false);
		expect(onRelease).toHaveBeenCalledTimes(2);
		expect(onStray).not.toHaveBeenCalled();
		losePointerStream("blur");
		expect(onLost).not.toHaveBeenCalled();
	});

	it("reports a release elsewhere once, canceled", () => {
		const { live, onLost, onRelease, onStray, button } = setup();
		fireEvent.mouseDown(button);
		fireEvent.mouseUp(document.body);
		expect(onRelease).toHaveBeenCalledExactlyOnceWith(true);
		expect(live.size).toBe(0);
		// The mouseup that follows on the control is a release of its own.
		fireEvent.mouseUp(button);
		expect(onStray).toHaveBeenCalledOnce();
		expect(onRelease).toHaveBeenCalledOnce();
		losePointerStream("blur");
		expect(onLost).not.toHaveBeenCalled();
	});

	it("leaves a mouseup with no press behind it to the control", () => {
		const { onRelease, onStray, button } = setup();
		fireEvent.mouseUp(button);
		expect(onStray).toHaveBeenCalledOnce();
		expect(onRelease).not.toHaveBeenCalled();
	});

	it("hears a release a target stops, over the control or elsewhere", () => {
		const { live, onLost, onRelease, onStray, button, getByText } = setup();
		const inside = getByText("inside");
		inside.addEventListener("mouseup", (e) => e.stopPropagation());
		fireEvent.mouseDown(button);
		fireEvent.mouseUp(inside);
		expect(onRelease).toHaveBeenCalledExactlyOnceWith(false);
		expect(onStray).not.toHaveBeenCalled();
		document.body.insertAdjacentHTML("beforeend", `<div id="stopper"></div>`);
		const stopper = document.getElementById("stopper") as HTMLElement;
		stopper.addEventListener("mouseup", (e) => e.stopPropagation());
		fireEvent.mouseDown(button);
		fireEvent.mouseUp(stopper);
		expect(onRelease).toHaveBeenNthCalledWith(2, true);
		expect(live.size).toBe(0);
		losePointerStream("blur");
		expect(onLost).not.toHaveBeenCalled();
		stopper.remove();
	});

	it("watches one press at a time, and stops when the control unmounts", () => {
		const { live, onLost, onRelease, button, unmount } = setup();
		fireEvent.mouseDown(button);
		fireEvent.mouseDown(button);
		expect(live.size).toBe(3);
		losePointerStream("pointercancel");
		expect(onLost).toHaveBeenCalledOnce();
		fireEvent.mouseDown(button);
		unmount();
		expect(live.size).toBe(0);
		losePointerStream("blur");
		fireEvent.mouseUp(document.body);
		expect(onLost).toHaveBeenCalledOnce();
		expect(onRelease).not.toHaveBeenCalled();
	});
});

describe("onClassicyWindowFocusLost", () => {
	it.each(KEY_PRESS_LOSSES)("reports a %s", (loss) => {
		const onLost = vi.fn();
		const stop = onClassicyWindowFocusLost(onLost);
		losePointerStream(loss);
		expect(onLost).toHaveBeenCalledExactlyOnceWith();
		stop();
	});

	it("ignores a pointercancel, which has nothing to do with focus", () => {
		const onLost = vi.fn();
		const stop = onClassicyWindowFocusLost(onLost);
		losePointerStream("pointercancel");
		expect(onLost).not.toHaveBeenCalled();
		stop();
	});

	it("removes both listeners when stopped", () => {
		const live = trackPointerStreamListeners();
		const onLost = vi.fn();
		const stop = onClassicyWindowFocusLost(onLost);
		expect(live.size).toBe(2);
		stop();
		expect(live.size).toBe(0);
		for (const loss of KEY_PRESS_LOSSES) losePointerStream(loss);
		expect(onLost).not.toHaveBeenCalled();
	});
});

describe("useClassicyKeyPress", () => {
	// A control whose keyboard press is watched from its keydown, and whose
	// keyup reports a release only when `releaseKey` says the press has not
	// already ended.
	const KeyPressable = ({
		onCancel,
		onRelease,
	}: {
		onCancel: (key: string, lost: boolean) => void;
		onRelease: (key: string) => void;
	}) => {
		const ref = useRef<HTMLButtonElement>(null);
		const { watchKeyPress, releaseKey } = useClassicyKeyPress(ref);
		return (
			<>
				<button
					ref={ref}
					type="button"
					onKeyDown={(e) => {
						if (!e.repeat)
							watchKeyPress(e.key, (lost) => onCancel(e.key, lost));
					}}
					onKeyUp={(e) => {
						if (releaseKey(e)) onRelease(e.key);
					}}
				>
					Press
				</button>
				<button type="button">Other</button>
			</>
		);
	};
	const setup = () => {
		const live = trackPointerStreamListeners();
		const onCancel = vi.fn();
		const onRelease = vi.fn();
		const view = render(
			<KeyPressable onCancel={onCancel} onRelease={onRelease} />,
		);
		const button = view.getByRole("button", { name: "Press" });
		const other = view.getByRole("button", { name: "Other" });
		button.focus();
		return { ...view, live, onCancel, onRelease, button, other };
	};

	it("leaves a keyup that ends its press to the control, and stops watching", () => {
		const { live, onCancel, onRelease, button } = setup();
		fireEvent.keyDown(button, { key: " " });
		expect(live.size).toBe(2);
		// Not prevented: the browser still activates the button.
		expect(fireEvent.keyUp(button, { key: " " })).toBe(true);
		expect(onRelease).toHaveBeenCalledExactlyOnceWith(" ");
		expect(live.size).toBe(0);
		losePointerStream("blur");
		expect(onCancel).not.toHaveBeenCalled();
	});

	it("leaves a keyup with no press behind it to the control", () => {
		const { onRelease, button } = setup();
		expect(fireEvent.keyUp(button, { key: "Enter" })).toBe(true);
		expect(onRelease).toHaveBeenCalledExactlyOnceWith("Enter");
	});

	it.each(
		KEY_PRESS_LOSSES,
	)("ends a press lost on a %s once, and swallows its late keyup", (loss) => {
		const { live, onCancel, onRelease, button } = setup();
		fireEvent.keyDown(button, { key: " " });
		losePointerStream(loss);
		expect(onCancel).toHaveBeenCalledExactlyOnceWith(" ", true);
		expect(live.size).toBe(0);
		losePointerStream(loss);
		// Prevented, so the browser does not activate the button either.
		expect(fireEvent.keyUp(button, { key: " " })).toBe(false);
		expect(onRelease).not.toHaveBeenCalled();
		expect(onCancel).toHaveBeenCalledOnce();
		// Only that keyup: the next press is an ordinary one.
		fireEvent.keyDown(button, { key: " " });
		expect(fireEvent.keyUp(button, { key: " " })).toBe(true);
		expect(onRelease).toHaveBeenCalledExactlyOnceWith(" ");
	});

	it("treats the next press of a key as its own when the lost press's keyup never came back", () => {
		const { onCancel, onRelease, button } = setup();
		fireEvent.keyDown(button, { key: " " });
		losePointerStream("blur");
		// The key was let go in another window; the next press is new.
		fireEvent.keyDown(button, { key: " " });
		expect(fireEvent.keyUp(button, { key: " " })).toBe(true);
		expect(onRelease).toHaveBeenCalledExactlyOnceWith(" ");
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("keeps a press through a pointercancel", () => {
		const { onCancel, onRelease, button } = setup();
		fireEvent.keyDown(button, { key: "Enter" });
		losePointerStream("pointercancel");
		expect(onCancel).not.toHaveBeenCalled();
		fireEvent.keyUp(button, { key: "Enter" });
		expect(onRelease).toHaveBeenCalledExactlyOnceWith("Enter");
	});

	it("cancels a press, not lost, when focus moves off the control", () => {
		const { live, onCancel, onRelease, button, other } = setup();
		fireEvent.keyDown(button, { key: " " });
		act(() => other.focus());
		expect(onCancel).toHaveBeenCalledExactlyOnceWith(" ", false);
		expect(live.size).toBe(0);
		// Focus coming back before the key is let go does not revive it.
		act(() => button.focus());
		expect(fireEvent.keyUp(button, { key: " " })).toBe(false);
		expect(onRelease).not.toHaveBeenCalled();
		// Blurred outright, too.
		fireEvent.keyDown(button, { key: "Enter" });
		act(() => button.blur());
		expect(onCancel).toHaveBeenLastCalledWith("Enter", false);
		expect(onCancel).toHaveBeenCalledTimes(2);
	});

	it("counts the control's blur as lost when it stays the active element (the window lost focus)", () => {
		const { onCancel, button } = setup();
		fireEvent.keyDown(button, { key: " " });
		// A browser blurs the focused element, which stays document's active
		// element, when the window loses focus; the window's blur follows.
		act(() => {
			button.dispatchEvent(new FocusEvent("blur"));
		});
		losePointerStream("blur");
		expect(onCancel).toHaveBeenCalledExactlyOnceWith(" ", true);
	});

	it("ends every key held, each once", () => {
		const { onCancel, onRelease, button } = setup();
		fireEvent.keyDown(button, { key: " " });
		fireEvent.keyDown(button, { key: "Enter" });
		fireEvent.keyUp(button, { key: "Enter" });
		fireEvent.keyDown(button, { key: "Enter" });
		losePointerStream("hidden");
		expect(onRelease).toHaveBeenCalledExactlyOnceWith("Enter");
		expect(onCancel.mock.calls).toEqual([
			[" ", true],
			["Enter", true],
		]);
	});

	it("stops watching when the control unmounts", () => {
		const { live, onCancel, button, unmount } = setup();
		fireEvent.keyDown(button, { key: " " });
		unmount();
		expect(live.size).toBe(0);
		losePointerStream("blur");
		expect(onCancel).not.toHaveBeenCalled();
	});
});
