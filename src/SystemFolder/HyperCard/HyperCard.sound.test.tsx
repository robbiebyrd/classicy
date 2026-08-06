import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dispatch = vi.fn();
const player = vi.fn();
let mockState: Record<string, unknown> = {};

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
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
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => player }),
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
