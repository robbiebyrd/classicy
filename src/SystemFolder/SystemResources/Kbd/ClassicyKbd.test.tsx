// The Windows-layout package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

vi.mock("@/SystemFolder/SystemResources/Kbd/ClassicyKbd.scss", () => ({}));

// Call-through spies, so a test can count how often ClassicyKbd parses.
const shortcutSpies = vi.hoisted(() => ({
	parse: vi.fn(),
	modifiers: vi.fn(),
}));
vi.mock(
	"@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/SystemResources/Menu/ClassicyKeyboardShortcut")
			>();
		shortcutSpies.parse.mockImplementation(actual.parseKeyboardShortcut);
		shortcutSpies.modifiers.mockImplementation(
			actual.keyboardShortcutModifiers,
		);
		return {
			...actual,
			parseKeyboardShortcut: shortcutSpies.parse,
			keyboardShortcutModifiers: shortcutSpies.modifiers,
		};
	},
);

// Platinum (registered above) is the default layout, spelling shortcuts in
// glyphs; `windows-kbd` carries the Windows 98 package's layout
// (`menu.shortcutSpelling` "names"). The store is not mounted: stand in for
// its connection of the active package id.
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});
registerClassicyAppearancePackage({
	id: "windows-kbd",
	name: "Windows shortcuts",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "windows-kbd-default",
		package: "windows-kbd",
	},
	layout: windows98.layout as never,
});

afterEach(() => {
	activePackage.id = "platinum";
});

describe("ClassicyKbd", () => {
	it("renders a semantic <kbd> with canonical Platinum glyphs", () => {
		const { container } = render(<ClassicyKbd shortcut="Cmd+Shift+S" />);
		const kbd = container.querySelector("kbd");
		expect(kbd).not.toBeNull();
		expect(kbd).toHaveTextContent("⇧⌘S");
		expect(kbd).toHaveClass("classicyKbd", "classicyKbdInline");
	});

	it("renders one addressable span per modifier", () => {
		const { container } = render(<ClassicyKbd shortcut="Cmd+Shift+S" />);
		const kbd = container.querySelector("kbd") as HTMLElement;
		const parts = kbd.querySelectorAll("[data-classicy-part^='modifier-']");
		expect([...parts].map((p) => p.getAttribute("data-classicy-part"))).toEqual(
			["modifier-shift", "modifier-command"],
		);
		for (const part of parts) expect(part).toHaveClass("classicyKbdModifier");
	});

	it("keycaps put each modifier span inside its own cap", () => {
		const { container } = render(
			<ClassicyKbd shortcut="Ctrl+Opt+F1" variant="keycaps" />,
		);
		const caps = [...container.querySelectorAll(".classicyKbdKeycap")];
		expect(
			caps.map(
				(c) =>
					c
						.querySelector("[data-classicy-part^='modifier-']")
						?.getAttribute("data-classicy-part") ?? null,
			),
		).toEqual(["modifier-control", "modifier-option", null]);
		expect(caps.map((c) => c.textContent)).toEqual(["⌃", "⌥", "F1"]);
	});

	// The glyphs stay text (only wrapped in spans), so a control labeled by a
	// shortcut keeps the same accessible name.
	it("keeps the shortcut's accessible name in both variants", () => {
		render(
			<>
				<button type="button">
					<ClassicyKbd shortcut="Cmd+Shift+S" />
				</button>
				<button type="button">
					<ClassicyKbd shortcut="Ctrl+Opt+F1" variant="keycaps" />
				</button>
			</>,
		);
		expect(screen.getByRole("button", { name: "⇧⌘S" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "⌃⌥F1" })).toBeInTheDocument();
	});

	it("is idempotent for already-formatted glyph strings", () => {
		const { container } = render(<ClassicyKbd shortcut="⌘N" />);
		expect(container.querySelector("kbd")).toHaveTextContent("⌘N");
	});

	it("renders children verbatim when no shortcut is given", () => {
		const { container } = render(<ClassicyKbd>Esc</ClassicyKbd>);
		expect(container.querySelector("kbd")).toHaveTextContent("Esc");
	});

	it("renders nothing for an empty shortcut", () => {
		const { container } = render(<ClassicyKbd shortcut="" />);
		expect(container.querySelector("kbd")).toBeNull();
	});

	it("renders nothing with neither shortcut nor children", () => {
		const { container } = render(<ClassicyKbd />);
		expect(container.querySelector("kbd")).toBeNull();
	});

	it("keycaps variant renders one cap per key in HIG order", () => {
		const { container } = render(
			<ClassicyKbd shortcut="Cmd+Shift+S" variant="keycaps" />,
		);
		const caps = container.querySelectorAll(".classicyKbdKeycap");
		expect([...caps].map((c) => c.textContent)).toEqual(["⇧", "⌘", "S"]);
		// Nested <kbd> per cap is the HTML-sanctioned "keys to press" markup.
		for (const cap of caps) {
			expect(cap.tagName).toBe("KBD");
		}
	});

	it("merges a caller className", () => {
		const { container } = render(
			<ClassicyKbd shortcut="F1" className="myClass" />,
		);
		expect(container.querySelector("kbd")).toHaveClass(
			"classicyKbd",
			"myClass",
		);
	});

	it("parses the shortcut once and hands the parse to the modifier lookup", () => {
		shortcutSpies.parse.mockClear();
		shortcutSpies.modifiers.mockClear();
		render(<ClassicyKbd shortcut="Cmd+Shift+S" />);
		expect(shortcutSpies.parse).toHaveBeenCalledTimes(1);
		expect(shortcutSpies.modifiers).toHaveBeenCalledTimes(1);
		expect(shortcutSpies.modifiers).toHaveBeenCalledWith(
			shortcutSpies.parse.mock.results[0].value,
		);
	});
});

