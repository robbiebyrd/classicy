import { describe, it, expect } from "vitest";
import {
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
