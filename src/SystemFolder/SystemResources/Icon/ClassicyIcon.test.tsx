import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	ClassicyIcon,
	snapToGrid,
} from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";

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

// WIG Ch.13 "Highlighting" (p.318): the icon says whether its window is the
// active one (the audit's 6.4 / 13.8), so a package can draw a selected item
// of an inactive window apart (Windows 98's list view, LVS_SHOWSELALWAYS).
describe("ClassicyIcon — inactive", () => {
	const icon = (
		<ClassicyIcon
			appId={"Test.app"}
			name={"thing.pdf"}
			icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
		/>
	);
	const iconRoot = () =>
		screen.getByRole("img").closest(".classicyIcon") as HTMLElement;

	it("carries inactive in a window that is not the active one, beside selected", () => {
		render(
			<ClassicyWindowActiveContext.Provider value={false}>
				{icon}
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(iconRoot()).toHaveClass("inactive");
		fireEvent.click(iconRoot());
		expect(iconRoot()).toHaveClass("selected", "inactive");
	});

	it("does not in the active window, or outside any window", () => {
		render(
			<ClassicyWindowActiveContext.Provider value={true}>
				{icon}
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(iconRoot()).not.toHaveClass("inactive");
		cleanup();
		render(icon);
		expect(iconRoot()).not.toHaveClass("inactive");
	});
});

// The file browser's icon view keeps one selection for its icons: given
// `selected`, an icon draws what it is told and hands its clicks to
// `onSelectClick`; without it, a click toggles its own look, as before.
describe("ClassicyIcon — controlled selection", () => {
	const props = {
		appId: "Test.app",
		name: "thing.pdf",
		icon: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
	};
	const iconRoot = () =>
		screen.getByRole("img").closest(".classicyIcon") as HTMLElement;

	it("draws the selection it is given, and hands a click to onSelectClick", () => {
		const onSelectClick = vi.fn();
		const { rerender } = render(
			<ClassicyIcon
				{...props}
				selected={false}
				onSelectClick={onSelectClick}
			/>,
		);
		fireEvent.click(iconRoot(), { shiftKey: true });
		expect(onSelectClick).toHaveBeenCalledOnce();
		expect(onSelectClick.mock.calls[0][0].shiftKey).toBe(true);
		expect(iconRoot()).not.toHaveClass("selected");
		rerender(
			<ClassicyIcon {...props} selected={true} onSelectClick={onSelectClick} />,
		);
		expect(iconRoot()).toHaveClass("selected");
	});

	it("still toggles its own look without `selected`", () => {
		render(<ClassicyIcon {...props} />);
		fireEvent.click(iconRoot());
		expect(iconRoot()).toHaveClass("selected");
		fireEvent.click(iconRoot());
		expect(iconRoot()).not.toHaveClass("selected");
	});
});

describe("ClassicyIcon — renaming", () => {
	const props = {
		appId: "Test.app",
		name: "thing.pdf",
		icon: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
	};
	const field = () =>
		document.querySelector(".classicyIconRename") as HTMLInputElement;

	it("shows the name in a focused, selected field in place of the caption", () => {
		render(<ClassicyIcon {...props} renaming={true} />);
		expect(document.querySelector(".classicyIcon p")).toBeNull();
		expect(field().value).toBe("thing.pdf");
		expect(document.activeElement).toBe(field());
		expect([field().selectionStart, field().selectionEnd]).toEqual([0, 9]);
	});

	it("commits once on Return or on a click elsewhere, cancels on Escape", () => {
		const onRenameCommit = vi.fn();
		const onRenameCancel = vi.fn();
		const { rerender } = render(
			<ClassicyIcon
				{...props}
				renaming={true}
				onRenameCommit={onRenameCommit}
				onRenameCancel={onRenameCancel}
			/>,
		);
		fireEvent.change(field(), { target: { value: "new.pdf" } });
		fireEvent.keyDown(field(), { key: "Enter" });
		fireEvent.blur(field());
		expect(onRenameCommit).toHaveBeenCalledTimes(1);
		expect(onRenameCommit).toHaveBeenCalledWith("new.pdf");
		rerender(<ClassicyIcon {...props} renaming={false} />);
		rerender(
			<ClassicyIcon
				{...props}
				renaming={true}
				onRenameCommit={onRenameCommit}
				onRenameCancel={onRenameCancel}
			/>,
		);
		fireEvent.blur(field());
		expect(onRenameCommit).toHaveBeenCalledTimes(2);
		rerender(<ClassicyIcon {...props} renaming={false} />);
		rerender(
			<ClassicyIcon
				{...props}
				renaming={true}
				onRenameCommit={onRenameCommit}
				onRenameCancel={onRenameCancel}
			/>,
		);
		fireEvent.keyDown(field(), { key: "Escape" });
		expect(onRenameCancel).toHaveBeenCalledOnce();
		expect(onRenameCommit).toHaveBeenCalledTimes(2);
	});

	it("keeps the field's presses, clicks and keys from the icon", () => {
		const onSelectClick = vi.fn();
		const onClickFunc = vi.fn();
		render(
			<ClassicyIcon
				{...props}
				renaming={true}
				selected={true}
				onSelectClick={onSelectClick}
				onClickFunc={onClickFunc}
			/>,
		);
		fireEvent.mouseDown(field());
		fireEvent.click(field());
		fireEvent.doubleClick(field());
		fireEvent.keyDown(field(), { key: " " });
		expect(onSelectClick).not.toHaveBeenCalled();
		expect(onClickFunc).not.toHaveBeenCalled();
	});
});
