import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { fireEvent, render } from "@/__tests__/test-utils";
import {
	onClassicyPointerStreamLost,
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
