// A host that draws only its own package's themes never writes the
// explicit-edit record (story 0235-xgi, fix round 1): with Platinum alone
// registered, a run of theme edits persists exactly the bytes the build
// before the record persisted. The expected bytes were written by this test
// on that build (commit 1aceac95a) and are kept beside it, as `.txt` so no
// formatter rewrites them.
import "@/__tests__/withPlatinum";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { listClassicyAppearancePackages } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

const EXPECTED = path.join(
	import.meta.dirname,
	"__tests__",
	"platinumOnlyPersistedAppearance.bytes.txt",
);

const run = (): string => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	const edits: Record<string, unknown>[] = [
		{ type: "ClassicyDesktopChangeTheme", activeTheme: "azul" },
		// Platinum's own defaults, set on a built-in: no edit, no fork.
		{
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowControlSize",
			value: 12,
		},
		{
			type: "ClassicyDesktopChangeMetric",
			family: "menuFrame",
			key: "shadowStart",
			value: 1,
		},
		// Real edits: the first forks Azul into Custom.
		{
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowControlSize",
			value: 14,
		},
		{
			type: "ClassicyDesktopChangeMetric",
			family: "menuFrame",
			key: "shadowStart",
			value: 3,
		},
		{
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowScrollbarSize",
			value: 16,
		},
		{
			type: "ClassicyDesktopChangeMetric",
			metricKey: "buttonMinWidth",
			value: 60,
		},
		// Back to Platinum's defaults.
		{
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowControlSize",
			value: 12,
		},
		{
			type: "ClassicyDesktopChangeMetric",
			family: "menuFrame",
			key: "shadowStart",
			value: 1,
		},
		{
			type: "ClassicyDesktopChangeAppearanceOption",
			path: "desktop.iconSize",
			value: 40,
		},
		{
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowUtilityTitleBarHeight",
			value: 13,
		},
		{
			type: "ClassicyDesktopChangeMetric",
			metricKey: "windowUtilityTitleBarHeight",
			value: 10,
		},
	];
	for (const action of edits) dispatch(action as never);
	const appearance = sanitizeStateForPersistence(useAppManager.getState())
		.System.Manager.Appearance;
	return `${JSON.stringify(appearance, null, "\t")}\n`;
};

describe("a Platinum-only host's persisted appearance", () => {
	it("registers Platinum alone", () => {
		expect(listClassicyAppearancePackages().map((p) => p.id)).toEqual([
			"platinum",
		]);
	});

	it("is byte for byte what the build before the explicit-edit record persisted", () => {
		const bytes = run();
		if (process.env.CLASSICY_WRITE_EXPECTED === "1")
			writeFileSync(EXPECTED, bytes);
		expect(bytes).toBe(readFileSync(EXPECTED, "utf8"));
		expect(bytes).not.toContain("measurementPins");
	});
});
