import { describe, expect, it, vi } from "vitest";
import { compileScss, scssRule } from "@/__tests__/compiledScss";
import { render } from "@/__tests__/test-utils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";

/**
 * The alert's parts are orderable siblings: the icon and body carry explicit
 * `order` values (so a package can swap them), and every non-help button
 * carries a `data-classicy-role` a package can key an `order` on. jsdom does
 * no layout, so the arrangement is pinned on the compiled stylesheet.
 */

// Real ClassicyWindow + Button render; only their external hooks are mocked
// (as in ClassicyAlert.test.tsx), so the modal renders without providers.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: { Applications: { apps: {} } },
				},
			}),
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
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);
vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));
vi.mock("@/SystemFolder/SystemResources/Alert/ClassicyAlert.scss", () => ({}));
vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Button/ClassicyButton.scss",
	() => ({}),
);

const css = compileScss(
	"src/SystemFolder/SystemResources/Alert/ClassicyAlert.scss",
);

const rule = (selector: string) => scssRule(css, selector);

describe("ClassicyAlert arrangement", () => {
	it("gives every non-help button a data-classicy-role", () => {
		render(
			<ClassicyAlert
				alertType="caution"
				label="Save changes?"
				buttons={[
					{ id: "dont", label: "Don't Save", role: "normal" },
					{ id: "cancel", label: "Cancel", role: "cancel" },
					{ id: "save", label: "Save", role: "default" },
					{ id: "help", label: "?", role: "help" },
				]}
			/>,
		);
		const buttons = document.querySelectorAll(
			".classicyAlertButtons button:not(.classicyAlertHelpButton)",
		);
		expect(buttons.length).toBe(3);
		for (const button of buttons) {
			expect(["default", "cancel", "other"]).toContain(
				button.getAttribute("data-classicy-role"),
			);
		}
	});

	it("orders the icon and body explicitly, with no floats", () => {
		expect(rule(".classicyAlert .classicyAlertIcon").order).toBe("10");
		expect(rule(".classicyAlert .classicyAlertBody").order).toBe("20");
		expect(css).not.toMatch(/\bfloat\s*:/);
	});
});
