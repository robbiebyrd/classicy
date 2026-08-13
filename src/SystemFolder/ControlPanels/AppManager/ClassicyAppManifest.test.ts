import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	isUntrustedActionAllowed,
	isUntrustedActionAllowlisted,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust";
import type {
	ActionMessage,
	ClassicyStore,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	describeAppAction,
	describeAppState,
	getAppManifest,
	getScriptableAction,
	listAppManifests,
	listScriptableActions,
	parseAppData,
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

describe("scriptable actions", () => {
	it("scriptable: true reaches the untrusted allowlist", () => {
		registerApp({
			id: "T2Script.app",
			description: "Scriptable test app.",
			actions: {
				ClassicyAppT2ScriptWave: {
					description: "Wave hello.",
					params: z.object({ times: z.number().describe("Wave count.") }),
					scriptable: true,
				},
				ClassicyAppT2ScriptHidden: { description: "Not scriptable." },
			},
		});
		expect(isUntrustedActionAllowed("ClassicyAppT2ScriptWave")).toBe(true);
		expect(isUntrustedActionAllowed("ClassicyAppT2ScriptHidden")).toBe(false);
	});

	it("lists and indexes scriptable actions across apps", () => {
		const wave = getScriptableAction("ClassicyAppT2ScriptWave");
		expect(wave?.appId).toBe("T2Script.app");
		expect(wave?.description).toBe("Wave hello.");
		expect(wave?.params).toBeDefined();
		expect(getScriptableAction("ClassicyAppT2ScriptHidden")).toBeUndefined();
		expect(
			listScriptableActions().some((a) => a.type === "ClassicyAppT2ScriptWave"),
		).toBe(true);
	});

	it("a scriptable guarded route is allowlisted but stays inert (kernel floor wins)", () => {
		registerApp({
			id: "T2Guarded.app",
			description: "Tries to script a guarded route.",
			actions: {
				ClassicyDesktopSetTheme: {
					description: "Should never be script-reachable.",
					scriptable: true,
				},
			},
		});
		expect(isUntrustedActionAllowlisted("ClassicyDesktopSetTheme")).toBe(true);
		expect(isUntrustedActionAllowed("ClassicyDesktopSetTheme")).toBe(false);
	});

	it("index invalidates when a later registration adds actions", () => {
		listScriptableActions(); // force index build
		registerApp({
			id: "T2Late.app",
			description: "Late registration.",
			actions: {
				ClassicyAppT2LateGo: { description: "Late action.", scriptable: true },
			},
		});
		expect(getScriptableAction("ClassicyAppT2LateGo")?.appId).toBe(
			"T2Late.app",
		);
	});
});

describe("manifest metadata walkers", () => {
	const stateSchema = z.looseObject({
		openPaths: z
			.array(z.string())
			.optional()
			.describe("Folder paths with an open window."),
		prefs: z
			.looseObject({
				sortBy: z.string().optional().describe("Active sort column."),
			})
			.optional()
			.describe("Per-user view preferences."),
		undescribed: z.number().optional(),
	});

	it("registers the walker fixture app", () => {
		registerApp({
			id: "T3Walk.app",
			description: "Walker test app.",
			actions: {
				ClassicyAppT3WalkGo: { description: "Go somewhere." },
			},
			state: stateSchema,
		});
		expect(getAppManifest("T3Walk.app")).toBeDefined();
	});

	it("describeAppAction returns balloon-ready title/content", () => {
		expect(describeAppAction("T3Walk.app", "ClassicyAppT3WalkGo")).toEqual({
			title: "ClassicyAppT3WalkGo",
			content: "Go somewhere.",
		});
		expect(
			describeAppAction("T3Walk.app", "ClassicyAppT3WalkNope"),
		).toBeUndefined();
		expect(
			describeAppAction("T3None.app", "ClassicyAppT3WalkGo"),
		).toBeUndefined();
	});

	it("describeAppState resolves top-level and nested dot paths", () => {
		expect(describeAppState("T3Walk.app", "openPaths")).toEqual({
			title: "openPaths",
			content: "Folder paths with an open window.",
		});
		expect(describeAppState("T3Walk.app", "prefs.sortBy")).toEqual({
			title: "sortBy",
			content: "Active sort column.",
		});
	});

	it("describeAppState returns undefined for unknowns and undescribed fields", () => {
		expect(describeAppState("T3Walk.app", "nope")).toBeUndefined();
		expect(describeAppState("T3Walk.app", "prefs.nope")).toBeUndefined();
		expect(describeAppState("T3Walk.app", "undescribed")).toBeUndefined();
		expect(describeAppState("T3None.app", "openPaths")).toBeUndefined();
	});

	it("parseAppData validates, passes unknown keys through, and rejects malformed data", () => {
		type T3Data = { openPaths?: string[] };
		const good = parseAppData<T3Data & { extra?: string }>("T3Walk.app", {
			openPaths: ["/a"],
			extra: "kernel-written",
		});
		expect(good?.openPaths).toEqual(["/a"]);
		expect(good?.extra).toBe("kernel-written");
		expect(
			parseAppData<T3Data>("T3Walk.app", { openPaths: "not-an-array" }),
		).toBeUndefined();
		expect(parseAppData<T3Data>("T3None.app", {})).toBeUndefined();
		expect(parseAppData<T3Data>("T3Walk.app", undefined)).toEqual({});
	});
});
