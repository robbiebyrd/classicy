/**
 * Subtask 04: HyperCard.tsx's `openApp` effect dispatches `e.event` verbatim
 * — stack-authored JSON that `validateStack` checks for shape, not
 * authority. These tests pin the untrusted-dispatch call site: a stack
 * cannot smuggle a guarded/non-allowlisted action type through the `event`
 * override, an ordinary openApp effect (no override) still opens the app,
 * and the engine-internal `custom` effect branch (host-originated, not
 * stack-authored) keeps dispatching its continuation actions unaffected.
 */
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

const dispatchedTypes = () =>
	dispatch.mock.calls.map((c) => (c[0] as { type: string }).type);

describe("HyperCard openApp effect trust", () => {
	it("does not change the theme when a stack overrides `event` with ClassicyDesktopSetTheme", () => {
		mockState = stateWithEffects([
			{
				id: 1,
				kind: "openApp",
				appId: "Finder.app",
				event: "ClassicyDesktopSetTheme",
				data: { theme: "Midnight" },
			},
		]);
		render(<HyperCard />);
		expect(dispatchedTypes()).not.toContain("ClassicyDesktopSetTheme");
	});

	it("does not empty the trash when a stack overrides `event` with ClassicyAppFinderEmptyTrash", () => {
		mockState = stateWithEffects([
			{
				id: 2,
				kind: "openApp",
				appId: "Finder.app",
				event: "ClassicyAppFinderEmptyTrash",
			},
		]);
		render(<HyperCard />);
		expect(dispatchedTypes()).not.toContain("ClassicyAppFinderEmptyTrash");
	});

	it("still opens the app for the ordinary openApp case (no `event` override)", () => {
		mockState = stateWithEffects([
			{ id: 3, kind: "openApp", appId: "Finder.app" },
		]);
		render(<HyperCard />);
		const call = dispatch.mock.calls.find(
			(c) => (c[0] as { type: string }).type === "ClassicyAppOpen",
		);
		expect(call).toBeDefined();
		expect((call?.[0] as { app: { id: string } }).app.id).toBe("Finder.app");
		// Dispatched at the "untrusted" trust level — the allowlist's sole
		// default entry, but still routed through the kernel floor underneath.
		expect(call?.[1]).toBe("untrusted");
	});

	it("drops an openApp effect whose event type is neither the default nor host-allowlisted, regardless of payload", () => {
		mockState = stateWithEffects([
			{
				id: 4,
				kind: "openApp",
				appId: "Finder.app",
				event: "ClassicyAppSomeUnregisteredEffect",
			},
		]);
		render(<HyperCard />);
		expect(dispatchedTypes()).not.toContain(
			"ClassicyAppSomeUnregisteredEffect",
		);
	});
});

describe("HyperCard custom effect engine-internal dispatch", () => {
	it("keeps resolving a blocking command with no registered handler (ClassicyAppHyperCardResolveCommand)", () => {
		mockState = stateWithEffects([
			{
				id: 5,
				kind: "custom",
				name: "unregisteredCommand",
				args: {},
				token: "tok-1",
			},
		]);
		render(<HyperCard />);
		const call = dispatch.mock.calls.find(
			(c) =>
				(c[0] as { type: string }).type ===
				"ClassicyAppHyperCardResolveCommand",
		);
		expect(call).toBeDefined();
		expect(call?.[0]).toMatchObject({
			type: "ClassicyAppHyperCardResolveCommand",
			token: "tok-1",
			result: "",
		});
		// Engine-internal: the action `type` is a hardcoded literal in
		// HyperCard.tsx, never stack-authored data, so it dispatches at the
		// default trusted level (no explicit trust argument).
		expect(call?.[1]).toBeUndefined();
	});
});
