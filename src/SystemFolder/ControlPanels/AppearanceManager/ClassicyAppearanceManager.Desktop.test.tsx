import type { ChangeEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, renderHook, screen, userEvent } from "@/__tests__/test-utils";
import { useDesktopTab } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Desktop";
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
