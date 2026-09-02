import {
	act,
	cleanup,
	fireEvent,
	render,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { registerHyperCardSaveProvider } from "@/SystemFolder/HyperCard/HyperCardPlugins";

const dispatch = vi.fn();
let mockState: Record<string, unknown> = {};
const capturedMenus: Record<string, unknown[]> = {};
const capturedOnBeforeClose: Record<
	string,
	((id: string) => boolean | Promise<boolean>) | undefined
> = {};
let capturedOpenDialogProps:
	| {
			open: boolean;
			onOpenFunc: (
				selections: {
					volumeId: string;
					path: string[];
					entry: { id: string; meta?: Record<string, unknown> };
				}[],
			) => void;
			onCancelFunc?: () => void;
	  }
	| undefined;

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
		onBeforeClose,
	}: {
		children: React.ReactNode;
		title?: string;
		id: string;
		appMenu?: unknown[];
		onBeforeClose?: (id: string) => boolean | Promise<boolean>;
	}) => {
		capturedMenus[id] = (appMenu as unknown[]) ?? [];
		capturedOnBeforeClose[id] = onBeforeClose;
		return (
			<div
				data-window-id={id}
				data-title={title}
				data-has-app-menu={appMenu ? "true" : "false"}
				data-app-menu-len={appMenu?.length ?? 0}
			>
				{children}
			</div>
		);
	},
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
vi.mock(
	"@/SystemFolder/SystemResources/FileDialog/ClassicyFileOpenDialog",
	() => ({
		ClassicyFileOpenDialog: (
			props: NonNullable<typeof capturedOpenDialogProps>,
		): null => {
			capturedOpenDialogProps = props;
			return null;
		},
	}),
);

let capturedSaveDialogProps:
	| {
			open: boolean;
			defaultFileName?: string;
			formats: {
				label: string;
				extension: string;
				fileType: string;
				data: () => string | Promise<string>;
			}[];
			onSaveFunc: (saved: unknown) => void;
			onCancelFunc?: () => void;
	  }
	| undefined;

vi.mock(
	"@/SystemFolder/SystemResources/FileDialog/ClassicyFileSaveDialog",
	() => ({
		ClassicyFileSaveDialog: (
			props: NonNullable<typeof capturedSaveDialogProps>,
		): null => {
			capturedSaveDialogProps = props;
			return null;
		},
	}),
);

import { HyperCard } from "@/SystemFolder/HyperCard/HyperCard";

afterEach(cleanup);

beforeEach(() => {
	dispatch.mockClear();
	capturedOpenDialogProps = undefined;
	capturedSaveDialogProps = undefined;
	for (const k of Object.keys(capturedMenus)) {
		delete capturedMenus[k];
	}
	for (const k of Object.keys(capturedOnBeforeClose)) {
		delete capturedOnBeforeClose[k];
	}
});

function stateWith(edit?: HCEditState, windows: unknown[] = []) {
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
							windows: windows,
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

/** Like stateWith, but supports several simultaneously open stacks — needed
 * for the #236 Quit cascade, which walks every dirty edit session. */
function stateWithStacks(
	stacks: { id: string; edit?: HCEditState }[],
	activeStackId: string = stacks[0]?.id ?? "demo",
) {
	const openStacks: Record<string, unknown> = {};
	const edits: Record<string, HCEditState> = {};
	for (const s of stacks) {
		const draft = s.edit?.draft ?? {
			name: s.id,
			cards: [{ id: "c1", parts: [] }],
		};
		openStacks[s.id] = {
			stackSource: s.id,
			stack: draft,
			currentCardId: "c1",
			history: [] as unknown[],
			variables: {},
			fieldValues: {},
			partVisibility: {},
			fieldRev: {},
		};
		if (s.edit) edits[s.id] = s.edit;
	}
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
								activeStackId,
								openStacks,
								...(Object.keys(edits).length ? { edits } : {}),
							},
						},
					},
				},
			},
		},
	};
}

