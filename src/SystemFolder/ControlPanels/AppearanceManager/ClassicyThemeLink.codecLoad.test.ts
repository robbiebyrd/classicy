import { afterEach, describe, expect, it, vi } from "vitest";

// The codec is a lazy chunk in the ES build: a host whose server drops it
// (a stale deploy, a CDN miss) must get a reason, a log entry and a retry,
// never a hung promise or a link read as something else.
const CODEC =
	"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLinkCodec.internal";

afterEach(() => {
	vi.doUnmock(CODEC);
	vi.resetModules();
	vi.restoreAllMocks();
});

describe("theme links when the codec cannot load", () => {
	it("say why, log it, and load it again on the next call", async () => {
		vi.resetModules();
		vi.doMock(CODEC, () => {
			throw new Error("chunk failed to load");
		});
		// Fresh modules: Platinum registers into the registries the link
		// module reads.
		await import("@classicy/appearance-platinum");
		const { getTheme } = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance"
		);
		const { registerClassicyLogSink, unregisterClassicyLogSink } = await import(
			"@/SystemFolder/SystemResources/Log/ClassicyLog"
		);
		const entries: string[] = [];
		registerClassicyLogSink({
			id: "theme-link-codec-test",
			onLog: (entry) => entries.push(`${entry.subsystem}: ${entry.message}`),
		});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const link = await import(
			"@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeLink"
		);
		const unreadable = {
			ok: false,
			error:
				"Classicy could not load the code that reads and writes theme links.",
		};
		expect(await link.readClassicyThemeLink("#classicy-theme=abc")).toEqual(
			unreadable,
		);
		expect(
			await link.createClassicyThemeLink(
				structuredClone(getTheme("azul")),
				"https://host.example/",
			),
		).toEqual(unreadable);
		expect(entries).toContain(
			"ClassicyThemeLink: The theme link codec could not be loaded.",
		);
		unregisterClassicyLogSink("theme-link-codec-test");

		vi.doUnmock(CODEC);
		const made = await link.createClassicyThemeLink(
			structuredClone(getTheme("azul")),
			"https://host.example/",
		);
		expect(made.ok).toBe(true);
	});
});
