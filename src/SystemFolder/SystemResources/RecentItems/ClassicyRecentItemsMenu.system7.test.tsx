// The Apple menu's Recent entries under the System 7 package (story 0226-a6f,
// review M8): the same entries, items and order, with System 7's folder
// icons (its inventory shows both Recent folders as the generic folder).
import "@/__tests__/withPlatinum";
import { SYSTEM7_APPEARANCE_PACKAGE_ID } from "@classicy/appearance-system7";
import { act, cleanup, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }),
	}),
);

afterEach(() => {
	cleanup();
});

const entryImage = (id: string) =>
	document.querySelector<HTMLElement>(`#${id} > p img`)?.getAttribute("src");

describe("Recent Items under System 7", () => {
	it("lists the entries and items with System 7's folder icons", () => {
		useAppManager.setState(
			produce(DefaultAppManagerState, (draft) => {
				draft.System.Manager.Desktop.recentItems = {
					enabled: true,
					counts: { application: 10, document: 10 },
					items: [
						{
							kind: "document",
							path: "Macintosh HD:B.txt",
							name: "B.txt",
							at: 2,
						},
						{
							kind: "document",
							path: "Macintosh HD:A.txt",
							name: "A.txt",
							at: 1,
						},
					],
				};
			}),
			true,
		);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeAppearancePackage",
				packageId: SYSTEM7_APPEARANCE_PACKAGE_ID,
			}),
		);
		render(<ClassicyDesktopMenuBar />);
		expect(useAppManager.getState().System.Manager.Appearance.packageId).toBe(
			SYSTEM7_APPEARANCE_PACKAGE_ID,
		);
		const docs = [
			...document.querySelectorAll<HTMLElement>(
				"#apple-recent-documents > .classicyMenuWrapper > ul > li",
			),
		].map((li) => li.querySelector("p")?.textContent?.trim());
		expect(docs).toEqual(["A.txt", "B.txt"]);
		// System 7's own folder art (its generic folder, drawn at the menu's
		// small size, in the active theme's variant), never Platinum's.
		for (const id of ["apple-recent-documents", "apple-recent-applications"]) {
			expect(entryImage(id), id).toMatch(
				/packages\/appearance\/system7\/.*system-folders-directory\.webp$/,
			);
		}
		expect(document.getElementById("apple-recent-applications")).toHaveClass(
			"disabled",
		);
	});
});
