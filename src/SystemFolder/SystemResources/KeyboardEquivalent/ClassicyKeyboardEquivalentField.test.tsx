import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
	within,
} from "@/__tests__/test-utils";
import {
	registerTestTaskbarPackage,
	TEST_DIALOG_CAPTION_LAYOUT,
	TEST_DIALOG_CAPTION_PACKAGE_ID,
} from "@/__tests__/testTaskbarPackage";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { unregisterClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyKeyboardEquivalentField } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentField";
import { spellKeyboardEquivalent } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentRules";

// Keys are captured on window; a Meta chord records as ⌘ on any platform.
const press = (init: KeyboardEventInit & { key: string }) =>
	fireEvent.keyDown(window, init);

const setup = (
	props: Partial<
		React.ComponentProps<typeof ClassicyKeyboardEquivalentField>
	> = {},
) => {
	const onChange = vi.fn();
	renderWithProviders(
		<ClassicyKeyboardEquivalentField
			id="show-hide"
			value="⌃⌘S"
			description="This key combination will show and hide the custom settings."
			onChange={onChange}
			{...props}
		/>,
	);
	return { onChange };
};

const openDialog = async () => {
	await userEvent
		.setup()
		.click(screen.getByRole("button", { name: "Change keyboard equivalent…" }));
	return screen.getByRole("dialog");
};

const feedback = () =>
	screen.getByRole("status", { name: "Keyboard equivalent" });

describe("ClassicyKeyboardEquivalentField (HIGOS8 Figure 6-8)", () => {
	it("shows the current equivalent spelled out above a button to redefine it", () => {
		setup();
		expect(screen.getByText("Current keyboard equivalent")).toBeInTheDocument();
		expect(
			screen.getByLabelText("Current keyboard equivalent"),
		).toHaveTextContent("⌃ + ⌘ + S");
		expect(
			screen.getByRole("button", { name: "Change keyboard equivalent…" }),
		).toBeInTheDocument();
	});

	it("disables the button when disabled", () => {
		setup({ disabled: true });
		expect(
			screen.getByRole("button", { name: "Change keyboard equivalent…" }),
		).toBeDisabled();
	});
});

