import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, render } from "@/__tests__/test-utils";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/**
 * Part attributes name the pieces a theme package restyles — the window's
 * control boxes, an alert's buttons by role, the menu bar's clusters — so a
 * package can target them without depending on Platinum's class names.
 */

const APP = "Parts.app";

const app: ClassicyStoreSystemApp = {
	id: APP,
	name: "Parts",
	icon: "",
	open: true,
	focused: true,
	windows: {},
	data: {},
};

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => () => {} }),
);
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({ useClassicyAnalytics: () => ({ track: () => {}, page: () => {} }) }),
);

function setStore(mutate: (draft: ClassicyStore) => void): void {
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});
}

beforeEach(() => {
	setStore((draft) => {
		draft.System.Manager.Applications.apps[APP] = app;
	});
});

describe("part attributes", () => {
	it("window control boxes carry data-classicy-control", () => {
		const { container } = render(
			<ClassicyWindow
				id="parts"
				appId={APP}
				title="Parts"
				closable
				zoomable
				collapsable
			>
				<p>parts</p>
			</ClassicyWindow>,
		);
		expect(
			container.querySelector(
				'[data-classicy-control="close"] .classicyWindowCloseBox',
			),
		).not.toBeNull();
		expect(
			container.querySelector(
				'[data-classicy-control="zoom"] .classicyWindowZoomBox',
			),
		).not.toBeNull();
		expect(
			container.querySelector(
				'[data-classicy-control="collapse"] .classicyWindowCollapseBox',
			),
		).not.toBeNull();
		expect(container.querySelectorAll("[data-classicy-control]")).toHaveLength(
			3,
		);
	});

	it("alert buttons carry data-classicy-role", () => {
		const { getByRole } = render(
			<ClassicyAlert
				appId={APP}
				label="Parts"
				buttons={[
					{ id: "cancel", label: "Cancel", role: "cancel" },
					{ id: "other", label: "Later", role: "normal" },
					{ id: "ok", label: "OK", role: "default" },
				]}
			/>,
		);
		expect(getByRole("button", { name: "Cancel" })).toHaveAttribute(
			"data-classicy-role",
			"cancel",
		);
		expect(getByRole("button", { name: "Later" })).toHaveAttribute(
			"data-classicy-role",
			"other",
		);
		expect(getByRole("button", { name: "OK" })).toHaveAttribute(
			"data-classicy-role",
			"default",
		);
	});

	it("the alert's help button carries data-classicy-role other", () => {
		const { getByRole } = render(
			<ClassicyAlert
				appId={APP}
				label="Parts"
				buttons={[
					{ id: "help", label: "Help", role: "help" },
					{ id: "ok", label: "OK", role: "default" },
				]}
			/>,
		);
		expect(getByRole("button", { name: "Help" })).toHaveAttribute(
			"data-classicy-role",
			"other",
		);
	});

	it("menu bar clusters carry data-classicy-part", () => {
		const { container } = render(<ClassicyDesktopMenuBar />);
		for (const p of ["apple", "help", "switcher", "extensions", "clock"])
			expect(
				container.querySelector(`[data-classicy-part="${p}"]`),
			).not.toBeNull();
	});

	it("a menu item's part renders only as data-classicy-part, never as a DOM part attribute", () => {
		const { container } = render(
			<ClassicyMenu
				name="parts-menu"
				menuItems={[{ id: "parts_item", title: "Item", part: "custom" }]}
			/>,
		);
		const li = container.querySelector("#parts_item");
		expect(li).toHaveAttribute("data-classicy-part", "custom");
		expect(li).not.toHaveAttribute("part");
	});

	it("each app menu title carries data-classicy-part app", () => {
		setStore((draft) => {
			draft.System.Manager.Applications.apps[APP] = app;
			draft.System.Manager.Desktop.appMenu = [
				{ id: "parts_file", title: "File", menuChildren: [] },
				{ id: "parts_edit", title: "Edit", menuChildren: [] },
			];
		});
		const { container } = render(<ClassicyDesktopMenuBar />);
		const apps = [
			...container.querySelectorAll(
				'.classicyDesktopMenu > li[data-classicy-part="app"], .classicyDesktopMenu > * > li[data-classicy-part="app"]',
			),
		].map((li) => li.id);
		expect(apps).toEqual(["parts_file", "parts_edit"]);
		// Submenu items are not clusters.
		expect(
			container.querySelectorAll('.classicySubMenu [data-classicy-part="app"]'),
		).toHaveLength(0);
	});
});
