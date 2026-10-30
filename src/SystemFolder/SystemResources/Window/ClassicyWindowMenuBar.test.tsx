import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";

describe("ClassicyWindowMenuBar", () => {
	it("renders the window's menus as a bar", () => {
		const { container } = render(
			<ClassicyWindowMenuBar
				appId="T.app"
				windowId="main"
				menuItems={[
					{
						id: "file",
						title: "File",
						menuChildren: [{ id: "new", title: "New" }],
					},
				]}
			/>,
		);
		expect(
			container.querySelector(".classicyWindowMenuBar .classicyDesktopMenu"),
		).not.toBeNull();
		expect(screen.getByText("File")).toBeInTheDocument();
	});

	it("marks its root as the window-menu-bar part", () => {
		const { container } = render(
			<ClassicyWindowMenuBar
				appId="T.app"
				windowId="main"
				menuItems={[{ id: "file", title: "File" }]}
			/>,
		);
		const root = container.querySelector(".classicyWindowMenuBar");
		expect(root?.getAttribute("data-classicy-part")).toBe("window-menu-bar");
		expect(root?.querySelector("ul.classicyWindowMenu")).not.toBeNull();
	});

	// F 5.1 review: a sticky menu closes on a mouse-down outside the bar, as
	// the screen bar's do.
	it("closes an open menu on a mouse-down outside the bar", () => {
		render(
			<ClassicyWindowMenuBar
				appId="T.app"
				windowId="main"
				menuItems={[
					{
						id: "file",
						title: "File",
						menuChildren: [{ id: "new", title: "New" }],
					},
				]}
			/>,
		);
		const file = screen.getByText("File").closest("li") as HTMLElement;
		fireEvent.click(screen.getByText("File"));
		expect(file).toHaveClass("open");
		fireEvent.mouseDown(screen.getByText("File"));
		expect(file).toHaveClass("open");
		fireEvent.mouseDown(document.body);
		expect(file).not.toHaveClass("open");
	});
});
