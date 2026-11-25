import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardToolsPalette } from "@/SystemFolder/HyperCard/Editor/HyperCardToolsPalette";
import { registerHyperCardPartEditorMeta } from "@/SystemFolder/HyperCard/HyperCardPlugins";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

const dispatch = vi.fn();
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatch,
		useAppManager: Object.assign((sel: (s: unknown) => unknown) => sel({}), {
			getState: () => ({}),
		}),
	}),
);

afterEach(cleanup);
beforeEach(() => dispatch.mockClear());

function makeEdit(): HCEditState {
	return {
		draft: { name: "Demo", cards: [{ id: "c1" }] },
		currentCardId: "c1",
		layer: "card",
		tool: "pointer",
		undo: [],
		redo: [],
		dirty: false,
	};
}

describe("HyperCardToolsPalette", () => {
	it("lists all ten built-in part types as draggable entries", () => {
		const { container } = render(
			<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />,
		);
		const entries = container.querySelectorAll(
			".classicyHyperCardPaletteEntry",
		);
		expect(entries).toHaveLength(10);
		const setData = vi.fn();
		fireEvent.dragStart(entries[0], { dataTransfer: { setData } });
		expect(setData).toHaveBeenCalledWith(
			"application/x-hypercard-part-type",
			"button",
		);
	});

	it("arms click-to-place on entry click", () => {
		const { container } = render(
			<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />,
		);
		fireEvent.click(
			container.querySelector(
				'.classicyHyperCardPaletteEntry[data-part-type="slider"]',
			) as HTMLElement,
		);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetPlacing",
			stackId: "demo",
			partType: "slider",
		});
	});

	it("switches tools via the Browse button", () => {
		render(<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />);
		fireEvent.click(screen.getByText("Browse"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetTool",
			stackId: "demo",
			tool: "browse",
		});
	});

	it("lists registered plugin part types after the built-ins", () => {
		registerHyperCardPartEditorMeta("paletteTest", { label: "Palette Test" });
		const { container } = render(
			<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />,
		);
		const entry = container.querySelector(
			'.classicyHyperCardPaletteEntry[data-part-type="paletteTest"]',
		);
		expect(entry?.textContent).toContain("Palette Test");
	});

	// The armed entry's ✓ is package CSS (::after on an aria-hidden mark), so
	// the state reaches assistive technology through aria-pressed instead.
	it("exposes the armed entry as a pressed button with a selected state", () => {
		render(
			<HyperCardToolsPalette
				stackId={"demo"}
				edit={{ ...makeEdit(), placing: "slider" }}
			/>,
		);
		const armed = screen.getByRole("button", { name: "Slider" });
		expect(armed).toHaveAttribute("aria-pressed", "true");
		expect(armed).toHaveClass("classicyHyperCardPaletteEntry", "selected");
		expect(armed.textContent).not.toContain("✓");
		const mark = armed.querySelector(".classicyHyperCardPaletteEntryMark");
		expect(mark).toHaveAttribute("aria-hidden", "true");
		expect(mark?.textContent).toBe("");

		const idle = screen.getByRole("button", { name: "Button" });
		expect(idle).toHaveAttribute("aria-pressed", "false");
		expect(idle).not.toHaveClass("selected");
	});

	// Arming is a one-shot, optional mode (nothing armed is the normal state),
	// so the entry is a toggle: pressing the armed entry again disarms it and
	// aria-pressed turns false, by click and by Enter or Space.
	it("disarms the armed entry when it is pressed again", () => {
		const { rerender } = render(
			<HyperCardToolsPalette
				stackId={"demo"}
				edit={{ ...makeEdit(), placing: "slider" }}
			/>,
		);
		const armed = screen.getByRole("button", { name: "Slider" });
		fireEvent.click(armed);
		fireEvent.keyDown(armed, { key: "Enter" });
		fireEvent.keyDown(armed, { key: " " });
		expect(dispatch.mock.calls).toEqual(
			Array.from({ length: 3 }, () => [
				{
					type: "ClassicyAppHCEditSetPlacing",
					stackId: "demo",
					partType: undefined,
				},
			]),
		);

		rerender(<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />);
		expect(screen.getByRole("button", { name: "Slider" })).toHaveAttribute(
			"aria-pressed",
			"false",
		);
	});
});

// The remaining chapters' audit's 1.4, in the palette: pressing an entry
// arms it and leaves the focus on it, so under `input.escapeCancels`
// (Windows 98) Escape there disarms the armed tool as Escape on the card
// does (WIG Ch.1 "User in Control", p.1; Ch.4 "Shortcut Keys", p.27);
// without the key the palette ignores Escape.
describe("HyperCardToolsPalette — Escape and the armed entry", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-palette",
			name: "Windows palette",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-palette-default",
				package: "windows-palette",
			},
			layout: windows98.layout as never,
		});

	it("disarms on Escape from any entry under the Windows layout", () => {
		useWindowsLayout();
		render(
			<HyperCardToolsPalette
				stackId={"demo"}
				edit={{ ...makeEdit(), placing: "slider" }}
			/>,
		);
		const other = screen.getByRole("button", { name: "Button" });
		expect(fireEvent.keyDown(other, { key: "Escape" })).toBe(false);
		expect(dispatch.mock.calls).toEqual([
			[
				{
					type: "ClassicyAppHCEditSetPlacing",
					stackId: "demo",
					partType: undefined,
				},
			],
		]);
	});

	it("does nothing on Escape with nothing armed under the Windows layout", () => {
		useWindowsLayout();
		render(<HyperCardToolsPalette stackId={"demo"} edit={makeEdit()} />);
		expect(
			fireEvent.keyDown(screen.getByRole("button", { name: "Slider" }), {
				key: "Escape",
			}),
		).toBe(true);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("ignores Escape without the key, the entry staying armed", () => {
		render(
			<HyperCardToolsPalette
				stackId={"demo"}
				edit={{ ...makeEdit(), placing: "slider" }}
			/>,
		);
		expect(
			fireEvent.keyDown(screen.getByRole("button", { name: "Slider" }), {
				key: "Escape",
			}),
		).toBe(true);
		expect(dispatch).not.toHaveBeenCalled();
	});
});
