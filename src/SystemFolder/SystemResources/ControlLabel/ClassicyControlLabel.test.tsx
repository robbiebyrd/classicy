// The Windows-layout package below needs a sound pack registered: Platinum's.
import "@classicy/appearance-platinum";
import { produce } from "immer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { registerClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { connectClassicyAssetPackageSource } from "@/Appearance/ClassicyAssetPackageSource.internal";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyControlLabel,
	labelAlignClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { useClassicyShortcutDispatcher } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher";
import {
	registerClassicyAccessKeyMenuBar,
	resetClassicyAccessKeyReportsForTests,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

// Platinum (registered above) is the default layout, which declares no
// access keys (Mac OS had none: a label's own `accessKey` is inert there);
// `windows-labels` carries the Windows 98 package's layout
// (`menu.accessKeys` "auto"), and `explicit-labels` declares explicit keys
// alone. The store is not mounted: stand in for its connection of the
// active package id.
const activePackage = { id: "platinum" };
connectClassicyAssetPackageSource({
	getId: () => activePackage.id,
	subscribe: () => () => {},
});
registerClassicyAppearancePackage({
	id: "windows-labels",
	name: "Windows labels",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "windows-labels-default",
		package: "windows-labels",
	},
	layout: windows98.layout as never,
});
registerClassicyAppearancePackage({
	id: "explicit-labels",
	name: "Explicit labels",
	css: "",
	defaults: {
		...CLASSICY_CORE_DEFAULT_THEME,
		id: "explicit-labels-default",
		package: "explicit-labels",
	},
	layout: {
		...windows98.layout,
		menu: { accessKeys: "explicit" },
	} as never,
});

afterEach(() => {
	activePackage.id = "platinum";
});

