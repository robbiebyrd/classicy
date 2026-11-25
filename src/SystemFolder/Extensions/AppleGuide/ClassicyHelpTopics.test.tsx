// The probe package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import {
	type HelpTopic,
	registerAppleGuideTopic,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import {
	ClassicyHelpTopics,
	classicyHelpTopicsContents,
} from "@/SystemFolder/Extensions/AppleGuide/ClassicyHelpTopics";

// WinHelp's Help Topics browser (the WIG audit's 12.21; WIG Ch.12 "The Help
// Topics Browser" and "The Help Topic Tabs", pp.284-288, Figure 12.13;
// winhlp32.exe's dialog on the Windows 98 SE CD).

const { dispatch, windowProps } = vi.hoisted(() => ({
	dispatch: vi.fn(),
	windowProps: { value: {} as Record<string, unknown> },
}));

vi.mock(
	"@/SystemFolder/Extensions/AppleGuide/ClassicyHelpTopics.scss",
	() => ({}),
);

// Reduce ClassicyWindow to a wrapper that records its props: the real
// chrome is tested elsewhere.
vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow", () => ({
	ClassicyWindow: (props: {
		children?: ReactNode;
		className?: string;
		title?: string;
		onCloseFunc?: (id: string) => void;
	}) => {
		windowProps.value = props;
		return (
			<div data-testid="window" className={props.className} title={props.title}>
				{props.children}
				<button type="button" onClick={() => props.onCloseFunc?.("w")}>
					close box
				</button>
			</div>
		);
	},
}));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatch,
		useAppManager: (selector: (s: unknown) => unknown) =>
			selector({
				System: { Manager: { Applications: { apps: {} } } },
			}),
	}),
);

const topic = (id: string, title: string, book?: string): HelpTopic => ({
	id,
	title,
	book,
	pages: [title],
});

registerAppleGuideTopic(
	topic("ht-print-queue", "To view the print queue", "Printing"),
);
registerAppleGuideTopic(topic("ht-find", "To find a file", "Finding Things"));
registerAppleGuideTopic(
	topic("ht-print-settings", "To change printer settings", "Printing"),
);
registerAppleGuideTopic(topic("ht-loose", "Keyboard shortcuts"));

// The store is not mounted: stand in for its connection of the active
// package id.
const active = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => active.id,
	subscribe: () => () => {},
});
registerClassicyAppearancePackage({
	id: "help-names-probe",
	name: "Help names probe",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "help-names-probe-default",
		package: "help-names-probe",
	},
	layout: {
		...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
		help: { topicWindow: "winhelp" },
	},
	apps: { "AppleGuide.app": { name: "Windows Help" } },
});

beforeEach(() => {
	dispatch.mockClear();
});

afterEach(() => {
	active.id = "platinum";
});

const rows = () =>
	[
		...document.querySelectorAll<HTMLElement>(
			".classicyHelpTopicsList .classicyTreeNodeLabelHolder",
		),
	].map(
		(row) =>
			`${row.classList.contains("selected") ? "*" : ""}${row.querySelector(".classicyTreeNodeLabel")?.textContent}`,
	);
const row = (label: string) => {
	const holder = screen
		.getByText(label)
		.closest<HTMLElement>(".classicyTreeNodeLabelHolder");
	if (!holder) throw new Error(`no row ${label}`);
	return holder;
};
const actionButton = () =>
	document.querySelector<HTMLButtonElement>(
		".classicyHelpTopicsButtons button",
	) as HTMLButtonElement;
const prompt = () =>
	document.querySelector(".classicyHelpTopicsPrompt")?.textContent;

const SHOW_PRINT_SETTINGS = {
	type: "ClassicyAppAppleGuideShowTopic",
	app: { id: "AppleGuide.app" },
	topicId: "ht-print-settings",
};
const CLOSE = {
	type: "ClassicyAppAppleGuideCloseTopics",
	app: { id: "AppleGuide.app" },
};

describe("classicyHelpTopicsContents", () => {
	it("puts topics into their books, each where its first topic stood, the rest at the top level", () => {
		const entries = classicyHelpTopicsContents([
			topic("a", "A", "Book 1"),
			topic("b", "B"),
			topic("c", "C", "Book 2"),
			topic("d", "D", "Book 1"),
			topic("e", "E", ""),
		]);
		expect(
			entries.map((entry) =>
				entry.kind === "book"
					? [entry.id, entry.topics.map((t) => t.id)]
					: [entry.id],
			),
		).toEqual([
			["book:Book 1", ["a", "d"]],
			["topic:b"],
			["book:Book 2", ["c"]],
			["topic:e"],
		]);
	});
});

