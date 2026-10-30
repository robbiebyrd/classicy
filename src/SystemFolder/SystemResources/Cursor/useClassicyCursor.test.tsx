import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyCursorRole,
	registerClassicyCursors,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import "@/Appearance/Platinum/assets/platinumAssets";
import arrowUrl from "@/Appearance/Platinum/assets/art/cursor-arrow.svg";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useClassicyCursor } from "./useClassicyCursor";

describe("useClassicyCursor", () => {
	beforeEach(() => {
		document.body.style.cursor = "";
	});

	afterEach(() => {
		document.body.style.cursor = "";
	});

	it("sets the body cursor from the registry for a role", () => {
		const { result } = renderHook(() => useClassicyCursor());
		result.current("resizeLr");
		expect(document.body.style.cursor).toBe(
			`url(${ClassicyIcons.ui.cursors.resizeLr}), auto`,
		);
	});

	it("the arrow role resolves to the Platinum arrow file", () => {
		// The bundler inlines the small SVG, so the URL carries no file name;
		// compare against the same import instead.
		expect(arrowUrl).toBeTruthy();
		expect(resolveClassicyAsset("cursors", "arrow")).toBe(arrowUrl);
	});

	it("quotes a source an unquoted url() could not hold, such as an SVG data URI", () => {
		const { result } = renderHook(() => useClassicyCursor());
		result.current("arrow");
		expect(document.body.style.cursor).toBe(`url("${arrowUrl}"), auto`);
	});

	it("clears the body cursor with no role", () => {
		const { result } = renderHook(() => useClassicyCursor());
		result.current("watch");
		expect(document.body.style.cursor).not.toBe("");
		result.current();
		expect(document.body.style.cursor).toBe("");
	});

	it("an unregistered role clears instead of writing url(undefined)", () => {
		const { result } = renderHook(() => useClassicyCursor());
		result.current("watch");
		result.current("ibeam");
		expect(document.body.style.cursor).toBe("");
	});

	it("every role SplitView drags with is registered", () => {
		const dragRoles: ClassicyCursorRole[] = [
			"resizeU",
			"resizeD",
			"resizeL",
			"resizeR",
		];
		for (const role of dragRoles) {
			expect(resolveClassicyAsset("cursors", role)).toBeDefined();
		}
	});

	it("a host cursor registered after mount reaches the next setCursor call", () => {
		const original = resolveClassicyAsset("cursors", "watch") as string;
		const { result } = renderHook(() => useClassicyCursor());
		try {
			registerClassicyCursors("platinum", { watch: "host-watch.png" });
			result.current("watch");
			expect(document.body.style.cursor).toBe("url(host-watch.png), auto");
		} finally {
			registerClassicyCursors("platinum", { watch: original });
		}
	});
});
