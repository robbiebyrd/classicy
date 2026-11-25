// The WinHelp probe package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { registerAppleGuideTopic } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import {
	AppleGuideWindow,
	classicyAppleGuidePageText,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideWindow";
import { ClassicyContextualMenuContext } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuContext.internal";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const { dispatch, appData } = vi.hoisted(() => ({
	dispatch: vi.fn(),
	appData: { value: {} as Record<string, unknown> },
}));

vi.mock("@/SystemFolder/Extensions/AppleGuide/AppleGuide.scss", () => ({}));
vi.mock(
	"@/SystemFolder/SystemResources/Assistant/ClassicyAssistant.scss",
	() => ({}),
);
vi.mock("@/SystemFolder/SystemResources/Pager/ClassicyPager.scss", () => ({}));

// Reduce ClassicyWindow to a wrapper: the real chrome is tested elsewhere.
vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: ({
		children,
		className,
		onCloseFunc,
		resizable,
		minimumSize,
		title,
		hideIcon,
	}: {
		children?: ReactNode;
		className?: string;
		onCloseFunc?: (id: string) => void;
		resizable?: boolean;
		minimumSize?: number[];
		title?: string;
		hideIcon?: boolean;
	}) => (
		<div
			data-testid="window"
			className={className}
			data-resizable={String(resizable)}
			data-minimum={minimumSize ? minimumSize.join("x") : ""}
			data-title={title ?? ""}
			data-hide-icon={String(hideIcon)}
		>
			{children}
			<button type="button" onClick={() => onCloseFunc?.("w")}>
				close
			</button>
		</div>
	),
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatch,
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

registerAppleGuideTopic({
	id: "one-page",
	title: "About Help",
	pages: [<p key="0">The Help menu includes:</p>],
});
registerAppleGuideTopic({
	id: "three-page",
	title: "Three Pager",
	pages: [
		<p key="0">First page body</p>,
		<p key="1">Second page body</p>,
		<p key="2">Third page body</p>,
	],
});

beforeEach(() => {
	dispatch.mockClear();
	appData.value = {};
});

describe("AppleGuideWindow", () => {
	// AppleGuide.scss sizes this one window border-box by its own class (no
	// `:has(.appleGuideWindow)`, which Firefox 113-120 lacks), the host's
	// className after it.
	it("marks its window appleGuideWindowFrame", () => {
		render(<AppleGuideWindow topicId="one-page" className="hostGuide" />);
		expect(screen.getByTestId("window")).toHaveClass(
			"appleGuideWindowFrame",
			"hostGuide",
		);
	});

	it("renders the topic title in the header band", () => {
		const { container } = render(<AppleGuideWindow topicId="one-page" />);
		expect(
			container.querySelector(".classicyAssistantHeader"),
		).toHaveTextContent("About Help");
	});

	it("keeps the topic title on every page", () => {
		appData.value = { pages: { "three-page": 2 } };
		const { container } = render(<AppleGuideWindow topicId="three-page" />);
		expect(
			container.querySelector(".classicyAssistantHeader"),
		).toHaveTextContent("Three Pager");
	});

	it("renders no footer buttons", () => {
		const { container } = render(<AppleGuideWindow topicId="one-page" />);
		expect(
			container.querySelector(".classicyAssistantFooterButtons")?.children,
		).toHaveLength(0);
	});

	it("renders the current page body", () => {
		render(<AppleGuideWindow topicId="one-page" />);
		expect(screen.getByText("The Help menu includes:")).toBeInTheDocument();
	});

	it("shows the end marker on the last page", () => {
		render(<AppleGuideWindow topicId="one-page" />);
		expect(screen.getByText("- End -")).toBeInTheDocument();
	});

	it("hides the end marker on a non-final page", () => {
		appData.value = { pages: { "three-page": 0 } };
		render(<AppleGuideWindow topicId="three-page" />);
		expect(screen.queryByText("- End -")).not.toBeInTheDocument();
	});

	it("renders the page indicated by store state", () => {
		appData.value = { pages: { "three-page": 1 } };
		render(<AppleGuideWindow topicId="three-page" />);
		expect(screen.getByText("Second page body")).toBeInTheDocument();
	});

	it("dispatches SetPage when the forward arrow is clicked", async () => {
		appData.value = { pages: { "three-page": 0 } };
		render(<AppleGuideWindow topicId="three-page" />);
		await userEvent.click(screen.getByLabelText("Next page"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppAppleGuideSetPage",
			app: { id: "AppleGuide.app" },
			topicId: "three-page",
			page: 1,
		});
	});

	it("does not move pages on its own — the store drives the index", async () => {
		appData.value = { pages: { "three-page": 0 } };
		render(<AppleGuideWindow topicId="three-page" />);
		await userEvent.click(screen.getByLabelText("Next page"));
		expect(screen.getByText("First page body")).toBeInTheDocument();
		expect(screen.queryByText("Second page body")).not.toBeInTheDocument();
	});

	it("dispatches CloseTopic when the window is closed", async () => {
		render(<AppleGuideWindow topicId="one-page" />);
		await userEvent.click(screen.getByText("close"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppAppleGuideCloseTopic",
			app: { id: "AppleGuide.app" },
			topicId: "one-page",
		});
	});

	it("renders nothing for an unregistered topic", () => {
		const { container } = render(<AppleGuideWindow topicId="missing" />);
		expect(container).toBeEmptyDOMElement();
	});
});

