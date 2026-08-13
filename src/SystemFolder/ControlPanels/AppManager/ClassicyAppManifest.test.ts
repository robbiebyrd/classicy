import { describe, expect, it } from "vitest";
import { z } from "zod";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	getAppManifest,
	listAppManifests,
	registerApp,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

const passHandler = (ds: ClassicyStore, _action: ActionMessage) => ds;

describe("registerApp", () => {
	it("stores a manifest retrievable by app id", () => {
		registerApp({
			id: "T1Basic.app",
			description: "Test app one.",
			prefix: "ClassicyAppT1Basic",
			handler: passHandler,
			actions: {
				ClassicyAppT1BasicPing: { description: "Ping the app." },
			},
			state: z.looseObject({
				count: z.number().optional().describe("A counter."),
			}),
		});
		const manifest = getAppManifest("T1Basic.app");
		expect(manifest?.description).toBe("Test app one.");
		expect(manifest?.prefixes).toEqual(["ClassicyAppT1Basic"]);
		expect(manifest?.actions.ClassicyAppT1BasicPing?.description).toBe(
			"Ping the app.",
		);
		expect(listAppManifests().some((m) => m.id === "T1Basic.app")).toBe(true);
	});

	it("returns undefined for an unregistered app", () => {
		expect(getAppManifest("T1Nowhere.app")).toBeUndefined();
	});

	it("merges a second registration for the same id additively", () => {
		registerApp({
			id: "T1Merge.app",
			description: "First description.",
			prefix: "ClassicyAppT1MergeA",
			handler: passHandler,
			actions: { ClassicyAppT1MergeAGo: { description: "Go A." } },
			state: z.looseObject({ a: z.string().optional() }),
		});
		registerApp({
			id: "T1Merge.app",
			description: "Second description (ignored).",
			prefix: "ClassicyAppT1MergeB",
			handler: passHandler,
			actions: {
				ClassicyAppT1MergeAGo: { description: "Overwrite (ignored)." },
				ClassicyAppT1MergeBGo: { description: "Go B." },
			},
		});
		const manifest = getAppManifest("T1Merge.app");
		expect(manifest?.description).toBe("First description.");
		expect(manifest?.prefixes).toEqual([
			"ClassicyAppT1MergeA",
			"ClassicyAppT1MergeB",
		]);
		expect(manifest?.actions.ClassicyAppT1MergeAGo?.description).toBe("Go A.");
		expect(manifest?.actions.ClassicyAppT1MergeBGo?.description).toBe("Go B.");
		expect(manifest?.state).toBeDefined();
	});

	it("registers the prefix handler with the kernel router", async () => {
		const seen: string[] = [];
		registerApp({
			id: "T1Route.app",
			description: "Routing test app.",
			prefix: "ClassicyAppT1Route",
			handler: (ds, action) => {
				seen.push(action.type);
				return ds;
			},
		});
		const { classicyDesktopStateEventReducer, DefaultAppManagerState } =
			await import(
				"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager"
			);
		classicyDesktopStateEventReducer(structuredClone(DefaultAppManagerState), {
			type: "ClassicyAppT1RoutePing",
		});
		expect(seen).toEqual(["ClassicyAppT1RoutePing"]);
	});
});
