import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dispatch = vi.fn();
const player = vi.fn();
let mockState: Record<string, unknown> = {};

// Spread the real module and override only the two hooks the test drives
// (dispatch double + state control) — any other export (e.g.
// wasHydratedFromStorage) a rendered subcomponent starts calling later still
// gets a working real implementation instead of "X is not a function".
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils")
		>()),
		useAppManagerDispatch: () => dispatch,
		useAppManager: Object.assign(
			(sel: (s: unknown) => unknown): unknown => sel(mockState),
			{ getState: (): unknown => mockState },
		),
	}),
);
vi.mock("@/SystemFolder/SystemResources/App/ClassicyApp", () => ({
	ClassicyApp: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
}));
// Spread here too — the real module's only import-time side effect is
// constructing a `Howl` for `initialPlayer`, which loads async and fails
// silently (onloaderror just console.errors) under jsdom, so it's safe.
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	async (importOriginal) => ({
		...(await importOriginal<
			typeof import("@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext")
		>()),
		useSoundDispatch: () => player,
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/File/ClassicyFileSystemContext",
	() => ({
		useClassicyFileSystem: () => ({ resolve: (): undefined => undefined }),
	}),
);
vi.mock(
	"@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog",
	() => ({ ClassicyFileOpenDialog: (): null => null }),
);
vi.mock(
	"@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog",
	() => ({ ClassicyFileSaveDialog: (): null => null }),
);

import { HyperCard } from "@/SystemFolder/HyperCard/HyperCard";

afterEach(cleanup);
beforeEach(() => {
	dispatch.mockClear();
	player.mockClear();
});

function stateWithEffects(pendingEffects: unknown[]) {
	return {
		System: {
			Manager: {
				Desktop: { appMenu: [] as unknown[] },
				Applications: {
					focusedAppId: "HyperCard.app",
					apps: {
						"HyperCard.app": {
							id: "HyperCard.app",
							name: "HyperCard",
							icon: "i.png",
							windows: [] as unknown[],
							open: true,
							data: {
								activeStackId: "demo",
								openStacks: {
									demo: {
										stackSource: "demo",
										stack: {
											name: "Demo",
											cards: [{ id: "c1", parts: [] as unknown[] }],
										},
										currentCardId: "c1",
										history: [] as unknown[],
										variables: {},
										fieldValues: {},
										partVisibility: {},
										fieldRev: {},
										runtime: { pendingEffects },
									},
								},
							},
						},
					},
				},
			},
		},
	};
}

const soundCalls = () =>
	player.mock.calls.map((c) => c[0] as { type: string; sound?: string });

describe("HyperCard sound effects", () => {
	it("plays a beep with PlayInterrupt so a click sound can't mask it", () => {
		mockState = stateWithEffects([{ id: 1, kind: "beep" }]);
		render(<HyperCard />);
		expect(soundCalls()).toContainEqual({
			type: "ClassicySoundPlayInterrupt",
			sound: "ClassicyBeep",
		});
	});

	it("plays a named sound with PlayInterrupt", () => {
		mockState = stateWithEffects([
			{ id: 2, kind: "play", sound: "ClassicyAlertSosumi" },
		]);
		render(<HyperCard />);
		expect(soundCalls()).toContainEqual({
			type: "ClassicySoundPlayInterrupt",
			sound: "ClassicyAlertSosumi",
		});
	});

	it("dispatches PlayInterrupt even for a play effect with no sound field", () => {
		// A hand-authored or cleared `play` action has no `sound` key at all, so
		// HyperCardEngine's `play` case pushes `{ kind: "play", sound: undefined }`.
		// HyperCard.tsx dispatches that as-is — it relies on
		// ClassicySoundStateEventReducer's `action.sound &&` guard (see
		// ClassicySoundStateEventReducer.test.ts) to keep an undefined sound from
		// ever reaching Howler's play(), which would otherwise play the entire
		// sprite sheet. This test only pins the effect-loop half: the sound key
		// is passed through untouched, not silently defaulted to something else.
		mockState = stateWithEffects([{ id: 4, kind: "play", sound: undefined }]);
		render(<HyperCard />);
		expect(soundCalls()).toContainEqual({
			type: "ClassicySoundPlayInterrupt",
			sound: undefined,
		});
	});

	it("plays each queued effect id only once", () => {
		mockState = stateWithEffects([{ id: 3, kind: "beep" }]);
		const { rerender } = render(<HyperCard />);
		// Reassign to a FRESH object carrying the SAME effect id before the
		// rerender, so the effect's dependency array is not Object.is-equal to
		// the previous render's and the effect body genuinely re-runs. Reusing
		// the same `mockState` reference here would make this assertion
		// unfalsifiable — it would pass even with the `playedRef` dedup guard
		// disabled, because the effect body would never run a second time.
		mockState = stateWithEffects([{ id: 3, kind: "beep" }]);
		rerender(<HyperCard />);
		expect(soundCalls().filter((c) => c.sound === "ClassicyBeep")).toHaveLength(
			1,
		);
	});
});
