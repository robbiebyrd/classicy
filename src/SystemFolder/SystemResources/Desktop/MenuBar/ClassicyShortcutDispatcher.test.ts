import { fireEvent, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const dispatch = vi.fn();
let store: any;
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (sel: (s: any) => unknown) => sel(store),
		useAppManagerDispatch: () => dispatch,
	}),
);

import { useClassicyShortcutDispatcher } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher";

const seed = (over: any) => {
	store = {
		System: {
			Manager: {
				Applications: { focusedAppId: over.focusedAppId ?? "Finder.app" },
				Keyboard: {
					app: over.app ?? {},
					system: over.system ?? [],
					global: over.global ?? {},
				},
			},
		},
	};
};

describe("useClassicyShortcutDispatcher", () => {
	const toolsItem = {
		id: "t",
		title: "Tools",
		keyboardShortcut: "Ctrl+T",
		onClickFunc: vi.fn(),
	};
	const menu = [{ id: "view", title: "View", menuChildren: [toolsItem] }];

	it("fires the focused app's claimed chord via its menu action", () => {
		toolsItem.onClickFunc.mockClear();
		seed({ focusedAppId: "HC.app", app: { "HC.app": ["control+t"] } });
		renderHook(() => useClassicyShortcutDispatcher(menu));
		fireEvent.keyDown(document, { key: "t", ctrlKey: true });
		expect(toolsItem.onClickFunc).toHaveBeenCalledOnce();
	});

	it("does NOT fire when a different app is focused (no claim)", () => {
		toolsItem.onClickFunc.mockClear();
		seed({ focusedAppId: "Other.app", app: { "HC.app": ["control+t"] } });
		renderHook(() => useClassicyShortcutDispatcher(menu));
		fireEvent.keyDown(document, { key: "t", ctrlKey: true });
		expect(toolsItem.onClickFunc).not.toHaveBeenCalled();
	});

	it("dispatches a global event when no focused-app/system claim matches", () => {
		dispatch.mockClear();
		seed({
			focusedAppId: "Other.app",
			global: { "control+space": { appId: "Ext", event: "ExtToggle" } },
		});
		renderHook(() => useClassicyShortcutDispatcher([]));
		fireEvent.keyDown(document, { key: " ", code: "Space", ctrlKey: true });
		expect(dispatch).toHaveBeenCalledWith(
			expect.objectContaining({ type: "ExtToggle" }),
		);
	});

	it("shadows a global when the focused app claims the same chord", () => {
		dispatch.mockClear();
		toolsItem.onClickFunc.mockClear();
		seed({
			focusedAppId: "HC.app",
			app: { "HC.app": ["control+t"] },
			global: { "control+t": { appId: "Ext", event: "ExtToggle" } },
		});
		renderHook(() => useClassicyShortcutDispatcher(menu));
		fireEvent.keyDown(document, { key: "t", ctrlKey: true });
		expect(toolsItem.onClickFunc).toHaveBeenCalledOnce();
		expect(dispatch).not.toHaveBeenCalledWith(
			expect.objectContaining({ type: "ExtToggle" }),
		);
	});
});
