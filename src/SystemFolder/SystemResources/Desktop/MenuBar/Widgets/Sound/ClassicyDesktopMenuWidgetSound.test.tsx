import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClassicyLogEntry } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSound: () => ({ disabled: [] }),
		useSoundDispatch: () => vi.fn(),
	}),
);
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => vi.fn(),
	}),
);

const SINK_ID = "menu-widget-sound-test";

/**
 * The once-per-page flag is module state, so each test re-imports the widget
 * (and the log module it writes to) from a fresh module registry.
 */
const loadWithSink = async () => {
	const log = await import("@/SystemFolder/SystemResources/Log/ClassicyLog");
	const entries: ClassicyLogEntry[] = [];
	log.registerClassicyLogSink({
		id: SINK_ID,
		onLog: (entry) => entries.push(entry),
	});
	const { ClassicyDesktopMenuWidgetSound } = await import(
		"@/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound"
	);
	const deprecationWarnings = () =>
		entries.filter(
			(e) =>
				e.level === "warn" && e.subsystem === "ClassicyDesktopMenuWidgetSound",
		);
	return { log, ClassicyDesktopMenuWidgetSound, deprecationWarnings };
};

describe("ClassicyDesktopMenuWidgetSound deprecation notice", () => {
	let unregister: (() => void) | undefined;

	beforeEach(() => {
		vi.resetModules();
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});
	afterEach(() => {
		unregister?.();
		unregister = undefined;
		vi.restoreAllMocks();
	});

	it("warns once per page, however many times the widget mounts", async () => {
		const { log, ClassicyDesktopMenuWidgetSound, deprecationWarnings } =
			await loadWithSink();
		unregister = () => log.unregisterClassicyLogSink(SINK_ID);

		const first = render(<ClassicyDesktopMenuWidgetSound />);
		first.unmount();
		render(<ClassicyDesktopMenuWidgetSound />);
		render(<ClassicyDesktopMenuWidgetSound hide />);

		const warnings = deprecationWarnings();
		expect(warnings).toHaveLength(1);
		expect(warnings[0].message).toMatch(/deprecated/);
		expect(warnings[0].message).toMatch(/useClassicySoundControlStripModule/);
		expect(warnings[0].message).toMatch(/controlStrip/);
	});

	it("stays silent in production builds", async () => {
		const original = process.env.NODE_ENV;
		process.env.NODE_ENV = "production";
		try {
			const { log, ClassicyDesktopMenuWidgetSound, deprecationWarnings } =
				await loadWithSink();
			unregister = () => log.unregisterClassicyLogSink(SINK_ID);

			render(<ClassicyDesktopMenuWidgetSound />);

			expect(deprecationWarnings()).toHaveLength(0);
		} finally {
			process.env.NODE_ENV = original;
		}
	});
});
