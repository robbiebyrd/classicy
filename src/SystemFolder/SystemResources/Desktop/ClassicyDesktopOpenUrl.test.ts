import { describe, expect, it } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { WebViewerAppInfo } from "@/SystemFolder/WebViewer/WebViewerUtils";
// Side-effect import: registers the "ClassicyAppWebViewer" plugin handler so
// classicyDesktopEventHandler's dispatchToPlugin call can reach it. In the
// running app this registration happens because WebViewer.tsx imports
// WebViewerContext.tsx (Task 4 mounts it); this test exercises the reducer in
// isolation, so it triggers that same registration directly instead.
import "@/SystemFolder/WebViewer/WebViewerContext";

function makeStore(): ClassicyStore {
	return {
		System: {
			Manager: {
				Desktop: {
					selectedIcons: [],
					icons: [],
					systemMenu: [],
					appMenu: [],
					selectBox: { size: [0, 0], start: [0, 0], active: false },
					disableBalloonHelp: false,
				},
				Applications: { apps: {}, fileTypeHandlers: {} },
			},
		},
	} as unknown as ClassicyStore;
}

const desktopOf = (ds: ClassicyStore) => ds.System.Manager.Desktop;

describe("ClassicyDesktopOpenUrl", () => {
	it("routes the classicy disposition into Web Viewer without a request", () => {
		const ds = classicyDesktopEventHandler(makeStore(), {
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "classicy",
			title: "Press Room",
		});
		const app = ds.System.Manager.Applications.apps[WebViewerAppInfo.id];
		expect(app.open).toBe(true);
		expect(app.data?.openUrls).toEqual([
			{ url: "/press", title: "Press Room" },
		]);
		// A pure store mutation needs no side-effect rail.
		expect(desktopOf(ds).openUrlRequest ?? null).toBeNull();
	});

	it("defaults a missing disposition to the in-desktop viewer", () => {
		const ds = classicyDesktopEventHandler(makeStore(), {
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
		});
		expect(ds.System.Manager.Applications.apps[WebViewerAppInfo.id].open).toBe(
			true,
		);
		expect(desktopOf(ds).openUrlRequest ?? null).toBeNull();
	});

	it.each([
		"browser",
		"browser-new",
	] as const)("queues a request for the %s disposition", (disposition) => {
		const ds = classicyDesktopEventHandler(makeStore(), {
			type: "ClassicyDesktopOpenUrl",
			url: "https://example.com/docs",
			disposition,
		});
		expect(desktopOf(ds).openUrlRequest).toEqual({
			url: "https://example.com/docs",
			disposition,
		});
		expect(desktopOf(ds).openUrlRequestId).toBe(1);
		// The browser dispositions must not also open the in-desktop app.
		expect(
			ds.System.Manager.Applications.apps[WebViewerAppInfo.id],
		).toBeUndefined();
	});

	// The id is what the controller keys on, so a repeated identical request
	// still has to fire.
	it("bumps the request id on every request", () => {
		let ds = classicyDesktopEventHandler(makeStore(), {
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "browser-new",
		});
		ds = classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "browser-new",
		});
		expect(desktopOf(ds).openUrlRequestId).toBe(2);
	});

	it.each([
		"javascript:alert(1)",
		"data:text/html,<script>alert(1)</script>",
		"file:///etc/passwd",
		"not a url",
	])("refuses %s", (url) => {
		const ds = classicyDesktopEventHandler(makeStore(), {
			type: "ClassicyDesktopOpenUrl",
			url,
			disposition: "browser-new",
		});
		expect(desktopOf(ds).errorDialog?.message).toMatch(/cannot be opened/i);
		expect(desktopOf(ds).openUrlRequest ?? null).toBeNull();
	});

	it("ignores an action with no url", () => {
		const ds = classicyDesktopEventHandler(makeStore(), {
			type: "ClassicyDesktopOpenUrl",
		});
		expect(desktopOf(ds).openUrlRequest ?? null).toBeNull();
		expect(desktopOf(ds).errorDialog ?? null).toBeNull();
	});

	it("clears a pending request", () => {
		let ds = classicyDesktopEventHandler(makeStore(), {
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "browser",
		});
		ds = classicyDesktopEventHandler(ds, {
			type: "ClassicyDesktopClearOpenUrlRequest",
		});
		expect(desktopOf(ds).openUrlRequest).toBeNull();
	});
});
