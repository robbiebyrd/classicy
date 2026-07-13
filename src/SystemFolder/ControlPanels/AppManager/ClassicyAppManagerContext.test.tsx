import { render, waitFor } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/** Minimal valid persisted-state shape that passes the store's schema check. */
function makeValidStoredState(): Record<string, unknown> {
	return {
		System: {
			Manager: {
				Applications: { apps: {} },
				Desktop: {
					selectedIcons: [],
					contextMenu: [],
					showContextMenu: false,
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Appearance: { activeTheme: { id: "default" }, availableThemes: [] },
				Sound: { volume: 100, labels: {}, disabled: [] },
				DateAndTime: {
					show: true,
					dateTime: "2020-01-01T00:00:00.000Z",
					timeZoneOffset: "0",
					militaryTime: false,
					displaySeconds: true,
					displayPeriod: true,
					displayDay: true,
					displayLongDay: false,
					flashSeparators: false,
					paused: false,
				},
			},
		},
	};
}

const SEED = {
	System: {
		Manager: {
			DateAndTime: {
				dateTime: "2001-09-11T12:40:00.000Z",
				timeZoneOffset: "-4",
			},
		},
	},
};

describe("ClassicyAppManagerProvider defaultState", () => {
	beforeEach(() => {
		vi.resetModules();
		localStorage.clear();
	});
	afterEach(async () => {
		const mod = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		mod.stopAppManagerPersistence();
		localStorage.clear();
	});

	// Generous timeout: as the first test in the file it pays the one-time
	// dynamic-import cost of the full provider module graph, which can exceed
	// the default 5s under parallel full-suite load.
	it("seeds the store when no persisted state exists", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const utils = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		render(<ctx.ClassicyAppManagerProvider defaultState={SEED} />);
		await waitFor(() => {
			expect(
				utils.useAppManager.getState().System.Manager.DateAndTime.dateTime,
			).toBe("2001-09-11T12:40:00.000Z");
		});
		expect(
			utils.useAppManager.getState().System.Manager.DateAndTime.timeZoneOffset,
		).toBe("-4");
	}, 20000);

	it("does NOT override when valid persisted state exists", async () => {
		localStorage.setItem(
			"classicyDesktopState",
			JSON.stringify(makeValidStoredState()),
		);
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const utils = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		render(<ctx.ClassicyAppManagerProvider defaultState={SEED} />);
		// give any effect a chance to run, then assert persisted value survived
		await new Promise((r) => setTimeout(r, 0));
		expect(
			utils.useAppManager.getState().System.Manager.DateAndTime.dateTime,
		).toBe("2020-01-01T00:00:00.000Z");
	});

	it("is a no-op when defaultState is omitted", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const utils = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		const before =
			utils.useAppManager.getState().System.Manager.DateAndTime.dateTime;
		render(<ctx.ClassicyAppManagerProvider />);
		await new Promise((r) => setTimeout(r, 0));
		expect(
			utils.useAppManager.getState().System.Manager.DateAndTime.dateTime,
		).toBe(before);
	});
});

describe("ClassicyAppManagerProvider defaultFileSystem", () => {
	it("provides mode 'merge' and no override by default", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const fsCtx = await import(
			"@/SystemFolder/SystemResources/File/ClassicyFileSystemContext"
		);
		let captured: { defaultFileSystem?: unknown; mode: string } | undefined;
		function Capture(): null {
			captured = useContext(fsCtx.ClassicyDefaultFileSystemContext);
			return null;
		}
		render(
			<ctx.ClassicyAppManagerProvider>
				<Capture />
			</ctx.ClassicyAppManagerProvider>,
		);
		expect(captured?.defaultFileSystem).toBeUndefined();
		expect(captured?.mode).toBe("merge");
	});

	it("passes defaultFileSystem and defaultFileSystemMode through context", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const fsCtx = await import(
			"@/SystemFolder/SystemResources/File/ClassicyFileSystemContext"
		);
		const tree = {
			"My Drive": { _type: ClassicyFileSystemEntryFileType.Drive },
		};
		let captured: { defaultFileSystem?: unknown; mode: string } | undefined;
		function Capture(): null {
			captured = useContext(fsCtx.ClassicyDefaultFileSystemContext);
			return null;
		}
		render(
			<ctx.ClassicyAppManagerProvider
				defaultFileSystem={tree}
				defaultFileSystemMode="exclusive"
			>
				<Capture />
			</ctx.ClassicyAppManagerProvider>,
		);
		expect(captured?.defaultFileSystem).toEqual(tree);
		expect(captured?.mode).toBe("exclusive");
	});
});

describe("ClassicyAppManagerProvider default apps", () => {
	it("defaults all four disableX props to false", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const appsCtx = await import(
			"@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext"
		);
		let captured: unknown;
		function Capture(): null {
			captured = useContext(appsCtx.ClassicyDefaultAppsContext);
			return null;
		}
		render(
			<ctx.ClassicyAppManagerProvider>
				<Capture />
			</ctx.ClassicyAppManagerProvider>,
		);
		expect(captured).toEqual({
			disableSimpleText: false,
			disablePDFViewer: false,
			disableMoviePlayer: false,
			disablePictureViewer: false,
		});
	});

	it("passes explicit disableX props through context", async () => {
		const ctx = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext"
		);
		const appsCtx = await import(
			"@/SystemFolder/SystemResources/App/ClassicyDefaultAppsContext"
		);
		let captured: unknown;
		function Capture(): null {
			captured = useContext(appsCtx.ClassicyDefaultAppsContext);
			return null;
		}
		render(
			<ctx.ClassicyAppManagerProvider disablePictureViewer disableMoviePlayer>
				<Capture />
			</ctx.ClassicyAppManagerProvider>,
		);
		expect(captured).toEqual({
			disableSimpleText: false,
			disablePDFViewer: false,
			disableMoviePlayer: true,
			disablePictureViewer: true,
		});
	});
});
