import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { WebViewer } from "@/SystemFolder/WebViewer/WebViewer";
import { WebViewerAppInfo } from "@/SystemFolder/WebViewer/WebViewerUtils";

function openUrl(url: string, title: string) {
	dispatch({ type: "ClassicyAppWebViewerOpenUrl", url, title });
}

function renderViewer() {
	return render(
		<ClassicyAppManagerProvider>
			<WebViewer />
		</ClassicyAppManagerProvider>,
	);
}

// useAppManager is a module-level zustand store created once at import, so it
// survives between tests in this file — setup.ts only swaps localStorage.
// Without this, every test after the first inherits the previous test's open
// windows. DriveSetupController.test.tsx clears its own request the same way.
afterEach(() => {
	const openUrls =
		useAppManager.getState().System.Manager.Applications.apps[
			WebViewerAppInfo.id
		]?.data?.openUrls;
	if (Array.isArray(openUrls)) {
		for (const entry of [...openUrls]) {
			dispatch({ type: "ClassicyAppWebViewerCloseUrl", url: entry.url });
		}
	}
});

describe("WebViewer", () => {
	it("renders a same-origin target with no sandbox attribute", async () => {
		renderViewer();
		openUrl("/press", "Press Room");
		const frame = await screen.findByTitle("Press Room");
		expect(frame).toHaveAttribute("src", "/press");
		// Sandboxing same-origin content is meaningless — the frame can remove
		// the attribute itself — so the attribute must be absent, not empty.
		expect(frame).not.toHaveAttribute("sandbox");
		expect(frame).not.toHaveAttribute("referrerPolicy");
	});

	it("sandboxes a cross-origin target", async () => {
		renderViewer();
		openUrl("https://example.com/docs", "Example");
		const frame = await screen.findByTitle("Example");
		expect(frame).toHaveAttribute("sandbox", "allow-scripts allow-popups");
		expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
	});

	it("renders one window per open URL", async () => {
		renderViewer();
		openUrl("/press", "Press Room");
		openUrl("/teachers", "For Teachers");
		expect(await screen.findByTitle("Press Room")).toBeInTheDocument();
		expect(await screen.findByTitle("For Teachers")).toBeInTheDocument();
	});

	it("renders no frame until a URL is opened", () => {
		const { container } = renderViewer();
		expect(container.querySelector("iframe")).toBeNull();
	});

	it("stops rendering a frame once its URL is closed", async () => {
		renderViewer();
		openUrl("/press", "Press Room");
		expect(await screen.findByTitle("Press Room")).toBeInTheDocument();
		dispatch({ type: "ClassicyAppWebViewerCloseUrl", url: "/press" });
		await waitFor(() =>
			expect(screen.queryByTitle("Press Room")).not.toBeInTheDocument(),
		);
	});

	// The tests above close a URL via a direct dispatch, which proves the
	// reducer works but not that ClassicyWindow's close box is actually wired
	// to onCloseFunc={() => closeUrl(entry.url)}. Drive the real close box
	// instead, the way a user would.
	it("closes the frame when the window's close box is clicked", async () => {
		renderViewer();
		openUrl("/press", "Press Room");
		await screen.findByTitle("Press Room");
		const windowEl = screen.getByRole("application", { name: "Press Room" });
		// biome-ignore lint/style/noNonNullAssertion: closeBox is asserted present below
		const closeBox = windowEl.querySelector(".classicyWindowCloseBox")!;
		expect(closeBox).not.toBeNull();
		fireEvent.click(closeBox);
		await waitFor(() =>
			expect(screen.queryByTitle("Press Room")).not.toBeInTheDocument(),
		);
	});
});
