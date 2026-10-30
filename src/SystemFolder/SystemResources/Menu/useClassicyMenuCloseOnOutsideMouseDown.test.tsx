import { fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import { useClassicyMenuCloseOnOutsideMouseDown } from "@/SystemFolder/SystemResources/Menu/useClassicyMenuCloseOnOutsideMouseDown";

const Bar = () => {
	const ref = useRef<HTMLDivElement>(null);
	useClassicyMenuCloseOnOutsideMouseDown(ref);
	return (
		<div ref={ref}>
			<ClassicyMenu
				name="bar"
				menuItems={[
					{
						id: "file",
						title: "File",
						menuChildren: [{ id: "new", title: "New" }],
					},
				]}
				navClass="classicyDesktopMenu"
				subNavClass="classicySubMenu"
			/>
		</div>
	);
};

describe("useClassicyMenuCloseOnOutsideMouseDown", () => {
	// F 5.1 fix re-review: with no menu open there is nothing to close, so an
	// outside mouse-down leaves the provider alone (no closeAll, no onClose,
	// no re-render of every mounted bar).
	it("closes the provider's menus only while one is open", () => {
		const onClose = vi.fn();
		render(
			<ClassicyMenuProvider onClose={onClose}>
				<Bar />
			</ClassicyMenuProvider>,
		);
		fireEvent.mouseDown(document.body);
		expect(onClose).not.toHaveBeenCalled();

		const file = screen.getByText("File").closest("li") as HTMLElement;
		fireEvent.click(screen.getByText("File"));
		expect(file).toHaveClass("open");
		fireEvent.mouseDown(document.body);
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(file).not.toHaveClass("open");

		fireEvent.mouseDown(document.body);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
