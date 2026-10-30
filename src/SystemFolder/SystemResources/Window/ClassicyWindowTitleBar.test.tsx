import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { ClassicyWindowTitleBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowTitleBar";

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
});
