// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { produce } from "immer";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	sanitizeStateForPersistence,
	startAppManagerPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyStateReconcileResult,
	reconcileClassicyState,
	registerClassicyStateAdapter,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateAdapter";
import {
	noteClassicyStateUserAction,
	resetClassicyStateSyncForTests,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateSync.internal";
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
/** What each mount of the probe rendered and ran effects with, by mount. */
let seen: string[] = [];
/** A host app: shows the saved Control Strip edge, counts its mounts, and
 * notes the edge each of its renders and effects saw. */
function Probe() {
	const [mount] = useState(() => {
		mounts += 1;
		return mounts;
	});
	const edge = useAppManager(
		(s) => s.System.Manager.Desktop.controlStrip?.edge ?? "left",
	);
	seen.push(`render ${mount}:${edge}`);
	useEffect(() => {
		seen.push(`effect ${mount}:${edge}`);
	}, [mount, edge]);
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
	seen = [];
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
		// The old tree never rendered, nor ran an effect, with the adopted
		// state: it was replaced by the new one in the same step (review I2).
		expect(seen).not.toContain("render 1:right");
		expect(seen).not.toContain("effect 1:right");
		expect(seen).toContain("render 2:right");
	});

	it("sends nothing while an idle desktop's clock ticks for minutes (review I1)", async () => {
		const sent: string[] = [];
		registerClassicyStateAdapter({
			id: "mirror",
			onSnapshot: (snapshot) => {
				sent.push(snapshot.hash);
			},
		});
		renderDesktop();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(2000);
		});
		const settled = sent.length;
		expect(settled).toBeGreaterThan(0);
		const before = useAppManager.getState().System.Manager.DateAndTime.dateTime;
		await act(async () => {
			await vi.advanceTimersByTimeAsync(3 * 60_000 + 1000);
		});
		// The menu bar clock wrote its minute ticks...
		expect(
			useAppManager.getState().System.Manager.DateAndTime.dateTime,
		).not.toBe(before);
		// ...and nothing was sent for them.
		expect(sent).toHaveLength(settled);
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					draft.System.Manager.Desktop.disableBalloonHelp = true;
				}),
			);
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(500);
		});
		expect(sent).toHaveLength(settled + 1);
	});
});

describe("Reset PRAM with a desktop state adapter (reviews M1, M2)", () => {
	const openResetAlert = () =>
		act(() => {
			dispatch({
				type: "ClassicyDesktopShowSystemDialog",
				dialog: "resetPram",
			});
		});

	it("says the synced copy resets on every computer that shares it", () => {
		registerClassicyStateAdapter({ id: "mirror", onSnapshot: () => {} });
		renderDesktop();
		openResetAlert();
		expect(
			screen.getByText(
				/on this computer and on every other computer that shares them/,
			),
		).toBeInTheDocument();
	});

	it("says nothing of other computers without one", () => {
		renderDesktop();
		openResetAlert();
		expect(
			screen.getByText(
				"This clears all saved settings — windows, icons, appearance — and restarts Classicy. Files on your disks are kept. This action cannot be undone.",
			),
		).toBeInTheDocument();
	});

	it("shows the wristwatch while the reset is sent, and restarts once", async () => {
		const reload = vi.fn();
		vi.stubGlobal("location", { ...window.location, reload });
		try {
			registerClassicyStateAdapter({
				id: "slow",
				onSnapshot: () => new Promise<void>(() => {}),
			});
			renderDesktop();
			openResetAlert();
			fireEvent.click(screen.getByText("Reset"));
			expect(document.body.style.cursor).not.toBe("");
			openResetAlert();
			fireEvent.click(screen.getByText("Reset"));
			await act(async () => {
				await vi.advanceTimersByTimeAsync(4999);
			});
			expect(reload).not.toHaveBeenCalled();
			await act(async () => {
				await vi.advanceTimersByTimeAsync(1);
			});
			expect(reload).toHaveBeenCalledTimes(1);
		} finally {
			vi.unstubAllGlobals();
			document.body.style.cursor = "";
		}
	});
});

describe("the choice after a retry found the account's copy (review R1)", () => {
	/** Boot fails, the desktop draws, the user acts, the retry answers. */
	async function bootThenRetry(sent: string[] = []) {
		let calls = 0;
		registerClassicyStateAdapter({
			id: "remote",
			reconcile: async () => {
				calls += 1;
				if (calls === 1) throw new Error("500");
				return { action: "replace", state: remoteState() };
			},
			onSnapshot: (snapshot) => {
				sent.push(
					snapshot.state.System.Manager.Desktop.controlStrip?.edge ?? "left",
				);
			},
		});
		renderDesktop();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});
		noteClassicyStateUserAction();
		return sent;
	}

	const choiceText = "Use the settings saved on your other computers?";

	it("asks, then Use Saved restarts the desktop on the account's copy", async () => {
		await bootThenRetry();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10_000);
		});
		expect(screen.getByText(choiceText)).toBeInTheDocument();
		expect(screen.getByTestId("probe").textContent).toBe("left");
		fireEvent.click(screen.getByText("Use Saved"));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});
		expect(screen.queryByText(choiceText)).toBeNull();
		expect(screen.getByTestId("probe").textContent).toBe("right");
	});

	it("Keep Current keeps this desktop and sends it", async () => {
		const sent = await bootThenRetry();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10_000);
		});
		fireEvent.click(screen.getByText("Keep Current"));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(500);
		});
		expect(screen.queryByText(choiceText)).toBeNull();
		expect(screen.getByTestId("probe").textContent).toBe("left");
		expect(sent).toEqual(["left"]);
	});

	it("waits while another alert is up", async () => {
		await bootThenRetry();
		act(() => {
			dispatch({
				type: "ClassicyDesktopShowSystemDialog",
				dialog: "resetPram",
			});
		});
		await act(async () => {
			await vi.advanceTimersByTimeAsync(10_000);
		});
		expect(
			screen.getByText("Are you sure you want to reset PRAM?"),
		).toBeInTheDocument();
		expect(screen.queryByText(choiceText)).toBeNull();
		fireEvent.click(screen.getByText("Cancel"));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(0);
		});
		expect(screen.getByText(choiceText)).toBeInTheDocument();
	});
});
