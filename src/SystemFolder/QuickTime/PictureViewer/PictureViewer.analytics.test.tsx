import { act, render, waitFor } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

const mockPage = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: mockPage }),
	}),
);

import { QuickTimePictureViewer } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewer";
import "@/SystemFolder/QuickTime/PictureViewer/PictureViewerContext";
import { PictureViewerAppInfo } from "@/SystemFolder/QuickTime/PictureViewer/PictureViewerUtils";

function updateApp(
	mutator: (
		app: ClassicyStore["System"]["Manager"]["Applications"]["apps"][string],
	) => void,
) {
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				const app =
					draft.System.Manager.Applications.apps[PictureViewerAppInfo.id];
				if (app) mutator(app);
			}),
		);
	});
}

const emittedPaths = () => mockPage.mock.calls.map((call) => call[0] as string);

describe("PictureViewer analytics paths", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
		mockPage.mockClear();
	});

	// PictureViewer builds its window id as `${appId}_PictureViewer_${doc.key}`,
	// and doc.key is a consumer-supplied URL for object entries. A RELATIVE url
	// has no filesystem separator, so the path deriver's separator collapse
	// cannot see it — only the app knows that segment is user data.
	it("keeps a relative document URL out of the pageview path", async () => {
		render(<QuickTimePictureViewer />);

		updateApp((app) => {
			app.open = true;
			app.data = {
				openFiles: [{ url: "medical-scan-2026.png", name: "Scan" }],
			};
		});

		await waitFor(() => expect(mockPage).toHaveBeenCalled());

		for (const path of emittedPaths()) {
			expect(path).not.toContain("medical");
			expect(path).not.toContain("scan");
			expect(path).not.toContain("png");
		}
	});

	it("keeps a filesystem document path out of the pageview path", async () => {
		render(<QuickTimePictureViewer />);

		updateApp((app) => {
			app.open = true;
			app.data = { openFiles: ["Macintosh HD:Pictures:private.png"] };
		});

		await waitFor(() => expect(mockPage).toHaveBeenCalled());

		for (const path of emittedPaths()) {
			expect(path).not.toContain("private");
			expect(path).not.toContain("pictures");
		}
	});
});
