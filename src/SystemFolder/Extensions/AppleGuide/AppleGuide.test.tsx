// The WinHelp probe package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { AppleGuide } from "@/SystemFolder/Extensions/AppleGuide/AppleGuide";

const { appData } = vi.hoisted(() => ({
	appData: { value: {} as Record<string, unknown> },
}));

vi.mock("@/SystemFolder/Extensions/AppleGuide/AppleGuide.scss", () => ({}));

vi.mock("@/SystemFolder/SystemResources/App/ClassicyApp", () => ({
	ClassicyApp: ({
		id,
		name,
		extension,
		children,
	}: {
		id: string;
		name: string;
		extension?: boolean;
		children?: ReactNode;
	}) => (
		<div data-testid="app" data-id={id} data-name={name} data-ext={!!extension}>
			{children}
		</div>
	),
}));

vi.mock("@/SystemFolder/Extensions/AppleGuide/ClassicyHelpTopics", () => ({
	ClassicyHelpTopics: () => <div data-testid="help-topics" />,
}));

vi.mock("@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow", () => ({
	AppleGuideWindow: ({ topicId }: { topicId: string }) => (
		<div data-testid="topic-window">{topicId}</div>
	),
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => vi.fn(),
		useAppManager: (selector: (s: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Applications: {
							apps: { "AppleGuide.app": { data: appData.value } },
						},
					},
				},
			}),
	}),
);

beforeEach(() => {
	appData.value = {};
});

describe("AppleGuide", () => {
	it("registers as a headless extension named Apple Guide", () => {
		render(<AppleGuide />);
		const app = screen.getByTestId("app");
		expect(app).toHaveAttribute("data-id", "AppleGuide.app");
		expect(app).toHaveAttribute("data-name", "Apple Guide");
		expect(app).toHaveAttribute("data-ext", "true");
	});

	it("renders no topic windows when none are open", () => {
		render(<AppleGuide />);
		expect(screen.queryByTestId("topic-window")).not.toBeInTheDocument();
	});

	it("renders one window per open topic", () => {
		appData.value = { openTopics: ["about-balloon-help", "other"] };
		render(<AppleGuide />);
		expect(screen.getAllByTestId("topic-window")).toHaveLength(2);
		expect(screen.getByText("about-balloon-help")).toBeInTheDocument();
	});
});

// The Help Topics browser (the WIG audit's 12.21) is drawn while it is
// open, under `help.topicWindow` "winhelp" alone.
describe("AppleGuide — the Help Topics browser", () => {
	const WINHELP = "winhelp-guide-probe";
	const active = { id: "platinum" };
	connectClassicyAssetPackageSource({
		getId: () => active.id,
		subscribe: () => () => {},
	});
	registerClassicyAppearancePackage({
		id: WINHELP,
		name: "WinHelp guide probe",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: `${WINHELP}-default`,
			package: WINHELP,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			help: { topicWindow: "winhelp" },
		},
	});

	afterEach(() => {
		active.id = "platinum";
	});

	it("draws it while it is open, beside the topic windows", () => {
		active.id = WINHELP;
		appData.value = {
			openTopics: ["about-balloon-help"],
			helpTopicsOpen: true,
		};
		render(<AppleGuide />);
		expect(screen.getByTestId("help-topics")).toBeInTheDocument();
		expect(screen.getAllByTestId("topic-window")).toHaveLength(1);
	});

	it("draws nothing while it is closed", () => {
		active.id = WINHELP;
		appData.value = { helpTopicsOpen: false };
		render(<AppleGuide />);
		expect(screen.queryByTestId("help-topics")).not.toBeInTheDocument();
	});

	it("draws nothing without the key, open or not", () => {
		appData.value = { helpTopicsOpen: true };
		render(<AppleGuide />);
		expect(screen.queryByTestId("help-topics")).not.toBeInTheDocument();
	});
});
