import { afterEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	render,
	screen,
	userEvent,
} from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import {
	markClassicyMenuStatusShown,
	publishClassicyMenuStatusText,
	resetClassicyMenuStatusTextForTests,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuStatusText.internal";
import { ClassicyPlacard } from "@/SystemFolder/SystemResources/Placard/ClassicyPlacard";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss",
	() => ({}),
);

describe("ClassicyPlacard", () => {
	it("renders static content as a non-button div by default", () => {
		render(<ClassicyPlacard>24 items</ClassicyPlacard>);
		expect(screen.getByText("24 items")).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("reports the normal state by default", () => {
		const { container } = render(<ClassicyPlacard>Info</ClassicyPlacard>);
		const placard = container.querySelector(".classicyPlacard");
		expect(placard).not.toHaveClass("pressed", "disabled");
		expect(placard).not.toHaveAttribute("data-state");
	});

	it("renders a button and fires onClick when clickable", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<ClassicyPlacard onClick={onClick}>Go</ClassicyPlacard>);
		const btn = screen.getByRole("button", { name: "Go" });
		await user.click(btn);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("shows disabled state and does not become interactive", () => {
		const { container } = render(
			<ClassicyPlacard disabled={true} onClick={vi.fn()}>
				Off
			</ClassicyPlacard>,
		);
		const placard = container.querySelector(".classicyPlacard");
		expect(placard).toHaveClass("disabled");
		expect(placard).not.toHaveClass("classicyPlacardDisabled");
		expect(placard).not.toHaveAttribute("data-state");
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("opens a pop-up menu and fires onSelect with the chosen id", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<ClassicyPlacard
				onSelect={onSelect}
				menuItems={[
					{ id: "50", title: "50%" },
					{ id: "100", title: "100%" },
				]}
			>
				100%
			</ClassicyPlacard>,
		);
		const trigger = screen.getByRole("button", { name: /100%/ });
		expect(trigger).toHaveAttribute("aria-haspopup", "menu");
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");

		await user.click(screen.getByRole("menuitem", { name: "50%" }));
		expect(onSelect).toHaveBeenCalledWith("50");
		// Menu closes after a selection.
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});
});

// The remaining chapters' audit's 12.13 (WIG Ch.12 "Status Bar Messages",
// pp.276-277, Figure 12.7): a placard given `menuStatus` is its window's
// status bar for the menus' help, showing the highlighted item's help in
// place of its children while a menu is shown, in the active window, until
// the menu closes; under a package without `layout.menu.itemHelp`
// "statusBar" no menu gives any, and it never changes.
describe("ClassicyPlacard — menuStatus", () => {
	afterEach(() => {
		resetClassicyMenuStatusTextForTests();
		resetClassicyAppearancePackagesForTests();
	});
	const content = () =>
		document.querySelector(".classicyPlacardContent")?.textContent;

	it("shows the menus' status text in place of its children while a menu shows, in the active window or none", () => {
		for (const active of [true, undefined]) {
			const { unmount } = render(
				<ClassicyWindowActiveContext.Provider value={active}>
					<ClassicyPlacard menuStatus>24 items</ClassicyPlacard>
				</ClassicyWindowActiveContext.Provider>,
			);
			expect(content()).toBe("24 items");
			let close = () => {};
			act(() => {
				close = markClassicyMenuStatusShown();
			});
			expect(content()).toBe("");
			act(() => publishClassicyMenuStatusText({}, "Opens a document."));
			expect(content()).toBe("Opens a document.");
			act(() => close());
			expect(content()).toBe("24 items");
			unmount();
		}
	});

	it("keeps its children in an inactive window, and without menuStatus", () => {
		render(
			<>
				<ClassicyWindowActiveContext.Provider value={false}>
					<ClassicyPlacard menuStatus>Inactive</ClassicyPlacard>
				</ClassicyWindowActiveContext.Provider>
				<ClassicyPlacard>Plain</ClassicyPlacard>
			</>,
		);
		act(() => {
			markClassicyMenuStatusShown();
			publishClassicyMenuStatusText({}, "Opens a document.");
		});
		expect(screen.getByText("Inactive")).toBeInTheDocument();
		expect(screen.getByText("Plain")).toBeInTheDocument();
		expect(screen.queryByText("Opens a document.")).not.toBeInTheDocument();
	});

	const renderWindow = () =>
		render(
			<ClassicyWindowActiveContext.Provider value={true}>
				<ClassicyMenuProvider>
					<ClassicyMenu
						name="bar"
						navClass="classicyDesktopMenu"
						subNavClass="classicySubMenu"
						menuItems={[
							{
								id: "file",
								title: "File",
								menuChildren: [
									{
										id: "open",
										title: "Open",
										balloon: { content: "Opens a document." },
									},
								],
							},
						]}
					/>
				</ClassicyMenuProvider>
				<ClassicyPlacard menuStatus>24 items</ClassicyPlacard>
			</ClassicyWindowActiveContext.Provider>,
		);
	const openAndPoint = () => {
		fireEvent.click(
			document.getElementById("file")?.querySelector("p") as HTMLElement,
		);
		fireEvent.mouseOver(document.getElementById("open") as HTMLElement);
	};

	it("shows a highlighted menu item's help under the Windows 98 layout, until the menu closes", () => {
		registerClassicyAppearancePackage({
			id: "windows-placards",
			name: "Windows placards",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-placards-default",
				package: "windows-placards",
			},
			layout: windows98.layout as never,
		});
		renderWindow();
		openAndPoint();
		expect(content()).toBe("Opens a document.");
		fireEvent.click(
			document.getElementById("file")?.querySelector("p") as HTMLElement,
		);
		expect(content()).toBe("24 items");
	});

	it("never changes under a Mac layout", () => {
		renderWindow();
		openAndPoint();
		expect(content()).toBe("24 items");
	});
});
