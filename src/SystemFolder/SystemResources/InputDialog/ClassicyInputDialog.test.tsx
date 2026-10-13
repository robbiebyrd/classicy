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

	it("honours a custom validate (blocks confirm on invalid input)", async () => {
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
