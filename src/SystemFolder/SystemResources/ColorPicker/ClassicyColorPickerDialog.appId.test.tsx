import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyAppIdContext } from "@/SystemFolder/SystemResources/App/ClassicyAppIdContext";
import { ClassicyColorPickerDialog } from "@/SystemFolder/SystemResources/ColorPicker/ClassicyColorPickerDialog";

const mockPlayer = vi.hoisted(() => vi.fn());

// ClassicyAppManagerUtils is left unmocked here (unlike
// ClassicyColorPickerDialog.test.tsx) so these tests exercise the real
// Zustand store and the real classicyWindowEventHandler reducer — the only
// way to prove a window record is actually written to / removed from the
// store rather than merely dispatched. Only the sound context is mocked,
// since no ClassicySoundManagerProvider is mounted in these tests.
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

function makeTestApp(id: string): ClassicyStoreSystemApp {
	return {
		id,
		name: id,
		icon: "",
		open: true,
		focused: false,
		windows: [],
	};
}

function seedApps(apps: Record<string, ClassicyStoreSystemApp>) {
	useAppManager.setState(DefaultAppManagerState, true);
	useAppManager.setState((state) => ({
		...state,
		System: {
			...state.System,
			Manager: {
				...state.System.Manager,
				Applications: {
					...state.System.Manager.Applications,
					apps: {
						...state.System.Manager.Applications.apps,
						...apps,
					},
				},
			},
		},
	}));
}

const windowIdsFor = (appId: string) => {
	const app = useAppManager.getState().System.Manager.Applications.apps[appId];
	return (app?.windows ?? []).map((w) => w.id);
};

describe("ClassicyColorPickerDialog appId resolution", () => {
	beforeEach(() => {
		mockPlayer.mockClear();
	});

	it("registers the window under a registered appId and removes it on unmount", () => {
		seedApps({ "TestApp.app": makeTestApp("TestApp.app") });

		const { unmount } = render(
			<ClassicyColorPickerDialog
				id="test-dialog"
				appId="TestApp.app"
				open={true}
			/>,
		);

		expect(windowIdsFor("TestApp.app")).toContain("test-dialog");

		unmount();

		expect(windowIdsFor("TestApp.app")).not.toContain("test-dialog");
	});

	// The maintainer's instruction was "it should copy the id of the app that
	// called it" — lexical, via ClassicyAppIdContext (what ClassicyApp
	// provides to everything it renders), never the store's global focused
	// app. An explicit `appId` prop still wins over that context when both
	// are present.
	it("prefers an explicitly passed appId over the enclosing context", () => {
		seedApps({
			"ContextApp.app": makeTestApp("ContextApp.app"),
			"ExplicitApp.app": makeTestApp("ExplicitApp.app"),
		});

		render(
			<ClassicyAppIdContext.Provider value="ContextApp.app">
				<ClassicyColorPickerDialog
					id="explicit-dialog"
					appId="ExplicitApp.app"
					open={true}
				/>
			</ClassicyAppIdContext.Provider>,
		);

		expect(windowIdsFor("ExplicitApp.app")).toContain("explicit-dialog");
		expect(windowIdsFor("ContextApp.app")).not.toContain("explicit-dialog");
	});

	it("falls back to the lexically enclosing app id when no appId prop is given", () => {
		seedApps({ "ContextApp.app": makeTestApp("ContextApp.app") });

		render(
			<ClassicyAppIdContext.Provider value="ContextApp.app">
				<ClassicyColorPickerDialog id="context-dialog" open={true} />
			</ClassicyAppIdContext.Provider>,
		);

		expect(windowIdsFor("ContextApp.app")).toContain("context-dialog");
	});

	it("does not throw and still renders when there is no appId prop and no enclosing context", () => {
		seedApps({});

		expect(() =>
			render(<ClassicyColorPickerDialog id="orphan-dialog" open={true} />),
		).not.toThrow();

		expect(screen.getByText("OK")).toBeInTheDocument();
	});
});
