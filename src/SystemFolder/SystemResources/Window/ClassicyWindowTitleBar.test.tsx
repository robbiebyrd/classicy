import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyWindowTitleBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar";

// The tooltip's text, while one shows.
const tooltipText = () =>
	document.querySelector(".classicyBalloonHelpContent")?.textContent ??
	undefined;

describe("ClassicyWindowTitleBar", () => {
	it("renders close, zoom and collapse boxes only for the handlers given", () => {
		const { container } = render(
			<ClassicyWindowTitleBar
				title="T"
				onClose={vi.fn()}
				onCollapse={vi.fn()}
			/>,
		);
		expect(container.querySelector(".classicyWindowCloseBox")).not.toBeNull();
		expect(container.querySelector(".classicyWindowZoomBox")).toBeNull();
		expect(
			container.querySelector(".classicyWindowCollapseBox"),
		).not.toBeNull();
	});

	it("hides the zoom box on a modal title bar even with onZoom", () => {
		const { container } = render(
			<ClassicyWindowTitleBar title="T" modal onZoom={vi.fn()} />,
		);
		expect(container.querySelector(".classicyWindowZoomBox")).toBeNull();
		expect(container.querySelector(".classicyWindowTitleBar")).toHaveClass(
			"classicyWindowTitleBarModal",
		);
	});

	it("keeps the Part A control attributes", () => {
		const { container } = render(
			<ClassicyWindowTitleBar
				title="T"
				onClose={vi.fn()}
				onZoom={vi.fn()}
				onCollapse={vi.fn()}
			/>,
		);
		expect(
			container.querySelector('[data-classicy-control="close"]'),
		).not.toBeNull();
		expect(
			container.querySelector(
				'[data-classicy-control="zoom"] > .classicyWindowZoomBox',
			),
		).not.toBeNull();
		expect(
			container.querySelector(
				'[data-classicy-control="collapse"] > .classicyWindowCollapseBox',
			),
		).not.toBeNull();
	});

	it("renders the utility center band instead of title text", () => {
		const { container } = render(
			<ClassicyWindowTitleBar title="Tools" variant="utility" />,
		);
		expect(container.querySelector(".classicyWindowTitleText")).toBeNull();
		expect(
			container.querySelector(".classicyWindowTitleCenter"),
		).not.toBeNull();
	});

	it("renders the side bands, icon and title text for a titled document bar", () => {
		const { container } = render(
			<ClassicyWindowTitleBar title="Letter" icon="letter.png" />,
		);
		const title = container.querySelector(".classicyWindowTitle");
		expect(
			[...(title?.children ?? [])].map((child) => child.className),
		).toEqual([
			"classicyWindowTitleLeft",
			"classicyWindowIcon",
			"classicyWindowTitleText",
			"classicyWindowTitleRight",
		]);
		expect(container.querySelector(".classicyWindowIcon img")).toHaveAttribute(
			"src",
			"letter.png",
		);
		expect(
			container.querySelector(".classicyWindowTitleText p"),
		).toHaveTextContent("Letter");
	});

	it("drops the icon with hideIcon and draws the center band without a title", () => {
		const { container, rerender } = render(
			<ClassicyWindowTitleBar title="Letter" hideIcon />,
		);
		expect(container.querySelector(".classicyWindowIcon")).toBeNull();
		expect(container.querySelector(".classicyWindowTitleText")).not.toBeNull();
		rerender(<ClassicyWindowTitleBar title="" />);
		expect(container.querySelector(".classicyWindowTitleText")).toBeNull();
		expect(
			container.querySelector(".classicyWindowTitleCenter"),
		).not.toBeNull();
	});

	it("fires onTitleDoubleClick and onTitleMouseDown from the title area", () => {
		const onTitleMouseDown = vi.fn();
		const onTitleDoubleClick = vi.fn();
		const { container } = render(
			<ClassicyWindowTitleBar
				title="T"
				onTitleMouseDown={onTitleMouseDown}
				onTitleDoubleClick={onTitleDoubleClick}
			/>,
		);
		const title = container.querySelector(".classicyWindowTitle") as Element;
		fireEvent.mouseDown(title);
		fireEvent.doubleClick(title);
		expect(onTitleMouseDown).toHaveBeenCalledTimes(1);
		expect(onTitleDoubleClick).toHaveBeenCalledTimes(1);
	});

	// The window pop-up menu's icon (plan 0020-w98 §5): `ClassicyWindow`
	// passes the handlers under `window.systemMenu`, and the icon is inert
	// without them.
	it("fires onIconMouseDown and onIconDoubleClick from the icon, before the title area hears them", () => {
		const order: string[] = [];
		const { container } = render(
			<ClassicyWindowTitleBar
				title="T"
				icon="doc.png"
				onTitleMouseDown={() => order.push("title down")}
				onTitleDoubleClick={() => order.push("title double")}
				onIconMouseDown={() => order.push("icon down")}
				onIconDoubleClick={(e) => {
					order.push("icon double");
					e.stopPropagation();
				}}
			/>,
		);
		const iconEl = container.querySelector(".classicyWindowIcon") as Element;
		fireEvent.mouseDown(iconEl);
		fireEvent.doubleClick(iconEl);
		expect(order).toEqual(["icon down", "title down", "icon double"]);
	});

	it("keeps the icon inert, and its markup as it was, without the icon handlers", () => {
		const onTitleMouseDown = vi.fn();
		const { container } = render(
			<ClassicyWindowTitleBar
				title="T"
				icon="doc.png"
				onTitleMouseDown={onTitleMouseDown}
			/>,
		);
		const iconEl = container.querySelector(".classicyWindowIcon") as Element;
		expect(iconEl.getAttributeNames()).toEqual(["class"]);
		fireEvent.mouseDown(iconEl);
		// The press is the title area's, as any press in it.
		expect(onTitleMouseDown).toHaveBeenCalledTimes(1);
	});

	it("clicks and keys each control box to its handler", () => {
		const onClose = vi.fn();
		const onZoom = vi.fn();
		const onCollapse = vi.fn();
		const onCollapseKey = vi.fn();
		const { container } = render(
			<ClassicyWindowTitleBar
				title="T"
				onClose={onClose}
				onZoom={onZoom}
				onCollapse={onCollapse}
				onCollapseKey={onCollapseKey}
			/>,
		);
		const close = container.querySelector(".classicyWindowCloseBox") as Element;
		const zoom = container.querySelector(".classicyWindowZoomBox") as Element;
		const collapse = container.querySelector(
			".classicyWindowCollapseBox",
		) as Element;
		fireEvent.click(close);
		fireEvent.keyDown(close, { key: "Enter" });
		fireEvent.click(zoom);
		fireEvent.keyDown(zoom, { key: " " });
		fireEvent.click(collapse);
		fireEvent.keyDown(collapse, { key: "Enter" });
		fireEvent.keyDown(collapse, { key: "a" });
		expect(onClose).toHaveBeenCalledTimes(2);
		expect(onZoom).toHaveBeenCalledTimes(2);
		expect(onCollapse).toHaveBeenCalledTimes(1);
		expect(onCollapseKey).toHaveBeenCalledTimes(1);
	});

	it("keys the collapse box to onCollapse when no onCollapseKey is given", () => {
		const onCollapse = vi.fn();
		const { container } = render(
			<ClassicyWindowTitleBar title="T" onCollapse={onCollapse} />,
		);
		fireEvent.keyDown(
			container.querySelector(".classicyWindowCollapseBox") as Element,
			{ key: " " },
		);
		expect(onCollapse).toHaveBeenCalledTimes(1);
	});

	it("names the control boxes for assistive technology", () => {
		const { getByRole } = render(
			<ClassicyWindowTitleBar
				title="T"
				onClose={vi.fn()}
				onZoom={vi.fn()}
				onCollapse={vi.fn()}
			/>,
		);
		expect(getByRole("button", { name: "Close" })).toHaveClass(
			"classicyWindowCloseBox",
		);
		expect(getByRole("button", { name: "Zoom" })).toHaveClass(
			"classicyWindowZoomBox",
		);
		expect(getByRole("button", { name: "Collapse" })).toHaveClass(
			"classicyWindowCollapseBox",
		);
	});

	it("names the boxes from `labels`, each falling back to its own name", () => {
		const { getByRole, rerender } = render(
			<ClassicyWindowTitleBar
				title="T"
				onClose={vi.fn()}
				onZoom={vi.fn()}
				onCollapse={vi.fn()}
				labels={{ collapse: "Minimize" }}
			/>,
		);
		// Plan 0020-w98 §5: the collapse box is Windows' Minimize button.
		expect(getByRole("button", { name: "Minimize" })).toHaveClass(
			"classicyWindowCollapseBox",
		);
		expect(getByRole("button", { name: "Close" })).toHaveClass(
			"classicyWindowCloseBox",
		);
		expect(getByRole("button", { name: "Zoom" })).toHaveClass(
			"classicyWindowZoomBox",
		);
		rerender(
			<ClassicyWindowTitleBar
				title="T"
				onClose={vi.fn()}
				onZoom={vi.fn()}
				onCollapse={vi.fn()}
				labels={{ close: "Fermer", zoom: "Agrandir", collapse: "Réduire" }}
			/>,
		);
		expect(
			[
				".classicyWindowCloseBox",
				".classicyWindowZoomBox",
				".classicyWindowCollapseBox",
			].map((s) => document.querySelector(s)?.getAttribute("aria-label")),
		).toEqual(["Fermer", "Agrandir", "Réduire"]);
		// Without the prop the boxes keep their Mac OS names.
		rerender(
			<ClassicyWindowTitleBar
				title="T"
				onClose={vi.fn()}
				onZoom={vi.fn()}
				onCollapse={vi.fn()}
			/>,
		);
		expect(getByRole("button", { name: "Collapse" })).toHaveClass(
			"classicyWindowCollapseBox",
		);
	});

	// Plan 0020-w98 §6: under `dialog.caption: "titled"` a modal that cannot
	// close draws its Close box unavailable, as Windows grays the Close of a
	// message box with no Cancel (Wine's `draw_close_button`).
	describe("closeDisabled", () => {
		it("draws the close box unavailable, with no handler, even without onClose", () => {
			const { container, getByRole } = render(
				<ClassicyWindowTitleBar title="T" closeDisabled />,
			);
			const close = getByRole("button", { name: "Close" });
			expect(close).toHaveClass("classicyWindowCloseBox", "disabled");
			expect(close).toHaveAttribute("aria-disabled", "true");
			// Out of the tab order, as an unavailable control is.
			expect(close).toHaveAttribute("tabindex", "-1");
			expect(
				container.querySelector('[data-classicy-control="close"]'),
			).toContainElement(close);
		});

		it("runs no onClose from its click, Enter or Space", () => {
			const onClose = vi.fn();
			const { container } = render(
				<ClassicyWindowTitleBar title="T" onClose={onClose} closeDisabled />,
			);
			const close = container.querySelector(
				".classicyWindowCloseBox",
			) as Element;
			fireEvent.click(close);
			fireEvent.keyDown(close, { key: "Enter" });
			fireEvent.keyDown(close, { key: " " });
			expect(onClose).not.toHaveBeenCalled();
		});

		it("leaves the close box as it was without the prop", () => {
			const { container, rerender } = render(
				<ClassicyWindowTitleBar title="T" />,
			);
			// No handler and no prop: no box at all, as always.
			expect(container.querySelector(".classicyWindowCloseBox")).toBeNull();
			rerender(<ClassicyWindowTitleBar title="T" onClose={vi.fn()} />);
			const close = container.querySelector(
				".classicyWindowCloseBox",
			) as Element;
			expect(close.className).toBe("classicyWindowCloseBox");
			expect(close.getAttributeNames()).toEqual([
				"class",
				"role",
				"aria-label",
				"tabindex",
			]);
			expect(close).toHaveAttribute("tabindex", "0");
		});
	});

	// Plan 0020-w98 §1 (`window.captionTooltips`): each box names itself in a
	// tooltip after Windows' 500 ms (Wine's `TTDT_AUTOMATIC`), whatever
	// Balloon Help says.
	describe("buttonTooltips", () => {
		afterEach(() => {
			vi.useRealTimers();
			useAppManager.setState(structuredClone(DefaultAppManagerState), true);
		});

		const boxes = (container: HTMLElement) =>
			[
				".classicyWindowCloseBox",
				".classicyWindowZoomBox",
				".classicyWindowCollapseBox",
			].map((s) => container.querySelector(s) as HTMLElement);

		it("shows each box's label after 500 ms with balloon help off", () => {
			vi.useFakeTimers();
			act(() =>
				dispatch({
					type: "ClassicyDesktopSetBalloonHelp",
					disableBalloonHelp: true,
				}),
			);
			const { container } = render(
				<ClassicyWindowTitleBar
					title="T"
					onClose={vi.fn()}
					onZoom={vi.fn()}
					onCollapse={vi.fn()}
					labels={{ zoom: "Maximize", collapse: "Minimize" }}
					buttonTooltips
				/>,
			);
			const labels: (string | undefined)[] = [];
			for (const box of boxes(container)) {
				fireEvent.mouseEnter(box);
				act(() => {
					vi.advanceTimersByTime(499);
				});
				expect(tooltipText()).toBeUndefined();
				act(() => {
					vi.advanceTimersByTime(1);
				});
				labels.push(tooltipText());
				expect(box).toHaveAttribute("aria-describedby");
				fireEvent.mouseLeave(box);
				expect(tooltipText()).toBeUndefined();
			}
			expect(labels).toEqual(["Close", "Maximize", "Minimize"]);
		});

		it("names an unavailable Close too", () => {
			vi.useFakeTimers();
			const { container } = render(
				<ClassicyWindowTitleBar title="T" closeDisabled buttonTooltips />,
			);
			fireEvent.mouseEnter(
				container.querySelector(".classicyWindowCloseBox") as Element,
			);
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(tooltipText()).toBe("Close");
		});

		it("hides on a press until the pointer comes back", () => {
			vi.useFakeTimers();
			const onZoom = vi.fn();
			const { container } = render(
				<ClassicyWindowTitleBar title="T" onZoom={onZoom} buttonTooltips />,
			);
			const zoom = container.querySelector(".classicyWindowZoomBox") as Element;
			fireEvent.mouseEnter(zoom);
			act(() => {
				vi.advanceTimersByTime(500);
			});
			expect(tooltipText()).toBe("Zoom");
			fireEvent.mouseDown(zoom);
			fireEvent.click(zoom);
			expect(tooltipText()).toBeUndefined();
			expect(onZoom).toHaveBeenCalledTimes(1);
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(tooltipText()).toBeUndefined();
			// A press before the delay ends stops its timer too.
			fireEvent.mouseLeave(zoom);
			fireEvent.mouseEnter(zoom);
			fireEvent.mouseDown(zoom);
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(tooltipText()).toBeUndefined();
		});

		it("shows nothing without the prop", () => {
			vi.useFakeTimers();
			const { container } = render(
				<ClassicyWindowTitleBar
					title="T"
					onClose={vi.fn()}
					onZoom={vi.fn()}
					onCollapse={vi.fn()}
				/>,
			);
			for (const box of boxes(container)) {
				fireEvent.mouseEnter(box);
				act(() => {
					vi.advanceTimersByTime(1000);
				});
				expect(tooltipText()).toBeUndefined();
				expect(box).not.toHaveAttribute("aria-describedby");
			}
		});
	});

	// The props are typed `() => void`: a host handler with an optional first
	// parameter (`applyZoom(toZoom?: boolean)`) must not receive the click event.
	it("calls onClose and onZoom with no arguments, by click and by key", () => {
		const onClose = vi.fn();
		const onZoom = vi.fn();
		const { container } = render(
			<ClassicyWindowTitleBar title="T" onClose={onClose} onZoom={onZoom} />,
		);
		const close = container.querySelector(".classicyWindowCloseBox");
		const zoom = container.querySelector(".classicyWindowZoomBox");
		if (!close || !zoom) throw new Error("control boxes not rendered");
		fireEvent.click(close);
		fireEvent.keyDown(close, { key: "Enter" });
		fireEvent.click(zoom);
		fireEvent.keyDown(zoom, { key: " " });
		expect(onClose.mock.calls).toEqual([[], []]);
		expect(onZoom.mock.calls).toEqual([[], []]);
	});
});
