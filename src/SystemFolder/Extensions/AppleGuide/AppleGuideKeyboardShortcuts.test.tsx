import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@/__tests__/test-utils";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	BALLOON_HELP_SHORTCUT,
	collectShortcutEntries,
	KEYBOARD_SHORTCUTS_TOPIC_ID,
} from "@/SystemFolder/Extensions/AppleGuide/AppleGuideKeyboardShortcuts";
import { getAppleGuideTopic } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const menuFor = (title: string, shortcut: string): ClassicyMenuItem[] => [
	{
		id: "m",
		title: "File",
		menuChildren: [
			{ id: "i", title, keyboardShortcut: shortcut },
			{ id: "spacer" },
			{ id: "plain", title: "No Shortcut" },
		],
	},
];

function setFront(appId: string, name: string, appMenu: ClassicyMenuItem[]) {
	act(() => {
		useAppManager.setState((s) => {
			const apps = { ...s.System.Manager.Applications.apps };
			for (const id of Object.keys(apps)) {
				apps[id] = { ...apps[id], focused: false };
			}
			apps[appId] = {
				id: appId,
				name,
				icon: "",
				windows: {},
				open: true,
				focused: true,
				data: {},
			};
			return {
				...s,
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Applications: { ...s.System.Manager.Applications, apps },
						Desktop: { ...s.System.Manager.Desktop, appMenu },
					},
				},
			};
		});
	});
}

const page = (index: number) => {
	const topic = getAppleGuideTopic(KEYBOARD_SHORTCUTS_TOPIC_ID);
	if (!topic) throw new Error("topic not registered");
	return topic.pages[index];
};

describe("Keyboard Shortcuts topic", () => {
	beforeEach(() => {
		setFront("Finder.app", "Finder", []);
	});

	it("is registered with three pages", () => {
		const topic = getAppleGuideTopic(KEYBOARD_SHORTCUTS_TOPIC_ID);
		expect(topic?.title).toBe("Keyboard Shortcuts");
		expect(topic?.pages).toHaveLength(3);
	});

	it("explains why Control and Option stand in for Command", () => {
		const { container } = render(<>{page(0)}</>);
		expect(container.textContent).toContain("browser keeps");
		expect(container.querySelectorAll("kbd").length).toBeGreaterThan(2);
		expect(container.textContent).toContain("⌃");
		expect(container.textContent).toContain("⌥");
	});

	it("lists the frontmost app's equivalents and follows a change of front app", () => {
		setFront("Alpha.app", "Alpha", menuFor("Do Alpha", "⌃A"));
		const { container } = render(<>{page(1)}</>);
		expect(screen.getByText("Alpha")).toBeInTheDocument();
		expect(container.textContent).toContain("Do Alpha");
		expect(container.textContent).toContain("⌃A");
		expect(container.textContent).not.toContain("No Shortcut");

		setFront("Beta.app", "Beta", menuFor("Do Beta", "⌥B"));
		expect(screen.getByText("Beta")).toBeInTheDocument();
		expect(container.textContent).toContain("Do Beta");
		expect(container.textContent).toContain("⌥B");
		expect(container.textContent).not.toContain("Do Alpha");
	});

	it("says so when the front app has none", () => {
		setFront("Gamma.app", "Gamma", []);
		render(<>{page(1)}</>);
		expect(
			screen.getByText("Gamma has no keyboard equivalents."),
		).toBeInTheDocument();
	});

	it("lists the system equivalents whichever app is in front", () => {
		setFront("Alpha.app", "Alpha", []);
		const { container } = render(<>{page(2)}</>);
		expect(container.textContent).toContain("Show or Hide Balloons");
		expect(container.textContent).toContain(BALLOON_HELP_SHORTCUT);
		expect(container.textContent).not.toContain("Do Alpha");
	});

	it("includes shortcuts the Apple menu itself carries", () => {
		act(() => {
			useAppManager.setState((s) => ({
				...s,
				System: {
					...s.System,
					Manager: {
						...s.System.Manager,
						Desktop: {
							...s.System.Manager.Desktop,
							systemMenu: [
								{ id: "sys", title: "Sys Command", keyboardShortcut: "⌃Y" },
							],
						},
					},
				},
			}));
		});
		const { container } = render(<>{page(2)}</>);
		expect(container.textContent).toContain("Sys Command");
		expect(container.textContent).toContain("⌃Y");
	});
});

describe("collectShortcutEntries", () => {
	it("records each item's top-level menu and skips items without a shortcut", () => {
		expect(collectShortcutEntries(menuFor("Open", "⌃O"))).toEqual([
			{ shortcut: "⌃O", title: "Open", menu: "File" },
		]);
		expect(collectShortcutEntries(undefined)).toEqual([]);
	});
});
