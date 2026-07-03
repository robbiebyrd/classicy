import { describe, expect, it } from "vitest";
import {
	closeAllWindowsMenuItemHelper,
	closeWindowMenuItemHelper,
	quitAppHelper,
	quitMenuItemHelper,
} from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";

describe("quitAppHelper", () => {
	it("returns the ClassicyAppClose event type", () => {
		const result = quitAppHelper("my-app", "My App", "icon.png");
		expect(result.type).toBe("ClassicyAppClose");
	});

	it("carries the app id in the payload", () => {
		const result = quitAppHelper("my-app", "My App", "icon.png");
		expect(result.app.id).toBe("my-app");
	});

	it("carries the app title in the payload", () => {
		const result = quitAppHelper("my-app", "My App", "icon.png");
		expect(result.app.title).toBe("My App");
	});

	it("carries the app icon in the payload", () => {
		const result = quitAppHelper("my-app", "My App", "icon.png");
		expect(result.app.icon).toBe("icon.png");
	});

	it("produces different payloads for different inputs", () => {
		const a = quitAppHelper("app-a", "App A", "a.png");
		const b = quitAppHelper("app-b", "App B", "b.png");
		expect(a.app.id).not.toBe(b.app.id);
		expect(a.app.title).not.toBe(b.app.title);
		expect(a.app.icon).not.toBe(b.app.icon);
	});
});

describe("quitMenuItemHelper", () => {
	it("builds the menu item id as appId + '_quit'", () => {
		const result = quitMenuItemHelper("my-app", "My App", "icon.png");
		expect(result.id).toBe("my-app_quit");
	});

	it("sets the title to 'Quit'", () => {
		const result = quitMenuItemHelper("my-app", "My App", "icon.png");
		expect(result.title).toBe("Quit");
	});

	it("sets the event to 'ClassicyAppClose'", () => {
		const result = quitMenuItemHelper("my-app", "My App", "icon.png");
		expect(result.event).toBe("ClassicyAppClose");
	});

	it("includes the app id in eventData", () => {
		const result = quitMenuItemHelper("my-app", "My App", "icon.png");
		expect(result.eventData.app.id).toBe("my-app");
	});

	it("includes the app title in eventData", () => {
		const result = quitMenuItemHelper("my-app", "My App", "icon.png");
		expect(result.eventData.app.title).toBe("My App");
	});

	it("includes the app icon in eventData", () => {
		const result = quitMenuItemHelper("my-app", "My App", "icon.png");
		expect(result.eventData.app.icon).toBe("icon.png");
	});
});

describe("closeWindowMenuItemHelper", () => {
	it("uses the given id", () => {
		const onClickFunc = () => {};
		const result = closeWindowMenuItemHelper("my-app_win-1_close", onClickFunc);
		expect(result.id).toBe("my-app_win-1_close");
	});

	it("sets the title to 'Close Window'", () => {
		const result = closeWindowMenuItemHelper("id", () => {});
		expect(result.title).toBe("Close Window");
	});

	it("wires onClickFunc to the given callback", () => {
		let called = false;
		const result = closeWindowMenuItemHelper("id", () => {
			called = true;
		});
		result.onClickFunc?.();
		expect(called).toBe(true);
	});
});

describe("closeAllWindowsMenuItemHelper", () => {
	it("uses the given id", () => {
		const result = closeAllWindowsMenuItemHelper("my-app_close_all", () => {});
		expect(result.id).toBe("my-app_close_all");
	});

	it("sets the title to 'Close All Windows'", () => {
		const result = closeAllWindowsMenuItemHelper("id", () => {});
		expect(result.title).toBe("Close All Windows");
	});

	it("wires onClickFunc to the given callback", () => {
		let called = false;
		const result = closeAllWindowsMenuItemHelper("id", () => {
			called = true;
		});
		result.onClickFunc?.();
		expect(called).toBe(true);
	});
});
