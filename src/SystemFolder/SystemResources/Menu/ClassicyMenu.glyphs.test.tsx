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

	// WIG Ch.7 "Types of Menu Items" (p.108), Figure 7.5 "Option Button": one
	// choice of an interdependent group (`mark: "bullet"`) is a menuitemradio
	// whose gutter carries `classicyMenuItemBullet` beside the check's class,
	// so Platinum and System 7, keyed on `.classicyMenuItemCheck.checked`,
	// keep their check mark there while Windows 98 draws its round bullet.
	it("renders a bullet item as menuitemradio, its gutter carrying the bullet class beside the check's", () => {
		const { container } = render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[
					{ id: "icons", title: "Icons", checked: true, mark: "bullet" },
					{ id: "list", title: "List", checked: false, mark: "bullet" },
					{ id: "check", title: "Check", checked: true, mark: "check" },
					{ id: "plain", title: "Plain" },
				]}
			/>,
		);
		const icons = screen.getByRole("menuitemradio", { name: "Icons" });
		expect(icons).toHaveAttribute("aria-checked", "true");
		const iconsGutter = icons.querySelector(".classicyMenuItemCheck");
		expect(iconsGutter).toHaveClass("classicyMenuItemBullet", "checked");
		expect(iconsGutter).toHaveAttribute("aria-hidden", "true");
		expect(iconsGutter?.textContent).toBe("");
		const list = screen.getByRole("menuitemradio", { name: "List" });
		expect(list).toHaveAttribute("aria-checked", "false");
		const listGutter = list.querySelector(".classicyMenuItemCheck");
		expect(listGutter).toHaveClass("classicyMenuItemBullet");
		expect(listGutter).not.toHaveClass("checked");
		// `mark: "check"` is the default: a check box, with no bullet class;
		// a plain item has no gutter at all.
		const check = screen.getByRole("menuitemcheckbox", { name: "Check" });
		expect(check.querySelector(".classicyMenuItemCheck")).toHaveClass(
			"checked",
		);
		expect(check.querySelector(".classicyMenuItemCheck")).not.toHaveClass(
			"classicyMenuItemBullet",
		);
		expect(
			screen
				.getByRole("menuitem", { name: "Plain" })
				.querySelector(".classicyMenuItemCheck"),
		).toBeNull();
		expect(container.querySelectorAll(".classicyMenuItemBullet")).toHaveLength(
			2,
		);
		expect(screen.queryByRole("menuitemradio", { name: "Check" })).toBeNull();
	});

	// ARIA 1.2 allows "mixed" on menuitemcheckbox alone, so a bullet item
	// given it reads as unchecked.
	it("reads a mixed bullet item as an unchecked menuitemradio", () => {
		render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[
					{ id: "mixed", title: "Mixed", checked: "mixed", mark: "bullet" },
				]}
			/>,
		);
		expect(
			screen.getByRole("menuitemradio", { name: "Mixed" }),
		).toHaveAttribute("aria-checked", "false");
	});

	// WIG Ch.7 "Types of Menu Items" (pp.108–109), Figure 7.5 "Default Item":
	// the default item, the command a double-click runs, carries the `default`
	// state on its `<li>`, which Windows 98 draws bold; a plain item, and one
	// whose `isDefault` is false, carry it not at all, and it goes with the
	// prop.
	it("marks the default item with the default state, which follows isDefault", () => {
		const { rerender } = render(
			<ClassicyMenu
				name="test-menu"
				menuItems={[
					{ id: "open", title: "Open", isDefault: true },
					{ id: "not", title: "Not default", isDefault: false },
					{ id: "plain", title: "Plain" },
				]}
			/>,
		);
		const open = screen.getByRole("menuitem", { name: "Open" });
		expect(open).toHaveClass("classicyMenuItem", "default");
		// A default item that is not checkable has no gutter, bullet or check.
		expect(open.querySelector(".classicyMenuItemCheck")).toBeNull();
		expect(open).not.toHaveAttribute("aria-checked");
		expect(
			screen.getByRole("menuitem", { name: "Not default" }),
		).not.toHaveClass("default");
		expect(screen.getByRole("menuitem", { name: "Plain" })).not.toHaveClass(
			"default",
		);
		rerender(
			<ClassicyMenu
				name="test-menu"
				menuItems={[
					{ id: "open", title: "Open" },
					{ id: "not", title: "Not default", isDefault: true },
					{ id: "plain", title: "Plain" },
				]}
			/>,
		);
		expect(screen.getByRole("menuitem", { name: "Open" })).not.toHaveClass(
			"default",
		);
		expect(screen.getByRole("menuitem", { name: "Not default" })).toHaveClass(
			"default",
		);
	});
});
