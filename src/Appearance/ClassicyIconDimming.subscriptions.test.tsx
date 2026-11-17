import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	classicyDimmedIconListenerCountForTests,
	resetClassicyDimmedIconsForTests,
	useClassicyDimmedIconImage,
} from "@/Appearance/ClassicyIconDimming";

// Review of Batch F-c (r3, Minors): an icon that is not dimmed, which is
// nearly every one, subscribes to no store through the dimming hook.

const assetSubscriptions = vi.hoisted(() => ({ count: 0 }));

vi.mock("@/Appearance/ClassicyAssetRegistry", async (importOriginal) => {
	const original =
		await importOriginal<typeof import("@/Appearance/ClassicyAssetRegistry")>();
	return {
		...original,
		subscribeClassicyAssets: (listener: () => void) => {
			assetSubscriptions.count += 1;
			return original.subscribeClassicyAssets(listener);
		},
	};
});

describe("useClassicyDimmedIconImage subscriptions", () => {
	afterEach(() => {
		resetClassicyDimmedIconsForTests();
		assetSubscriptions.count = 0;
		vi.restoreAllMocks();
	});

	it("makes no subscription for an icon that is not dimmed", () => {
		const { result } = renderHook(() =>
			useClassicyDimmedIconImage("icon.png", false),
		);
		expect(result.current).toEqual({
			image: "icon.png",
			drawsDimmedImage: false,
		});
		expect(assetSubscriptions.count).toBe(0);
	});

	// The settled set is the hook's second subscription: a mounted icon that is
	// not dimmed holds no listener on it.
	it("listens for settled images only while the icon is dimmed", () => {
		const plain = renderHook(() =>
			useClassicyDimmedIconImage("icon.png", false),
		);
		expect(classicyDimmedIconListenerCountForTests()).toBe(0);
		const dimmed = renderHook(() =>
			useClassicyDimmedIconImage("icon.png", true),
		);
		expect(classicyDimmedIconListenerCountForTests()).toBe(1);
		dimmed.unmount();
		expect(classicyDimmedIconListenerCountForTests()).toBe(0);
		plain.unmount();
	});

	it("subscribes while the icon is dimmed", () => {
		renderHook(() => useClassicyDimmedIconImage("icon.png", true));
		expect(assetSubscriptions.count).toBeGreaterThan(0);
	});
});
