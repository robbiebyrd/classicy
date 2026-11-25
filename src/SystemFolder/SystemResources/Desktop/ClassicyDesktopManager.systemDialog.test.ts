import { afterEach, describe, expect, it } from "vitest";
import "@/__tests__/withPlatinum";
import {
	registerTestTaskbarPackage,
	TEST_TASKBAR_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { sanitizeStateForPersistence } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CLASSICY_RUN_HISTORY_LIMIT,
	CLASSICY_SHUT_DOWN_CHOICES,
	classicyDesktopEventHandler,
	classicyRunHistoryWith,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { SYSTEM_DIALOG_WINDOW_IDS } from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";

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

// Plan 0020-w98 E2: the Windows shell's dialogs, from its Start menu, open
// only under a layout that declares a taskbar; under any other they are
// unknown values and close the dialog, as before.
describe("classicyDesktopEventHandler — the Windows shell's dialogs", () => {
	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_TASKBAR_PACKAGE_ID);
	});

	const shell = (): ClassicyStore => {
		registerTestTaskbarPackage();
		const ds = makeStore();
		ds.System.Manager.Appearance.packageId = TEST_TASKBAR_PACKAGE_ID;
		return ds;
	};

	it("opens Shut Down, Run and Log Off under a taskbar layout", () => {
		const ds = shell();
		for (const dialog of ["shutDown", "run", "logOff"]) {
			classicyDesktopEventHandler(ds, {
				type: "ClassicyDesktopShowSystemDialog",
				dialog,
			});
			expect(ds.System.Manager.Desktop.systemDialog).toBe(dialog);
		}
		expect(SYSTEM_DIALOG_WINDOW_IDS).toMatchObject({
			shutDown: "shut_down",
			run: "run",
			logOff: "log_off",
		});
	});

	it("closes rather than opens them under a layout with no taskbar", () => {
		const ds = makeStore();
		ds.System.Manager.Desktop.systemDialog = "emptyTrash";
		for (const dialog of ["shutDown", "run", "logOff"]) {
			classicyDesktopEventHandler(ds, {
				type: "ClassicyDesktopShowSystemDialog",
				dialog,
			});
			expect(ds.System.Manager.Desktop.systemDialog).toBeNull();
		}
		// The Special menu's alerts open under every layout.
		const taskbar = shell();
		classicyDesktopEventHandler(taskbar, {
			type: "ClassicyDesktopShowSystemDialog",
			dialog: "resetPram",
		});
		expect(taskbar.System.Manager.Desktop.systemDialog).toBe("resetPram");
	});

	it("never persists one", () => {
		const ds = shell();
		ds.System.Manager.Desktop.systemDialog = "shutDown";
		expect(
			sanitizeStateForPersistence(ds).System.Manager.Desktop.systemDialog,
		).toBeNull();
	});
});

describe("classicyDesktopEventHandler — the Run dialog's history and Shut Down's choice", () => {
	it("writes nothing until a command runs or a choice is made", () => {
		expect(makeStore().System.Manager.Desktop.taskbar).toBeUndefined();
	});

	it("keeps each command run, trimmed, most recent first, once without case, 26 at most", () => {
		const ds = makeStore();
		const add = (command: unknown) =>
			classicyDesktopEventHandler(ds, {
				type: "ClassicyDesktopTaskbarAddRunCommand",
				command,
			});
		add(" notepad ");
		add("https://example.com");
		add("NOTEPAD");
		expect(ds.System.Manager.Desktop.taskbar?.runHistory).toEqual([
			"NOTEPAD",
			"https://example.com",
		]);
		add("   ");
		add(42);
		expect(ds.System.Manager.Desktop.taskbar?.runHistory).toHaveLength(2);
		for (let i = 0; i < 30; i++) add(`app${i}`);
		const history = ds.System.Manager.Desktop.taskbar?.runHistory ?? [];
		expect(history).toHaveLength(CLASSICY_RUN_HISTORY_LIMIT);
		expect(CLASSICY_RUN_HISTORY_LIMIT).toBe(26);
		expect(history[0]).toBe("app29");
	});

	it("cleans a stored history that is not a list of strings", () => {
		expect(classicyRunHistoryWith("junk", "a")).toEqual(["a"]);
		expect(classicyRunHistoryWith(["b", 3, "", "a"], "")).toEqual(["b", "a"]);
	});

	it("remembers the Shut Down choice, ignoring an unknown one", () => {
		const ds = makeStore();
		const choose = (choice: unknown) =>
			classicyDesktopEventHandler(ds, {
				type: "ClassicyDesktopTaskbarSetShutDownChoice",
				choice,
			});
		choose("restart");
		expect(ds.System.Manager.Desktop.taskbar?.shutDownChoice).toBe("restart");
		choose("hibernate");
		expect(ds.System.Manager.Desktop.taskbar?.shutDownChoice).toBe("restart");
		expect(CLASSICY_SHUT_DOWN_CHOICES).toEqual([
			"standBy",
			"shutDown",
			"restart",
		]);
	});

	it("persists both, beside Quick Launch", () => {
		const ds = makeStore();
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopTaskbarAddRunCommand",
			command: "notepad",
		});
		classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopTaskbarSetShutDownChoice",
			choice: "standBy",
		});
		expect(
			sanitizeStateForPersistence(ds).System.Manager.Desktop.taskbar,
		).toEqual({ runHistory: ["notepad"], shutDownChoice: "standBy" });
	});
});
