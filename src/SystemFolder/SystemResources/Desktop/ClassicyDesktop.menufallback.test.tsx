import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("ClassicyDesktop menu-bar fallback", () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("restores the desktop menu bar (with Special) when focus lands on Finder with no open windows", () => {
		// Simulate the state left immediately after an app quits: Finder is the
		// focused successor but has no windows, and Desktop.appMenu still holds the
		// dead app's menu. The bar should fall back to the desktop default menu.
		useAppManager.setState((s) => ({
			System: {
				...s.System,
				Manager: {
					...s.System.Manager,
					Desktop: {
						...s.System.Manager.Desktop,
						appMenu: [{ id: "stale_quit_menu", title: "StaleQuitMenu" }],
					},
				},
			},
		}));

		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);

		expect(screen.getByText("Special")).toBeInTheDocument();
		expect(screen.queryByText("StaleQuitMenu")).not.toBeInTheDocument();
	});
});
