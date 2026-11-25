import { describe, expect, it, vi } from "vitest";
import { renderWithProviders, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyInputDialog } from "@/SystemFolder/SystemResources/InputDialog/ClassicyInputDialog";

const setup = (
	props: Partial<React.ComponentProps<typeof ClassicyInputDialog>> = {},
) => {
	const onConfirm = vi.fn();
	const onCancel = vi.fn();
	renderWithProviders(
		<ClassicyInputDialog
			id="test-dialog"
			title="New Folder"
			prompt="Name of new folder:"
			placeholder="untitled folder"
			confirmLabel="Create"
			onConfirm={onConfirm}
			onCancel={onCancel}
			{...props}
		/>,
	);
	return { onConfirm, onCancel };
};

describe("ClassicyInputDialog", () => {
	it("renders the prompt, field, and both buttons", () => {
		setup();
		expect(screen.getByText("Name of new folder:")).toBeInTheDocument();
		expect(screen.getByPlaceholderText("untitled folder")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
	});

	it("labels the field with its prompt, a ClassicyControlLabel", () => {
		setup();
		const prompt = screen.getByText("Name of new folder:");
		expect(prompt).toHaveClass("classicyControlLabel");
		expect(prompt.parentElement).toHaveClass("classicyInputDialogPrompt");
		expect(screen.getByLabelText("Name of new folder:")).toHaveAttribute(
			"placeholder",
			"untitled folder",
		);
	});

	// The file dialog's New Folder under Windows' names reads why a name is
	// refused (the remaining chapters' audit's 10.9): a prompt may follow
	// the field's value.
	it("takes a prompt that follows the field's value", async () => {
		setup({
			prompt: (value: string) =>
				value.includes("?") ? "No question marks." : "Name of new folder:",
			initialValue: "Plans",
		});
		expect(screen.getByText("Name of new folder:")).toBeInTheDocument();
		const field = screen.getByDisplayValue("Plans");
		await userEvent.type(field, "?");
		expect(screen.getByText("No question marks.")).toBeInTheDocument();
	});

	it("takes a rich prompt", () => {
		setup({
			prompt: (
				<>
					Name of <em>new</em> folder:
				</>
			),
		});
		expect(screen.getByText("new").tagName).toBe("EM");
		expect(screen.getByLabelText("Name of new folder:")).toHaveAttribute(
			"placeholder",
			"untitled folder",
		);
	});

	it("draws no prompt row for an empty prompt", () => {
		setup({ prompt: "" });
		expect(document.querySelector(".classicyInputDialogPrompt")).toBeNull();
	});

	it("disables the default button until the value is valid", async () => {
		const user = userEvent.setup();
		setup();
		const create = screen.getByRole("button", {
			name: "Create",
		}) as HTMLButtonElement;
		expect(create.disabled).toBe(true);

		await user.type(screen.getByPlaceholderText("untitled folder"), "Projects");
		expect(create.disabled).toBe(false);
	});

	it("confirms with the typed value", async () => {
		const user = userEvent.setup();
		const { onConfirm } = setup();
		await user.type(screen.getByPlaceholderText("untitled folder"), "Projects");
		await user.click(screen.getByRole("button", { name: "Create" }));
		expect(onConfirm).toHaveBeenCalledWith("Projects");
	});

	it("cancels via the Cancel button", async () => {
		const user = userEvent.setup();
		const { onCancel, onConfirm } = setup();
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(onCancel).toHaveBeenCalledOnce();
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("Return confirms and Escape cancels", async () => {
		const user = userEvent.setup();
		const { onConfirm, onCancel } = setup();
		const field = screen.getByPlaceholderText("untitled folder");

		await user.type(field, "Docs{Enter}");
		expect(onConfirm).toHaveBeenCalledWith("Docs");

		await user.type(field, "{Escape}");
		expect(onCancel).toHaveBeenCalledOnce();
	});

	it("honors a custom validate (blocks confirm on invalid input)", async () => {
		const user = userEvent.setup();
		const { onConfirm } = setup({
			validate: (name) => name.trim().length > 0 && !name.includes(":"),
		});
		const create = screen.getByRole("button", {
			name: "Create",
		}) as HTMLButtonElement;

		await user.type(screen.getByPlaceholderText("untitled folder"), "a:b");
		expect(create.disabled).toBe(true);
		await user.type(screen.getByPlaceholderText("untitled folder"), "{Enter}");
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it("selects the prefilled value on open so it can be typed over", () => {
		setup({ initialValue: "untitled folder" });
		const field = screen.getByDisplayValue(
			"untitled folder",
		) as HTMLInputElement;
		expect(field.selectionStart).toBe(0);
		expect(field.selectionEnd).toBe("untitled folder".length);
	});
});