describe("ClassicyHelpTopics", () => {
	it("is a modeless dialog titled with the help application's name, sized as winhlp32's", () => {
		render(<ClassicyHelpTopics />);
		expect(screen.getByTestId("window")).toHaveAttribute(
			"title",
			"Help Topics: Apple Guide",
		);
		expect(screen.getByTestId("window")).toHaveClass(
			"classicyHelpTopicsWindow",
		);
		expect(windowProps.value).toMatchObject({
			id: "apple_guide_help_topics",
			appId: "AppleGuide.app",
			contentFrame: true,
			resizable: false,
			zoomable: false,
			collapsable: false,
			hideIcon: true,
			initialSize: [428, 423],
		});
	});

	it("names the help file by the package's display name for Apple Guide", () => {
		active.id = "help-names-probe";
		render(<ClassicyHelpTopics />);
		expect(screen.getByTestId("window")).toHaveAttribute(
			"title",
			"Help Topics: Windows Help",
		);
	});

	it("lists the books and the topics outside them on its Contents tab, the first row chosen", () => {
		render(<ClassicyHelpTopics />);
		expect(screen.getByRole("tab", { name: "Contents" })).toBeInTheDocument();
		expect(rows()).toEqual([
			"*About Help",
			"Printing",
			"Finding Things",
			"Keyboard shortcuts",
		]);
		expect(prompt()).toBe("Click a topic, and then click Display.");
		expect(actionButton()).toHaveTextContent("Display");
	});

	it("reads Open on a book, opens it, then reads Close and closes it", async () => {
		render(<ClassicyHelpTopics />);
		await userEvent.click(row("Printing"));
		expect(prompt()).toBe("Click a book, and then click Open.");
		expect(actionButton()).toHaveTextContent("Open");
		await userEvent.click(actionButton());
		expect(rows()).toEqual([
			"About Help",
			"*Printing",
			"To view the print queue",
			"To change printer settings",
			"Finding Things",
			"Keyboard shortcuts",
		]);
		expect(actionButton()).toHaveTextContent("Close");
		await userEvent.click(actionButton());
		expect(rows()).toEqual([
			"About Help",
			"*Printing",
			"Finding Things",
			"Keyboard shortcuts",
		]);
		expect(dispatch).not.toHaveBeenCalled();
	});

	it("opens a book on a double-click", async () => {
		render(<ClassicyHelpTopics />);
		await userEvent.dblClick(row("Finding Things"));
		expect(screen.getByText("To find a file")).toBeInTheDocument();
	});

	it("displays the chosen topic and closes, from Display", async () => {
		render(<ClassicyHelpTopics />);
		await userEvent.click(row("Printing"));
		await userEvent.click(actionButton());
		await userEvent.click(row("To change printer settings"));
		expect(prompt()).toBe("Click a topic, and then click Display.");
		await userEvent.click(actionButton());
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			SHOW_PRINT_SETTINGS,
			CLOSE,
		]);
	});

	it("displays a topic on a double-click", async () => {
		render(<ClassicyHelpTopics />);
		await userEvent.dblClick(row("Keyboard shortcuts"));
		expect(dispatch).toHaveBeenCalledWith({
			type: "ClassicyAppAppleGuideShowTopic",
			app: { id: "AppleGuide.app" },
			topicId: "ht-loose",
		});
		expect(dispatch).toHaveBeenCalledWith(CLOSE);
	});

	it("takes Return as the default button's, on the keyboard's row", async () => {
		render(<ClassicyHelpTopics />);
		row("Printing").focus();
		await userEvent.keyboard("{Enter}");
		expect(screen.getByText("To view the print queue")).toBeInTheDocument();
		expect(dispatch).not.toHaveBeenCalled();
		row("To change printer settings").focus();
		await userEvent.keyboard("{Enter}");
		expect(dispatch.mock.calls.map(([action]) => action)).toEqual([
			SHOW_PRINT_SETTINGS,
			CLOSE,
		]);
	});

	it("closes on Cancel, Escape and the close box", async () => {
		render(<ClassicyHelpTopics />);
		await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
		expect(dispatch).toHaveBeenLastCalledWith(CLOSE);
		dispatch.mockClear();
		fireEvent.keyDown(row("About Help"), { key: "Escape" });
		expect(dispatch).toHaveBeenLastCalledWith(CLOSE);
		dispatch.mockClear();
		await userEvent.click(screen.getByText("close box"));
		expect(dispatch).toHaveBeenLastCalledWith(CLOSE);
	});

	it("leaves Return on a button to the button", async () => {
		render(<ClassicyHelpTopics />);
		const cancel = screen.getByRole("button", { name: "Cancel" });
		fireEvent.keyDown(cancel, { key: "Enter" });
		expect(dispatch).not.toHaveBeenCalled();
	});
});
