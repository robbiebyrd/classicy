import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
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
