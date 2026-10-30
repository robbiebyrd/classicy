import { afterEach, describe, expect, it, vi } from "vitest";

// The test re-imports the whole icon tree and the Platinum assets after
// resetting the module registry (2.4 s alone), so it gets a timeout sized for
// a loaded machine; vitest's 5 s default timed out at load averages above 40
// on 16 cores.
const IMPORT_TIMEOUT_MS = 60_000;

describe("importing the Platinum assets", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it(
		"emits no classicyLog warnings (every bundled icon, art, cursor, wallpaper and font source is valid)",
		async () => {
			vi.resetModules();
			vi.spyOn(console, "warn").mockImplementation(() => {});
			const log = await import(
				"@/SystemFolder/SystemResources/Log/ClassicyLog"
			);
			const levels: string[] = [];
			const messages: string[] = [];
			log.registerClassicyLogSink({
				id: "platinum-import-warnings",
				onLog: (entry) => {
					levels.push(entry.level);
					messages.push(entry.message);
				},
			});
			try {
				await import(
					"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons"
				);
				await import("@/Appearance/Platinum/assets/platinumAssets");
			} finally {
				log.unregisterClassicyLogSink("platinum-import-warnings");
			}
			expect(
				messages.filter(
					(_, i) => levels[i] === "warn" || levels[i] === "error",
				),
			).toEqual([]);
		},
		IMPORT_TIMEOUT_MS,
	);
});