describe("ClassicyKeyboardEquivalentDialog (HIGOS8 Figures 6-9 to 6-11)", () => {
	afterEach(() => vi.restoreAllMocks());

	it("opens with the prompt, the current equivalent and the explanation", async () => {
		setup();
		await openDialog();
		expect(
			screen.getByText(
				"Press any combination of keys to define the keyboard equivalent:",
			),
		).toBeInTheDocument();
		expect(feedback()).toHaveTextContent("⌃ + ⌘ + S");
		expect(
			screen.getByText(
				"This key combination will show and hide the custom settings.",
			),
		).toBeInTheDocument();
	});

	it("shows a new combination as soon as it is typed, and OK hands it over", async () => {
		const { onChange } = setup();
		await openDialog();
		press({ key: "k", code: "KeyK", metaKey: true });
		expect(feedback()).toHaveTextContent("⌘ + K");
		expect(onChange).not.toHaveBeenCalled();

		await userEvent.setup().click(screen.getByRole("button", { name: "OK" }));
		expect(onChange).toHaveBeenCalledWith("⌘K");
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("Return chooses OK and Escape cancels", async () => {
		const { onChange } = setup();
		await openDialog();
		press({ key: "j", code: "KeyJ", metaKey: true });
		press({ key: "Enter" });
		expect(onChange).toHaveBeenCalledWith("⌘J");

		await openDialog();
		press({ key: "l", code: "KeyL", metaKey: true });
		press({ key: "Escape" });
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("keeps captured keys from reaching the app's own shortcut handlers", async () => {
		setup();
		await openDialog();
		const appHandler = vi.fn();
		document.addEventListener("keydown", appHandler);
		press({ key: "q", code: "KeyQ", metaKey: true });
		document.removeEventListener("keydown", appHandler);
		expect(appHandler).not.toHaveBeenCalled();
		expect(feedback()).toHaveTextContent("⌘ + Q");
	});

	it("ignores modifier keys pressed on their own", async () => {
		setup();
		await openDialog();
		press({ key: "Meta", code: "MetaLeft", metaKey: true });
		expect(feedback()).toHaveTextContent("⌃ + ⌘ + S");
	});

	it("refuses a combination without the command key with an alert, leaving the field unchanged", async () => {
		setup();
		await openDialog();
		press({ key: "s", code: "KeyS" });
		expect(
			await screen.findByText(
				"The keyboard equivalent must include the command key.",
			),
		).toBeInTheDocument();
		expect(
			screen.getByText("Please select another combination."),
		).toBeInTheDocument();
		expect(feedback()).toHaveTextContent("⌃ + ⌘ + S");

		// The alert has its own OK, distinct from the dialog's.
		await userEvent.setup().click(
			within(screen.getByRole("alertdialog")).getByRole("button", {
				name: "OK",
			}),
		);
		await waitFor(() =>
			expect(
				screen.queryByText(
					"The keyboard equivalent must include the command key.",
				),
			).not.toBeInTheDocument(),
		);
		// Capturing resumes once the alert is gone.
		press({ key: "k", code: "KeyK", metaKey: true });
		expect(feedback()).toHaveTextContent("⌘ + K");
	});

	it("refuses a combination already in use, naming the item that uses it", async () => {
		setup({ inUse: [{ shortcut: "⌘N", name: "New Folder" }] });
		await openDialog();
		press({ key: "n", code: "KeyN", metaKey: true });
		expect(
			await screen.findByText(
				"The keyboard equivalent ⌘ + N is already used by “New Folder”.",
			),
		).toBeInTheDocument();
	});

	it("offers Help on the alert when given onHelp", async () => {
		const onHelp = vi.fn();
		setup({ onHelp });
		await openDialog();
		press({ key: "s", code: "KeyS" });
		await userEvent
			.setup()
			.click(await screen.findByRole("button", { name: "Help" }));
		expect(onHelp).toHaveBeenCalledTimes(1);
	});
});

// Plan 0020-w98 §6: under a layout whose `dialog.caption` is `"titled"`
// (Windows 98) the dialog's caption has a Close box, its Cancel (WIG Ch.8,
// p.145, Figure 8.1); under every other layout it has none (HIGOS8 p.59).
describe("ClassicyKeyboardEquivalentDialog's caption Close box", () => {
	const closeBox = () =>
		document.querySelector<HTMLElement>(
			".classicyWindow > .classicyWindowTitleBar .classicyWindowCloseBox",
		);

	afterEach(() => {
		unregisterClassicyAppearancePackage(TEST_DIALOG_CAPTION_PACKAGE_ID);
		useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	});

	it("is not drawn under a layout without titled captions", async () => {
		setup();
		await openDialog();
		expect(closeBox()).toBeNull();
	});

	describe('under dialog.caption: "titled"', () => {
		beforeEach(() => {
			registerTestTaskbarPackage(
				TEST_DIALOG_CAPTION_LAYOUT,
				TEST_DIALOG_CAPTION_PACKAGE_ID,
			);
			act(() =>
				dispatch({
					type: "ClassicyDesktopChangeAppearancePackage",
					packageId: TEST_DIALOG_CAPTION_PACKAGE_ID,
				}),
			);
		});

		it("cancels: the dialog closes and the equivalent stays", async () => {
			const { onChange } = setup();
			await openDialog();
			press({ key: "k", code: "KeyK", metaKey: true });
			fireEvent.click(closeBox() as HTMLElement);
			expect(onChange).not.toHaveBeenCalled();
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});
	});
});

// The remaining chapters' audit's 1.12 and 4.19: under Windows 98's
// layout the field and the dialog spell a chord by name, ⌘ as Ctrl
// (`menu.shortcutSpelling` "names", `keyboard.command` "ctrl"), the
// Windows key records nothing, and Win+period cancels nothing.
describe("ClassicyKeyboardEquivalentField under Windows' spelling and command rule", () => {
	let restore: (() => void) | undefined;
	afterEach(() => {
		restore?.();
		restore = undefined;
	});
	const windows = () => {
		restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", shortcutSpelling: "names" },
			keyboard: { contextMenuKey: true, command: "ctrl" },
		});
	};

	it("spells the equivalent by name, ⌘ as Ctrl, in the field, the dialog and its alert", async () => {
		windows();
		setup({ value: "⌥⌘S", inUse: [{ shortcut: "⌘N", name: "New Folder" }] });
		expect(
			screen.getByLabelText("Current keyboard equivalent"),
		).toHaveTextContent("Ctrl+Alt+S");
		await openDialog();
		expect(feedback()).toHaveTextContent("Ctrl+Alt+S");
		press({ key: "k", code: "KeyK", ctrlKey: true });
		expect(feedback()).toHaveTextContent("Ctrl+K");
		press({ key: "n", code: "KeyN", ctrlKey: true });
		expect(
			await screen.findByText(
				"The keyboard equivalent Ctrl+N is already used by “New Folder”.",
			),
		).toBeInTheDocument();
	});

	it("records nothing from the Windows key, and Win+period does not cancel", async () => {
		windows();
		const { onChange } = setup();
		await openDialog();
		press({ key: "k", code: "KeyK", metaKey: true });
		expect(feedback()).toHaveTextContent("Ctrl+S");
		press({ key: ".", code: "Period", metaKey: true });
		expect(screen.getByRole("dialog")).toBeInTheDocument();
		press({ key: ".", code: "Period", ctrlKey: true });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		expect(onChange).not.toHaveBeenCalled();
	});

	it("keeps the glyphs and Command-period by default (Platinum)", async () => {
		expect(spellKeyboardEquivalent("⌥⌘S")).toBe("⌥ + ⌘ + S");
		setup();
		await openDialog();
		press({ key: ".", code: "Period", metaKey: true });
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("spells the names with Win for ⌘ under the names spelling alone", () => {
		expect(
			spellKeyboardEquivalent("⌥⌘S", { menu: { shortcutSpelling: "names" } }),
		).toBe("Alt+Win+S");
		expect(
			spellKeyboardEquivalent("⌥⌘S", {
				menu: { shortcutSpelling: "names" },
				keyboard: { command: "ctrl" },
			}),
		).toBe("Ctrl+Alt+S");
		expect(
			spellKeyboardEquivalent("", { menu: { shortcutSpelling: "names" } }),
		).toBe("");
	});
});
