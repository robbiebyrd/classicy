import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import {
	ClassicyApp,
	type ClassicyGlobalShortcut,
} from "@/SystemFolder/SystemResources/App/ClassicyApp";

const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: {
							apps: {
								"ClockExt.app": {
									id: "ClockExt.app",
									name: "Clock",
									icon: "/icons/clock.png",
									open: true,
									focused: false,
									extension: true,
									windows: [] as never[],
									data: {},
								},
							},
						},
						Appearance: {
							activeTheme: {
								color: {
									white: 0xffffff,
									black: 0x000000,
									error: 0xff0000,
									system: [0, 0, 0, 0, 0, 0, 0, 0],
									theme: [0, 0, 0, 0, 0, 0, 0, 0],
								},
							},
						},
					},
				},
			};
			return selector(mockState);
		},
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: (): null => null,
}));

const dispatchedTypes = () =>
	mockDispatch.mock.calls.map((call) => (call[0] as { type: string }).type);

function renderExtension() {
	return render(
		<ClassicyApp
			id="ClockExt.app"
			name="Clock"
			icon="/icons/clock.png"
			extension
			addSystemMenu
		>
			<div data-testid="ext-child" />
		</ClassicyApp>,
	);
}

function renderApp(props: {
	id: string;
	extension?: boolean;
	globalShortcuts?: ClassicyGlobalShortcut[];
}) {
	return render(
		<ClassicyApp
			id={props.id}
			name="Test"
			icon="/icons/test.png"
			extension={props.extension}
			globalShortcuts={props.globalShortcuts}
		/>,
	);
}

describe("ClassicyApp extension prop", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("dispatches ClassicyAppLoad with extension: true", () => {
		renderExtension();
		const load = mockDispatch.mock.calls
			.map((call) => call[0] as { type: string; extension?: boolean })
			.find((e) => e.type === "ClassicyAppLoad");
		expect(load?.extension).toBe(true);
	});

	it("never adds a desktop icon or Apple-menu entry, even with addSystemMenu", () => {
		renderExtension();
		expect(dispatchedTypes()).not.toContain("ClassicyDesktopIconAdd");
		expect(dispatchedTypes()).not.toContain("ClassicyDesktopAppMenuAdd");
	});

	it("renders its children because the extension is open in the store", () => {
		renderExtension();
		expect(screen.getByTestId("ext-child")).toBeInTheDocument();
	});

	it("an extension registers its global shortcuts on mount and unregisters on unmount", () => {
		const { unmount } = renderApp({
			id: "Ext.app",
			extension: true,
			globalShortcuts: [{ shortcut: "Ctrl+Space", event: "ExtToggle" }],
		});
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyShortcutRegister",
				scope: "global",
				appId: "Ext.app",
				chord: "control+space",
				event: "ExtToggle",
			}),
		);
		unmount();
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyShortcutUnregister",
				scope: "global",
				appId: "Ext.app",
				chord: "control+space",
			}),
		);
	});

	it("a NON-extension app's globalShortcuts are ignored", () => {
		renderApp({
			id: "Reg.app",
			extension: false,
			globalShortcuts: [{ shortcut: "Ctrl+Space", event: "Nope" }],
		});
		expect(mockDispatch).not.toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyShortcutRegister",
				scope: "global",
			}),
		);
	});
});
