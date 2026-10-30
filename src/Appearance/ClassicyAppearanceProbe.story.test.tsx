import "@/Appearance/Platinum";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
// The root vitest config has no `@sb` alias, so the Storybook helper is
// imported by its relative path.
import { ClassicyAppearanceProbe } from "../../storybook/.storybook/ClassicyAppearanceProbe";

// The Storybook probe package (storybook/.storybook/ClassicyAppearanceProbe):
// it registers at module scope, switches the store to itself while mounted,
// outlines every decorated root and logs every event to the Actions panel.
// `action` is replaced by a recorder, so "logs" can be asserted. The root
// workspace has no `storybook` dependency: the probe's "storybook/actions"
// resolves from storybook/node_modules, so the mock names that file (a bare
// "storybook/actions" here would register an id the probe never imports).
const { logged } = vi.hoisted(() => ({
	logged: [] as { name: string; detail: unknown }[],
}));

vi.mock("../../storybook/node_modules/storybook/dist/actions/index.js", () => ({
	action: (name: string) => (detail: unknown) => {
		logged.push({ name, detail });
	},
}));

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);

const packageId = () =>
	useAppManager.getState().System.Manager.Appearance.packageId;

describe("ClassicyAppearanceProbe (Storybook)", () => {
	it("registers the probe package", () => {
		const probe = getClassicyAppearancePackage("storybook-probe");
		expect(probe).toBeDefined();
		expect(probe?.css.startsWith("@layer classicy.package")).toBe(true);
	});

	it("activates on mount and restores platinum on unmount", () => {
		const { unmount } = render(
			<ClassicyAppearanceProbe>
				<span />
			</ClassicyAppearanceProbe>,
		);
		expect(packageId()).toBe("storybook-probe");
		unmount();
		expect(packageId()).toBe("platinum");
	});

	it("decorates and logs", () => {
		logged.length = 0;
		render(
			<ClassicyAppearanceProbe>
				<ClassicyButton>OK</ClassicyButton>
			</ClassicyAppearanceProbe>,
		);
		const button = screen.getByRole("button", { name: "OK" });
		expect(button).toHaveClass("sbProbe");
		expect(button).toHaveAttribute("data-sb-state");
		fireEvent.mouseDown(button);
		expect(button).toHaveClass("sbProbePressed");
		fireEvent.mouseUp(button);
		expect(button).not.toHaveClass("sbProbePressed");
		const names = logged.map(({ name }) => name);
		expect(names).toContain("Button.mount");
		expect(names).toContain("Button.press");
		expect(names).toContain("Button.release");
	});
});
