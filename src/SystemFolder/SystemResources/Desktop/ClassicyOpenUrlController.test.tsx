import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyOpenUrlController } from "@/SystemFolder/SystemResources/Desktop/ClassicyOpenUrlController";

let openSpy: ReturnType<typeof vi.fn>;
let assignSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
	openSpy = vi.fn();
	assignSpy = vi.fn();
	vi.stubGlobal("open", openSpy);
	// jsdom's location.assign is not implemented and warns; replace the whole
	// accessor so the controller's call is observable.
	Object.defineProperty(window, "location", {
		configurable: true,
		value: { ...window.location, assign: assignSpy },
	});
});

afterEach(() => {
	dispatch({ type: "ClassicyDesktopClearOpenUrlRequest" });
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("ClassicyOpenUrlController", () => {
	it("opens a new tab with noopener for browser-new", async () => {
		render(<ClassicyOpenUrlController />);
		dispatch({
			type: "ClassicyDesktopOpenUrl",
			url: "https://example.com/docs",
			disposition: "browser-new",
		});
		await waitFor(() =>
			expect(openSpy).toHaveBeenCalledWith(
				"https://example.com/docs",
				"_blank",
				"noopener,noreferrer",
			),
		);
	});

	it("navigates the current page for browser", async () => {
		render(<ClassicyOpenUrlController />);
		dispatch({
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "browser",
		});
		await waitFor(() => expect(assignSpy).toHaveBeenCalledWith("/press"));
		expect(openSpy).not.toHaveBeenCalled();
	});

	it("clears the request after consuming it", async () => {
		render(<ClassicyOpenUrlController />);
		dispatch({
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "browser-new",
		});
		await waitFor(() =>
			expect(
				useAppManager.getState().System.Manager.Desktop.openUrlRequest,
			).toBeNull(),
		);
	});

	// The monotonic id, not the payload, is what re-triggers the effect.
	it("fires again for a repeated identical request", async () => {
		render(<ClassicyOpenUrlController />);
		dispatch({
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "browser-new",
		});
		await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(1));
		dispatch({
			type: "ClassicyDesktopOpenUrl",
			url: "/press",
			disposition: "browser-new",
		});
		await waitFor(() => expect(openSpy).toHaveBeenCalledTimes(2));
	});

	it("does nothing on mount with no pending request", async () => {
		render(<ClassicyOpenUrlController />);
		await waitFor(() => expect(openSpy).not.toHaveBeenCalled());
		expect(assignSpy).not.toHaveBeenCalled();
	});
});
