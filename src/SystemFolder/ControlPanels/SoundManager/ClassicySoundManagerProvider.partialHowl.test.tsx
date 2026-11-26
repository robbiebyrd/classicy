import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicySoundManagerProvider } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerProvider";
import { registerClassicySoundPack } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";

// Story 0225-ci7, review S4: a host's Howler stand-in may lack `unload`. The
// provider unloads its players a tick after it unmounts, from a timer, where
// an exception would be uncaught: it must not throw.

vi.mock("howler", () => ({
	Howl: class {
		play = vi.fn();
		stop = vi.fn();
		volume = vi.fn();
		playing = vi.fn().mockReturnValue(false);
	},
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => {
		const state = () => ({ System: { Manager: { Appearance: {} } } });
		return {
			useAppManager: Object.assign(
				(sel: (s: unknown) => unknown) => sel(state()),
				{ getState: state },
			),
		};
	},
);

registerClassicySoundPack({
	id: "platinum",
	name: "Platinum",
	src: ["platinum.ogg"],
	sprite: { ClassicyBeep: [0, 100] },
});

describe("ClassicySoundManagerProvider with a Howl that cannot unload", () => {
	it("unmounts without throwing", () => {
		vi.useFakeTimers();
		try {
			const { unmount } = render(
				<ClassicySoundManagerProvider>
					<span />
				</ClassicySoundManagerProvider>,
			);
			unmount();
			expect(() =>
				act(() => {
					vi.runAllTimers();
				}),
			).not.toThrow();
		} finally {
			vi.useRealTimers();
		}
	});
});
