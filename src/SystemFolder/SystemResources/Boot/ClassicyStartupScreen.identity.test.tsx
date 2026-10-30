import { act, render } from "@testing-library/react";
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
import { ClassicyStartupScreen } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreen";
import { resetStartupScreenSession } from "@/SystemFolder/SystemResources/Boot/ClassicyStartupScreenSession";

// The real store; only the sound provider the boot chime needs is mocked.
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

// Importing the Platinum module registered it; keep that object so every
// test can put the real Platinum registration back after a reset.
const platinum = getClassicyAppearancePackage(
	PLATINUM_APPEARANCE_PACKAGE_ID,
) as ClassicyAppearancePackage;

const MOVIE_PLAYER_ICON = "/movie-player.png";

const resetToPlatinum = () => {
	resetClassicyAppearancePackagesForTests();
	registerClassicyAppearancePackage(platinum);
	useAppManager.setState(DefaultAppManagerState, true);
};

const switchPackage = (packageId: string) =>
	act(() =>
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId }),
	);

const paradeImages = (container: HTMLElement) =>
	Array.from(
		container.querySelectorAll(".classicyStartupScreenExtensions img"),
	);

beforeEach(() => {
	sessionStorage.clear();
	resetStartupScreenSession();
	resetToPlatinum();
	registerTestRenamePackage();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	resetToPlatinum();
});

describe("ClassicyStartupScreen parade — a package switch after mount", () => {
	it("follows the switch to the package's name and icon, and back", () => {
		dispatch({
			type: "ClassicyBootParadeIconAdd",
			id: "MoviePlayer.app",
			icon: MOVIE_PLAYER_ICON,
			name: "Movie Player",
			followsAppIcon: true,
		});
		const { container } = render(<ClassicyStartupScreen duration={4000} />);
		act(() => {
			vi.advanceTimersByTime(2100);
		});
		const parade = () => paradeImages(container)[0];
		expect(parade()).toHaveAttribute("title", "Movie Player");
		expect(parade()).toHaveAttribute("src", MOVIE_PLAYER_ICON);

		switchPackage(TEST_RENAME_PACKAGE_ID);

		expect(parade()).toHaveAttribute("title", "Media Player");
		expect(parade()).toHaveAttribute("alt", "Media Player");
		expect(parade()).toHaveAttribute("src", TEST_RENAMED_ICON);

		switchPackage(PLATINUM_APPEARANCE_PACKAGE_ID);

		expect(parade()).toHaveAttribute("title", "Movie Player");
		expect(parade()).toHaveAttribute("src", MOVIE_PLAYER_ICON);
	});
});
