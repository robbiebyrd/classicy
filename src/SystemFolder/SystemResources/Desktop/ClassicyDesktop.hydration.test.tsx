// The client side of server rendering (story 0223-a0y): a host hydrates the
// server's HTML, and the desktop, a shell on the server, draws right after,
// with no hydration mismatch. The server render is renderToString's, which
// takes the server snapshot here as on a server; ClassicyDesktop.ssr.test.tsx
// renders it with no DOM at all.
import "@/__tests__/withPlatinum";
import { act } from "@testing-library/react";
import type { ReactNode } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// React's hydration diagnostics (a mismatch it patched, or one it could not:
// "A tree hydrated but some attributes of the server rendered HTML didn't
// match the client properties"), not jsdom's audio, which has no codecs, so
// every Howl logs a load error a little after it mounts.
const HYDRATION = /hydrat|server rendered|didn't match|did not match/i;
const hydrationErrors = (spy: { mock: { calls: unknown[][] } }) =>
	spy.mock.calls
		.map((call) => call.map(String).join(" "))
		.filter((line) => HYDRATION.test(line));

const desktop = (
	<ClassicyAppManagerProvider>
		<ClassicyDesktop startupScreen={false} className="host" />
	</ClassicyAppManagerProvider>
);

describe("ClassicyDesktop hydrating server HTML", () => {
	let root: Root | null = null;
	let container: HTMLElement;
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
		container = document.createElement("div");
		document.body.appendChild(container);
	});
	afterEach(() => {
		act(() => root?.unmount());
		root = null;
		container.remove();
		vi.restoreAllMocks();
	});

	const hydrate = async (html: string, app: ReactNode = desktop) => {
		container.innerHTML = html;
		const errors = vi.spyOn(console, "error");
		const recoverable = vi.fn();
		await act(async () => {
			root = hydrateRoot(container, app, { onRecoverableError: recoverable });
		});
		return { errors, recoverable };
	};

	it("hydrates the server's shell without a mismatch, then draws the desktop", async () => {
		const html = renderToString(desktop);
		expect(html).toBe('<div class="classicyDesktop host"></div>');
		const { errors, recoverable } = await hydrate(html);
		expect(recoverable).not.toHaveBeenCalled();
		expect(hydrationErrors(errors)).toEqual([]);
		const root = container.querySelector("#classicyDesktop");
		expect(root).not.toBeNull();
		expect(root?.getAttribute("data-classicy-appearance")).toBe("platinum");
		expect(root?.classList.contains("host")).toBe(true);
		// The shell is gone: one desktop root.
		expect(container.querySelectorAll(".classicyDesktop")).toHaveLength(1);
	});

	// A returning visitor's saved state is not the server's: the shell reads
	// none of it, so there is nothing to mismatch.
	it("hydrates without a mismatch when the client's state differs from the server's", async () => {
		const html = renderToString(desktop);
		act(() =>
			dispatch({
				type: "ClassicyDesktopChangeMetric",
				metricKey: "windowBorderSize",
				value: 3,
			}),
		);
		const { errors, recoverable } = await hydrate(html);
		expect(recoverable).not.toHaveBeenCalled();
		expect(hydrationErrors(errors)).toEqual([]);
		expect(
			(
				container.querySelector("#classicyDesktop") as HTMLElement
			).style.getPropertyValue("--window-border-size"),
		).toBe("3px");
	});
});
