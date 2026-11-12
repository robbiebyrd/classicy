// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { APPEARANCE_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManagerManifest";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicySoundPack,
	getClassicySoundPack,
	registerClassicySoundPack,
} from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundPacks";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

// Plan 0018-dbd task 6A (0200-hl0): the Sound tab lists the alerts of the pack
// that plays, across package switches and late pack registrations.
const base = getTheme("default");
const packageWith = (id: string, soundPack: string) =>
	registerClassicyAppearancePackage({
		id,
		name: id,
		css: "",
		defaults: {
			...structuredClone(base),
			id,
			name: id,
			package: id,
			sound: { ...base.sound, pack: soundPack },
		},
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
	});
const soundPack = (id: string, alerts: string[]): ClassicySoundPack => {
	const platinum = getClassicySoundPack("platinum") as ClassicySoundPack;
	return {
		...platinum,
		id,
		name: id,
		packageId: undefined,
		alerts: alerts.map((value) => ({ value, label: value })),
	};
};

registerClassicySoundPack(soundPack("sw-a-pack", ["A1", "A2"]));
registerClassicySoundPack(soundPack("sw-b-pack", ["B1"]));
packageWith("sw-a", "sw-a-pack");
packageWith("sw-b", "sw-b-pack");

const openSoundTab = async () => {
	render(
		<ClassicyAppManagerProvider>
			<ClassicyDesktop controlStrip={false} />
		</ClassicyAppManagerProvider>,
	);
	await waitFor(() => {
		expect(
			useAppManager.getState().System.Manager.Applications.apps[
				APPEARANCE_MANAGER_APP_ID
			],
		).toBeDefined();
	});
	act(() => {
		dispatch({
			type: "ClassicyAppOpen",
			app: {
				id: APPEARANCE_MANAGER_APP_ID,
				name: "Appearance Manager",
				icon: "",
			},
		});
	});
	const win = await screen.findByRole("application", {
		name: "Appearance Manager",
	});
	const tab = within(win).getByRole("tab", { name: "Sound" });
	fireEvent.mouseDown(tab);
	fireEvent.mouseUp(tab);
	return within(within(win).getByRole("tabpanel"));
};

const switchTo = (packageId: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
	});

describe("Appearance Manager Sound tab across package switches", {
	timeout: 15_000,
}, () => {
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(
			JSON.parse(
				JSON.stringify(DefaultAppManagerState),
			) as typeof DefaultAppManagerState,
			true,
		);
	});

	const alertOptions = async (panel: ReturnType<typeof within>) => {
		const user = userEvent.setup();
		await user.click(panel.getAllByRole("combobox")[1]);
		const names = screen
			.getAllByRole("option")
			.map((o) => o.textContent?.replace(/^✓/, ""));
		await user.click(panel.getAllByRole("combobox")[1]);
		await waitFor(() =>
			expect(screen.queryAllByRole("option")).toHaveLength(0),
		);
		return names;
	};

	it("lists the new package's pack alerts after a switch", async () => {
		switchTo("sw-a");
		const panel = await openSoundTab();
		expect(await alertOptions(panel)).toEqual(["A1", "A2"]);
		switchTo("sw-b");
		await waitFor(async () =>
			expect(await alertOptions(panel)).toEqual(["B1"]),
		);
	});

	it("lists what plays (Platinum's alerts) while the theme's pack is unregistered, then the pack's once it registers", async () => {
		// A theme loaded from a host (or saved) can name a pack that has not
		// registered yet; the provider plays the default pack meanwhile.
		act(() => {
			useAppManager.setState((s) => {
				s.System.Manager.Appearance.activeTheme.sound.pack = "sw-c-pack";
				return s;
			});
		});
		const panel = await openSoundTab();
		expect(await alertOptions(panel)).toHaveLength(7);
		act(() => registerClassicySoundPack(soundPack("sw-c-pack", ["C1"])));
		await waitFor(async () =>
			expect(await alertOptions(panel)).toEqual(["C1"]),
		);
	});

	it("re-reads the default pack's alerts an alert-less pack inherits when that default is re-registered", async () => {
		const platinum = getClassicySoundPack("platinum") as ClassicySoundPack;
		const {
			alerts: _a,
			defaultAlert: _d,
			...bare
		} = soundPack("sw-d-pack", []);
		registerClassicySoundPack(bare as ClassicySoundPack);
		act(() => {
			useAppManager.setState((s) => {
				s.System.Manager.Appearance.activeTheme.sound.pack = "sw-d-pack";
				return s;
			});
		});
		const panel = await openSoundTab();
		try {
			expect(await alertOptions(panel)).toHaveLength(7);
			act(() =>
				registerClassicySoundPack({
					...platinum,
					alerts: [{ value: "ClassicyAlertBonk", label: "Bonk" }],
				}),
			);
			await waitFor(async () =>
				expect(await alertOptions(panel)).toEqual(["Bonk"]),
			);
		} finally {
			registerClassicySoundPack(platinum);
		}
	});
});