describe("ClassicyControlLabel", () => {
	it("returns null when label is empty string (default)", () => {
		const { container } = render(<ClassicyControlLabel />);
		expect(container.firstChild).toBeNull();
	});

	it.each([
		["null", null],
		["undefined", undefined],
		["false", false],
	])("returns null when label is %s", (_, label) => {
		const { container } = render(<ClassicyControlLabel label={label} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders rich content inside the <label>, naming its control", () => {
		render(
			<>
				<ClassicyControlLabel
					labelFor="folder-name"
					label={
						<>
							Name of <em>new</em> folder:
						</>
					}
				/>
				<input id="folder-name" />
			</>,
		);
		const em = screen.getByText("new");
		expect(em.tagName).toBe("EM");
		expect(em.closest("label")).toHaveAttribute("for", "folder-name");
		expect(screen.getByLabelText("Name of new folder:")).toHaveAttribute(
			"id",
			"folder-name",
		);
	});

	it("gives the icon the label's text as alt, or none beside rich content", () => {
		const { rerender } = render(
			<ClassicyControlLabel label="Printer" icon="printer.png" />,
		);
		expect(screen.getByRole("img")).toHaveAttribute("alt", "Printer");
		rerender(
			<ClassicyControlLabel label={<b>Printer</b>} icon="printer.png" />,
		);
		expect(document.querySelector("img")).toHaveAttribute("alt", "");
	});

	it("renders label text", () => {
		render(<ClassicyControlLabel label="My Label" />);
		expect(screen.getByText("My Label")).toBeInTheDocument();
	});

	it("sets htmlFor attribute on the label element", () => {
		render(<ClassicyControlLabel label="My Label" labelFor="my-input" />);
		const labelEl = screen.getByText("My Label");
		expect(labelEl.tagName).toBe("LABEL");
		expect(labelEl).toHaveAttribute("for", "my-input");
	});

	it("calls onClickFunc when the outer div is clicked", async () => {
		const handler = vi.fn();
		const { userEvent } = await import("@/__tests__/test-utils");
		const user = userEvent.setup();
		const { container } = render(
			<ClassicyControlLabel label="Click Me" onClickFunc={handler} />,
		);
		await user.click(container.firstChild as Element);
		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("renders an img element when icon prop is provided", () => {
		render(<ClassicyControlLabel label="With Icon" icon="/icon.png" />);
		const img = screen.getByRole("img", { name: "With Icon" });
		expect(img).toBeInTheDocument();
		expect(img).toHaveAttribute("src", "/icon.png");
	});

	it("renders children on the left side when direction is left (default)", () => {
		render(
			<ClassicyControlLabel label="Label" direction="left">
				<button type="button">Child</button>
			</ClassicyControlLabel>,
		);
		expect(screen.getByRole("button", { name: "Child" })).toBeInTheDocument();
	});

	it("renders children on the right side when direction is right", () => {
		render(
			<ClassicyControlLabel label="Label" direction="right">
				<button type="button">Child</button>
			</ClassicyControlLabel>,
		);
		expect(screen.getByRole("button", { name: "Child" })).toBeInTheDocument();
	});
});

describe("labelAlignClass", () => {
	it("maps left to classicyLabelAlignLeft", () => {
		expect(labelAlignClass("left")).toBe("classicyLabelAlignLeft");
	});

	it("maps center to classicyLabelAlignCenter", () => {
		expect(labelAlignClass("center")).toBe("classicyLabelAlignCenter");
	});

	it("maps right to classicyLabelAlignRight", () => {
		expect(labelAlignClass("right")).toBe("classicyLabelAlignRight");
	});
});

describe("ClassicyControlLabel — access keys (WIG Ch.8, pp.148-149; the audit's 8.9)", () => {
	const part = (root: ParentNode = document) =>
		root.querySelector('[data-classicy-part="access-key"]');
	const alt = (
		k: string,
		target: Element = document.activeElement as Element,
	) =>
		fireEvent.keyDown(target, {
			key: k,
			code: `Key${k.toUpperCase()}`,
			altKey: true,
		});

	// A dialog's fields: a text field, two check boxes and a static label.
	const Form = ({ keys = {} }: { keys?: Record<string, string> }) => (
		<div className="classicyWindow">
			<ClassicyControlLabel
				label="Name:"
				labelFor="name"
				accessKey={keys.name}
			/>
			<input id="name" defaultValue="Plan" />
			<ClassicyControlLabel
				label="Match case"
				labelFor="match"
				accessKey={keys.match}
			/>
			<input id="match" type="checkbox" />
			<ClassicyControlLabel
				label="Whole words"
				labelFor="whole"
				accessKey={keys.whole}
			/>
			<input id="whole" type="checkbox" />
			<ClassicyControlLabel label="Searching 12 folders" />
			<button type="button">Find</button>
		</div>
	);

	it("adds nothing under a package without access keys: no part, and Alt and a letter do nothing", () => {
		render(<Form />);
		expect(part()).toBeNull();
		const find = screen.getByText("Find");
		find.focus();
		expect(alt("n", find)).toBe(true);
		expect(find).toHaveFocus();
	});

	it("ignores a label's own key under a package without access keys (Platinum)", () => {
		render(<Form keys={{ name: "N", match: "c" }} />);
		expect(part()).toBeNull();
		const find = screen.getByText("Find");
		find.focus();
		expect(alt("n", find)).toBe(true);
		expect(alt("c", find)).toBe(true);
		expect(fireEvent.keyDown(find, { key: "c" })).toBe(true);
		expect(find).toHaveFocus();
		expect((document.getElementById("match") as HTMLInputElement).checked).toBe(
			false,
		);
	});

	it("underlines an explicit key, and Alt and it focus the field and select its text", () => {
		activePackage.id = "explicit-labels";
		render(<Form keys={{ name: "N" }} />);
		expect(part()).toHaveTextContent("N");
		const find = screen.getByText("Find");
		find.focus();
		expect(alt("n", find)).toBe(false);
		const name = document.getElementById("name") as HTMLInputElement;
		expect(name).toHaveFocus();
		expect(name.selectionStart).toBe(0);
		expect(name.selectionEnd).toBe(4);
	});

	it("clicks a check box it reaches, from Alt and the key or the key alone on a button", () => {
		activePackage.id = "explicit-labels";
		render(<Form keys={{ match: "c", whole: "w" }} />);
		const match = document.getElementById("match") as HTMLInputElement;
		const whole = document.getElementById("whole") as HTMLInputElement;
		const find = screen.getByText("Find");
		find.focus();
		alt("c", find);
		expect(match).toHaveFocus();
		expect(match.checked).toBe(true);
		// The key alone, focus on a check box (which takes no letters).
		fireEvent.keyDown(match, { key: "w" });
		expect(whole).toHaveFocus();
		expect(whole.checked).toBe(true);
	});

	it("leaves the key alone to a text field that has focus", () => {
		activePackage.id = "explicit-labels";
		render(<Form keys={{ match: "c" }} />);
		const name = document.getElementById("name") as HTMLInputElement;
		name.focus();
		expect(fireEvent.keyDown(name, { key: "c" })).toBe(true);
		expect(name).toHaveFocus();
	});

	it("gives every label of a focusable control a key of its own under menu.accessKeys auto (Windows 98), static text none", () => {
		activePackage.id = "windows-labels";
		render(<Form />);
		const labels = Array.from(document.querySelectorAll("label")).map(
			(label) => part(label)?.textContent ?? null,
		);
		// Name N, Match case M, Whole words W; the static label none.
		expect(labels).toEqual(["N", "M", "W", null]);
	});

	it("reserves an explicit key before the automatic picks, and moves between labels sharing one", () => {
		activePackage.id = "windows-labels";
		render(<Form keys={{ whole: "m", match: "m" }} />);
		const labels = Array.from(document.querySelectorAll("label")).map(
			(label) => part(label)?.textContent ?? null,
		);
		// Whole words holds "m", which its text lacks: nothing drawn, the key
		// still its own.
		expect(labels).toEqual(["N", "M", null, null]);
		const match = document.getElementById("match") as HTMLInputElement;
		const whole = document.getElementById("whole") as HTMLInputElement;
		const find = screen.getByText("Find");
		find.focus();
		alt("m", find);
		expect(match).toHaveFocus();
		alt("m");
		expect(whole).toHaveFocus();
		// Moved between, never clicked.
		expect(match.checked).toBe(false);
		expect(whole.checked).toBe(false);
	});

	it("keeps keys unique within a window, not across windows, and acts in the window holding focus", () => {
		activePackage.id = "windows-labels";
		render(
			<>
				<div className="classicyWindow">
					<ClassicyControlLabel label="Name" labelFor="a" />
					<input id="a" />
				</div>
				<div className="classicyWindow">
					<ClassicyControlLabel label="Name" labelFor="b" />
					<input id="b" />
					<button type="button">here</button>
				</div>
			</>,
		);
		const [first, second] = Array.from(document.querySelectorAll("label"));
		expect(part(first)).toHaveTextContent("N");
		expect(part(second)).toHaveTextContent("N");
		const here = screen.getByText("here");
		here.focus();
		alt("n", here);
		expect(document.getElementById("b")).toHaveFocus();
	});

	it("yields Alt and a key to a menu bar's title outside a modal window", () => {
		activePackage.id = "explicit-labels";
		render(<Form keys={{ name: "n" }} />);
		const remove = registerClassicyAccessKeyMenuBar({
			claims: (key) => key === "n",
		});
		const find = screen.getByText("Find");
		find.focus();
		expect(alt("n", find)).toBe(true);
		expect(find).toHaveFocus();
		// In a modal window no menu bar reaches the key.
		(document.querySelector(".classicyWindow") as HTMLElement).classList.add(
			"classicyWindowModal",
		);
		expect(alt("n", find)).toBe(false);
		expect(document.getElementById("name")).toHaveFocus();
		remove();
	});

	// The remaining chapters' audit's 4.14 (WIG Ch.4 "Shortcut Keys", p.27:
	// "avoid ALT+key combinations, because they conflict with access keys"):
	// with the menu-shortcut dispatcher mounted, a label's Alt and its key
	// win over a menu item's ⌥ chord, which still runs where no label in
	// scope holds the key; under Platinum (no access keys) the chord runs.
	describe("with the menu-shortcut dispatcher mounted", () => {
		const Dispatcher = ({ menu }: { menu: ClassicyMenuItem[] }) => {
			useClassicyShortcutDispatcher(menu);
			return null;
		};
		const claim = (chords: string[]) =>
			act(() => {
				useAppManager.setState(
					produce(useAppManager.getState(), (draft) => {
						draft.System.Manager.Keyboard.system = chords;
					}),
				);
			});
		afterEach(() => claim([]));

		it("takes Alt and a label's key ahead of a ⌥ chord, which runs for a key no label holds", () => {
			activePackage.id = "explicit-labels";
			const match = vi.fn();
			const whole = vi.fn();
			claim(["option+c", "option+w"]);
			render(
				<>
					<Form keys={{ match: "c" }} />
					<Dispatcher
						menu={[
							{
								id: "edit",
								title: "Edit",
								menuChildren: [
									{
										id: "match",
										title: "Match",
										keyboardShortcut: "⌥C",
										onClickFunc: match,
									},
									{
										id: "whole",
										title: "Whole",
										keyboardShortcut: "⌥W",
										onClickFunc: whole,
									},
								],
							},
						]}
					/>
				</>,
			);
			const find = screen.getByText("Find");
			find.focus();
			expect(alt("c", find)).toBe(false);
			expect(document.getElementById("match")).toHaveFocus();
			expect(document.getElementById("match")).toBeChecked();
			expect(match).not.toHaveBeenCalled();
			// "w" is no label's key here ("Whole words" was given none under
			// explicit keys): the chord runs.
			find.focus();
			expect(alt("w", find)).toBe(false);
			expect(whole).toHaveBeenCalledTimes(1);
			expect(find).toHaveFocus();
		});

		it("leaves every ⌥ chord to the dispatcher by default (Platinum)", () => {
			const match = vi.fn();
			claim(["option+c"]);
			render(
				<>
					<Form keys={{ match: "c" }} />
					<Dispatcher
						menu={[
							{
								id: "match",
								title: "Match",
								keyboardShortcut: "⌥C",
								onClickFunc: match,
							},
						]}
					/>
				</>,
			);
			const find = screen.getByText("Find");
			find.focus();
			alt("c", find);
			expect(match).toHaveBeenCalledTimes(1);
			expect(document.getElementById("match")).not.toBeChecked();
			expect(find).toHaveFocus();
		});
	});

	it("leaves Alt and a key in a text field to Option on a Mac, where it types a character", () => {
		const platform = vi
			.spyOn(navigator, "platform", "get")
			.mockReturnValue("MacIntel");
		activePackage.id = "explicit-labels";
		render(<Form keys={{ match: "c" }} />);
		const name = document.getElementById("name") as HTMLInputElement;
		name.focus();
		expect(
			fireEvent.keyDown(name, { key: "ç", code: "KeyC", altKey: true }),
		).toBe(true);
		expect(name).toHaveFocus();
		platform.mockRestore();
	});

	it("underlines inside a rich label, and gives an empty key none", () => {
		activePackage.id = "windows-labels";
		render(
			<>
				<ClassicyControlLabel
					labelFor="folder"
					accessKey="n"
					label={
						<>
							Name of <em>new</em> folder:
						</>
					}
				/>
				<input id="folder" />
				<ClassicyControlLabel label="Kind" labelFor="kind" accessKey="" />
				<input id="kind" />
			</>,
		);
		const [rich, none] = Array.from(document.querySelectorAll("label"));
		expect(part(rich)).toHaveTextContent("n");
		expect(part(rich)?.closest("em")).not.toBeNull();
		expect(part(none)).toBeNull();
	});
});

// The remaining chapters' audit's 4.12 (WIG Ch.4 "Access Keys", p.27): two
// controls of one window sharing a key log a Dialog warning in development,
// once; none under Platinum, where no label has a key.
describe("ClassicyControlLabel — duplicate access keys", () => {
	const entries: ClassicyLogEntry[] = [];
	afterEach(() => {
		unregisterClassicyLogSink("label-duplicates");
		entries.length = 0;
		resetClassicyAccessKeyReportsForTests();
	});
	const Pair = () => (
		<div className="classicyWindow">
			<ClassicyControlLabel label="Name:" labelFor="a" accessKey="n" />
			<input id="a" />
			<ClassicyControlLabel label="Notes:" labelFor="b" accessKey="n" />
			<input id="b" />
		</div>
	);

	it("warns once when two controls of one window share a key", () => {
		activePackage.id = "explicit-labels";
		registerClassicyLogSink({
			id: "label-duplicates",
			onLog: (entry) => entries.push(entry),
		});
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(<Pair />);
		const dialog = entries.filter((e) => e.subsystem === "Dialog");
		expect(dialog).toHaveLength(1);
		expect(dialog[0].message).toContain("“Name:”, “Notes:”");
		warn.mockRestore();
	});

	it("warns of nothing by default (Platinum)", () => {
		registerClassicyLogSink({
			id: "label-duplicates",
			onLog: (entry) => entries.push(entry),
		});
		render(<Pair />);
		expect(entries.filter((e) => e.subsystem === "Dialog")).toHaveLength(0);
	});
});
