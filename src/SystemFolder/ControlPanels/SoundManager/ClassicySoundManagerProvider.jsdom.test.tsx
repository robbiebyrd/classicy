import "@classicy/appearance-platinum";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { useSound } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { resetClassicySoundUnavailableLogForTests } from "./ClassicySoundAvailability.internal";

// Story 0225-ci7, fix round 3: jsdom has the real Howler here (no mock),
// with Platinum's own pack (ogg and m4a), and Howler's codec table, which
// jsdom's `canPlayType` leaves empty. A desktop drawn in
// it builds no player and says once, at `info`, that sound is unavailable,
// rather than an error-level "Failed to load audio sprite … No codec
// support" for every load.

let entries: ClassicyLogEntry[] = [];

beforeEach(() => {
	entries = [];
	resetClassicySoundUnavailableLogForTests();
	registerClassicyLogSink({
		id: "jsdom-test",
		onLog: (entry) => entries.push(entry),
	});
});

afterEach(() => {
	unregisterClassicyLogSink("jsdom-test");
	vi.useRealTimers();
});

let sound: ReturnType<typeof useSound> | undefined;
const Probe = () => {
	sound = useSound();
	return null;
};

const mount = () =>
	render(
		<ClassicySoundManagerProvider>
			<Probe />
		</ClassicySoundManagerProvider>,
	);

describe("ClassicySoundManagerProvider without usable audio (jsdom)", () => {
	it("builds no player and logs once, at info, never an error", async () => {
		const first = mount();
		const second = mount();
		// Give a Howl's asynchronous load error, were there one, its turn.
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
		expect(sound?.soundPlayer ?? null).toBeNull();
		expect(sound?.packId).toBe("platinum");
		const sounds = entries.filter(
			(e) => e.subsystem === "ClassicySoundManager",
		);
		expect(sounds.filter((e) => e.level === "error")).toEqual([]);
		expect(sounds.map((e) => [e.level, e.message])).toEqual([
			[
				"info",
				"Sound is unavailable here (no audio, or no audio format this browser plays); sounds play nothing",
			],
		]);
		first.unmount();
		second.unmount();
	});
});
