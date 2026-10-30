import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	registerTestRenamePackage,
	TEST_RENAME_PACKAGE_ID,
	TEST_RENAMED_ICON,
} from "@/__tests__/testRenamePackage";
import {
	type ClassicyAppearancePackage,
	getClassicyAppearancePackage,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import {
	CLASSICY_NO_APP_IDENTITY_OVERRIDES,
	type ClassicyAppIdentity,
	classicyAppIdentityFrom,
	getClassicyAppIdentityOverrides,
	resolveClassicyAppIdentity,
	useClassicyAppIdentity,
	useClassicyAppIdentityOverrides,
} from "@/Appearance/ClassicyAppIdentity";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

// Importing the Platinum module registered it; keep that object so every
// test can put the real Platinum registration back after a reset.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const fb: ClassicyAppIdentity = {
	name: "Movie Player",
	icon: "movie-player.png",
};

const switchPackage = (packageId: string) =>
	dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });

beforeEach(() => {
	resetClassicyAppearancePackagesForTests();
	registerClassicyAppearancePackage(platinum);
	useAppManager.setState(DefaultAppManagerState, true);
});

afterEach(() => {
	resetClassicyAppearancePackagesForTests();
	registerClassicyAppearancePackage(platinum);
	useAppManager.setState(DefaultAppManagerState, true);
});

describe("resolveClassicyAppIdentity", () => {
	it("returns the fallback object itself under Platinum", () => {
		registerTestRenamePackage();
		expect(resolveClassicyAppIdentity("MoviePlayer.app", fb)).toBe(fb);
		expect(
			resolveClassicyAppIdentity(
				"MoviePlayer.app",
				fb,
				PLATINUM_APPEARANCE_PACKAGE_ID,
			),
		).toBe(fb);
		expect(getClassicyAppIdentityOverrides()).toBe(
			CLASSICY_NO_APP_IDENTITY_OVERRIDES,
		);
	});

	it("applies every field a package overrides", () => {
		registerTestRenamePackage();
		expect(
			resolveClassicyAppIdentity("MoviePlayer.app", fb, TEST_RENAME_PACKAGE_ID),
		).toEqual({
			name: "Media Player",
			icon: TEST_RENAMED_ICON,
			description: "Plays movies and sound.",
		});
	});

	it("keeps the fallback icon when only the name is overridden", () => {
		registerTestRenamePackage();
		expect(
			resolveClassicyAppIdentity(
				"TV.app",
				{ name: "TV", icon: "tv.png" },
				TEST_RENAME_PACKAGE_ID,
			),
		).toEqual({ name: "Television", icon: "tv.png" });
	});

	it("falls back to Platinum for an unregistered package id", () => {
		registerTestRenamePackage();
		expect(resolveClassicyAppIdentity("MoviePlayer.app", fb, "irix")).toBe(fb);
		expect(getClassicyAppIdentityOverrides("irix")).toBe(
			CLASSICY_NO_APP_IDENTITY_OVERRIDES,
		);
	});

	it("returns the fallback for prototype keys", () => {
		registerTestRenamePackage();
		for (const appId of ["__proto__", "constructor"])
			expect(
				resolveClassicyAppIdentity(appId, fb, TEST_RENAME_PACKAGE_ID),
				appId,
			).toBe(fb);
	});

	// The schema validates own entries only: an inherited one parses as an
	// empty record and is never checked, so the resolver must never read it.
	it("ignores an inherited apps entry", () => {
		const renamed = {
			...platinum,
			id: "inherited",
			defaults: { ...platinum.defaults, package: "inherited" },
			apps: Object.create({ "TV.app": { name: "_unvalidated" } }),
		};
		registerClassicyAppearancePackage(renamed);
		expect(getClassicyAppearancePackage("inherited")).toBe(renamed);
		const tv = { name: "TV", icon: "tv.png" };
		expect(resolveClassicyAppIdentity("TV.app", tv, "inherited")).toBe(tv);
		expect(
			classicyAppIdentityFrom(
				Object.create({ "TV.app": { name: "Telly" } }),
				"TV.app",
				tv,
			),
		).toBe(tv);
	});
});

describe("CLASSICY_NO_APP_IDENTITY_OVERRIDES", () => {
	it("is a frozen empty map", () => {
		expect(CLASSICY_NO_APP_IDENTITY_OVERRIDES).toEqual({});
		expect(Object.isFrozen(CLASSICY_NO_APP_IDENTITY_OVERRIDES)).toBe(true);
	});
});

