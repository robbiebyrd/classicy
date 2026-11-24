// requestClassicyAppQuit and the quit guards (story 0226-a6f; third
// re-review, N2 and N3).
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	registerClassicyAppQuitGuard,
	requestClassicyAppQuit,
} from "@/SystemFolder/SystemResources/App/ClassicyAppQuit";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const isOpen = (id: string) =>
	useAppManager.getState().System.Manager.Applications.apps[id]?.open;

const unregisters: (() => void)[] = [];
const guard = (id: string, g: () => boolean | Promise<boolean>) => {
	const off = registerClassicyAppQuitGuard(id, g);
	unregisters.push(off);
	return off;
};

beforeEach(() => {
	useAppManager.setState(
		produce(DefaultAppManagerState, (draft) => {
			for (const id of ["Stuck.app", "Other.app", "Broken.app"])
				draft.System.Manager.Applications.apps[id] = {
					id,
					name: id,
					icon: "",
					windows: {},
					open: true,
					data: {},
				};
		}),
		true,
	);
});

afterEach(() => {
	for (const off of unregisters.splice(0)) off();
	unregisterClassicyLogSink("quit-test");
});

describe("requestClassicyAppQuit", () => {
	it("quits an app with no guard at once, every time it is asked", async () => {
		await expect(requestClassicyAppQuit("Other.app")).resolves.toBe(true);
		expect(isOpen("Other.app")).toBe(false);
		// Relaunched and asked again: a request that finished is not joined.
		useAppManager.setState(
			produce(useAppManager.getState(), (draft) => {
				draft.System.Manager.Applications.apps["Other.app"].open = true;
			}),
		);
		await expect(requestClassicyAppQuit("Other.app")).resolves.toBe(true);
		expect(isOpen("Other.app")).toBe(false);
	});

	// N2: a guard that throws or rejects is a refusal, logged; the request
	// never rejects, so `void requestClassicyAppQuit(…)` leaves no unhandled
	// rejection.
	it("treats a guard that throws or rejects as a refusal, and logs it", async () => {
		const logged: ClassicyLogEntry[] = [];
		registerClassicyLogSink({ id: "quit-test", onLog: (e) => logged.push(e) });
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		guard("Broken.app", () => {
			throw new Error("boom");
		});
		await expect(requestClassicyAppQuit("Broken.app")).resolves.toBe(false);
		expect(isOpen("Broken.app")).toBe(true);

		guard("Broken.app", () => Promise.reject(new Error("later boom")));
		await expect(requestClassicyAppQuit("Broken.app")).resolves.toBe(false);
		expect(isOpen("Broken.app")).toBe(true);

		const errors = logged.filter(
			(e) => e.level === "error" && e.subsystem === "ClassicyAppQuit",
		);
		expect(errors).toHaveLength(2);
		consoleError.mockRestore();
	});

	// N3: a guard that never settles holds only its own app's requests, and
	// only while it is that app's guard.
	it("never lets a guard that does not settle block other apps, or its own app once replaced", async () => {
		guard("Stuck.app", () => new Promise<boolean>(() => {}));
		const stuck = requestClassicyAppQuit("Stuck.app");
		// A second request for the same app joins the one asking.
		expect(requestClassicyAppQuit("Stuck.app")).toBe(stuck);

		// Another app's request is its own.
		await expect(requestClassicyAppQuit("Other.app")).resolves.toBe(true);
		expect(isOpen("Other.app")).toBe(false);

		// Replacing the guard releases the app: the next request asks the new one.
		const off = guard("Stuck.app", () => true);
		await expect(requestClassicyAppQuit("Stuck.app")).resolves.toBe(true);
		expect(isOpen("Stuck.app")).toBe(false);
		off();
	});

	it("runs afresh once the stuck guard is unregistered", async () => {
		const off = guard("Stuck.app", () => new Promise<boolean>(() => {}));
		void requestClassicyAppQuit("Stuck.app");
		off();
		await expect(requestClassicyAppQuit("Stuck.app")).resolves.toBe(true);
		expect(isOpen("Stuck.app")).toBe(false);
	});
});
