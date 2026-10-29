import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { getActiveClassicyAppearancePackageId } from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyAppearance } from "@/Appearance/useClassicyAppearance";

// The shape of HyperCard.sound.test.tsx: the real store module (which
// connects the asset registry's package source) with `useAppManager`
// replaced by a fixture whose state has no System.Manager.Appearance slice.
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
	expect(() => getActiveClassicyAppearancePackageId()).not.toThrow();
	expect(getActiveClassicyAppearancePackageId()).toBe("platinum");
	const { result } = renderHook(() =>
		useClassicyAppearance("Button", { pressed: true }),
	);
	expect(result.current.className).toBe("pressed");
	expect(result.current.style).toBeUndefined();
	expect(result.current.attrs).toEqual({});
});
