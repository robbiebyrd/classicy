import { produce } from "immer";
import { beforeEach, describe, expect, it } from "vitest";
import {
	act,
	fireEvent,
	render,
	screen,
	userEvent,
} from "@/__tests__/test-utils";
import {
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { getAppleGuideTopic } from "@/SystemFolder/Extensions/AppleGuide/AppleGuideTopics";
// Registers the Keyboard Shortcuts topic.
import "@/SystemFolder/Extensions/AppleGuide/AppleGuideKeyboardShortcuts";
import { KEYBOARD_SHORTCUTS_TOPIC_ID } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyStandardHelpMenu";
import {
	APPLICATION_SWITCHER_APP_ID,
	type ClassicyApplicationSwitcherData,
} from "./ClassicyApplicationSwitcherContext";
import { ClassicyApplicationSwitcherShortcutPage } from "./ClassicyApplicationSwitcherShortcutPage.internal";

const app = (
	id: string,
	extra: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id.replace(".app", ""),
	icon: "",
	windows: {},
	open: true,
	focused: false,
	data: {},
	...extra,
});

const data = () =>
	useAppManager.getState().System.Manager.Applications.apps[
		APPLICATION_SWITCHER_APP_ID
	].data as ClassicyApplicationSwitcherData;

const openDialog = async () => {
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: "Change keyboard equivalent…" }));
	return screen.getByRole("dialog");
};
const press = (init: KeyboardEventInit & { key: string }) =>
	act(() => {
		fireEvent.keyDown(window, init);
	});

