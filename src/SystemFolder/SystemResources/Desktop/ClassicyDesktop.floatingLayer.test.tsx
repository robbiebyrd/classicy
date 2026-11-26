import "@/__tests__/withPlatinum";
import { render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ABOUT_BALLOON_HELP_TOPIC_ID } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// The desktop owns the one floating layer (story 0233-c79, m22): a reload with
// a help topic open must put its window in that layer at the first render,
// once, with the window's observers on the live node.
describe("ClassicyDesktop's floating layer", () => {
	const live = new Set<Element>();
	const realRO = globalThis.ResizeObserver;
	beforeEach(() => {
		live.clear();
		globalThis.ResizeObserver = class {
			private targets = new Set<Element>();
			observe(el: Element) {
				this.targets.add(el);
				live.add(el);
			}
			unobserve(el: Element) {
				this.targets.delete(el);
				live.delete(el);
			}
			disconnect() {
				for (const el of this.targets) live.delete(el);
				this.targets.clear();
			}
		} as unknown as typeof ResizeObserver;
	});
	afterEach(() => {
		globalThis.ResizeObserver = realRO;
		useAppManager.setState(DefaultAppManagerState, true);
		document.getElementById("classicy-floating-layer")?.remove();
	});

	it("holds a topic that is open at the first render: one layer, inside the desktop, the window in it once, observed live", () => {
		useAppManager.setState(
			produce(DefaultAppManagerState, (draft) => {
				draft.System.Manager.Applications.apps["AppleGuide.app"] = {
					id: "AppleGuide.app",
					name: "Apple Guide",
					icon: "",
					extension: true,
					open: true,
					windows: {},
					data: { openTopics: [ABOUT_BALLOON_HELP_TOPIC_ID] },
				} as ClassicyStoreSystemApp;
			}),
			true,
		);
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop controlStrip={false} />
			</ClassicyAppManagerProvider>,
		);
		const layers = document.querySelectorAll("#classicy-floating-layer");
		expect(layers).toHaveLength(1);
		const layer = layers[0];
		expect(layer.parentElement?.id).toBe("classicyDesktop");
		expect(
			document.body.querySelector(":scope > #classicy-floating-layer"),
		).toBeNull();
		const windows = document.querySelectorAll(".appleGuideWindowFrame");
		expect(windows).toHaveLength(1);
		expect(windows[0].parentElement).toBe(layer);
		// Observers sit on the live node, none on a discarded one.
		expect(live.has(windows[0])).toBe(true);
		for (const el of live) expect(el.isConnected).toBe(true);
	});
});
