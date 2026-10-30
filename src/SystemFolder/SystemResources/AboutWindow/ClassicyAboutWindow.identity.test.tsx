import { act, render, screen } from "@testing-library/react";
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
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAboutWindow } from "@/SystemFolder/SystemResources/AboutWindow/ClassicyAboutWindow";

// The real store; only the providers the box would otherwise need are mocked.
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

// Importing the Platinum module registered it; keep that object so every
// test can put the real Platinum registration back after a reset.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const resetToPlatinum = () => {
	resetClassicyAppearancePackagesForTests();
	registerClassicyAppearancePackage(platinum);
	useAppManager.setState(DefaultAppManagerState, true);
};

const switchPackage = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

beforeEach(() => {
	resetToPlatinum();
	registerTestRenamePackage();
});

afterEach(() => {
	resetToPlatinum();
});

describe("ClassicyAboutWindow — a package switch after mount", () => {
	it("follows the switch to the package's name and icon, and back", () => {
		render(
			<ClassicyAboutWindow
				appId="MoviePlayer.app"
				appName="Movie Player"
				appIcon="x.png"
				hideFunc={() => {}}
			/>,
		);
		expect(
			screen.getByRole("heading", { name: "Movie Player" }),
		).toBeInTheDocument();
		expect(screen.getByAltText("About")).toHaveAttribute("src", "x.png");

		switchPackage(TEST_RENAME_PACKAGE_ID);

		expect(
			screen.getByRole("heading", { name: "Media Player" }),
		).toBeInTheDocument();
		expect(screen.getByAltText("About")).toHaveAttribute(
			"src",
			TEST_RENAMED_ICON,
		);

		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);

		expect(
			screen.getByRole("heading", { name: "Movie Player" }),
		).toBeInTheDocument();
		expect(screen.getByAltText("About")).toHaveAttribute("src", "x.png");
	});
});
