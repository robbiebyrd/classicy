import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockState = vi.hoisted(() => ({ disableBalloonHelp: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: {
							selectedIcons: [] as string[],
							icons: [{ appId: "TestApp", location: [100, 200] }],
							disableBalloonHelp: mockState.disableBalloonHelp,
						},
						Applications: {
							apps: {
								"Finder.app": { windows: [] as unknown[] },
								TestApp: { open: false },
							},
						},
					},
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss",
	() => ({}),
);

import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";

const defaultProps = {
	appId: "TestApp",
	appName: "Test Application",
	icon: "/icons/test.png",
	kind: "app_shortcut",
};

const iconRoot = () => screen.getByRole("button");

describe("ClassicyDesktopIcon balloon help", () => {
	it("shows app-supplied balloon help on hover", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				{...defaultProps}
				balloonHelp={{ content: "Opens the editor.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(await screen.findByText("Opens the editor.")).toBeInTheDocument();
	});

	it("hides it again on mouse leave", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				{...defaultProps}
				balloonHelp={{ content: "Opens the editor.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(await screen.findByText("Opens the editor.")).toBeInTheDocument();
		fireEvent.mouseLeave(iconRoot());
		expect(screen.queryByText("Opens the editor.")).not.toBeInTheDocument();
	});

	it("keeps the icon root free of a balloon wrapper and its inline position", () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				{...defaultProps}
				balloonHelp={{ content: "Opens the editor.", delay: 0 }}
			/>,
		);
		const root = iconRoot();
		expect(root).toHaveClass("classicyDesktopIcon");
		expect(root.parentElement).not.toHaveClass("classicyBalloonHelpAnchor");
		// location [100, 200] is rendered as top: 200px / left: 100px
		expect(root).toHaveStyle({ top: "200px", left: "100px" });
	});

	it("is suppressed when balloon help is globally disabled", async () => {
		mockState.disableBalloonHelp = true;
		render(
			<ClassicyDesktopIcon
				{...defaultProps}
				balloonHelp={{ content: "Opens the editor.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Opens the editor.")).not.toBeInTheDocument();
	});

	it("shows stock copy for the trash with no balloonHelp prop", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				appId="Trash"
				appName="Trash"
				icon="/icons/trash.png"
				kind="trash"
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(
			await screen.findByText(/This is the Trash\./, {}, { timeout: 2000 }),
		).toBeInTheDocument();
	});

	it("shows stock copy for a drive with no balloonHelp prop", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				appId="Finder.app"
				appName="Macintosh HD"
				icon="/icons/hd.png"
				kind="drive"
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(
			await screen.findByText(/This is a disk icon\./, {}, { timeout: 2000 }),
		).toBeInTheDocument();
	});

	it("lets an explicit balloonHelp override the stock copy for its kind", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyDesktopIcon
				appId="Trash"
				appName="Trash"
				icon="/icons/trash.png"
				kind="trash"
				balloonHelp={{ content: "Custom trash text.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(iconRoot());
		expect(await screen.findByText("Custom trash text.")).toBeInTheDocument();
		expect(screen.queryByText(/This is the Trash\./)).not.toBeInTheDocument();
	});

	it("shows nothing for an app icon with no balloonHelp", async () => {
		mockState.disableBalloonHelp = false;
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		fireEvent.mouseEnter(iconRoot());
		await new Promise((resolve) => setTimeout(resolve, 10));
		// The icon's own label is a <p>, so assert on the balloon container
		// rather than on paragraphs.
		expect(
			container.ownerDocument.querySelector(".classicyBalloonHelpContainer"),
		).toBeNull();
	});
});