describe("classicyAppIdentityFrom", () => {
	it("returns the fallback itself when the app has no override", () =>
		expect(
			classicyAppIdentityFrom({ "A.app": { name: "A" } }, "B.app", fb),
		).toBe(fb));

	it("lets each override field win over the fallback's", () =>
		expect(
			classicyAppIdentityFrom(
				{ "A.app": { description: "Overridden." } },
				"A.app",
				{ ...fb, description: "Original." },
			),
		).toEqual({ ...fb, description: "Overridden." }));
});

describe("useClassicyAppIdentityOverrides", () => {
	it("follows a package switch and back", () => {
		registerTestRenamePackage();
		const { result } = renderHook(() => useClassicyAppIdentityOverrides());
		expect(result.current).toBe(CLASSICY_NO_APP_IDENTITY_OVERRIDES);
		act(() => switchPackage(TEST_RENAME_PACKAGE_ID));
		expect(result.current).toBe(
			getClassicyAppearancePackage(TEST_RENAME_PACKAGE_ID)?.apps,
		);
		act(() => switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID));
		expect(result.current).toBe(CLASSICY_NO_APP_IDENTITY_OVERRIDES);
	});

	it("follows a re-registration under the active id", () => {
		registerTestRenamePackage();
		act(() => switchPackage(TEST_RENAME_PACKAGE_ID));
		const { result } = renderHook(() =>
			useClassicyAppIdentity("TV.app", { name: "TV", icon: "tv.png" }),
		);
		expect(result.current.name).toBe("Television");
		const renamed = getClassicyAppearancePackage(
			TEST_RENAME_PACKAGE_ID,
		) as ClassicyAppearancePackage;
		act(() =>
			registerClassicyAppearancePackage({
				...renamed,
				apps: { "TV.app": { name: "Telly" } },
			}),
		);
		expect(result.current).toEqual({ name: "Telly", icon: "tv.png" });
	});
});

describe("useClassicyAppIdentity", () => {
	it("follows ClassicyDesktopChangeAppearancePackage and back", () => {
		registerTestRenamePackage();
		const { result } = renderHook(() =>
			useClassicyAppIdentity("MoviePlayer.app", fb),
		);
		expect(result.current).toBe(fb);
		act(() => switchPackage(TEST_RENAME_PACKAGE_ID));
		expect(result.current).toEqual({
			name: "Media Player",
			icon: TEST_RENAMED_ICON,
			description: "Plays movies and sound.",
		});
		act(() => switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID));
		expect(result.current).toBe(fb);
	});

	it("returns the fallback for an undefined app id", () => {
		registerTestRenamePackage();
		act(() => switchPackage(TEST_RENAME_PACKAGE_ID));
		const { result } = renderHook(() => useClassicyAppIdentity(undefined, fb));
		expect(result.current).toBe(fb);
	});

	it("is reference-stable across unrelated store updates", () => {
		registerTestRenamePackage();
		act(() => switchPackage(TEST_RENAME_PACKAGE_ID));
		let renders = 0;
		const { result, rerender } = renderHook(() => {
			renders += 1;
			return {
				overrides: useClassicyAppIdentityOverrides(),
				// An inline literal, as components pass it: memoized on its fields.
				identity: useClassicyAppIdentity("MoviePlayer.app", {
					name: "Movie Player",
					icon: "movie-player.png",
				}),
			};
		});
		const first = result.current;
		const rendersBefore = renders;
		act(() =>
			dispatch({
				type: "ClassicyDesktopSetBalloonHelp",
				disableBalloonHelp: true,
			}),
		);
		act(() =>
			dispatch({
				type: "ClassicyDesktopSetBalloonHelp",
				disableBalloonHelp: false,
			}),
		);
		expect(renders).toBe(rendersBefore);
		rerender();
		expect(result.current.overrides).toBe(first.overrides);
		expect(result.current.identity).toBe(first.identity);
	});
});

describe("the identity module", () => {
	// Reducers import the resolver: its module must never reach the store,
	// directly or through the package module (which reads the store), or a
	// reducer the app manager imports would recreate the
	// store-before-default-state load-order failure.
	it("loads without evaluating the app manager's store module", async () => {
		// The pattern of useClassicyAppearance.storeFree.test.ts, with the
		// counting mock registered after the reset: this file already loaded
		// the store, and a hoisted vi.mock's result would be reused.
		const storeModule =
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
		let storeLoads = 0;
		vi.resetModules();
		vi.doMock(storeModule, async (importOriginal) => {
			storeLoads += 1;
			return importOriginal();
		});
		try {
			const identity = await import("@/Appearance/ClassicyAppIdentity");
			expect(typeof identity.resolveClassicyAppIdentity).toBe("function");
			expect(storeLoads).toBe(0);
		} finally {
			vi.doUnmock(storeModule);
		}
	});
});
