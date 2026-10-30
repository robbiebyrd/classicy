import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ActionMessage,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { PDFViewer } from "@/SystemFolder/PDFViewer/PDFViewer";
import { PDFViewerAppInfo } from "@/SystemFolder/PDFViewer/PDFViewerUtils";
// Side-effect import: registers classicyPDFViewerEventHandler for
// ClassicyAppPDFViewer* actions, as the package barrel does in the real app.
import "@/SystemFolder/PDFViewer/PDFViewerContext";

// The page renderer needs pdf.js; the close path never touches it.
vi.mock("@/SystemFolder/PDFViewer/PDFViewerDocument", () => ({
	PDFViewerDocument: (): null => null,
}));

// No AnalyticsProvider is mounted; keep the window's no-op fallback quiet.
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

// Every action the component dispatches, recorded on its way into the real
// store: the wrapper calls straight through, so the reducers still run.
const dispatched = vi.hoisted((): ActionMessage[] => []);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => {
		const { recordingAppManagerUtils } = await import(
			"@/__tests__/recordingAppManagerUtils"
		);
		return recordingAppManagerUtils(await importOriginal(), dispatched);
	},
);

// The action types PDF Viewer's own reducer received. The kernel holds the
// handler registerApp was given, so it is wrapped at registration.
const pdfReducerTypes = vi.hoisted((): string[] => []);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest",
	async (importOriginal) => {
		const actual =
			await importOriginal<
				typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest")
			>();
		const registerApp: typeof actual.registerApp = (def) => {
			const handler = def.handler;
			actual.registerApp(
				def.id === "PDFViewer.app" && handler
					? {
							...def,
							handler: (ds, action) => {
								pdfReducerTypes.push(action.type);
								return handler(ds, action);
							},
						}
					: def,
			);
		};
		return { ...actual, registerApp };
	},
);

const apps = () => useAppManager.getState().System.Manager.Applications.apps;

describe("PDFViewer closing a document", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
		dispatched.length = 0;
		pdfReducerTypes.length = 0;
	});

	it("dispatches ClassicyAppPDFViewerCloseFile, which reaches the PDF reducer", async () => {
		const { container } = render(<PDFViewer />);
		await waitFor(() => expect(apps()[PDFViewerAppInfo.id]).toBeDefined());

		const path = "Macintosh HD:Documents:Manual.pdf";
		act(() => {
			useAppManager.setState((state) =>
				produce(state, (draft) => {
					const app =
						draft.System.Manager.Applications.apps[PDFViewerAppInfo.id];
					app.open = true;
					app.data = { openFiles: [path] };
				}),
			);
		});

		const closeBox = await waitFor(() => {
			const box = container.querySelector(".classicyWindowCloseBox");
			expect(box).not.toBeNull();
			return box as Element;
		});
		dispatched.length = 0;
		pdfReducerTypes.length = 0;
		fireEvent.click(closeBox);

		expect(dispatched.filter((a) => a.type.endsWith("CloseFile"))).toEqual([
			{
				type: "ClassicyAppPDFViewerCloseFile",
				app: { id: PDFViewerAppInfo.id },
				path,
			},
		]);
		expect(pdfReducerTypes).toEqual(["ClassicyAppPDFViewerCloseFile"]);
		expect(apps()[PDFViewerAppInfo.id].data?.openFiles).toEqual([]);
	});
});
