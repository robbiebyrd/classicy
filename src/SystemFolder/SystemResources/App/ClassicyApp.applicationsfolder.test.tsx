import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { registerApp } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";

const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: { apps: {} },
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

type IconAction = {
	type: string;
	kind?: string;
	hidden?: boolean;
	inApplications?: boolean;
	balloonHelp?: { title?: string; content: string };
	app?: { id?: string };
};

const actionsOfType = (type: string): IconAction[] =>
	mockDispatch.mock.calls
		.map((call) => call[0] as IconAction)
		.filter((a) => a.type === type);

const iconAddActions = () => actionsOfType("ClassicyDesktopIconAdd");
const iconRemoveActions = () => actionsOfType("ClassicyDesktopIconRemove");

describe("ClassicyApp icon visibility", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("shows a desktop icon and lists in Applications by default", () => {
		render(<ClassicyApp id="Reg.app" name="Reg" icon="/icons/reg.png" />);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].kind).toBe("app_shortcut");
		expect(adds[0].hidden).toBeFalsy();
		expect(adds[0].inApplications).toBeUndefined();
	});

	it("registers a hidden icon for showDesktopIcon={false}", () => {
		render(
			<ClassicyApp
				id="Panel.app"
				name="Panel"
				icon="/icons/panel.png"
				showDesktopIcon={false}
			/>,
		);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].hidden).toBe(true);
		expect(adds[0].inApplications).toBeUndefined();
	});

	it("registers a visible icon opted out of Applications", () => {
		render(
			<ClassicyApp
				id="Solo.app"
				name="Solo"
				icon="/icons/solo.png"
				showInApplicationsFolder={false}
			/>,
		);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].hidden).toBeFalsy();
		expect(adds[0].inApplications).toBe(false);
	});

	it("removes the icon when both surfaces are off", () => {
		render(
			<ClassicyApp
				id="Ghost.app"
				name="Ghost"
				icon="/icons/ghost.png"
				showDesktopIcon={false}
				showInApplicationsFolder={false}
			/>,
		);
		expect(iconAddActions()).toHaveLength(0);
		const removes = iconRemoveActions();
		expect(removes).toHaveLength(1);
		expect(removes[0].app?.id).toBe("Ghost.app");
	});

	it("registers no icon at all for an extension, whatever the props say", () => {
		render(
			<ClassicyApp
				id="Ext.app"
				name="Ext"
				icon="/icons/ext.png"
				extension
				showDesktopIcon
				showInApplicationsFolder
			/>,
		);
		expect(iconAddActions()).toHaveLength(0);
		expect(iconRemoveActions()).toHaveLength(0);
	});

	it("attaches normalized balloon help titled with the app name", () => {
		render(
			<ClassicyApp
				id="TV.app"
				name="TV"
				icon="/icons/tv.png"
				desktopIconBalloonHelp="Watch TV."
			/>,
		);
		expect(iconAddActions()[0].balloonHelp).toEqual({
			title: "TV",
			content: "Watch TV.",
		});
	});

	it("attaches no balloon for an app with neither prop nor manifest", () => {
		render(
			<ClassicyApp id="Plain.app" name="Plain" icon="/icons/plain.png" />,
		);
		expect(iconAddActions()[0].balloonHelp).toBeUndefined();
	});

	it("falls back to the registered manifest description when no prop is given", () => {
		registerApp({
			id: "Described.app",
			description: "Does described things.",
		});
		render(
			<ClassicyApp
				id="Described.app"
				name="Described"
				icon="/icons/described.png"
			/>,
		);
		expect(iconAddActions()[0].balloonHelp).toEqual({
			title: "Described",
			content: "Does described things.",
		});
	});

	it("lets an explicit prop win over the manifest description", () => {
		registerApp({
			id: "Explicit.app",
			description: "Manifest copy.",
		});
		render(
			<ClassicyApp
				id="Explicit.app"
				name="Explicit"
				icon="/icons/explicit.png"
				desktopIconBalloonHelp="Prop copy."
			/>,
		);
		expect(iconAddActions()[0].balloonHelp).toEqual({
			title: "Explicit",
			content: "Prop copy.",
		});
	});

	it("passes the object form of balloon help through", () => {
		render(
			<ClassicyApp
				id="TV.app"
				name="TV"
				icon="/icons/tv.png"
				desktopIconBalloonHelp={{
					title: "Television",
					content: "Watch TV.",
					position: "bottom-center",
				}}
			/>,
		);
		expect(iconAddActions()[0].balloonHelp).toEqual({
			title: "Television",
			content: "Watch TV.",
			position: "bottom-center",
		});
	});
});

describe("ClassicyApp deprecated icon props", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("maps noDesktopIcon to a hidden icon", () => {
		render(
			<ClassicyApp
				id="Panel.app"
				name="Panel"
				icon="/icons/panel.png"
				noDesktopIcon
			/>,
		);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].hidden).toBe(true);
	});

	it("still honors noDesktopIcon + inApplicationsFolder", () => {
		render(
			<ClassicyApp
				id="DriveSetup.app"
				name="Drive Setup"
				icon="/icons/disk.png"
				noDesktopIcon
				inApplicationsFolder
			/>,
		);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].kind).toBe("app_shortcut");
		expect(adds[0].hidden).toBe(true);
		expect(adds[0].app?.id).toBe("DriveSetup.app");
	});

	it("maps inApplicationsFolder={false} to an opt-out", () => {
		render(
			<ClassicyApp
				id="Solo.app"
				name="Solo"
				icon="/icons/solo.png"
				inApplicationsFolder={false}
			/>,
		);
		expect(iconAddActions()[0].inApplications).toBe(false);
	});

	it("lets the new props win when both forms are passed", () => {
		render(
			<ClassicyApp
				id="Both.app"
				name="Both"
				icon="/icons/both.png"
				noDesktopIcon
				showDesktopIcon
			/>,
		);
		expect(iconAddActions()[0].hidden).toBeFalsy();
	});
});
