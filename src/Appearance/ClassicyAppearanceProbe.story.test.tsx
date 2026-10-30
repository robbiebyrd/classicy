import "@/Appearance/Platinum";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackage";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
// The root vitest config has no `@sb` alias, so the Storybook helper is
// imported by its relative path.
import { ClassicyAppearanceProbe } from "../../storybook/.storybook/ClassicyAppearanceProbe";

// The Storybook probe package (storybook/.storybook/ClassicyAppearanceProbe):
// it registers itself and switches the store to itself only while mounted,
// outlines every decorated root and logs every event to the Actions panel.
// `action` is replaced by a recorder, so "logs" can be asserted. The root
// workspace has no `storybook` dependency: the probe's "storybook/actions"
// resolves from the storybook workspace, so the mock resolves the id from
// there too (a bare "storybook/actions" here would register an id the probe
// never imports). Resolving through the package's `exports` keeps the test
// independent of storybook's dist layout.
const { logged, actionsId } = await vi.hoisted(async () => {
	const { createRequire } = await import("node:module");
	const { resolve } = await import("node:path");
	// jsdom rewrites import.meta.url to an http URL; import.meta.dirname is
	// the file's directory on disk.
	const storybookWorkspace = resolve(
		import.meta.dirname,
		"../../storybook/package.json",
	);
	return {
		logged: [] as { name: string; detail: unknown }[],
		actionsId: createRequire(storybookWorkspace).resolve("storybook/actions"),
	};
});

vi.mock(actionsId, () => ({
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
	it("registers the probe package only while it is mounted", () => {
		const ids = () => listClassicyAppearancePackages().map(({ id }) => id);
		// Importing the probe registers nothing, so the Packages tab of any
		// other story in the same iframe never lists it.
		expect(ids()).not.toContain("storybook-probe");
		const { unmount } = render(
			<ClassicyAppearanceProbe>
				<span />
			</ClassicyAppearanceProbe>,
		);
		const probe = getClassicyAppearancePackage("storybook-probe");
		expect(probe?.css.startsWith("@layer classicy.package")).toBe(true);
		expect(
			document.getElementById("classicy-appearance-storybook-probe"),
		).not.toBeNull();
		unmount();
		expect(ids()).not.toContain("storybook-probe");
		expect(
			document.getElementById("classicy-appearance-storybook-probe"),
		).toBeNull();
		expect(ids()).toContain("platinum");
	});

	it("restores a package registered under its id before it mounted", () => {
		const platinum = getClassicyAppearancePackage(
			"platinum",
		) as ClassicyAppearancePackage;
		const earlier: ClassicyAppearancePackage = {
			...platinum,
			id: "storybook-probe",
			name: "Earlier",
			css: "",
			defaults: { ...platinum.defaults, package: "storybook-probe" },
			presets: [],
			hooks: undefined,
		};
		registerClassicyAppearancePackage(earlier);
		const { unmount } = render(
			<ClassicyAppearanceProbe>
				<span />
			</ClassicyAppearanceProbe>,
		);
		expect(getClassicyAppearancePackage("storybook-probe")?.name).toBe(
			"Storybook Probe",
		);
		unmount();
		expect(getClassicyAppearancePackage("storybook-probe")).toBe(earlier);
		unregisterClassicyAppearancePackage("storybook-probe");
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
