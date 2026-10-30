import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => vi.fn(),
	}),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss", () => ({}));

import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// The check and dash are package look: Platinum draws them as `content` on
// `.classicyMenuItemCheck.checked|mixed::before`, so the span carries only the
// state class.
describe("ClassicyMenu — check glyphs", () => {
	it("marks checked and mixed items with state classes and no text", () => {
		const { container } = render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[
					{ id: "on", title: "On", checked: true },
					{ id: "mixed", title: "Mixed", checked: "mixed" },
					{ id: "off", title: "Off", checked: false },
				]}
			/>,
		);
		const checks = [...container.querySelectorAll(".classicyMenuItemCheck")];
		expect(checks).toHaveLength(3);
		const [on, mixed, off] = checks;
		expect(on).toHaveClass("checked");
		expect(on).not.toHaveClass("mixed");
		expect(mixed).toHaveClass("mixed");
		expect(mixed).not.toHaveClass("checked");
		expect(off).not.toHaveClass("checked");
		expect(off).not.toHaveClass("mixed");
		for (const check of checks) expect(check.textContent).toBe("");
	});

	// The gutter was aria-hidden before the glyph moved to CSS, so the check
	// never contributed to the item's accessible name; it still does not, and
	// the shortcut glyphs still do.
	it("keeps a checked item's accessible name: title and shortcut, no check", () => {
		render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[
					{
						id: "save-as",
						title: "Save As",
						checked: true,
						keyboardShortcut: "Cmd+Shift+S",
					},
					{ id: "mixed", title: "Mixed", checked: "mixed" },
				]}
			/>,
		);
		expect(
			screen.getByRole("menuitemcheckbox", { name: "Save As ⇧⌘S" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("menuitemcheckbox", { name: "Mixed" }),
		).toBeInTheDocument();
		for (const check of document.querySelectorAll(".classicyMenuItemCheck"))
			expect(check).toHaveAttribute("aria-hidden", "true");
	});

	// The glyph belongs to the package, so the checked state must not depend
	// on it: a checkable item is a menuitemcheckbox whose aria-checked carries
	// the state (ARIA 1.2 allows "mixed" there, not on menuitemradio).
	it("exposes the checked state as menuitemcheckbox with aria-checked", () => {
		render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[
					{ id: "on", title: "On", checked: true },
					{ id: "mixed", title: "Mixed", checked: "mixed" },
					{ id: "off", title: "Off", checked: false },
					{ id: "plain", title: "Plain" },
				]}
			/>,
		);
		expect(
			screen.getByRole("menuitemcheckbox", { name: "On" }),
		).toHaveAttribute("aria-checked", "true");
		expect(
			screen.getByRole("menuitemcheckbox", { name: "Mixed" }),
		).toHaveAttribute("aria-checked", "mixed");
		expect(
			screen.getByRole("menuitemcheckbox", { name: "Off" }),
		).toHaveAttribute("aria-checked", "false");
		const plain = screen.getByRole("menuitem", { name: "Plain" });
		expect(plain).not.toHaveAttribute("aria-checked");
	});
});
