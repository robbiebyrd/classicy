import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
// Loaded first on purpose: the package module imports the store module, so
// it pulls in the mocked store below (whose real implementation connects the
// asset registry's package source) and resolves the active package through
// the mocked `useAppManager`, the shape of HyperCard.sound.test.tsx's graph.
// useClassicyAppearance itself never loads the store.
import { resolveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { getActiveClassicyAppearancePackageId } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";

// The store module is real apart from `useAppManager`, a fixture whose state
// has no System.Manager.Appearance slice.
const mockState = {
	System: { Manager: { Desktop: {}, Applications: { apps: {} } } },
};

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => ({
		...(await importOriginal<object>()),
		useAppManager: Object.assign(
			(selector: (state: unknown) => unknown): unknown => selector(mockState),
			{ getState: (): unknown => mockState },
		),
	}),
);

it("renders from the default package under a store fixture without an Appearance slice", () => {
	expect(() => resolveClassicyAppearancePackage()).not.toThrow();
	expect(resolveClassicyAppearancePackage().id).toBe("platinum");
	expect(() => getActiveClassicyAppearancePackageId()).not.toThrow();
	expect(getActiveClassicyAppearancePackageId()).toBe("platinum");
	const { result } = renderHook(() =>
		useClassicyAppearance("Button", { pressed: true }),
	);
	expect(result.current.className).toBe("pressed");
	expect(result.current.style).toBeUndefined();
	expect(result.current.attrs).toEqual({});
});
