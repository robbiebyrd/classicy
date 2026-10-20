import { describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";

const makeStore = (): ClassicyStore => structuredClone(DefaultAppManagerState);

describe("classicyDesktopEventHandler — ClassicyDesktopShowSystemDialog", () => {
	it("opens the Empty Trash and Reset PRAM alerts, and closes them", () => {
		const ds = makeStore();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopShowSystemDialog",
			dialog: "emptyTrash",
		});
		expect(ds.System.Manager.Desktop.systemDialog).toBe("emptyTrash");
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopShowSystemDialog",
			dialog: "resetPram",
		});
		expect(ds.System.Manager.Desktop.systemDialog).toBe("resetPram");
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopShowSystemDialog",
			dialog: null,
		});
		expect(ds.System.Manager.Desktop.systemDialog).toBeNull();
	});

	it("closes rather than opening an unknown dialog", () => {
		const ds = makeStore();
		ds.System.Manager.Desktop.systemDialog = "emptyTrash";
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopShowSystemDialog",
			dialog: "formatDisk",
		});
		expect(ds.System.Manager.Desktop.systemDialog).toBeNull();
	});

	it("is never persisted", () => {
		const ds = makeStore();
		ds.System.Manager.Desktop.systemDialog = "resetPram";
		expect(
			sanitizeStateForPersistence(ds).System.Manager.Desktop.systemDialog,
		).toBeNull();
	});
});
