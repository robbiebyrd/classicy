import { describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { migrateClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations";

const deepFreeze = <T>(value: T): T => {
	if (value && typeof value === "object" && !Object.isFrozen(value)) {
		Object.freeze(value);
		for (const child of Object.values(value)) deepFreeze(child);
	}
	return value;
};

/** DefaultAppManagerState as a build before Appearance Packages saved it. */
const withoutPackages = (): ClassicyStore => {
	const state = structuredClone(DefaultAppManagerState);
	const appearance = state.System.Manager.Appearance as Partial<
		typeof state.System.Manager.Appearance
	>;
	delete appearance.packageId;
	delete (appearance.activeTheme as { package?: string }).package;
	delete (appearance.availableThemes?.[0] as { package?: string }).package;
	appearance.customThemes = [
		{
			...structuredClone(
				DefaultAppManagerState.System.Manager.Appearance.activeTheme,
			),
			id: "custom",
		},
	];
	delete (appearance.customThemes[0] as { package?: string }).package;
	return state;
};

describe("migrateAppearancePackage", () => {
	it("fills packageId and theme.package when absent", () => {
		const migrated = migrateClassicyState(withoutPackages());
		const appearance = migrated.System.Manager.Appearance;
		expect(appearance.packageId).toBe("platinum");
		expect(appearance.activeTheme.package).toBe("platinum");
		expect(appearance.availableThemes?.[0].package).toBe("platinum");
		expect(appearance.customThemes?.[0].package).toBe("platinum");
	});

	it("returns the same object when complete", () => {
		expect(migrateClassicyState(DefaultAppManagerState)).toBe(
			DefaultAppManagerState,
		);
	});

	it("does not mutate the input", () => {
		const input = deepFreeze(withoutPackages());
		expect(() => migrateClassicyState(input)).not.toThrow();
		expect(input.System.Manager.Appearance.packageId).toBeUndefined();
	});

	it("keeps a theme that already names its package", () => {
		const state = structuredClone(DefaultAppManagerState);
		state.System.Manager.Appearance.packageId = "irix";
		state.System.Manager.Appearance.activeTheme.package = "irix";
		const migrated = migrateClassicyState(state);
		expect(migrated).toBe(state);
		expect(migrated.System.Manager.Appearance.activeTheme.package).toBe("irix");
	});
});
