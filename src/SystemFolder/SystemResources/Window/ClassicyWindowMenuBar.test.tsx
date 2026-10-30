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

	// F 5.1 fix re-review: each bar treats a peer bar as outside, so only one
	// window's menu is ever open.
	it("keeps one menu open across two window bars", () => {
		const bar = (windowId: string) => (
			<ClassicyWindowMenuBar
				appId="T.app"
				windowId={windowId}
				menuItems={[
					{
						id: `${windowId}_file`,
						title: `File ${windowId}`,
						menuChildren: [{ id: `${windowId}_new`, title: "New" }],
					},
				]}
			/>
		);
		render(
			<>
				{bar("a")}
				{bar("b")}
			</>,
		);
		const fileA = screen.getByText("File a").closest("li") as HTMLElement;
		const fileB = screen.getByText("File b").closest("li") as HTMLElement;
		fireEvent.click(screen.getByText("File a"));
		expect(fileA).toHaveClass("open");
		fireEvent.mouseDown(screen.getByText("File b"));
		fireEvent.click(screen.getByText("File b"));
		expect(fileA).not.toHaveClass("open");
		expect(fileB).toHaveClass("open");
	});
});
