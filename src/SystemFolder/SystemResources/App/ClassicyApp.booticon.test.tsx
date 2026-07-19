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
						Applications: {
							apps: {
								"Paint.app": {
									id: "Paint.app",
									name: "Paint",
									icon: "/icons/paint.png",
									open: true,
									focused: false,
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

type BootIconEvent = {
	type: string;
	id?: string;
	icon?: string;
	name?: string;
};

const paradeAddEvents = (): BootIconEvent[] =>
	mockDispatch.mock.calls
		.map((call) => call[0] as BootIconEvent)
		.filter((e) => e.type === "ClassicyBootParadeIconAdd");

function renderApp(props: {
	bootIcon?: boolean | string;
	extension?: boolean;
}) {
	return render(
		<ClassicyApp
			id="Paint.app"
			name="Paint"
			icon="/icons/paint.png"
			noDesktopIcon
			{...props}
		>
			<div />
		</ClassicyApp>,
	);
}

describe("ClassicyApp bootIcon prop", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
	});

	it("bootIcon={true} dispatches a parade add with the app's own icon", () => {
		renderApp({ bootIcon: true });
		expect(paradeAddEvents()).toEqual([
			{
				type: "ClassicyBootParadeIconAdd",
				id: "Paint.app",
				icon: "/icons/paint.png",
				name: "Paint",
			},
		]);
	});

	it("bootIcon as a string dispatches a parade add with that icon", () => {
		renderApp({ bootIcon: "/icons/custom-ext.png" });
		expect(paradeAddEvents()).toEqual([
			{
				type: "ClassicyBootParadeIconAdd",
				id: "Paint.app",
				icon: "/icons/custom-ext.png",
				name: "Paint",
			},
		]);
	});

	it("no bootIcon prop dispatches nothing to the parade", () => {
		renderApp({});
		expect(paradeAddEvents()).toEqual([]);
	});

	it("extensions ignore bootIcon — they are already in the parade", () => {
		renderApp({ bootIcon: true, extension: true });
		expect(paradeAddEvents()).toEqual([]);
	});
});
