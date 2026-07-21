import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
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

type IconAddAction = {
	type: string;
	kind?: string;
	hidden?: boolean;
	app?: { id?: string };
};

const iconAddActions = (): IconAddAction[] =>
	mockDispatch.mock.calls
		.map((call) => call[0] as IconAddAction)
		.filter((a) => a.type === "ClassicyDesktopIconAdd");

describe("ClassicyApp inApplicationsFolder prop", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("registers a HIDDEN app_shortcut icon when noDesktopIcon + inApplicationsFolder", () => {
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

	it("registers NO icon when noDesktopIcon alone (no inApplicationsFolder)", () => {
		render(
			<ClassicyApp
				id="Panel.app"
				name="Panel"
				icon="/icons/panel.png"
				noDesktopIcon
			/>,
		);
		expect(iconAddActions()).toHaveLength(0);
	});

	it("registers a normal (non-hidden) app_shortcut icon for a regular app", () => {
		render(<ClassicyApp id="Reg.app" name="Reg" icon="/icons/reg.png" />);
		const adds = iconAddActions();
		expect(adds).toHaveLength(1);
		expect(adds[0].kind).toBe("app_shortcut");
		expect(adds[0].hidden).toBeFalsy();
	});
});