/** Deletes a stack's edit session from a stateWith/stateWithStacks mockState,
 * simulating what the real ClassicyAppHCEditExit reducer case does — the
 * mocked dispatch() is a spy only, so tests drive this by hand. */
function dropEditSession(state: unknown, stackId: string): void {
	const edits = (
		(
			state as {
				System: {
					Manager: {
						Applications: { apps: Record<string, { data?: unknown }> };
					};
				};
			}
		).System.Manager.Applications.apps["HyperCard.app"].data as
			| { edits?: Record<string, unknown> }
			| undefined
	)?.edits;
	if (edits) delete edits[stackId];
}

function menuItem(
	menus: unknown[],
	topId: string,
	childId: string,
):
	| {
			id: string;
			title?: string;
			disabled?: boolean;
			checked?: boolean;
			keyboardShortcut?: string;
			onClickFunc?: () => void;
	  }
	| undefined {
	const top = (
		menus as {
			id: string;
			menuChildren?: {
				id: string;
				title?: string;
				disabled?: boolean;
				checked?: boolean;
				keyboardShortcut?: string;
				onClickFunc?: () => void;
			}[];
		}[]
	).find((m) => m.id === topId);
	return top?.menuChildren?.find((c) => c.id === childId);
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

	it("shows the edit session's card in the title while editing", () => {
		const e = makeEdit({ currentCardId: "c2", dirty: true });
		e.draft.cards.push({ id: "c2", name: "Second", parts: [] });
		mockState = stateWith(e);
		const { container } = render(<HyperCard />);
		const win = container.querySelector('[data-window-id="hypercard_main"]');
		expect(win?.getAttribute("data-title")).toBe("Demo — Second •");
	});

	it("menu items dispatch the editor actions", () => {
		mockState = stateWith(makeEdit({ selectedPartId: "b1" }));
		render(<HyperCard />);
		const menus = capturedMenus.hypercard_main;
		menuItem(menus, "edit", "undo")?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditUndo",
			stackId: "demo",
		});
		menuItem(menus, "edit", "copy_part")?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditCopyPart",
			stackId: "demo",
			partId: "b1",
		});
		menuItem(menus, "objects", "new_card")?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditAddCard",
			stackId: "demo",
		});
		menuItem(menus, "objects", "toggle_layer")?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetLayer",
			stackId: "demo",
			layer: "background",
		});
		// #236: the old "Stop Editing (Discard)" item was replaced with a
		// non-destructive Browse/Edit toggle mirroring the toolbar buttons.
		// makeEdit() defaults to tool "pointer" (editing), so this is showing
		// "Browse" and toggling to the browse tool.
		expect(menuItem(menus, "file", "toggle_edit_mode")?.title).toBe("Browse");
		menuItem(menus, "file", "toggle_edit_mode")?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetTool",
			stackId: "demo",
			tool: "browse",
		});
		menuItem(menus, "edit", "edit_script")?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditShowScript",
			stackId: "demo",
			target: { kind: "part", partId: "b1" },
		});
	});

	it("a rejecting provider.save dispatches OpenFileFailed instead of failing silently", async () => {
		registerHyperCardSaveProvider({
			id: "flaky",
			label: "Flaky",
			canSave: () => true,
			save: () => Promise.reject(new Error("network down")),
		});
		mockState = stateWith(makeEdit());
		render(<HyperCard />);
		menuItem(
			capturedMenus.hypercard_main,
			"file",
			"save_flaky",
		)?.onClickFunc?.();
		await waitFor(() =>
			expect(dispatch).toHaveBeenCalledWith({
				type: "ClassicyAppHyperCardOpenFileFailed",
				path: "",
				message: "The stack can’t be saved: network down",
			}),
		);
	});

	it("a successful save with a ref rebinds the open stack to the saved id", async () => {
		registerHyperCardSaveProvider({
			id: "ref-provider",
			label: "Ref Provider",
			canSave: () => true,
			save: async () => ({ ok: true, ref: { id: "77", name: "X" } }),
		});
		mockState = stateWith(makeEdit());
		render(<HyperCard />);
		menuItem(
			capturedMenus.hypercard_main,
			"file",
			"save_ref-provider",
		)?.onClickFunc?.();
		await waitFor(() =>
			expect(dispatch).toHaveBeenCalledWith({
				type: "ClassicyAppHCEditRebindStack",
				stackId: "demo",
				newStackId: "saved:ref-provider:77",
			}),
		);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditMarkSaved",
			stackId: "demo",
		});
	});

	it("a successful save without a ref only marks the stack saved (no rebind)", async () => {
		registerHyperCardSaveProvider({
			id: "noref-provider",
			label: "No Ref Provider",
			canSave: () => true,
			save: async () => ({ ok: true }),
		});
		mockState = stateWith(makeEdit());
		render(<HyperCard />);
		menuItem(
			capturedMenus.hypercard_main,
			"file",
			"save_noref-provider",
		)?.onClickFunc?.();
		await waitFor(() =>
			expect(dispatch).toHaveBeenCalledWith({
				type: "ClassicyAppHCEditMarkSaved",
				stackId: "demo",
			}),
		);
		expect(dispatch).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicyAppHCEditRebindStack" }),
		);
	});

	it("Open Saved Stack… is always in the File menu, even with no list-capable save provider", () => {
		mockState = stateWith();
		render(<HyperCard />);
		expect(
			menuItem(capturedMenus.hypercard_main, "file", "open_saved"),
		).toBeDefined();
	});

	it("Open Saved Stack… shows the file-system Open dialog; picking a file dispatches OpenFile and closes it", () => {
		mockState = stateWith();
		render(<HyperCard />);
		expect(capturedOpenDialogProps?.open).toBe(false);

		act(() => {
			menuItem(
				capturedMenus.hypercard_main,
				"file",
				"open_saved",
			)?.onClickFunc?.();
		});
		expect(capturedOpenDialogProps?.open).toBe(true);

		act(() => {
			capturedOpenDialogProps?.onOpenFunc([
				{
					volumeId: "desktop",
					path: ["Macintosh HD", "Documents"],
					entry: {
						id: "Macintosh HD:Documents:My Stack",
						meta: { classicyPath: "Macintosh HD:Documents:My Stack" },
					},
				},
			]);
		});
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHyperCardOpenFile",
			path: "Macintosh HD:Documents:My Stack",
		});
		expect(capturedOpenDialogProps?.open).toBe(false);
	});

	it("cancelling the Open dialog closes it without dispatching OpenFile", () => {
		mockState = stateWith();
		render(<HyperCard />);
		act(() => {
			menuItem(
				capturedMenus.hypercard_main,
				"file",
				"open_saved",
			)?.onClickFunc?.();
		});
		act(() => {
			capturedOpenDialogProps?.onCancelFunc?.();
		});
		expect(capturedOpenDialogProps?.open).toBe(false);
		expect(dispatch).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicyAppHyperCardOpenFile" }),
		);
	});

	it("Go menu navigates the edit session while editing", () => {
		mockState = stateWith(makeEdit());
		render(<HyperCard />);
		menuItem(capturedMenus.hypercard_main, "go", "go_next")?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditSetCard",
			stackId: "demo",
			to: "next",
		});
	});

	it("shows Save Stack… while editing and opens the save dialog with the stack format", async () => {
		mockState = stateWith(makeEdit());
		render(<HyperCard />);
		const item = menuItem(capturedMenus.hypercard_main, "file", "save_stack");
		expect(item?.title).toBe("Save Stack…");
		act(() => item?.onClickFunc?.());
		await waitFor(() => expect(capturedSaveDialogProps?.open).toBe(true));
		expect(capturedSaveDialogProps?.defaultFileName).toBe("Demo");
		const fmt = capturedSaveDialogProps?.formats[0];
		expect(fmt).toMatchObject({
			label: "HyperCard Stack",
			extension: ".stack",
			fileType: "stack",
		});
		expect(JSON.parse(String(await fmt?.data()))).toMatchObject({
			name: "Demo",
		});
	});

	it("dispatches ClassicyAppHCEditMarkSaved and closes on save", async () => {
		mockState = stateWith(makeEdit());
		render(<HyperCard />);
		act(() =>
			menuItem(
				capturedMenus.hypercard_main,
				"file",
				"save_stack",
			)?.onClickFunc?.(),
		);
		await waitFor(() => expect(capturedSaveDialogProps?.open).toBe(true));
		act(() =>
			capturedSaveDialogProps?.onSaveFunc({
				volumeId: "desktop",
				path: [],
				fileName: "Demo.stack",
			}),
		);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicyAppHCEditMarkSaved" }),
		);
		await waitFor(() => expect(capturedSaveDialogProps?.open).toBe(false));
	});

	it("has no Save Stack… item outside edit mode", () => {
		mockState = stateWith(undefined);
		render(<HyperCard />);
		expect(
			menuItem(capturedMenus.hypercard_main, "file", "save_stack"),
		).toBeUndefined();
	});

	it("has a View menu placed immediately after Go", () => {
		mockState = stateWith(makeEdit(), [
			{ id: "hypercard_tools", closed: false },
			{ id: "hypercard_inspector", closed: false },
		]);
		render(<HyperCard />);
		const menus = capturedMenus.hypercard_main as { id: string }[];
		const ids = menus.map((m) => m.id);
		expect(ids).toContain("view");
		expect(ids.indexOf("view")).toBe(ids.indexOf("go") + 1);
		expect(menuItem(menus, "view", "view_hypercard_tools")).toBeDefined();
		expect(menuItem(menus, "view", "view_hypercard_inspector")).toBeDefined();
	});

	it("View items are disabled and unchecked outside edit mode", () => {
		mockState = stateWith();
		render(<HyperCard />);
		const tools = menuItem(
			capturedMenus.hypercard_main,
			"view",
			"view_hypercard_tools",
		);
		expect(tools?.disabled).toBe(true);
		expect(tools?.checked).toBe(false);
	});

	it("View items are enabled and checked when both palettes are open while editing", () => {
		mockState = stateWith(makeEdit(), [
			{ id: "hypercard_tools", closed: false },
			{ id: "hypercard_inspector", closed: false },
		]);
		render(<HyperCard />);
		const tools = menuItem(
			capturedMenus.hypercard_main,
			"view",
			"view_hypercard_tools",
		);
		expect(tools?.disabled).toBe(false);
		expect(tools?.checked).toBe(true);
		expect(
			menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_inspector")
				?.checked,
		).toBe(true);
	});

	it("a closed palette is unchecked in the View menu", () => {
		mockState = stateWith(makeEdit(), [
			{ id: "hypercard_tools", closed: true },
			{ id: "hypercard_inspector", closed: false },
		]);
		render(<HyperCard />);
		expect(
			menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_tools")
				?.checked,
		).toBe(false);
		expect(
			menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_inspector")
				?.checked,
		).toBe(true);
	});

	it("clicking a visible palette's View item dispatches ClassicyWindowClose", () => {
		mockState = stateWith(makeEdit(), [
			{ id: "hypercard_tools", closed: false },
			{ id: "hypercard_inspector", closed: false },
		]);
		render(<HyperCard />);
		menuItem(
			capturedMenus.hypercard_main,
			"view",
			"view_hypercard_tools",
		)?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyWindowClose",
			app: { id: "HyperCard.app" },
			window: { id: "hypercard_tools" },
		});
	});

	it("clicking a hidden palette's View item dispatches ClassicyWindowOpen", () => {
		mockState = stateWith(makeEdit(), [
			{ id: "hypercard_inspector", closed: true },
		]);
		render(<HyperCard />);
		menuItem(
			capturedMenus.hypercard_main,
			"view",
			"view_hypercard_inspector",
		)?.onClickFunc?.();
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyWindowOpen",
				app: { id: "HyperCard.app" },
				window: expect.objectContaining({
					id: "hypercard_inspector",
					windowType: "utility",
				}),
			}),
		);
	});

	it("View items carry the ⌃T / ⌃I keyboard equivalents", () => {
		mockState = stateWith(makeEdit(), [
			{ id: "hypercard_tools", closed: false },
			{ id: "hypercard_inspector", closed: false },
		]);
		render(<HyperCard />);
		expect(
			menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_tools")
				?.keyboardShortcut,
		).toBe("Ctrl+T");
		expect(
			menuItem(capturedMenus.hypercard_main, "view", "view_hypercard_inspector")
				?.keyboardShortcut,
		).toBe("Ctrl+I");
	});

	it("View items stay enabled and checked during browse-preview (browse tool)", () => {
		mockState = stateWith(makeEdit({ tool: "browse" }), [
			{ id: "hypercard_tools", closed: false },
			{ id: "hypercard_inspector", closed: false },
		]);
		render(<HyperCard />);
		const tools = menuItem(
			capturedMenus.hypercard_main,
			"view",
			"view_hypercard_tools",
		);
		expect(tools?.disabled).toBe(false);
		expect(tools?.checked).toBe(true);
		const info = menuItem(
			capturedMenus.hypercard_main,
			"view",
			"view_hypercard_inspector",
		);
		expect(info?.checked).toBe(true);
	});
});

