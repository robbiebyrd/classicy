// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, render, screen } from "@testing-library/react";
import { produce } from "immer";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	sanitizeStateForPersistence,
	startAppManagerPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyStateReconcileResult,
	reconcileClassicyState,
	registerClassicyStateAdapter,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateAdapter";
import { resetClassicyStateSyncForTests } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateSync.internal";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		unload = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

/** Saved state whose Control Strip sits on the right: visible to a child. */
const remoteState = () =>
	JSON.parse(
		JSON.stringify(
			sanitizeStateForPersistence(
				produce(DefaultAppManagerState, (draft) => {
					draft.System.Manager.Desktop.controlStrip = {
						...draft.System.Manager.Desktop.controlStrip,
						visible: true,
						edge: "right",
						bottom: 40,
					} as never;
				}),
			),
		),
	);

let mounts = 0;
/** A host app: shows the saved Control Strip edge, counts its mounts. */
function Probe() {
	const edge = useAppManager(
		(s) => s.System.Manager.Desktop.controlStrip?.edge ?? "left",
	);
	useEffect(() => {
		mounts += 1;
	}, []);
	return <div data-testid="probe">{edge}</div>;
}

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((res) => {
		resolve = res;
	});
	return { promise, resolve };
}

const renderDesktop = () =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop startupScreen={false}>
				<Probe />
			</ClassicyDesktop>
		</ClassicyAppManagerProvider>,
	);

beforeEach(() => {
	vi.useFakeTimers();
	resetClassicyStateSyncForTests();
	localStorage.clear();
	sessionStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
	startAppManagerPersistence();
	mounts = 0;
});

afterEach(() => {
	resetClassicyStateSyncForTests();
	vi.useRealTimers();
});

describe("ClassicyDesktop with a desktop state adapter", () => {
	it("draws at once with no adapter that reconciles", () => {
		registerClassicyStateAdapter({ id: "snapshots", onSnapshot: () => {} });
		const { container } = renderDesktop();
		expect(container.querySelector("#classicyDesktop")).not.toBeNull();
		expect(screen.getByTestId("probe").textContent).toBe("left");
	});

	it("draws only its shell until the boot reconcile settles, then the adopted state", async () => {
		const answer = deferred<ClassicyStateReconcileResult>();
		const reconcile = vi.fn(() => answer.promise);
		registerClassicyStateAdapter({ id: "remote", reconcile });
		const { container } = renderDesktop();
		expect(container.querySelector(".classicyDesktop")).not.toBeNull();
		expect(container.querySelector("#classicyDesktop")).toBeNull();
		expect(screen.queryByTestId("probe")).toBeNull();
		expect(reconcile).toHaveBeenCalledTimes(1);

		await act(async () => {
			answer.resolve({ action: "replace", state: remoteState() });
		});
		expect(container.querySelector("#classicyDesktop")).not.toBeNull();
		expect(screen.getByTestId("probe").textContent).toBe("right");
		expect(mounts).toBe(1);
	});

	it("draws the local state when the reconcile outlasts its timeout", async () => {
		registerClassicyStateAdapter(
			{ id: "hangs", reconcile: () => new Promise<never>(() => {}) },
			{ reconcileTimeoutMs: 3000 },
		);
		const { container } = renderDesktop();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2999);
		});
		expect(container.querySelector("#classicyDesktop")).toBeNull();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
		});
		expect(container.querySelector("#classicyDesktop")).not.toBeNull();
		expect(screen.getByTestId("probe").textContent).toBe("left");
	});

	it("reconciles once a page, however often it mounts", async () => {
		const reconcile = vi.fn(
			async (): Promise<ClassicyStateReconcileResult> => ({
				action: "useLocal",
			}),
		);
		registerClassicyStateAdapter({ id: "remote", reconcile });
		const first = renderDesktop();
		await act(async () => {});
		first.unmount();
		renderDesktop();
		await act(async () => {});
		expect(reconcile).toHaveBeenCalledTimes(1);
		expect(screen.getByTestId("probe")).not.toBeNull();
	});

	it("remounts the desktop when a later reconcile adopts a state, as a restart", async () => {
		let next: ClassicyStateReconcileResult = { action: "useLocal" };
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: async () => next,
		});
		renderDesktop();
		await act(async () => {});
		expect(mounts).toBe(1);

		// Nothing adopted: nothing remounts.
		await act(async () => {
			await reconcileClassicyState();
		});
		expect(mounts).toBe(1);

		// A user signs in: the host reconciles again, and their desktop comes.
		next = { action: "replace", state: remoteState() };
		await act(async () => {
			await expect(reconcileClassicyState()).resolves.toBe(true);
		});
		expect(screen.getByTestId("probe").textContent).toBe("right");
		expect(mounts).toBe(2);
	});
});
