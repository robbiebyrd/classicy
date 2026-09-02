/**
 * #252: HyperCard's File menu needs an "About HyperCard" entry
 * (useClassicyAboutMenu) so ClassicyDesktopMenuBar can hoist it into the
 * Apple menu like every other built-in app. Mirrors the mocking pattern in
 * HyperCard.editor.test.tsx: ClassicyWindow is mocked to a thin div that
 * captures its id/appMenu, so the File menu's contents (and the about
 * window's own mount) can be asserted without a full desktop provider tree.
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dispatch = vi.fn();
const player = vi.fn();
let mockState: Record<string, unknown> = {};
const capturedMenus: Record<string, unknown[]> = {};

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
		id,
		appMenu,
	}: {
		children: React.ReactNode;
		id: string;
		appMenu?: unknown[];
	}) => {
		capturedMenus[id] = (appMenu as unknown[]) ?? [];
		return <div data-window-id={id}>{children}</div>;
	},
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
	for (const k of Object.keys(capturedMenus)) {
		delete capturedMenus[k];
	}
});

function stateWith() {
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

function menuItem(
	menus: unknown[],
	topId: string,
	childId: string,
): { id: string; title?: string; onClickFunc?: () => void } | undefined {
	const top = (
		menus as {
			id: string;
			menuChildren?: { id: string; title?: string; onClickFunc?: () => void }[];
		}[]
	).find((m) => m.id === topId);
	return top?.menuChildren?.find((c) => c.id === childId);
}

describe("HyperCard — About menu (#252)", () => {
	it("shows 'About HyperCard' as the first File menu item", () => {
		mockState = stateWith();
		render(<HyperCard />);
		const file = (
			capturedMenus.hypercard_main as {
				id: string;
				menuChildren?: { title?: string }[];
			}[]
		).find((m) => m.id === "file");
		expect(file?.menuChildren?.[0]?.title).toBe("About HyperCard");
	});

	it("opens the about window when the About item is clicked", () => {
		mockState = stateWith();
		render(<HyperCard />);

		expect(
			document.querySelector('[data-window-id="HyperCard.app_about"]'),
		).toBeNull();

		act(() => {
			menuItem(
				capturedMenus.hypercard_main,
				"file",
				"HyperCard.app_about",
			)?.onClickFunc?.();
		});

		expect(
			document.querySelector('[data-window-id="HyperCard.app_about"]'),
		).not.toBeNull();
		expect(screen.getAllByText("HyperCard").length).toBeGreaterThan(0);
	});
});
