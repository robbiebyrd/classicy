import { describe, expect, it } from "vitest";
import { z } from "zod";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { evaluateScriptEffect } from "@/SystemFolder/HyperCard/HyperCardScriptEffects";

describe("evaluateScriptEffect", () => {
	it("drops a non-allowlisted action type", () => {
		expect(evaluateScriptEffect("ClassicyAppT5Unknown", {})).toEqual({
			kind: "drop",
			reason: "not-allowlisted",
		});
	});

	it("dispatches the default allowlist entry with no manifest (parity with today)", () => {
		expect(evaluateScriptEffect("ClassicyAppOpen", {})).toEqual({
			kind: "dispatch",
		});
	});

	it("validates args against the manifest param schema before the trust gate", () => {
		registerApp({
			id: "T5Score.app",
			description: "Script-effect test app.",
			actions: {
				ClassicyAppT5ScoreSet: {
					description: "Set the score.",
					params: z.object({ score: z.number().describe("New score.") }),
					scriptable: true,
				},
			},
		});
		expect(evaluateScriptEffect("ClassicyAppT5ScoreSet", { score: 7 })).toEqual(
			{ kind: "dispatch" },
		);
		const bad = evaluateScriptEffect("ClassicyAppT5ScoreSet", {
			score: "seven",
		});
		expect(bad.kind).toBe("drop");
		if (bad.kind === "drop") {
			expect(bad.reason).toBe("invalid-params");
			expect(bad.issues?.length).toBeGreaterThan(0);
		}
	});

	it("a scriptable action without params dispatches on allowlist alone", () => {
		registerApp({
			id: "T5NoParams.app",
			description: "No-params test app.",
			actions: {
				ClassicyAppT5NoParamsGo: {
					description: "Go.",
					scriptable: true,
				},
			},
		});
		expect(
			evaluateScriptEffect("ClassicyAppT5NoParamsGo", { anything: true }),
		).toEqual({ kind: "dispatch" });
	});
});
