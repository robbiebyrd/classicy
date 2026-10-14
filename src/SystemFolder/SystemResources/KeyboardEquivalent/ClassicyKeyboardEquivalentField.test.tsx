import { afterEach, describe, expect, it, vi } from "vitest";
import {
	fireEvent,
	renderWithProviders,
	screen,
	userEvent,
	waitFor,
	within,
} from "@/__tests__/test-utils";
import { ClassicyKeyboardEquivalentField } from "@/SystemFolder/SystemResources/KeyboardEquivalent/ClassicyKeyboardEquivalentField";

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
