import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";

const dispatch = vi.fn();
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
	ClassicyWindow: ({
		children,
		title,
		id,
		appMenu,
	}: {
		children: React.ReactNode;
		title?: string;
		id: string;
		appMenu?: unknown[];
	}) => (
		<div
			data-window-id={id}
			data-title={title}
			data-has-app-menu={appMenu ? "true" : "false"}
			data-app-menu-len={appMenu?.length ?? 0}
		>
			{children}
		</div>
	),
}));
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);
vi.mock(
	"@/SystemFolder/SystemResources/File/ClassicyFileSystemContext",
	() => ({
		useClassicyFileSystem: () => ({ resolve: (): undefined => undefined }),
	}),
);

import { HyperCard } from "@/SystemFolder/HyperCard/HyperCard";

afterEach(cleanup);

function stateWith(edit?: HCEditState) {
	const stack = {
		name: "Demo",
		cards: [
			{ id: "c1", parts: [{ id: "b1", type: "button", rect: [0, 0, 50, 20] }] },
		],
	};
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
										stack,
										currentCardId: "c1",
										history: [] as unknown[],
										variables: {},
										fieldValues: {},
										partVisibility: {},
										fieldRev: {},
									},
								},
								...(edit ? { edits: { demo: edit } } : {}),
							},
						},
					},
				},
			},
		},
	};
}

function makeEdit(overrides: Partial<HCEditState> = {}): HCEditState {
	return {
		draft: {
			name: "Demo",
			cards: [
				{
					id: "c1",
					parts: [{ id: "b1", type: "button", rect: [0, 0, 50, 20] }],
				},
			],
		},
		currentCardId: "c1",
		layer: "card",
		tool: "pointer",
		undo: [],
		redo: [],
		dirty: false,
		...overrides,
	};
}

describe("HyperCard editor integration", () => {
	it("renders the player (no overlay, no palette) when no edit session exists", () => {
		mockState = stateWith();
		const { container } = render(<HyperCard />);
		expect(
			container.querySelector(".classicyHyperCardEditorOverlay"),
		).toBeNull();
		expect(
			container.querySelector('[data-window-id="hypercard_tools"]'),
		).toBeNull();
	});

	it("renders the editor canvas and tools palette while editing", () => {
		mockState = stateWith(makeEdit());
		const { container } = render(<HyperCard />);
		expect(
			container.querySelector(".classicyHyperCardEditorOverlay"),
		).not.toBeNull();
		expect(
			container.querySelector('[data-window-id="hypercard_tools"]'),
		).not.toBeNull();
	});

	it("renders the live player in browse-preview (palette stays open)", () => {
		mockState = stateWith(makeEdit({ tool: "browse" }));
		const { container } = render(<HyperCard />);
		expect(
			container.querySelector(".classicyHyperCardEditorOverlay"),
		).toBeNull();
		expect(
			container.querySelector('[data-window-id="hypercard_tools"]'),
		).not.toBeNull();
	});

	it("marks the window title dirty", () => {
		mockState = stateWith(makeEdit({ dirty: true }));
		const { container } = render(<HyperCard />);
		const win = container.querySelector('[data-window-id="hypercard_main"]');
		expect(win?.getAttribute("data-title")).toContain("•");
	});

	it("pushes the live menu bar (with Edit/Objects) when the app is focused while editing", () => {
		// focusApp restores the window's registration-time menuBar record, which
		// goes stale as soon as the dynamic edit-mode menus change — HyperCard
		// must push its live appMenu whenever it is the focused app.
		mockState = stateWith(makeEdit());
		render(<HyperCard />);
		const menuPushes = dispatch.mock.calls
			.map(
				([action]) => action as { type: string; menuBar?: { title: string }[] },
			)
			.filter((a) => a.type === "ClassicyWindowMenu");
		expect(menuPushes.length).toBeGreaterThan(0);
		const titles = (menuPushes.at(-1)?.menuBar ?? []).map((m) => m.title);
		expect(titles).toContain("Edit");
		expect(titles).toContain("Objects");
	});

	it("gives the tools palette window a non-empty appMenu while editing", () => {
		mockState = stateWith(makeEdit());
		const { container } = render(<HyperCard />);
		const toolsWindow = container.querySelector(
			'[data-window-id="hypercard_tools"]',
		);
		expect(toolsWindow?.getAttribute("data-has-app-menu")).toBe("true");
		expect(
			Number(toolsWindow?.getAttribute("data-app-menu-len")),
		).toBeGreaterThan(0);
	});

	it("renders the inspector window (with appMenu) while editing", () => {
		mockState = stateWith(makeEdit());
		const { container } = render(<HyperCard />);
		const inspector = container.querySelector(
			'[data-window-id="hypercard_inspector"]',
		);
		expect(inspector).not.toBeNull();
		expect(inspector?.getAttribute("data-has-app-menu")).toBe("true");
	});
});
