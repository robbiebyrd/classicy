import { act, render, waitFor } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { QuickTimePictureViewer } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewer";
// Side-effect import: registers classicyQuickTimePictureViewerEventHandler
// for ClassicyAppPictureViewer* actions. In the real app this happens via
// the package barrel; PictureViewer.tsx itself never imports its context
// module.
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import { PictureViewerAppInfo } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";

function getOpenFiles(): unknown[] {
	const app =
		useAppManager.getState().System.Manager.Applications.apps[
			PictureViewerAppInfo.id
		];
	const data = app?.data as { openFiles?: unknown[] } | undefined;
	return data?.openFiles ?? [];
}

function updateApp(mutator: (app: ClassicyStore["System"]["Manager"]["Applications"]["apps"][string]) => void) {
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				const app = draft.System.Manager.Applications.apps[PictureViewerAppInfo.id];
				if (app) mutator(app);
			}),
		);
	});
}

describe("PictureViewer — demo auto-load", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("auto-loads the demo picture the first time the app opens with no files already open", async () => {
		render(<QuickTimePictureViewer />);
		expect(getOpenFiles()).toHaveLength(0);
		await waitFor(() =>
			expect(
				useAppManager.getState().System.Manager.Applications.apps[
					PictureViewerAppInfo.id
				],
			).toBeDefined(),
		);

		updateApp((app) => {
			app.open = true;
		});

		await waitFor(() => expect(getOpenFiles()).toHaveLength(1));
	});

	it("does not reload the demo after the user closes all open windows", async () => {
		render(<QuickTimePictureViewer />);

		updateApp((app) => {
			app.open = true;
		});
		await waitFor(() => expect(getOpenFiles()).toHaveLength(1));

		updateApp((app) => {
			app.data = { openFiles: [] };
		});

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(getOpenFiles()).toHaveLength(0);
	});

	it("does not auto-load the demo if files are already open when the app first opens", async () => {
		render(<QuickTimePictureViewer />);

		updateApp((app) => {
			app.open = true;
			app.data = { openFiles: ["Macintosh HD:Photos:existing.jpg"] };
		});

		await new Promise((resolve) => setTimeout(resolve, 50));
		expect(getOpenFiles()).toEqual(["Macintosh HD:Photos:existing.jpg"]);
	});
});
