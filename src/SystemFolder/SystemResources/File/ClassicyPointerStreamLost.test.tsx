import { afterEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { render } from "@/__tests__/test-utils";
import {
	onClassicyPointerStreamLost,
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
