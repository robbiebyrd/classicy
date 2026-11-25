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
	type ClassicyIconBalloonHelp,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

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
}: {
	config?: ClassicyIconBalloonHelp;
	onMouseDown?: () => void;
}) => {
	const ref = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(ref, config);
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: a test anchor
		<div ref={ref} data-testid="anchor" onMouseDown={onMouseDown} {...handlers}>
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
		// A press during the wait cancels it.
		fireEvent.mouseLeave(screen.getByTestId("anchor"));
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