describe("the Keyboard Shortcuts topic's page on switching applications", () => {
	beforeEach(() => {
		useAppManager.setState(
			produce(DefaultAppManagerState, (d) => {
				d.System.Manager.Applications.apps = {
					"Finder.app": app("Finder.app", { focused: true }),
					[APPLICATION_SWITCHER_APP_ID]: app(APPLICATION_SWITCHER_APP_ID, {
						extension: true,
					}),
					"Other.app": app("Other.app", { extension: true }),
				};
				d.System.Manager.Keyboard.global = {
					"option+k": {
						appId: "Other.app",
						event: "OtherThing",
						shortcut: "⌥K",
						title: "Other Thing",
					},
				};
			}),
			true,
		);
	});

	it("is the topic's last page", () => {
		const pages = getAppleGuideTopic(KEYBOARD_SHORTCUTS_TOPIC_ID)?.pages ?? [];
		render(<div>{pages[pages.length - 1]}</div>);
		expect(screen.getByText("Switching applications")).toBeInTheDocument();
	});

	it("names the chord and its Shift form, and how to tear the menu off", () => {
		render(<ClassicyApplicationSwitcherShortcutPage appId="AppleGuide.app" />);
		const page = document.querySelector(
			".classicyApplicationSwitcherShortcutPage",
		) as HTMLElement;
		expect(page.textContent).toContain("to switch to the next");
		expect(page.textContent).toMatch(/Option-Shift-click/);
		expect(
			screen.getByLabelText("Switch to the next application"),
		).toHaveTextContent("⌃ + `");
	});

	it("turns keyboard switching off and on with its checkbox", () => {
		render(<ClassicyApplicationSwitcherShortcutPage appId="AppleGuide.app" />);
		const box = screen.getByRole("checkbox", {
			name: "Use a keyboard shortcut to switch applications",
		});
		expect(box).toBeChecked();
		fireEvent.click(box);
		expect(data().keyboardCycling).toBe(false);
		expect(
			screen.getByRole("button", { name: "Change keyboard equivalent…" }),
		).toBeDisabled();
		fireEvent.click(box);
		expect(data().keyboardCycling).toBe(true);
	});

	it("records a new chord", async () => {
		render(<ClassicyApplicationSwitcherShortcutPage appId="AppleGuide.app" />);
		await openDialog();
		press({ key: "j", code: "KeyJ", altKey: true });
		press({ key: "Enter" });
		expect(data().cyclingShortcut).toBe("⌥J");
		expect(
			screen.getByLabelText("Switch to the next application"),
		).toHaveTextContent("⌥ + J");
	});

	it("refuses a chord with Shift, one with no Control, Option or Command, and one another extension uses", async () => {
		render(<ClassicyApplicationSwitcherShortcutPage appId="AppleGuide.app" />);
		await openDialog();
		press({ key: "J", code: "KeyJ", altKey: true, shiftKey: true });
		expect(
			await screen.findByText(/cannot include the Shift key/),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getAllByRole("button", { name: "OK" }).at(-1) as HTMLElement,
		);
		press({ key: "F5", code: "F5" });
		expect(
			await screen.findByText(
				/must include the Control, Option or Command key/,
			),
		).toBeInTheDocument();
		fireEvent.click(
			screen.getAllByRole("button", { name: "OK" }).at(-1) as HTMLElement,
		);
		press({ key: "k", code: "KeyK", altKey: true });
		expect(
			await screen.findByText(/already used by “Other Thing”/),
		).toBeInTheDocument();
		expect(data()?.cyclingShortcut).toBeUndefined();
	});

	it("refuses a chord any open application's menus use, with or without Shift, naming the command and its application", async () => {
		act(() => {
			useAppManager.setState(
				produce(useAppManager.getState(), (d) => {
					const window = (menuBar: object[]) => ({
						id: "main",
						closed: false,
						size: [100, 100] as [number, number],
						position: [0, 0] as [number, number],
						minimumSize: [0, 0] as [number, number],
						menuBar: menuBar as never,
					});
					d.System.Manager.Applications.apps["Calculator.app"] = app(
						"Calculator.app",
						{
							windows: {
								main: window([
									{
										id: "file",
										title: "File",
										menuChildren: [
											{ id: "quit", title: "Quit", keyboardShortcut: "⌥Q" },
										],
									},
									{
										id: "edit",
										title: "Edit",
										menuChildren: [
											{ id: "copy", title: "Copy", keyboardShortcut: "⌘C" },
										],
									},
								]),
							},
						},
					);
					d.System.Manager.Applications.apps["SimpleText.app"] = app(
						"SimpleText.app",
						{
							windows: {
								main: window([
									{
										id: "file",
										title: "File",
										menuChildren: [
											{
												id: "save-as",
												title: "Save As&hellip;",
												keyboardShortcut: "⇧⌘S",
											},
										],
									},
								]),
							},
						},
					);
					// A windowless menu's chords, claimed while its app was in front.
					d.System.Manager.Applications.apps["Writer.app"] = app("Writer.app");
					d.System.Manager.Keyboard.app = { "Writer.app": ["control+n"] };
				}),
				true,
			);
		});
		render(<ClassicyApplicationSwitcherShortcutPage appId="AppleGuide.app" />);
		await openDialog();
		const refused = async (text: RegExp) => {
			expect(await screen.findByText(text)).toBeInTheDocument();
			fireEvent.click(
				screen.getAllByRole("button", { name: "OK" }).at(-1) as HTMLElement,
			);
		};
		press({ key: "q", code: "KeyQ", altKey: true });
		await refused(/already used by “Quit in Calculator”/);
		// Off a Mac a Control press records as ⌘, which a ⌘ item answers to.
		press({ key: "c", code: "KeyC", ctrlKey: true });
		await refused(/already used by “Copy in Calculator”/);
		// The chord with Shift added is the previous application's.
		press({ key: "s", code: "KeyS", ctrlKey: true });
		await refused(/already used by “Save As… in SimpleText, with Shift”/);
		press({ key: "n", code: "KeyN", ctrlKey: true });
		await refused(/already used by “a menu command of Writer”/);
		expect(data()?.cyclingShortcut).toBeUndefined();
		// A chord nothing uses is taken.
		press({ key: "j", code: "KeyJ", altKey: true });
		press({ key: "Enter" });
		expect(data().cyclingShortcut).toBe("⌥J");
	});
});