// The page's text, as Options ▸ Copy puts it on the clipboard.
describe("classicyAppleGuidePageText", () => {
	const body = (html: string) => {
		const el = document.createElement("div");
		el.innerHTML = html;
		return el;
	};

	it("is the title, a blank line and the page's text, the end marker left out", () => {
		expect(
			classicyAppleGuidePageText(
				"Printing",
				body('<p>Click Print.</p><p class="appleGuideEnd">- End -</p>'),
			),
		).toBe("Printing\n\nClick Print.");
	});

	it("is the title alone with no page or an empty one", () => {
		expect(classicyAppleGuidePageText("Printing", null)).toBe("Printing");
		expect(
			classicyAppleGuidePageText(
				"Printing",
				body('<p class="appleGuideEnd">- End -</p>'),
			),
		).toBe("Printing");
	});
});

// WinHelp's task topic window under `help.topicWindow` "winhelp" (the WIG
// audit's 12.15 and 12.16; WIG Ch.12 "Task Topic Windows", pp.279-280,
// Figure 12.10): sizable, captioned, and a row of command buttons, Help
// Topics, Back and Options (Copy), above the topic. Without the key, none of
// it (Mac OS 8's fixed Apple Guide window).
describe("AppleGuideWindow — WinHelp's topic window (layout.help.topicWindow)", () => {
	const WINHELP = "winhelp-window-probe";
	const active = { id: "platinum" };
	connectClassicyAssetPackageSource({
		getId: () => active.id,
		subscribe: () => () => {},
	});
	registerClassicyAppearancePackage({
		id: WINHELP,
		name: "WinHelp window probe",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: `${WINHELP}-default`,
			package: WINHELP,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			menu: { accessKeys: "explicit" },
			help: { topicWindow: "winhelp" },
		},
	});

	const showContextMenu = vi.fn();
	const renderWindow = (topicId: string) =>
		render(
			<ClassicyContextualMenuContext.Provider
				value={{ showContextMenu, hideContextMenu: vi.fn() }}
			>
				<AppleGuideWindow topicId={topicId} />
			</ClassicyContextualMenuContext.Provider>,
		);
	const bar = () => document.querySelector(".appleGuideButtonBar");
	const barButton = (name: string) => {
		const button = [
			...(bar()?.querySelectorAll<HTMLButtonElement>("button") ?? []),
		].find((b) => b.textContent === name);
		if (!button) throw new Error(`no ${name} button`);
		return button;
	};

	beforeEach(() => {
		active.id = WINHELP;
		showContextMenu.mockClear();
	});

	afterEach(() => {
		active.id = "platinum";
	});

	it("is a sizable primary window with its caption, at least 320 × 200", () => {
		renderWindow("one-page");
		const win = screen.getByTestId("window");
		expect(win).toHaveAttribute("data-resizable", "true");
		expect(win).toHaveAttribute("data-minimum", "320x200");
		expect(win).toHaveAttribute("data-title", "Apple Guide");
		expect(win).toHaveAttribute("data-hide-icon", "false");
		expect(
			win.querySelector(".appleGuideWindow.appleGuideWindowWithButtonBar"),
		).not.toBeNull();
	});

	it("puts Help Topics, Back and Options above the topic, with winhlp32's keys", () => {
		renderWindow("one-page");
		const buttons = [...(bar()?.querySelectorAll("button") ?? [])];
		expect(buttons.map((b) => b.textContent)).toEqual([
			"Help Topics",
			"Back",
			"Options",
		]);
		// Before the assistant, which keeps its own footer.
		expect(bar()?.nextElementSibling).toHaveClass("classicyAssistant");
		const key = (b: Element) =>
			b.querySelector('[data-classicy-part="access-key"]')?.textContent;
		expect(key(barButton("Help Topics"))).toBe("T");
		expect(key(barButton("Options"))).toBe("O");
		// The footer's "< Back" holds B.
		expect(key(barButton("Back"))).toBeUndefined();
		expect(barButton("Options")).toHaveAttribute("aria-haspopup", "menu");
	});

	it("opens the Help Topics browser", async () => {
		renderWindow("one-page");
		await userEvent.click(barButton("Help Topics"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppAppleGuideShowTopics",
			app: { id: "AppleGuide.app" },
		});
	});

	it("goes back a page, and is dimmed on the first", async () => {
		appData.value = { pages: { "three-page": 0 } };
		const { unmount } = renderWindow("three-page");
		expect(barButton("Back")).toBeDisabled();
		unmount();
		appData.value = { pages: { "three-page": 2 } };
		renderWindow("three-page");
		await userEvent.click(barButton("Back"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppAppleGuideSetPage",
			app: { id: "AppleGuide.app" },
			topicId: "three-page",
			page: 1,
		});
	});

	it("drops Options' menu of Copy below the button, which copies the page", async () => {
		const writeText = vi.fn(() => Promise.resolve());
		Object.defineProperty(navigator, "clipboard", {
			value: { writeText },
			configurable: true,
		});
		appData.value = { pages: { "three-page": 1 } };
		renderWindow("three-page");
		const options = barButton("Options");
		options.getBoundingClientRect = () =>
			({ left: 100, bottom: 50, top: 27, right: 175 }) as DOMRect;
		await userEvent.click(options);
		expect(showContextMenu).toHaveBeenCalledTimes(1);
		const [items, at, opts] = showContextMenu.mock.calls[0] as [
			ClassicyMenuItem[],
			[number, number],
			{ helpItem?: boolean },
		];
		expect(at).toEqual([99, 49]);
		expect(opts).toEqual({ helpItem: false });
		expect(items.map((item) => [item.title, item.accessKey])).toEqual([
			["Copy", "o"],
		]);
		items[0].onClickFunc?.();
		expect(writeText).toHaveBeenCalledWith("Three Pager\n\nSecond page body");
		Reflect.deleteProperty(navigator, "clipboard");
	});

	it("logs, and copies nothing, with no clipboard", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		Reflect.deleteProperty(navigator, "clipboard");
		renderWindow("one-page");
		await userEvent.click(barButton("Options"));
		const [items] = showContextMenu.mock.calls[0] as [ClassicyMenuItem[]];
		items[0].onClickFunc?.();
		expect(warn).toHaveBeenCalledWith(
			"[AppleGuide] No clipboard to copy the topic to",
		);
		warn.mockRestore();
	});

	it("keeps Mac OS 8's fixed window, with no button row, without the key", () => {
		active.id = "platinum";
		renderWindow("one-page");
		const win = screen.getByTestId("window");
		expect(win).toHaveAttribute("data-resizable", "false");
		expect(win).toHaveAttribute("data-minimum", "");
		expect(win).toHaveAttribute("data-title", "");
		expect(win).toHaveAttribute("data-hide-icon", "true");
		expect(bar()).toBeNull();
		expect(win.querySelector(".appleGuideWindowWithButtonBar")).toBeNull();
	});
});
