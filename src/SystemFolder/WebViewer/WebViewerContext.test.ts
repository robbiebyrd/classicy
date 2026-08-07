import { describe, expect, it } from "vitest";
import type { ClassicyStore } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	classicyWebViewerEventHandler,
	WebViewerAppInfo,
} from "@/SystemFolder/WebViewer/WebViewerContext";
import type { WebViewerData } from "@/SystemFolder/WebViewer/WebViewerUtils";

// Minimal store: the handler only ever touches Applications.apps.
function makeStore(): ClassicyStore {
	return {
		System: {
			Manager: {
				Applications: { apps: {}, fileTypeHandlers: {} },
			},
		},
	} as unknown as ClassicyStore;
}

const dataOf = (ds: ClassicyStore) =>
	ds.System.Manager.Applications.apps[WebViewerAppInfo.id]
		.data as WebViewerData;

describe("classicyWebViewerEventHandler", () => {
	it("loads the app and opens it on the first URL", () => {
		const ds = classicyWebViewerEventHandler(makeStore(), {
			type: "ClassicyAppWebViewerOpenUrl",
			url: "/press",
			title: "Press Room",
		});
		const app = ds.System.Manager.Applications.apps[WebViewerAppInfo.id];
		expect(app.open).toBe(true);
		expect(dataOf(ds).openUrls).toEqual([
			{ url: "/press", title: "Press Room" },
		]);
	});

	it("falls back to the URL as the title", () => {
		const ds = classicyWebViewerEventHandler(makeStore(), {
			type: "ClassicyAppWebViewerOpenUrl",
			url: "/press",
		});
		expect(dataOf(ds).openUrls).toEqual([{ url: "/press", title: "/press" }]);
	});

	// The URL is the window identity, so re-opening the same shortcut must
	// focus the existing window rather than stack a duplicate.
	it("does not duplicate an already-open URL", () => {
		let ds = classicyWebViewerEventHandler(makeStore(), {
			type: "ClassicyAppWebViewerOpenUrl",
			url: "/press",
			title: "Press Room",
		});
		ds = classicyWebViewerEventHandler(ds, {
			type: "ClassicyAppWebViewerOpenUrl",
			url: "/press",
			title: "Press Room",
		});
		expect(dataOf(ds).openUrls).toHaveLength(1);
	});

	it("closes a URL by identity", () => {
		let ds = classicyWebViewerEventHandler(makeStore(), {
			type: "ClassicyAppWebViewerOpenUrl",
			url: "/press",
			title: "Press Room",
		});
		ds = classicyWebViewerEventHandler(ds, {
			type: "ClassicyAppWebViewerOpenUrl",
			url: "/teachers",
			title: "For Teachers",
		});
		ds = classicyWebViewerEventHandler(ds, {
			type: "ClassicyAppWebViewerCloseUrl",
			url: "/press",
		});
		expect(dataOf(ds).openUrls).toEqual([
			{ url: "/teachers", title: "For Teachers" },
		]);
	});

	// Persisted app data from an older session may be any shape.
	it("repairs malformed persisted data", () => {
		const ds = makeStore();
		ds.System.Manager.Applications.apps[WebViewerAppInfo.id] = {
			id: WebViewerAppInfo.id,
			name: WebViewerAppInfo.name,
			icon: WebViewerAppInfo.icon,
			windows: [],
			open: false,
			data: { openUrls: "not-an-array" },
		};
		const next = classicyWebViewerEventHandler(ds, {
			type: "ClassicyAppWebViewerOpenUrl",
			url: "/press",
		});
		expect(dataOf(next).openUrls).toEqual([{ url: "/press", title: "/press" }]);
	});
});
