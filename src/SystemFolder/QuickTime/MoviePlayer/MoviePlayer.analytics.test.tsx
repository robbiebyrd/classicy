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

import { MoviePlayer } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayer";
import "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerContext";
import { MoviePlayerAppInfo } from "@/SystemFolder/QuickTime/MoviePlayer/MoviePlayerUtils";

function updateApp(
	mutator: (
		app: ClassicyStore["System"]["Manager"]["Applications"]["apps"][string],
	) => void,
) {
	act(() => {
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				const app =
					draft.System.Manager.Applications.apps[MoviePlayerAppInfo.id];
				if (app) mutator(app);
			}),
		);
	});
}

const emittedPaths = () => mockPage.mock.calls.map((call) => call[0] as string);

describe("MoviePlayer analytics paths", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
		mockPage.mockClear();
	});

	// MoviePlayer builds its window id as `${appId}_MoviePlayer_${doc.key}`, and
	// doc.key is a consumer-supplied URL for object entries. A RELATIVE url has
	// no filesystem separator, so the path deriver's separator collapse cannot
	// see it — only the app knows that segment is user data.
	it("keeps a relative document URL out of the pageview path", async () => {
		render(<MoviePlayer />);

		updateApp((app) => {
			app.open = true;
			app.data = {
				openFiles: [
					{ url: "quarterly-earnings.mp4", name: "Q3", type: "video" },
				],
			};
		});

		await waitFor(() => expect(mockPage).toHaveBeenCalled());

		for (const path of emittedPaths()) {
			expect(path).not.toContain("quarterly");
			expect(path).not.toContain("earnings");
			expect(path).not.toContain("mp4");
		}
	});

	it("keeps a filesystem document path out of the pageview path", async () => {
		render(<MoviePlayer />);

		updateApp((app) => {
			app.open = true;
			app.data = { openFiles: ["Macintosh HD:Videos:confidential.mp4"] };
		});

		await waitFor(() => expect(mockPage).toHaveBeenCalled());

		for (const path of emittedPaths()) {
			expect(path).not.toContain("confidential");
			expect(path).not.toContain("videos");
		}
	});
});
