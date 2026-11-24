import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ClassicyIcon,
	snapToGrid,
} from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";

afterEach(cleanup);

describe("snapToGrid", () => {
	it("rounds to the nearest cell", () => {
		expect(snapToGrid([37, 61], [24, 24])).toEqual([48, 72]);
	});

	it("rounds down below the halfway point", () => {
		expect(snapToGrid([10, 10], [24, 24])).toEqual([0, 0]);
	});

	it("leaves an already-aligned position alone", () => {
		expect(snapToGrid([48, 24], [24, 24])).toEqual([48, 24]);
	});

	it("supports a non-square pitch", () => {
		expect(snapToGrid([30, 30], [20, 40])).toEqual([40, 40]);
	});

	it("rounds onto a lattice offset by an origin", () => {
		// Cells at 12, 108, 204… — never at 0 or 96, which is where an
		// origin-less snap would put a drop.
		expect(snapToGrid([100, 100], [96, 96], [12, 12])).toEqual([108, 108]);
		expect(snapToGrid([40, 40], [96, 96], [12, 12])).toEqual([12, 12]);
	});

	it("leaves a position already on the offset lattice alone", () => {
		expect(snapToGrid([108, 12], [96, 96], [12, 12])).toEqual([108, 12]);
	});
});

describe("ClassicyIcon snapping", () => {
	const renderIcon = () =>
		render(
			<ClassicyIcon
				appId={"Test.app"}
				name={"thing.pdf"}
				icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
				initialPosition={[50, 50]}
				snapTo={[96, 96]}
				snapOrigin={[12, 12]}
			/>,
		);

	const iconRoot = () =>
		screen.getByRole("img").closest(".classicyIcon") as HTMLElement;

	it("does not move an icon that was only clicked", () => {
		renderIcon();
		const icon = iconRoot();
		// mousedown/mouseup with no intervening move is a selection click, not a
		// drag. Mac OS 8 never displaced an icon you merely clicked.
		fireEvent.mouseDown(icon);
		fireEvent.mouseUp(icon);
		expect(icon.style.left).toBe("50px");
		expect(icon.style.top).toBe("50px");
	});
});

describe("ClassicyIcon consumer style", () => {
	// Stacking belongs to the icon states (ClassicyIcon.scss: 10, dragging
	// 500), which no longer win by !important; a consumer zIndex is dropped.
	it("drops a consumer zIndex and keeps the rest", () => {
		render(
			<ClassicyIcon
				appId={"Test.app"}
				name={"thing.pdf"}
				icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
				initialPosition={[50, 50]}
				style={{ zIndex: 7, opacity: 0.5 }}
			/>,
		);
		const icon = screen
			.getByRole("img")
			.closest(".classicyIcon") as HTMLElement;
		expect(icon.style.zIndex).toBe("");
		expect(icon.style.opacity).toBe("0.5");
	});
});

describe("ClassicyIcon contextual-menu click, and the click after a drag", () => {
	// Held in a container, so it drags by itself (no Finder drag).
	const renderHeld = () => {
		const holder = createRef<HTMLDivElement>();
		const view = render(
			<div ref={holder}>
				<ClassicyIcon
					appId={"Test.app"}
					name={"thing.pdf"}
					icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
					initialPosition={[50, 50]}
					holder={holder}
				/>
			</div>,
		);
		const icon = screen
			.getByRole("img")
			.closest(".classicyIcon") as HTMLElement;
		return { ...view, icon };
	};
	const click = (icon: HTMLElement, init: MouseEventInit = {}) => {
		fireEvent.mouseDown(icon, { button: 0, ...init });
		fireEvent.mouseUp(icon, init);
		fireEvent.click(icon, { detail: 1, ...init });
	};

	it("keeps an icon it dragged selected: the click ending a drag is no click", () => {
		const { icon } = renderHeld();
		fireEvent.mouseDown(icon, { button: 0, clientX: 60, clientY: 60 });
		fireEvent.mouseMove(icon, { clientX: 90, clientY: 90 });
		fireEvent.mouseUp(icon, { clientX: 90, clientY: 90 });
		fireEvent.click(icon, { detail: 1 });
		expect(icon.classList).toContain("selected");
		// The next click is a click again: it toggles.
		click(icon);
		expect(icon.classList).not.toContain("selected");
	});

	it("takes a Control-press as the contextual-menu click: selected, not dragged, the menu, no click after", async () => {
		const { icon, container } = renderHeld();
		const menus = vi.fn();
		container.addEventListener("contextmenu", menus);
		fireEvent.mouseDown(icon, {
			button: 0,
			clientX: 60,
			clientY: 60,
			ctrlKey: true,
		});
		expect(icon.classList).toContain("selected");
		expect(icon.classList).not.toContain("dragging");
		fireEvent.mouseMove(icon, { clientX: 90, clientY: 90 });
		expect(icon.style.left).toBe("50px");
		fireEvent.mouseUp(icon, { clientX: 90, clientY: 90 });
		// The click a browser off macOS sends at the release toggles nothing.
		fireEvent.click(icon, { detail: 1, ctrlKey: true });
		expect(icon.classList).toContain("selected");
		await act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
		expect(menus).toHaveBeenCalledTimes(1);
		expect(menus.mock.calls[0][0].target).toBe(icon);
	});

	it("takes a right-press as it takes a Control-press: selected, not dragged", () => {
		const { icon } = renderHeld();
		fireEvent.mouseDown(icon, { button: 2, clientX: 60, clientY: 60 });
		expect(icon.classList).toContain("selected");
		expect(icon.classList).not.toContain("dragging");
		fireEvent.mouseMove(icon, { clientX: 90, clientY: 90 });
		expect(icon.style.left).toBe("50px");
		fireEvent.mouseUp(icon, { clientX: 90, clientY: 90 });
		// Already selected: a second right-press keeps it so.
		fireEvent.mouseDown(icon, { button: 2, clientX: 60, clientY: 60 });
		expect(icon.classList).toContain("selected");
		fireEvent.mouseUp(icon);
	});
});
