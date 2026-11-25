import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

const mockState = vi.hoisted(() => ({ disableBalloonHelp: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: { disableBalloonHelp: mockState.disableBalloonHelp },
					},
				},
			}),
	}),
);

import { classicyHelpAnchorConfig } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import {
	type ClassicyBalloonHelpOptions,
	type ClassicyIconBalloonHelp,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";

// No package is registered for the first tests, so the layout is the
// fallback's (anchor placement); `windows-tips` carries the Windows 98
// package's layout (`balloonHelp.placement` "pointer"). The store is mocked:
// stand in for its connection of the active package id.
const activePackage = { id: "mac-tips" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});
registerClassicyAppearancePackage({
	id: "windows-tips",
	name: "Windows tips",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "windows-tips-default",
		package: "windows-tips",
	},
	layout: windows98.layout as never,
});
// A Mac-shaped layout that hides its balloons on a press, at the anchor.
registerClassicyAppearancePackage({
	id: "press-tips",
	name: "Press tips",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "press-tips-default",
		package: "press-tips",
	},
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
		balloonHelp: { hideOnPress: true },
	},
});
registerClassicyAppearancePackage({
	id: "mac-tips",
	name: "Mac tips",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "mac-tips-default",
		package: "mac-tips",
	},
	layout: {
		window: { growBoxCorner: "bottom-right" },
		menuBar: { placement: "screen" },
		desktop: { iconGridOrigin: "top-right" },
	},
});

afterEach(() => {
	activePackage.id = "mac-tips";
	vi.useRealTimers();
	vi.restoreAllMocks();
});

const Harness = ({
	config,
	onMouseDown,
	options,
	testId = "anchor",
}: {
	config?: ClassicyIconBalloonHelp;
	onMouseDown?: () => void;
	options?: ClassicyBalloonHelpOptions;
	testId?: string;
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(ref, config, options);
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a test anchor
		<div ref={ref} data-testid={testId} onMouseDown={onMouseDown} {...handlers}>
			anchor
			{balloon}
		</div>
	);
};

