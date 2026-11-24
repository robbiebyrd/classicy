// @vitest-environment node
// A server-rendering host registers its desktop state adapter at its entry,
// which its server runs too (story 0223-a0y): there, nothing is reconciled,
// sent or read from storage.
import "@/__tests__/withPlatinum";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	flushClassicyState,
	reconcileClassicyState,
	registerClassicyStateAdapter,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateAdapter";
import {
	resetClassicyPersistedState,
	resetClassicyStateSyncForTests,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateSync.internal";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

describe("desktop state adapters on a server", () => {
	const reads: string[] = [];
	const logged: unknown[][] = [];
	beforeEach(() => {
		resetClassicyStateSyncForTests();
		reads.length = 0;
		logged.length = 0;
		for (const name of ["window", "document", "navigator"])
			vi.stubGlobal(name, undefined);
		// Node 25's own storage accessors throw, or warn, on any read, `typeof`
		// included (0223-a0y): a server must never touch them.
		for (const name of ["localStorage", "sessionStorage"])
			Object.defineProperty(globalThis, name, {
				configurable: true,
				get() {
					reads.push(name);
					throw new Error(`${name} read on the server`);
				},
			});
		for (const method of ["error", "warn", "log", "info"] as const)
			vi.spyOn(console, method).mockImplementation((...args) => {
				logged.push(args);
			});
		vi.useFakeTimers();
	});
	afterEach(() => {
		for (const name of ["localStorage", "sessionStorage"])
			Reflect.deleteProperty(globalThis, name);
		resetClassicyStateSyncForTests();
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("reconciles nothing, sends nothing, reads no storage and leaves no timer", async () => {
		const onSnapshot = vi.fn();
		const reconcile = vi.fn(async () => ({ action: "useLocal" }) as const);
		registerClassicyStateAdapter({ id: "server", onSnapshot, reconcile });
		useAppManager.setState((state) => ({ ...state }));
		expect(vi.getTimerCount()).toBe(0);
		const html = renderToString(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(html).toBe('<div class="classicyDesktop"></div>');
		await expect(reconcileClassicyState()).resolves.toBe(false);
		await expect(flushClassicyState()).resolves.toBe(true);
		const restart = vi.fn();
		resetClassicyPersistedState(restart);
		expect(restart).toHaveBeenCalledTimes(1);
		vi.runAllTimers();
		expect(reconcile).not.toHaveBeenCalled();
		expect(onSnapshot).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
		expect(reads).toEqual([]);
		expect(logged).toEqual([]);
	});
});
