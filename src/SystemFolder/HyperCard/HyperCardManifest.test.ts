import { describe, expect, it } from "vitest";
import { getAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import "@/SystemFolder/HyperCard/HyperCardContext";
import "@/SystemFolder/HyperCard/Editor/HyperCardEditorContext";

describe("HyperCard merged manifest", () => {
	it("merges both prefixes under HyperCard.app", () => {
		const manifest = getAppManifest("HyperCard.app");
		expect(manifest?.prefixes).toContain("ClassicyAppHyperCard");
		expect(manifest?.prefixes).toContain("ClassicyAppHCEdit");
	});

	it("carries actions from both modules", () => {
		const manifest = getAppManifest("HyperCard.app");
		expect(
			manifest?.actions.ClassicyAppHyperCardOpenStack?.description,
		).toBeTruthy();
		expect(manifest?.actions.ClassicyAppHCEditEnter?.description).toBeTruthy();
	});

	it("validates player and editor state under one schema", () => {
		const manifest = getAppManifest("HyperCard.app");
		expect(
			manifest?.state?.safeParse({
				activeStackId: "s1",
				openStacks: { s1: { anything: true } },
				openFiles: ["/stack.stack"],
				edits: { s1: { tool: "browse" } },
			}).success,
		).toBe(true);
		expect(manifest?.state?.safeParse({ openStacks: "nope" }).success).toBe(
			false,
		);
	});

	it("ClassicyAppHCEditSetScript stays trust-guarded", async () => {
		const { isUntrustedActionAllowed } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyActionTrust"
		);
		expect(isUntrustedActionAllowed("ClassicyAppHCEditSetScript")).toBe(false);
	});
});
