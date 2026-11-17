import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	classicyDimmedIconSource,
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

	it("does not render again when some other icon's dimmed image settles", async () => {
		let renders = 0;
		renderHook(() => {
			renders += 1;
			return useClassicyDimmedIconImage("icon.png", false);
		});
		const before = renders;
		await act(async () => {
			// No Image in the test document draws: the request settles at once.
			vi.spyOn(globalThis, "Image").mockImplementation(function (
				this: HTMLImageElement,
			) {
				const img = document.createElement("img");
				queueMicrotask(() => img.onerror?.(new Event("error")));
				return img;
			} as unknown as typeof Image);
			await classicyDimmedIconSource("other.png", {
				blend: { color: "#FFFFFF", amount: 0.5 },
			});
		});
		expect(renders).toBe(before);
	});

	it("subscribes while the icon is dimmed", () => {
		renderHook(() => useClassicyDimmedIconImage("icon.png", true));
		expect(assetSubscriptions.count).toBeGreaterThan(0);
	});
});
