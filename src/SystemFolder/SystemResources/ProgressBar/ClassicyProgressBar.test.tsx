import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";

vi.mock(
	"@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar.scss",
	() => ({}),
);

describe("ClassicyProgressBar", () => {
	it("renders a progress element", () => {
		const { container } = render(<ClassicyProgressBar />);
		expect(container.querySelector("progress")).toBeInTheDocument();
	});

	it("uses determinate class by default", () => {
		const { container } = render(<ClassicyProgressBar />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressDeterminate");
		expect(wrapper).not.toHaveClass("classicyProgressIndeterminate");
	});

	it("uses indeterminate class when indeterminate=true", () => {
		const { container } = render(<ClassicyProgressBar indeterminate={true} />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressIndeterminate");
		expect(wrapper).not.toHaveClass("classicyProgressDeterminate");
	});

	it("reflects value and max on the progress element for determinate mode", () => {
		const { container } = render(<ClassicyProgressBar value={40} max={200} />);
		const progress = container.querySelector("progress");
		expect(progress).toBeInTheDocument();
		expect(progress).toHaveAttribute("value", "40");
		expect(progress).toHaveAttribute("max", "200");
	});

	it("forces max=100 and value=100 when indeterminate=true", () => {
		const { container } = render(
			<ClassicyProgressBar value={30} max={50} indeterminate={true} />,
		);
		const progress = container.querySelector("progress");
		expect(progress).toBeInTheDocument();
		expect(progress).toHaveAttribute("value", "100");
		expect(progress).toHaveAttribute("max", "100");
	});

	it("applies classicyLabelAlignLeft on the label wrapper by default", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelPosition="above" />,
		);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyLabelAbove");
		expect(wrapper).toHaveClass("classicyLabelAlignLeft");
	});

	it("applies classicyLabelAlignCenter when labelAlign=center", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelAlign="center" />,
		);
		expect(container.firstChild as Element).toHaveClass(
			"classicyLabelAlignCenter",
		);
	});

	it("applies classicyLabelAlignRight when labelAlign=right", () => {
		const { container } = render(
			<ClassicyProgressBar label="Loading" labelAlign="right" />,
		);
		expect(container.firstChild as Element).toHaveClass(
			"classicyLabelAlignRight",
		);
	});

	it("renders no label wrapper when there is no label, even with labelAlign", () => {
		const { container } = render(<ClassicyProgressBar labelAlign="center" />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgress");
		expect(wrapper).not.toHaveClass("classicyLabelAlignCenter");
	});

	it("renders the chasing-arrows spinner instead of a bar when chasingArrows=true", () => {
		const { container } = render(<ClassicyProgressBar chasingArrows={true} />);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressChasingArrows");
		expect(wrapper).toHaveAttribute("role", "progressbar");
		expect(wrapper).toHaveAttribute("aria-busy", "true");
		expect(container.querySelector("progress")).toBeNull();
		expect(
			container.querySelector(".classicyProgressChasingArrowsSpinner"),
		).toBeInTheDocument();
	});

	it("labels the chasing-arrows indicator with the label text", () => {
		const { container } = render(
			<ClassicyProgressBar chasingArrows={true} label="Connecting" />,
		);
		const wrapper = container.querySelector(".classicyProgressChasingArrows");
		expect(wrapper).toHaveAttribute("aria-label", "Connecting");
	});

	it("stays indeterminate when autoSwitch is set but no value is provided", () => {
		const { container } = render(
			<ClassicyProgressBar indeterminate={true} autoSwitch={true} />,
		);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressIndeterminate");
		expect(container.querySelector("progress")).toHaveAttribute("value", "100");
	});

	it("flips indeterminate→determinate once a value is known with autoSwitch", () => {
		const { container } = render(
			<ClassicyProgressBar
				indeterminate={true}
				autoSwitch={true}
				value={45}
				max={100}
			/>,
		);
		const wrapper = container.firstChild as Element;
		expect(wrapper).toHaveClass("classicyProgressDeterminate");
		expect(wrapper).not.toHaveClass("classicyProgressIndeterminate");
		const progress = container.querySelector("progress");
		expect(progress).toHaveAttribute("value", "45");
		expect(progress).toHaveAttribute("max", "100");
	});

	it("keeps a value=0 indeterminate bar barber-poled unless autoSwitch flips it", () => {
		// Without a value, indeterminate stays; value defaults to undefined now.
		const { container } = render(<ClassicyProgressBar indeterminate={true} />);
		expect(container.querySelector("progress")).toHaveAttribute("value", "100");
	});
});