describe("useClassicyBalloonHelp", () => {
	it("shows the balloon on hover after the delay", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		expect(await screen.findByText("Drag items here.")).toBeInTheDocument();
	});

	it("adds no DOM around the anchor element", () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		expect(screen.getByTestId("anchor")).not.toHaveClass(
			"classicyBalloonHelpAnchor",
		);
	});

	it("returns a null balloon when no config is supplied", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("returns a null balloon when balloon help is globally disabled", async () => {
		mockState.disableBalloonHelp = true;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("hides the balloon on mouse leave", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		const anchor = screen.getByTestId("anchor");
		fireEvent.mouseEnter(anchor);
		expect(await screen.findByText("Drag items here.")).toBeInTheDocument();
		fireEvent.mouseLeave(anchor);
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("renders the title when supplied", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<Harness
				config={{ title: "Trash", content: "Drag items here.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		expect(await screen.findByText("Trash")).toBeInTheDocument();
	});
});

// WIG Ch.7 "Tooltip Controls" (p.133): "The tooltip appears after a short
// time-out and is automatically removed when the user clicks the control or
// moves the pointer off the control. The tooltip is usually displayed at the
// lower right of the pointer, but is automatically adjusted if this location
// is offscreen" (the audit's 7.27), under `balloonHelp.placement` "pointer".
describe("useClassicyBalloonHelp — at the pointer (layout.balloonHelp.placement)", () => {
	const container = () =>
		document.querySelector(".classicyBalloonHelpContainer") as HTMLElement;
	const tip = { content: "Drag items here.", delay: 600 };
	const enter = (x: number, y: number) =>
		fireEvent.mouseEnter(screen.getByTestId("anchor"), {
			clientX: x,
			clientY: y,
		});
	const move = (x: number, y: number) =>
		fireEvent.mouseMove(screen.getByTestId("anchor"), {
			clientX: x,
			clientY: y,
		});
	const wait = (ms: number) =>
		act(() => {
			vi.advanceTimersByTime(ms);
		});

	it("keeps the balloon against its anchor, with its tail, under a Mac layout", () => {
		vi.useFakeTimers();
		mockState.disableBalloonHelp = false;
		render(<Harness config={tip} />);
		enter(40, 50);
		wait(600);
		expect(container().className).toBe("classicyBalloonHelpContainer");
		expect(
			container().querySelector(".classicyBalloonHelpTail"),
		).not.toBeNull();
		// A press does not hide it, nor a move restart anything.
		fireEvent.mouseDown(screen.getByTestId("anchor"));
		expect(screen.getByText("Drag items here.")).toBeInTheDocument();
	});

	it("opens under the resting pointer, with no tail", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		render(<Harness config={tip} />);
		enter(40, 50);
		move(44, 52);
		wait(600);
		expect(container()).toHaveClass("classicyBalloonHelpPointerBelow");
		expect(container().style.left).toBe("44px");
		expect(container().style.top).toBe("52px");
		expect(container().querySelector(".classicyBalloonHelpTail")).toBeNull();
		// A shown tip stays where it opened.
		move(70, 60);
		wait(600);
		expect(container().style.left).toBe("44px");
	});

	it("waits for the pointer to rest: a move restarts the time-out", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		render(<Harness config={tip} />);
		enter(40, 50);
		wait(500);
		move(41, 50);
		wait(500);
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
		wait(100);
		expect(screen.getByText("Drag items here.")).toBeInTheDocument();
		expect(container().style.left).toBe("41px");
	});

	it("hides on a press until the pointer leaves, the anchor's own handler running", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		const onMouseDown = vi.fn();
		render(<Harness config={tip} onMouseDown={onMouseDown} />);
		enter(40, 50);
		wait(600);
		expect(screen.getByText("Drag items here.")).toBeInTheDocument();
		fireEvent.mouseDown(screen.getByTestId("anchor"));
		expect(onMouseDown).toHaveBeenCalledTimes(1);
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
		move(45, 55);
		wait(1200);
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
		fireEvent.mouseLeave(screen.getByTestId("anchor"));
		enter(40, 50);
		wait(600);
		expect(screen.getByText("Drag items here.")).toBeInTheDocument();
		// A press during the wait cancels it (past the reshow time, so the
		// wait is the delay).
		fireEvent.mouseLeave(screen.getByTestId("anchor"));
		wait(200);
		enter(40, 50);
		wait(300);
		fireEvent.mouseDown(screen.getByTestId("anchor"));
		wait(600);
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("moves left at the desktop's right edge and above the anchor at its bottom", () => {
		vi.useFakeTimers();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		const viewport = { width: window.innerWidth, height: window.innerHeight };
		// The tip measures 120 x 30, 20 px under where it is put (the
		// package's offset); the anchor sits at the screen's bottom right.
		vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
			function (this: HTMLElement) {
				if (this.classList.contains("classicyBalloonHelpContainer")) {
					const left = Number.parseFloat(this.style.left);
					const top = Number.parseFloat(this.style.top) + 20;
					return {
						left,
						top,
						right: left + 120,
						bottom: top + 30,
						width: 120,
						height: 30,
						x: left,
						y: top,
						toJSON: () => ({}),
					} as DOMRect;
				}
				const top = viewport.height - 40;
				return {
					left: viewport.width - 60,
					top,
					right: viewport.width,
					bottom: viewport.height,
					width: 60,
					height: 40,
					x: viewport.width - 60,
					y: top,
					toJSON: () => ({}),
				} as DOMRect;
			},
		);
		render(<Harness config={tip} />);
		enter(viewport.width - 30, viewport.height - 20);
		wait(600);
		expect(container()).toHaveClass("classicyBalloonHelpPointerAbove");
		expect(container().style.left).toBe(`${viewport.width - 120}px`);
		expect(container().style.bottom).toBe("40px");
		expect(container().style.top).toBe("");
	});
});

// What's This? and F1 show the help a ToolTip shows (the WIG audit's 12.3,
// 12.4; `ClassicyWhatsThis.internal.ts`): every anchor given a config is
// registered with it, under every layout and whether balloons are shown,
// kept current, and forgotten with the anchor or its config. The page is
// unchanged by it (no DOM, no attribute).
describe("useClassicyBalloonHelp — the anchors' registry (What's This?)", () => {
	it.each([
		["a Mac layout", "mac-tips"],
		["the Windows 98 layout", "windows-tips"],
	])("registers the anchor's config under %s, balloons shown or hidden", (_, id) => {
		activePackage.id = id;
		for (const disabled of [false, true]) {
			mockState.disableBalloonHelp = disabled;
			const config = { title: "Trash", content: "Holds deleted items." };
			const { unmount } = render(<Harness config={config} />);
			const anchor = screen.getByTestId("anchor");
			expect(classicyHelpAnchorConfig(anchor)).toBe(config);
			expect(anchor.getAttributeNames().sort()).toEqual(["data-testid"]);
			unmount();
			expect(classicyHelpAnchorConfig(anchor)).toBeUndefined();
		}
		mockState.disableBalloonHelp = false;
	});

	it("follows a new config, and forgets one taken away", () => {
		const first = { content: "First." };
		const { rerender } = render(<Harness config={first} />);
		const anchor = screen.getByTestId("anchor");
		expect(classicyHelpAnchorConfig(anchor)).toBe(first);
		const second = { content: "Second." };
		rerender(<Harness config={second} />);
		expect(classicyHelpAnchorConfig(anchor)).toBe(second);
		rerender(<Harness />);
		expect(classicyHelpAnchorConfig(anchor)).toBeUndefined();
	});
});

// Windows' ToolTip timing (the WIG audit's 12.11; WIG Ch.12 "Tooltips",
// p.276: shown "after the pointer ... remains over the button for a short
// period of time", it "remains displayed until the user presses the button
// or moves off of the control, or after another time-out", and a move
// "directly to another control" shows the next one at once; Wine's
// tooltips.c, TTDT_AUTOMATIC on the 500 ms double-click time: the reshow a
// fifth of it, the auto-pop ten times it), the active-window rule (12.12;
// "Status Bar Messages", p.276) and `force` (12.9), each under the Windows
// 98 layout and absent under a Mac one.
describe("useClassicyBalloonHelp — ToolTip timing, the active window, force", () => {
	const shown = (text = "Drag items here.") =>
		screen.queryByText(text) !== null;
	const wait = (ms: number) =>
		act(() => {
			vi.advanceTimersByTime(ms);
		});
	// Each test an hour after the last, so no test's reshow stamp reaches
	// the next.
	let hour = 0;
	const fakeClock = () => {
		vi.useFakeTimers();
		hour += 1;
		vi.setSystemTime(new Date(Date.UTC(2030, 0, 1) + hour * 3_600_000));
	};

	it.each([
		["the Windows 98 layout's delayMs", "windows-tips", 500],
		["600 ms under a Mac layout", "mac-tips", 600],
	])("waits %s where the config names no delay", (_, id, ms) => {
		fakeClock();
		activePackage.id = id;
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here." }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		wait(ms - 1);
		expect(shown()).toBe(false);
		wait(1);
		expect(shown()).toBe(true);
	});

	it("keeps a config's own delay under the Windows 98 layout", () => {
		fakeClock();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 900 }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		wait(899);
		expect(shown()).toBe(false);
		wait(1);
		expect(shown()).toBe(true);
	});

	it("shows the next tip after the reshow time when the pointer comes straight from a shown one", () => {
		fakeClock();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		render(
			<>
				<Harness config={{ content: "Back" }} testId="a" />
				<Harness config={{ content: "Forward" }} testId="b" />
			</>,
		);
		fireEvent.mouseEnter(screen.getByTestId("a"));
		wait(500);
		expect(shown("Back")).toBe(true);
		fireEvent.mouseLeave(screen.getByTestId("a"));
		fireEvent.mouseEnter(screen.getByTestId("b"));
		expect(shown("Back")).toBe(false);
		wait(99);
		expect(shown("Forward")).toBe(false);
		wait(1);
		expect(shown("Forward")).toBe(true);
		// A move during the visit keeps the reshow wait.
		fireEvent.mouseLeave(screen.getByTestId("b"));
		fireEvent.mouseEnter(screen.getByTestId("a"));
		wait(50);
		fireEvent.mouseMove(screen.getByTestId("a"), { clientX: 3, clientY: 3 });
		wait(100);
		expect(shown("Back")).toBe(true);
		// Arriving later than the reshow time waits the delay again.
		fireEvent.mouseLeave(screen.getByTestId("a"));
		wait(101);
		fireEvent.mouseEnter(screen.getByTestId("b"));
		wait(499);
		expect(shown("Forward")).toBe(false);
		wait(1);
		expect(shown("Forward")).toBe(true);
	});

	it("waits the delay after leaving a tip that never showed", () => {
		fakeClock();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		render(
			<>
				<Harness config={{ content: "Back" }} testId="a" />
				<Harness config={{ content: "Forward" }} testId="b" />
			</>,
		);
		fireEvent.mouseEnter(screen.getByTestId("a"));
		wait(200);
		fireEvent.mouseLeave(screen.getByTestId("a"));
		fireEvent.mouseEnter(screen.getByTestId("b"));
		wait(499);
		expect(shown("Forward")).toBe(false);
		wait(1);
		expect(shown("Forward")).toBe(true);
	});

	it("waits the full delay from one balloon to the next under a Mac layout", () => {
		fakeClock();
		activePackage.id = "mac-tips";
		mockState.disableBalloonHelp = false;
		render(
			<>
				<Harness config={{ content: "Back" }} testId="a" />
				<Harness config={{ content: "Forward" }} testId="b" />
			</>,
		);
		fireEvent.mouseEnter(screen.getByTestId("a"));
		wait(600);
		expect(shown("Back")).toBe(true);
		fireEvent.mouseLeave(screen.getByTestId("a"));
		fireEvent.mouseEnter(screen.getByTestId("b"));
		wait(599);
		expect(shown("Forward")).toBe(false);
		wait(1);
		expect(shown("Forward")).toBe(true);
	});

	it("hides a shown tip after the auto-pop time, each move restarting it, until the pointer leaves", () => {
		fakeClock();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here." }} />);
		const anchor = screen.getByTestId("anchor");
		fireEvent.mouseEnter(anchor, { clientX: 5, clientY: 5 });
		wait(500);
		expect(shown()).toBe(true);
		wait(4000);
		fireEvent.mouseMove(anchor, { clientX: 6, clientY: 5 });
		wait(4999);
		expect(shown()).toBe(true);
		wait(1);
		expect(shown()).toBe(false);
		// Gone until the pointer leaves: a move restarts nothing.
		fireEvent.mouseMove(anchor, { clientX: 7, clientY: 5 });
		wait(2000);
		expect(shown()).toBe(false);
		fireEvent.mouseLeave(anchor);
		wait(200);
		fireEvent.mouseEnter(anchor, { clientX: 5, clientY: 5 });
		wait(500);
		expect(shown()).toBe(true);
	});

	it("keeps a balloon shown while the pointer stays under a Mac layout", () => {
		fakeClock();
		activePackage.id = "mac-tips";
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here." }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		wait(600);
		wait(60_000);
		expect(shown()).toBe(true);
	});

	it("hides on a pointer press at the anchor under hideOnPress, until the pointer leaves", () => {
		fakeClock();
		activePackage.id = "press-tips";
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here." }} />);
		const anchor = screen.getByTestId("anchor");
		fireEvent.mouseEnter(anchor);
		wait(600);
		expect(shown()).toBe(true);
		// The balloon is against its anchor (with its tail), not at the pointer.
		expect(
			document.querySelector(".classicyBalloonHelpContainer")?.className,
		).toBe("classicyBalloonHelpContainer");
		fireEvent.pointerDown(anchor);
		expect(shown()).toBe(false);
		fireEvent.mouseMove(anchor);
		wait(1200);
		expect(shown()).toBe(false);
		fireEvent.mouseLeave(anchor);
		fireEvent.mouseEnter(anchor);
		// A press during the wait cancels it.
		wait(300);
		fireEvent.mouseDown(anchor);
		wait(600);
		expect(shown()).toBe(false);
	});

	it.each([
		["inactive", false, false],
		["active", true, true],
		["outside any window", undefined, true],
	])("shows a tip in an %s window under the Windows 98 layout: %s", (_, active, expected) => {
		fakeClock();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyWindowActiveContext.Provider value={active}>
				<Harness config={{ content: "Drag items here." }} />
			</ClassicyWindowActiveContext.Provider>,
		);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		wait(500);
		expect(shown()).toBe(expected);
	});

	it("hides a shown tip when its window goes inactive, and shows in an inactive window under a Mac layout", () => {
		fakeClock();
		activePackage.id = "windows-tips";
		mockState.disableBalloonHelp = false;
		const Framed = ({ active }: { active: boolean }) => (
			<ClassicyWindowActiveContext.Provider value={active}>
				<Harness config={{ content: "Drag items here." }} />
			</ClassicyWindowActiveContext.Provider>
		);
		const { rerender, unmount } = render(<Framed active={true} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"), {
			clientX: 5,
			clientY: 5,
		});
		wait(500);
		expect(shown()).toBe(true);
		rerender(<Framed active={false} />);
		expect(shown()).toBe(false);
		// Active again, the pointer's next move starts the wait again.
		rerender(<Framed active={true} />);
		expect(shown()).toBe(false);
		fireEvent.mouseMove(screen.getByTestId("anchor"), {
			clientX: 6,
			clientY: 5,
		});
		wait(500);
		expect(shown()).toBe(true);
		unmount();
		activePackage.id = "mac-tips";
		render(<Framed active={false} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		wait(600);
		expect(shown()).toBe(true);
	});

	it.each([
		["the Windows 98 layout", "windows-tips", 500],
		["a Mac layout", "mac-tips", 600],
	])("shows a forced tip while balloon help is off under %s, and no other", (_, id, ms) => {
		fakeClock();
		activePackage.id = id;
		mockState.disableBalloonHelp = true;
		render(
			<>
				<Harness
					config={{ content: "Forced." }}
					options={{ force: true }}
					testId="a"
				/>
				<Harness config={{ content: "Plain." }} testId="b" />
			</>,
		);
		fireEvent.mouseEnter(screen.getByTestId("a"));
		fireEvent.mouseEnter(screen.getByTestId("b"));
		wait(ms);
		expect(shown("Forced.")).toBe(true);
		expect(shown("Plain.")).toBe(false);
		mockState.disableBalloonHelp = false;
	});
});