// The audit's 7.15 (WIG Ch.7 "Shortcut Keys in Menu Items", p.110: "Display
// CTRL and SHIFT key combinations as Ctrl+key ... and Shift+key").
describe("ClassicyKbd — layout.menu.shortcutSpelling", () => {
	it("spells the inline form by the keycaps' names under names (Windows 98), joined by + with no spaces", () => {
		activePackage.id = "windows-kbd";
		const text = (shortcut: string) =>
			render(<ClassicyKbd shortcut={shortcut} />).container.querySelector("kbd")
				?.textContent;
		expect(text("Ctrl+Shift+S")).toBe("Ctrl+Shift+S");
		expect(text("⌃⌫")).toBe("Ctrl+Backspace");
		expect(text("⌃⌦")).toBe("Ctrl+Del");
		expect(text("⌥⇧↑")).toBe("Alt+Shift+Up");
		expect(text("Cmd+O")).toBe("Win+O");
		expect(text("⌃Escape")).toBe("Ctrl+Esc");
		expect(text("F1")).toBe("F1");
		expect(text("⌃s")).toBe("Ctrl+S");
	});

	it("keeps each modifier its part, holding its name and the +", () => {
		activePackage.id = "windows-kbd";
		const { container } = render(<ClassicyKbd shortcut="Cmd+Shift+S" />);
		const parts = [
			...container.querySelectorAll("[data-classicy-part^='modifier-']"),
		];
		expect(
			parts.map((p) => [p.getAttribute("data-classicy-part"), p.textContent]),
		).toEqual([
			["modifier-shift", "Shift+"],
			["modifier-command", "Win+"],
		]);
		expect(container.querySelector("kbd")).toHaveTextContent("Shift+Win+S");
		// Text, wrapped in spans: the accessible name reads the same.
		render(
			<button type="button">
				<ClassicyKbd shortcut="Ctrl+S" />
			</button>,
		);
		expect(screen.getByRole("button", { name: "Ctrl+S" })).toBeInTheDocument();
	});

	it("keeps the glyphs by default (Platinum) and in key caps", () => {
		expect(
			render(<ClassicyKbd shortcut="Ctrl+Shift+S" />).container.querySelector(
				"kbd",
			),
		).toHaveTextContent("⌃⇧S");
		activePackage.id = "windows-kbd";
		const caps = render(
			<ClassicyKbd shortcut="Ctrl+Shift+S" variant="keycaps" />,
		).container.querySelectorAll(".classicyKbdKeycap");
		expect([...caps].map((c) => c.textContent)).toEqual(["⌃", "⇧", "S"]);
	});
});

// H-R27d: the key cap's outline is an edge of the cap, always drawn, so it
// reads the border width, not the focus ring's (one name per role, H-R6).
describe("ClassicyKbd styles", () => {
	it("outlines the key cap with the border width", () => {
		const sheet = readFileSync(resolve(__dirname, "ClassicyKbd.scss"), "utf8");
		expect(sheet).toMatch(
			/outline: var\(--window-border-size\) solid var\(--color-outline\);/,
		);
		expect(sheet).not.toMatch(/--focus-ring-width/);
	});
});
