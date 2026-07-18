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
	}: {
		children: React.ReactNode;
		title?: string;
		id: string;
	}) => (
		<div data-window-id={id} data-title={title}>
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
				Applications: {
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
});
