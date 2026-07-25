import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	fireEvent,
	render,
	screen,
	userEvent,
	within,
} from "@/__tests__/test-utils";
import { ClassicyMenuBarExtension } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyMenuBarExtension";

function mountTargets() {
	const region = document.createElement("div");
	region.id = "classicyDesktopMenuExtensions";
	const desktop = document.createElement("div");
	desktop.id = "classicyDesktop";
	document.body.append(region, desktop);
}

beforeEach(mountTargets);
afterEach(() => {
	document.body.innerHTML = "";
});

describe("ClassicyMenuBarExtension — item", () => {
	it("portals an icon into the extensions region", () => {
		render(
			<ClassicyMenuBarExtension id="user" icon="/user.png" title="Account" />,
		);
		const region = document.getElementById("classicyDesktopMenuExtensions");
		const img = region?.querySelector("img");
		expect(img).toBeTruthy();
		expect(img).toHaveAttribute("src", "/user.png");
		expect(region?.querySelector(".classicyDesktopMenuExtension")).toBeTruthy();
	});

	it("renders arbitrary children instead of the icon", () => {
		render(
			<ClassicyMenuBarExtension id="live" icon="/user.png">
				<span data-testid="live">98%</span>
			</ClassicyMenuBarExtension>,
		);
		const region = document.getElementById("classicyDesktopMenuExtensions");
		expect(region?.querySelector("img")).toBeNull();
		expect(screen.getByTestId("live")).toHaveTextContent("98%");
	});

	it("applies the order prop as an inline order style", () => {
		render(<ClassicyMenuBarExtension id="user" icon="/user.png" order={10} />);
		const item = document
			.getElementById("classicyDesktopMenuExtensions")
			?.querySelector<HTMLElement>(".classicyDesktopMenuExtension");
		expect(item?.style.order).toBe("10");
	});

	it("exposes the item as a labelled button", () => {
		render(
			<ClassicyMenuBarExtension id="user" icon="/user.png" title="Account" />,
		);
		expect(screen.getByRole("button", { name: "Account" })).toBeInTheDocument();
	});

	it("renders nothing when the region is absent (no throw)", () => {
		document.body.innerHTML = "";
		const { container } = render(
			<ClassicyMenuBarExtension id="user" icon="/user.png" />,
		);
		expect(container).toBeEmptyDOMElement();
		expect(document.querySelector(".classicyDesktopMenuExtension")).toBeNull();
	});
});

describe("ClassicyMenuBarExtension — dropdown", () => {
	it("opens a dropdown with the menu items on click (no Help item)", async () => {
		const userMenu = [
			{ id: "account", title: "Account…", onClickFunc: vi.fn() },
			{ id: "logout", title: "Log Out…", onClickFunc: vi.fn() },
		];
		const user = userEvent.setup();
		render(
			<ClassicyMenuBarExtension
				id="user"
				icon="/user.png"
				title="Account"
				menuItems={userMenu}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Account" }));
		expect(screen.getByText("Account…")).toBeInTheDocument();
		expect(screen.getByText("Log Out…")).toBeInTheDocument();
		expect(screen.queryByText("Help")).toBeNull();
	});

	it("portals the dropdown into #classicyDesktop, anchored under the item", async () => {
		const userMenu = [
			{ id: "account", title: "Account…", onClickFunc: vi.fn() },
		];
		const user = userEvent.setup();
		render(
			<ClassicyMenuBarExtension
				id="user"
				icon="/user.png"
				title="Account"
				menuItems={userMenu}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Account" }));
		const desktop = document.getElementById("classicyDesktop");
		// The floating menu wrapper renders inside the desktop portal target,
		// not in the extensions region.
		expect(desktop?.querySelector(".classicyContextMenuWrapper")).toBeTruthy();
		expect(
			within(desktop as HTMLElement).getByText("Account…"),
		).toBeInTheDocument();
	});

	it("closes on outside click", async () => {
		const userMenu = [
			{ id: "account", title: "Account…", onClickFunc: vi.fn() },
			{ id: "logout", title: "Log Out…", onClickFunc: vi.fn() },
		];
		const user = userEvent.setup();
		render(
			<ClassicyMenuBarExtension
				id="user"
				icon="/user.png"
				title="Account"
				menuItems={userMenu}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Account" }));
		expect(screen.getByText("Account…")).toBeInTheDocument();
		fireEvent.mouseDown(document.body);
		expect(screen.queryByText("Account…")).toBeNull();
	});

	it("without menuItems, click fires onClick and shows no dropdown", async () => {
		const onClick = vi.fn();
		const user = userEvent.setup();
		render(
			<ClassicyMenuBarExtension
				id="plain"
				icon="/user.png"
				title="Plain"
				onClick={onClick}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "Plain" }));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(document.querySelector(".classicyContextMenuWrapper")).toBeNull();
	});
});
