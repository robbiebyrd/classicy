import { act } from "@testing-library/react";
import type { ChangeEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, userEvent } from "@/__tests__/test-utils";
import "@/Appearance/Platinum/assets/platinumAssets";
import { registerClassicyWallpapers } from "@/Appearance/ClassicyAssetRegistry";
import {
	classicyBackgroundSizeOption,
	useDesktopTab,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop";
import {
	ClassicyDefaultWallpaper,
	ClassicyWallpapers,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyWallpapers";

type SelectHandler = (e: ChangeEvent<HTMLSelectElement>) => void;

const baseProps = {
	bg: ClassicyDefaultWallpaper,
	changeBackground: vi.fn() as SelectHandler,
	setBackgroundURL: vi.fn() as (e: ChangeEvent<HTMLInputElement>) => void,
	alignBackground: vi.fn() as SelectHandler,
	repeatBackground: vi.fn() as SelectHandler,
	backgroundSize: vi.fn() as SelectHandler,
};

type HostProps = Partial<Parameters<typeof useDesktopTab>[0]>;

const Host = (props: HostProps) => {
	const tab = useDesktopTab({ ...baseProps, ...props });
	return <div>{tab.children}</div>;
};

// The Patterns menu is the first pop-up on the tab.
const patternsMenu = () => screen.getAllByRole("combobox")[0];

const wallpaper = (label: string) => {
	const found = ClassicyWallpapers.find((w) => w.label === label);
	if (!found) throw new Error(`no wallpaper labelled ${label}`);
	return found;
};

describe("useDesktopTab — Patterns", () => {
	it("is titled 'Desktop'", () => {
		const { result } = renderHook(() => useDesktopTab(baseProps));
		expect(result.current.title).toBe("Desktop");
	});

	it("shows the wallpaper's label for the stored URL", () => {
		render(<Host bg={wallpaper("Bondi Dark").value} />);
		expect(patternsMenu()).toHaveTextContent("Bondi Dark");
	});

	it("shows 'Default' for the default wallpaper", () => {
		render(<Host bg={ClassicyDefaultWallpaper} />);
		expect(patternsMenu()).toHaveTextContent("Default");
	});

	it("follows the stored URL when it changes (e.g. after a theme switch)", () => {
		const { rerender } = render(<Host bg={wallpaper("Poppy").value} />);
		expect(patternsMenu()).toHaveTextContent("Poppy");
		rerender(<Host bg={wallpaper("Waves Bondi").value} />);
		expect(patternsMenu()).toHaveTextContent("Waves Bondi");
	});

	it("lists every bundled wallpaper from the registry, including the jpg", async () => {
		const user = userEvent.setup();
		render(<Host />);
		await user.click(patternsMenu());
		expect(screen.getAllByRole("option")).toHaveLength(
			ClassicyWallpapers.length,
		);
		expect(
			screen.getByRole("option", { name: "Default Photo" }),
		).toBeInTheDocument();
	});

	it("a wallpaper registered after mount appears (a name may contain a dot)", async () => {
		const user = userEvent.setup();
		render(<Host />);
		act(() =>
			registerClassicyWallpapers("platinum", [
				{ name: "Mac OS 8.5", src: "https://example.com/8-5.png" },
			]),
		);
		await user.click(patternsMenu());
		await user.click(screen.getByRole("option", { name: "Mac OS 8.5" }));
		expect(baseProps.changeBackground).toHaveBeenCalled();
	});

	it("shows 'Custom' for a picture that matches no pattern", () => {
		render(<Host bg={"https://example.com/my-picture.png"} />);
		expect(patternsMenu()).toHaveTextContent("Custom");
	});

	it("passes the chosen wallpaper's full URL to the change callback", async () => {
		const changeBackground = vi.fn();
		const user = userEvent.setup();
		render(<Host changeBackground={changeBackground} />);
		await user.click(patternsMenu());
		await user.click(screen.getByRole("option", { name: "Sunny" }));
		expect(changeBackground).toHaveBeenCalledOnce();
		expect(changeBackground.mock.calls[0][0].target.value).toBe(
			wallpaper("Sunny").value,
		);
	});

	it("previews the stored picture", () => {
		render(<Host bg={wallpaper("Rio Azul").value} />);
		expect(screen.getByAltText("Background")).toHaveAttribute(
			"src",
			wallpaper("Rio Azul").value,
		);
	});
});

// Align, Repeat and Size follow Patterns in DOM order.
const alignMenu = () => screen.getAllByRole("combobox")[1];
const repeatMenu = () => screen.getAllByRole("combobox")[2];
const sizeMenu = () => screen.getAllByRole("combobox")[3];

describe("classicyBackgroundSizeOption", () => {
	it.each([
		["auto", "auto"],
		["100%", "auto"],
		[100, "auto"],
		[50, "auto"],
		["", "auto"],
		[undefined, "auto"],
		["240px", "auto"],
		["cover", "cover"],
		["contain", "contain"],
	] as const)("maps %j to %j", (stored, option) => {
		expect(classicyBackgroundSizeOption(stored)).toBe(option);
	});
});

describe("useDesktopTab — Size", () => {
	it.each([
		"auto",
		"100%",
		100,
	] as const)("shows 'Normal' for a stored size of %j", (bgSize) => {
		render(<Host bgSize={bgSize} />);
		expect(sizeMenu()).toHaveTextContent("Normal");
	});

	it("shows 'Normal' when no size is passed", () => {
		render(<Host />);
		expect(sizeMenu()).toHaveTextContent("Normal");
	});

	it("shows 'Stretch' for cover and 'Fill' for contain", () => {
		const { rerender } = render(<Host bgSize="cover" />);
		expect(sizeMenu()).toHaveTextContent("Stretch");
		rerender(<Host bgSize="contain" />);
		expect(sizeMenu()).toHaveTextContent("Fill");
	});

	it("dispatches the CSS keyword 'auto' for Normal", async () => {
		const backgroundSize = vi.fn();
		const user = userEvent.setup();
		render(<Host bgSize="cover" backgroundSize={backgroundSize} />);
		await user.click(sizeMenu());
		await user.click(screen.getByRole("option", { name: "Normal" }));
		expect(backgroundSize).toHaveBeenCalledOnce();
		expect(backgroundSize.mock.calls[0][0].target.value).toBe("auto");
	});

	it("gives every element on the tab a distinct id", () => {
		const { container } = render(<Host />);
		const ids = Array.from(container.querySelectorAll("[id]")).map(
			(el) => el.id,
		);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("useDesktopTab — Align and Repeat", () => {
	it("shows the stored position", () => {
		render(<Host bgPosition="top right" />);
		expect(alignMenu()).toHaveTextContent("Top Right");
	});

	it("defaults Align to Center", () => {
		render(<Host />);
		expect(alignMenu()).toHaveTextContent("Center");
	});

	it("shows the stored repeat", () => {
		render(<Host bgRepeat="no-repeat" />);
		expect(repeatMenu()).toHaveTextContent("No Repeat");
	});

	it("defaults Repeat to Repeat", () => {
		render(<Host />);
		expect(repeatMenu()).toHaveTextContent("Repeat");
	});

	it("passes the chosen repeat value to the callback", async () => {
		const repeatBackground = vi.fn();
		const user = userEvent.setup();
		render(<Host repeatBackground={repeatBackground} />);
		await user.click(repeatMenu());
		await user.click(
			screen.getByRole("option", { name: "Repeat Horizontally" }),
		);
		expect(repeatBackground.mock.calls[0][0].target.value).toBe("repeat-x");
	});
});
