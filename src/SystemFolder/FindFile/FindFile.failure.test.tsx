// A search that fails is logged and told (story 0227-815, fix round 1, M9):
// a stop alert, as HIG7 p.196 has it for "an action [that] cannot be
// completed". And the contents criterion is offered with Option, as 8.1's.
import "@/__tests__/withPlatinum";
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type * as SearchModule from "@/SystemFolder/FindFile/ClassicyFindFileSearch";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const failure = vi.hoisted(() => ({ on: false }));
vi.mock(
	"@/SystemFolder/FindFile/ClassicyFindFileSearch",
	async (importOriginal) => {
		const actual = await importOriginal<typeof SearchModule>();
		return {
			...actual,
			searchClassicyFileSystem: (
				...args: Parameters<typeof actual.searchClassicyFileSystem>
			) =>
				failure.on
					? Promise.reject(new Error("tree unreadable"))
					: actual.searchClassicyFileSystem(...args),
		};
	},
);

const logs: ClassicyLogEntry[] = [];

describe("Find File", { timeout: 30_000 }, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		registerClassicyLogSink({ id: "find-failure", onLog: (e) => logs.push(e) });
	});
	afterEach(() => {
		cleanup();
		failure.on = false;
		unregisterClassicyLogSink("find-failure");
		logs.length = 0;
	});

	const open = async () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		act(() => {
			dispatch({ type: "ClassicyAppFindFileShowFind" });
		});
		await screen.findByText("Find items");
	};

	it("tells the user when a search fails, and logs it", async () => {
		failure.on = true;
		await open();
		fireEvent.change(
			document.getElementById("classicy-find-file-row-0-value") as HTMLElement,
			{ target: { value: "plan" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Find" }));
		expect(
			await screen.findByText(
				"The search could not be completed because an unexpected error occurred.",
			),
		).toBeInTheDocument();
		expect(
			logs.some(
				(l) =>
					l.level === "error" &&
					l.subsystem === "ClassicyFindFile" &&
					l.message === "The search failed",
			),
		).toBe(true);
		// The search is over: Find is back.
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		await waitFor(() =>
			expect(screen.getByRole("button", { name: "Find" })).toBeInTheDocument(),
		);
	});

	it("offers contents, name/icon lock and visibility when the criterion pop-up opens with Option", async () => {
		await open();
		const key = document.getElementById(
			"classicy-find-file-row-0-criterion",
		) as HTMLElement;
		const labels = async () =>
			within(await screen.findByRole("listbox"))
				.getAllByRole("option")
				.map((o) => o.textContent);
		fireEvent.mouseDown(key);
		fireEvent.click(key);
		expect(await labels()).not.toContain("contents");
		fireEvent.click(key);
		await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull());
		fireEvent.mouseDown(key, { altKey: true });
		fireEvent.click(key, { altKey: true });
		expect((await labels()).slice(-3)).toEqual([
			"contents",
			"name/icon lock",
			"visibility",
		]);
		fireEvent.click(within(screen.getByRole("listbox")).getByText("contents"));
		expect(
			document.getElementById("classicy-find-file-row-0-operator")?.textContent,
		).toContain("contain");
	});
});