describe("HyperCard unsaved-changes guard (#236)", () => {
	it("shows 'Edit' in the File menu while browsing", () => {
		mockState = stateWith(makeEdit({ tool: "browse" }));
		render(<HyperCard />);
		expect(
			menuItem(capturedMenus.hypercard_main, "file", "toggle_edit_mode")?.title,
		).toBe("Edit");
	});

	it("shows 'Browse' in the File menu while editing", () => {
		mockState = stateWith(makeEdit({ tool: "pointer" }));
		render(<HyperCard />);
		expect(
			menuItem(capturedMenus.hypercard_main, "file", "toggle_edit_mode")?.title,
		).toBe("Browse");
	});

	it("closing a clean stack's window proceeds immediately, with no alert", () => {
		mockState = stateWith(makeEdit({ dirty: false }));
		render(<HyperCard />);
		const result = capturedOnBeforeClose.hypercard_main?.("hypercard_main");
		expect(result).toBe(true);
	});

	it("closing a dirty stack's window shows the Save/Discard/Cancel alert instead of closing", () => {
		mockState = stateWith(makeEdit({ dirty: true }));
		const { getByText } = render(<HyperCard />);
		let result: boolean | Promise<boolean> | undefined;
		act(() => {
			result = capturedOnBeforeClose.hypercard_main?.("hypercard_main");
		});
		expect(result).toBeInstanceOf(Promise);
		expect(getByText(/Save changes to/)).toBeTruthy();
		expect(getByText("Cancel")).toBeTruthy();
		expect(getByText("Don’t Save")).toBeTruthy();
		expect(getByText("Save")).toBeTruthy();
	});

	it("Cancel in the guard alert aborts the close and dismisses the alert", async () => {
		mockState = stateWith(makeEdit({ dirty: true }));
		const { getByText, queryByText } = render(<HyperCard />);
		let result: boolean | Promise<boolean> | undefined;
		act(() => {
			result = capturedOnBeforeClose.hypercard_main?.("hypercard_main");
		});
		act(() => {
			fireEvent.click(getByText("Cancel"));
		});
		await expect(result).resolves.toBe(false);
		expect(queryByText(/Save changes to/)).toBeNull();
	});

	it("Don’t Save discards the edit session (ClassicyAppHCEditExit) and lets the close proceed", async () => {
		mockState = stateWith(makeEdit({ dirty: true }));
		const { getByText } = render(<HyperCard />);
		let result: boolean | Promise<boolean> | undefined;
		act(() => {
			result = capturedOnBeforeClose.hypercard_main?.("hypercard_main");
		});
		act(() => {
			fireEvent.click(getByText("Don’t Save"));
		});
		await expect(result).resolves.toBe(true);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditExit",
			stackId: "demo",
		});
	});

	it("Save saves through the registered provider, marks the stack saved, and lets the close proceed", async () => {
		registerHyperCardSaveProvider({
			id: "guard-provider",
			label: "Guard",
			canSave: () => true,
			save: async () => ({ ok: true }),
		});
		mockState = stateWith(makeEdit({ dirty: true }));
		const { getByText } = render(<HyperCard />);
		let result: boolean | Promise<boolean> | undefined;
		act(() => {
			result = capturedOnBeforeClose.hypercard_main?.("hypercard_main");
		});
		act(() => {
			fireEvent.click(getByText("Save"));
		});
		await expect(result).resolves.toBe(true);
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppHCEditMarkSaved",
			stackId: "demo",
		});
	});

	it("a failing Save reports the error and keeps the close from proceeding", async () => {
		registerHyperCardSaveProvider({
			id: "guard-fail-provider",
			label: "GuardFail",
			canSave: () => true,
			save: async () => ({ ok: false, error: "disk full" }),
		});
		mockState = stateWith(makeEdit({ dirty: true }));
		const { getByText } = render(<HyperCard />);
		let result: boolean | Promise<boolean> | undefined;
		act(() => {
			result = capturedOnBeforeClose.hypercard_main?.("hypercard_main");
		});
		act(() => {
			fireEvent.click(getByText("Save"));
		});
		await expect(result).resolves.toBe(false);
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyAppHyperCardOpenFileFailed",
				message: "The stack can’t be saved: disk full",
			}),
		);
	});

	it("Quit shows the guard for the first dirty stack; Cancel aborts the whole quit with no ClassicyAppClose", () => {
		mockState = stateWithStacks([
			{ id: "alpha", edit: makeEdit({ dirty: true }) },
			{ id: "beta", edit: makeEdit({ dirty: true }) },
		]);
		const { getByText, queryByText } = render(<HyperCard />);
		act(() => {
			menuItem(
				capturedMenus.hypercard_main,
				"file",
				"HyperCard.app_quit",
			)?.onClickFunc?.();
		});
		expect(getByText(/Save changes to/)).toBeTruthy();
		act(() => {
			fireEvent.click(getByText("Cancel"));
		});
		expect(queryByText(/Save changes to/)).toBeNull();
		expect(dispatch).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicyAppClose" }),
		);
	});

	it("Quit cascades: resolving each dirty stack in turn advances to the next, then quits once none remain", async () => {
		mockState = stateWithStacks([
			{
				id: "alpha",
				edit: makeEdit({
					dirty: true,
					draft: { name: "alpha", cards: [{ id: "c1", parts: [] }] },
				}),
			},
			{
				id: "beta",
				edit: makeEdit({
					dirty: true,
					draft: { name: "beta", cards: [{ id: "c1", parts: [] }] },
				}),
			},
		]);
		const { getByText, queryByText } = render(<HyperCard />);
		act(() => {
			menuItem(
				capturedMenus.hypercard_main,
				"file",
				"HyperCard.app_quit",
			)?.onClickFunc?.();
		});
		expect(getByText(/Save changes to “alpha”/)).toBeTruthy();

		act(() => {
			fireEvent.click(getByText("Don’t Save"));
		});
		// The mocked dispatch doesn't run the real reducer — simulate its
		// ClassicyAppHCEditExit effect so the cascade's next freshest-state
		// read no longer sees "alpha" as dirty.
		dropEditSession(mockState, "alpha");

		await waitFor(() =>
			expect(getByText(/Save changes to “beta”/)).toBeTruthy(),
		);
		act(() => {
			fireEvent.click(getByText("Don’t Save"));
		});
		dropEditSession(mockState, "beta");

		await waitFor(() => expect(queryByText(/Save changes to/)).toBeNull());
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicyAppClose" }),
		);
	});
});
