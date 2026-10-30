import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	getAppWindow,
	listAppWindows,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// #278: Option-click collapse-all / expand-all. Unlike
// ClassicyWindow.collapse.test.tsx, ClassicyAppManagerUtils is left unmocked
// so collapseOrExpandAll walks the real Zustand store — the window records'
// `collapsable`/`modal` flags are written by the real ClassicyWindowOpen
// reducer from each window's props.
const mockPlayer = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

const APP = "TestApp.app";

function seedApp() {
	const app: ClassicyStoreSystemApp = {
		id: APP,
		name: "Test",
		icon: "",
		open: true,
		focused: true,
		windows: {},
	};
	useAppManager.setState(DefaultAppManagerState, true);
	useAppManager.setState((state) => ({
		...state,
		System: {
			...state.System,
			Manager: {
				...state.System.Manager,
				Applications: {
					...state.System.Manager.Applications,
					apps: { ...state.System.Manager.Applications.apps, [APP]: app },
				},
			},
		},
	}));
}

const windowRecord = (id: string) =>
	getAppWindow(
		useAppManager.getState().System.Manager.Applications.apps[APP],
		id,
	);

function setCollapsed(ids: string[], collapsed: boolean) {
	act(() => {
		useAppManager.setState((state) => {
			const app = state.System.Manager.Applications.apps[APP];
			return {
				...state,
				System: {
					...state.System,
					Manager: {
						...state.System.Manager,
						Applications: {
							...state.System.Manager.Applications,
							apps: {
								...state.System.Manager.Applications.apps,
								[APP]: {
									...app,
									windows: windowsRecord(
										...listAppWindows(app).map((w) =>
											ids.includes(w.id) ? { ...w, collapsed } : w,
										),
									),
								},
							},
						},
					},
				},
			};
		});
	});
}

function renderWindows() {
	const result = render(
		<>
			<ClassicyWindow id="clicked" appId={APP} title="Clicked">
				<p>clicked</p>
			</ClassicyWindow>
			<ClassicyWindow id="plain" appId={APP} title="Plain">
				<p>plain</p>
			</ClassicyWindow>
			<ClassicyWindow id="fixed" appId={APP} title="Fixed" collapsable={false}>
				<p>fixed</p>
			</ClassicyWindow>
			<ClassicyWindow id="dialog" appId={APP} title="Dialog" modal>
				<p>dialog</p>
			</ClassicyWindow>
		</>,
	);
	const collapseBox = result.container.querySelector(
		`[id="${APP}_clicked"] .classicyWindowCollapseBox`,
	) as HTMLElement;
	return { ...result, collapseBox };
}

describe("ClassicyWindow Option-click collapse-all (#278)", () => {
	beforeEach(() => {
		mockPlayer.mockClear();
		seedApp();
	});

	it("persists collapsable/modal from props into the store record", () => {
		renderWindows();
		expect(windowRecord("fixed")?.collapsable).toBe(false);
		expect(windowRecord("dialog")?.modal).toBe(true);
		expect(windowRecord("plain")?.collapsable).toBe(true);
		expect(windowRecord("plain")?.modal).toBe(false);
	});

	it("collapse-all skips non-collapsable and modal windows", () => {
		const { collapseBox } = renderWindows();
		expect(collapseBox).not.toBeNull();

		fireEvent.click(collapseBox, { altKey: true });

		expect(windowRecord("clicked")?.collapsed).toBe(true);
		expect(windowRecord("plain")?.collapsed).toBe(true);
		expect(windowRecord("fixed")?.collapsed).toBe(false);
		expect(windowRecord("dialog")?.collapsed).toBe(false);
	});

	it("expand-all skips non-collapsable and modal windows", () => {
		const { collapseBox } = renderWindows();
		// Every window collapsed — including the two that opted out, as a
		// pre-#278 collapse-all would have left them.
		setCollapsed(["clicked", "plain", "fixed", "dialog"], true);

		fireEvent.click(collapseBox, { altKey: true });

		expect(windowRecord("clicked")?.collapsed).toBe(false);
		expect(windowRecord("plain")?.collapsed).toBe(false);
		expect(windowRecord("fixed")?.collapsed).toBe(true);
		expect(windowRecord("dialog")?.collapsed).toBe(true);
	});

	it("a plain collapse-box click still affects only the clicked window", () => {
		const { collapseBox } = renderWindows();

		fireEvent.click(collapseBox);

		expect(windowRecord("clicked")?.collapsed).toBe(true);
		expect(windowRecord("plain")?.collapsed).toBe(false);
		expect(windowRecord("fixed")?.collapsed).toBe(false);
		expect(windowRecord("dialog")?.collapsed).toBe(false);
	});
});

// #280: end to end through the real store — the Appearance checkbox's action
// reaches the window's title-bar double-click handler.
describe("ClassicyDesktopSetDoubleClickTitleToCollapse (#280)", () => {
	beforeEach(() => {
		mockPlayer.mockClear();
		seedApp();
	});

	const titleBarOf = (container: HTMLElement) =>
		container.querySelector(
			`[id="${APP}_clicked"] .classicyWindowTitle`,
		) as HTMLElement;

	it("a title-bar double-click is ignored once the setting is turned off", () => {
		const { container } = renderWindows();
		act(() => {
			dispatch({
				type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
				doubleClickTitleToCollapse: false,
			});
		});

		fireEvent.dblClick(titleBarOf(container));

		expect(windowRecord("clicked")?.collapsed).toBe(false);
	});

	it("a title-bar double-click collapses when the setting is back on", () => {
		const { container } = renderWindows();
		act(() => {
			dispatch({
				type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
				doubleClickTitleToCollapse: false,
			});
			dispatch({
				type: "ClassicyDesktopSetDoubleClickTitleToCollapse",
				doubleClickTitleToCollapse: true,
			});
		});

		fireEvent.dblClick(titleBarOf(container));

		expect(windowRecord("clicked")?.collapsed).toBe(true);
	});
});
