import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";

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

	// The glyphs stay text (only wrapped in spans), so a control labelled by a
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
