import {
	act,
	cleanup,
	render,
	renderHook,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "@/__tests__/test-utils";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	sanitizeStateForPersistence,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";
import {
	openClassicyAppAtTab,
	useClassicySessionTab,
} from "@/SystemFolder/SystemResources/Tabs/useClassicySessionTab";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

// An app's session places (`apps[id].session`): where its file dialog was
// left and the tabs its windows last showed (WIG Ch.8 "Interaction with
// Other Windows", p.146: a secondary window shows as last accessed). Kept
// while the page lives, the app's quitting included; never persisted.

const APP = "Places.app";
const session = () =>
	useAppManager.getState().System.Manager.Applications.apps[APP]?.session;

beforeEach(() => {
	useAppManager.setState(DefaultAppManagerState, true);
	dispatch({
		type: "ClassicyAppLoad",
		app: { id: APP, name: "Places", icon: "" },
	});
});
afterEach(() => {
	cleanup();
	useAppManager.setState(DefaultAppManagerState, true);
});

describe("ClassicyAppRememberFileDialogFolder and ClassicyAppRememberTab", () => {
	it("keep the places, through a quit, out of persisted state", () => {
		dispatch({
			type: "ClassicyAppRememberFileDialogFolder",
			app: { id: APP },
			volumeId: "fs-HD",
			path: ["Docs", "Sub"],
		});
		dispatch({
			type: "ClassicyAppRememberTab",
			app: { id: APP },
			tabs: "main",
			index: 3,
		});
		dispatch({
			type: "ClassicyAppRememberTab",
			app: { id: APP },
			tabs: "other",
			index: 1,
		});
		dispatch({ type: "ClassicyAppClose", app: { id: APP } });
		expect(session()).toEqual({
			fileDialog: { volumeId: "fs-HD", path: ["Docs", "Sub"] },
			tabs: { main: 3, other: 1 },
		});
		const saved = sanitizeStateForPersistence(useAppManager.getState());
		expect(saved.System.Manager.Applications.apps[APP]).toBeDefined();
		expect(
			saved.System.Manager.Applications.apps[APP]?.session,
		).toBeUndefined();
		expect(JSON.stringify(saved)).not.toContain("fs-HD");
	});

	it("ignore malformed places and apps that are not loaded", () => {
		for (const bad of [
			{ volumeId: 1, path: [] },
			{ volumeId: "v", path: "Docs" },
			{ volumeId: "v", path: ["Docs", 2] },
		]) {
			dispatch({
				type: "ClassicyAppRememberFileDialogFolder",
				app: { id: APP },
				...bad,
			});
		}
		for (const index of [-1, 1.5, "2"]) {
			dispatch({
				type: "ClassicyAppRememberTab",
				app: { id: APP },
				tabs: "main",
				index,
			});
		}
		dispatch({
			type: "ClassicyAppRememberTab",
			app: { id: APP },
			tabs: 7,
			index: 1,
		});
		expect(session()).toBeUndefined();
		dispatch({
			type: "ClassicyAppRememberTab",
			app: { id: "Nowhere.app" },
			tabs: "main",
			index: 1,
		});
		expect(
			useAppManager.getState().System.Manager.Applications.apps["Nowhere.app"],
		).toBeUndefined();
	});
});

describe("useClassicySessionTab", () => {
	const tabs = [
		{ title: "Themes", children: <p>Themes pane</p> },
		{ title: "Fonts", children: <p>Fonts pane</p> },
		{ title: "Sound", children: <p>Sound pane</p> },
	];
	const Panel = () => (
		<ClassicyTabs tabs={tabs} {...useClassicySessionTab(APP, "main")} />
	);
	const shown = () =>
		document.querySelector(".classicyTabActiveContent")?.textContent;

	it("opens on the first tab, then, reopened, on the tab it was left on", async () => {
		const first = render(<Panel />);
		expect(shown()).toBe("Themes pane");
		await userEvent.click(screen.getByText("Sound"));
		expect(session()?.tabs).toEqual({ main: 2 });
		first.unmount();
		render(<Panel />);
		expect(shown()).toBe("Sound pane");
	});

	it("reads an inherited key as no tab", () => {
		const { result } = renderHook(() => useClassicySessionTab(APP, "toString"));
		expect(result.current.defaultTab).toBe(0);
		act(() => result.current.onTabChange(1));
		expect(session()?.tabs?.toString).toBe(1);
	});
});

// Explorer's Properties on the desktop opens Display Properties (the
// remaining chapters' audit's 2.2): a panel opened on a remembered tab when
// it is closed, brought forward as it stands when open.
describe("openClassicyAppAtTab", () => {
	it("opens a closed app on the tab, and brings an open one forward as it stands", () => {
		expect(session()?.tabs).toBeUndefined();
		expect(openClassicyAppAtTab(dispatch, APP, "main", 3)).toBe(true);
		const app = () =>
			useAppManager.getState().System.Manager.Applications.apps[APP];
		expect(app()?.open).toBe(true);
		expect(session()?.tabs).toEqual({ main: 3 });
		act(() =>
			dispatch({
				type: "ClassicyAppRememberTab",
				app: { id: APP },
				tabs: "main",
				index: 1,
			}),
		);
		expect(openClassicyAppAtTab(dispatch, APP, "main", 3)).toBe(true);
		expect(session()?.tabs).toEqual({ main: 1 });
	});

	it("opens nothing for an app that is not loaded", () => {
		const calls: unknown[] = [];
		expect(
			openClassicyAppAtTab(
				(action) => calls.push(action),
				"Nope.app",
				"main",
				3,
			),
		).toBe(false);
		expect(calls).toEqual([]);
	});
});