// The indeterminate stripes slide by animating the registered `--slide-var`
// (CSS `@property`). Safari 16.2 and 16.3, inside the floor, lack
// `@property`: there the keyframes would step it between two offsets that
// draw the same stripes, so the bar slides them from script instead.
describe("ClassicyProgressBar stripes without @property", () => {
	let frames: FrameRequestCallback[] = [];
	beforeEach(() => {
		frames = [];
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			frames.push(cb);
			return frames.length;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});
	const runFrame = (time: number) => {
		const pending = frames;
		frames = [];
		for (const cb of pending) cb(time);
	};

	it("slides them from script, the keyframes stopped, where @property is missing", () => {
		vi.stubGlobal("CSS", { supports: () => true });
		const { container, unmount } = render(
			<ClassicyProgressBar indeterminate={true} />,
		);
		const bar = container.firstChild as HTMLElement;
		expect(bar).toHaveClass("classicyProgressSlideByScript");
		const progress = container.querySelector("progress") as HTMLElement;
		// jsdom has no theme: the period falls back to Platinum's 20 px, and
		// a 3 s loop travels two periods, as the keyframes do.
		runFrame(0);
		const start = Number.parseFloat(
			progress.style.getPropertyValue("--slide-var"),
		);
		runFrame(750);
		const quarter = Number.parseFloat(
			progress.style.getPropertyValue("--slide-var"),
		);
		expect(quarter - start).toBeCloseTo(10);
		unmount();
		expect(window.cancelAnimationFrame).toHaveBeenCalled();
		expect(progress.style.getPropertyValue("--slide-var")).toBe("");
	});

	// Final review r1, N2: Firefox 113-127 lack `@property` too, but draw
	// no stripes (they are `::-webkit-progress-value`'s), so nothing there
	// would read the offset.
	it("slides nothing where nothing draws the stripes (Firefox 113-127)", () => {
		vi.stubGlobal("CSS", {
			supports: (condition: string) =>
				condition !== "selector(::-webkit-progress-value)",
		});
		const { container } = render(<ClassicyProgressBar indeterminate={true} />);
		expect(container.firstChild).not.toHaveClass(
			"classicyProgressSlideByScript",
		);
		expect(frames).toHaveLength(0);
	});

	// The period is read when the slide starts, not on every frame (a
	// computed style read each frame), and the bar's per-frame writes are
	// marked as repainting it alone, so no observer measures for them.
	it("reads the period once, and marks its writes as repainting the bar alone", () => {
		vi.stubGlobal("CSS", { supports: () => true });
		const reads = vi.spyOn(window, "getComputedStyle");
		const { container, unmount } = render(
			<ClassicyProgressBar indeterminate={true} />,
		);
		const progress = container.querySelector("progress") as HTMLElement;
		expect(progress.hasAttribute("data-classicy-paint-only-style")).toBe(true);
		reads.mockClear();
		for (const time of [0, 16, 32, 48]) runFrame(time);
		expect(reads).not.toHaveBeenCalled();
		expect(progress.style.getPropertyValue("--slide-var")).not.toBe("");
		unmount();
		expect(progress.hasAttribute("data-classicy-paint-only-style")).toBe(false);
	});

	it("leaves them to the keyframes where @property is supported", () => {
		vi.stubGlobal("CSS", { supports: () => true, registerProperty: () => {} });
		const { container } = render(<ClassicyProgressBar indeterminate={true} />);
		expect(container.firstChild).not.toHaveClass(
			"classicyProgressSlideByScript",
		);
		expect(frames).toHaveLength(0);
	});

	it("slides nothing for a determinate bar", () => {
		vi.stubGlobal("CSS", { supports: () => true });
		const { container } = render(<ClassicyProgressBar value={4} />);
		expect(container.firstChild).not.toHaveClass(
			"classicyProgressSlideByScript",
		);
		expect(frames).toHaveLength(0);
	});
});
