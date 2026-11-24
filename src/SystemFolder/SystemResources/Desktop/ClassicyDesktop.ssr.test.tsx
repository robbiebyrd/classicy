// @vitest-environment node
// A server-rendering host (Next.js, Remix, Astro) renders the desktop in Node,
// where there is no DOM (story 0223-a0y). The core registers no package; the
// host's server imports Platinum as its client does.
import "@/__tests__/withPlatinum";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { Classicy } from "@/SystemFolder/SystemResources/Desktop/Classicy";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// What a server has none of. setup.ts installs a localStorage before each
// test; a server has none.
const BROWSER_GLOBALS = ["window", "document", "localStorage", "navigator"];

// The analytics instance starts a queue interval it never clears. Node loads
// the library's own Node build here, which starts none, while the published
// bundles carry its browser build, which does: so the test counts the calls.
const analyticsCalls = vi.hoisted(() => vi.fn());
vi.mock("analytics", async (importOriginal) => {
	const actual = await importOriginal<typeof import("analytics")>();
	const Analytics: typeof actual.default = (...args) => {
		analyticsCalls(...args);
		return actual.default(...args);
	};
	return { ...actual, default: Analytics };
});

describe("ClassicyDesktop under server rendering", () => {
	const logged: unknown[][] = [];
	beforeEach(() => {
		for (const name of BROWSER_GLOBALS) vi.stubGlobal(name, undefined);
		for (const method of ["error", "warn", "log"] as const)
			vi.spyOn(console, method).mockImplementation((...args) => {
				logged.push(args);
			});
		logged.length = 0;
		analyticsCalls.mockClear();
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("has no DOM, as a server has none", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
		expect(typeof localStorage).toBe("undefined");
		expect(typeof navigator).toBe("undefined");
	});

	it("renders the provider and the desktop, with Platinum registered, without throwing", () => {
		let html = "";
		expect(() => {
			html = renderToString(
				<ClassicyAppManagerProvider>
					<ClassicyDesktop />
				</ClassicyAppManagerProvider>,
			);
		}).not.toThrow();
		// A shell: the desktop draws on the client, right after hydration.
		expect(html).toBe('<div class="classicyDesktop"></div>');
	});

	it("passes the host's className and style to the shell", () =>
		expect(
			renderToString(
				<ClassicyAppManagerProvider>
					<ClassicyDesktop className="host" style={{ height: "100vh" }} />
				</ClassicyAppManagerProvider>,
			),
		).toBe('<div class="classicyDesktop host" style="height:100vh"></div>'));

	it("renders the one-tag Classicy root the same way", () =>
		expect(renderToString(<Classicy />)).toBe(
			'<div class="classicyDesktop"></div>',
		));

	// No analytics instance (whose queue interval is never cleared), no sound
	// player, no storage write: nothing outlives the request.
	it("logs nothing and leaves no timer running", () => {
		renderToString(
			<ClassicyAppManagerProvider gaMeasurementIds={["G-TEST"]}>
				<ClassicyDesktop />
			</ClassicyAppManagerProvider>,
		);
		expect(analyticsCalls).not.toHaveBeenCalled();
		expect(vi.getTimerCount()).toBe(0);
		vi.runAllTimers();
		expect(logged).toEqual([]);
	});

	// An Appearance Package registering at import changes the store; with no
	// window, the persistence subscriber schedules no write (whose
	// localStorage.setItem would throw, and log, half a second later).
	it("schedules no storage write when the store changes", () => {
		useAppManager.setState((state) => ({ ...state }));
		expect(vi.getTimerCount()).toBe(0);
		vi.runAllTimers();
		expect(logged).toEqual([]);
	});

	// From Node 25, Node defines localStorage and sessionStorage itself, as
	// accessors that throw (25.2), return an object with no setItem (25.5) or
	// warn (26) when no --localstorage-file is given: even `typeof` reads them.
	// A server render must never touch them.
	it("never reads Node's localStorage or sessionStorage", () => {
		const reads: string[] = [];
		vi.unstubAllGlobals();
		for (const name of ["window", "document"]) vi.stubGlobal(name, undefined);
		for (const name of ["localStorage", "sessionStorage"])
			Object.defineProperty(globalThis, name, {
				configurable: true,
				get() {
					reads.push(name);
					throw new Error(`${name} read on the server`);
				},
			});
		try {
			useAppManager.setState((state) => ({ ...state }));
			renderToString(
				<ClassicyAppManagerProvider>
					<ClassicyDesktop />
				</ClassicyAppManagerProvider>,
			);
			vi.runAllTimers();
		} finally {
			for (const name of ["localStorage", "sessionStorage"])
				Reflect.deleteProperty(globalThis, name);
		}
		expect(reads).toEqual([]);
		expect(logged).toEqual([]);
	});
});
