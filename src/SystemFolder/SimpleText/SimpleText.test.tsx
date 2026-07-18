import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// Regression test for a dispatch loop introduced in 7687143: ClassicyWindow's
// focused-menu effect dispatched ClassicyWindowSetMenuBar (which writes the
// Applications.apps[appId] slice) on every appMenu *identity* change. SimpleText's
// default "Untitled" window passes an inline appMenu array literal (a new identity
// every render) and SimpleText itself selects `apps["SimpleText.app"]` wholesale via
// useAppManager, so the write-triggered re-render produced a new appMenu identity,
// which re-fired the effect, which dispatched again — an unbounded render loop
// ("Maximum update depth exceeded") the instant the window actually renders (i.e.
// once the app is open; a closed app's window subtree isn't mounted, which is why
// the existing ClassicyDesktop icon-only tests didn't already catch this).
describe("SimpleText", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("opens its default Untitled window without an infinite menuBar dispatch loop", async () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);

		fireEvent.doubleClick(screen.getByAltText("SimpleText"));

		await waitFor(() => {
			expect(screen.getByText("Untitled")).toBeInTheDocument();
		});
	});
});
