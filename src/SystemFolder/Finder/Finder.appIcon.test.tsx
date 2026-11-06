import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

// K-R1: Finder's record icon is the one the App Switcher draws. The store's
// default Finder record seeds the Finder face (`system.macos`), and since
// K 2.2 `loadApp` refreshes the record from the `icon` Finder passes, so the
// two must agree. The About box, by contrast, has always drawn the compact
// Mac (`system.mac`).

// The window shell is stubbed to its children, so the About box's <img>
// reaches the DOM and each window's appMenu is observable.
const capturedMenuByWindow: Record<string, ClassicyMenuItem[] | undefined> = {};

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({
		id,
		appMenu,
		children,
	}: {
		id: string;
		appMenu?: ClassicyMenuItem[];
		children?: ReactNode;
	}) => {
		capturedMenuByWindow[id] = appMenu;
		return <div data-testid={`classicy-window-${id}`}>{children}</div>;
	},
}));

vi.mock("@/SystemFolder/SystemResources/File/ClassicyFileBrowser", () => ({
	ClassicyFileBrowser: ({ path }: { path: string }) => (
		<div data-testid={`classicy-file-browser-${path}`} />
	),
}));

import { Finder } from "./Finder";

const DOCUMENTS_PATH = "Macintosh HD:Documents";

afterEach(() => {
	cleanup();
	for (const key of Object.keys(capturedMenuByWindow)) {
		delete capturedMenuByWindow[key];
	}
	dispatch({ type: "ClassicyAppFinderCloseFolder", path: DOCUMENTS_PATH });
});

describe("Finder's app icon (K-R1)", () => {
	it("keeps the record's icon equal to the default record's Finder face after <Finder/> mounts", async () => {
		const finderFace = resolveClassicyAsset("icons", "system.macos");
		// The pin only means something while the two icons differ.
		expect(finderFace).toBeTruthy();
		expect(finderFace).not.toBe(resolveClassicyAsset("icons", "system.mac"));

		render(<Finder />);

		await waitFor(() => {
			expect(
				useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
					?.icon,
			).toBe(finderFace);
		});
	});

	it("draws the compact Mac in Finder's About box", async () => {
		dispatch({ type: "ClassicyAppFinderOpenFolder", path: DOCUMENTS_PATH });
		render(<Finder />);
		await waitFor(() => {
			expect(capturedMenuByWindow[DOCUMENTS_PATH]).toBeDefined();
		});

		const about = capturedMenuByWindow[DOCUMENTS_PATH]
			?.find((m) => m.title === "Help")
			?.menuChildren?.find((m) => m.title === "About");
		expect(about).toBeDefined();
		act(() => {
			about?.onClickFunc?.();
		});

		expect(screen.getByAltText("About").getAttribute("src")).toBe(
			resolveClassicyAsset("icons", "system.mac"),
		);
	});
});
