import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	ClassicyForm,
	ClassicyFormButtonRow,
} from "@/SystemFolder/SystemResources/Form/ClassicyForm";

vi.mock("@/SystemFolder/SystemResources/Form/ClassicyForm.scss", () => ({}));

describe("ClassicyForm", () => {
	it("renders a real <form>", () => {
		const { container } = render(
			<ClassicyForm aria-label="settings">
				<input />
			</ClassicyForm>,
		);
		const form = container.querySelector("form");
		expect(form).not.toBeNull();
		expect(form).toHaveClass("classicyForm");
	});

	it("calls onSubmitFunc and always prevents native navigation", () => {
		const onSubmit = vi.fn();
		const { container } = render(
			<ClassicyForm onSubmitFunc={onSubmit}>
				<input />
			</ClassicyForm>,
		);
		const form = container.querySelector("form") as HTMLFormElement;
		fireEvent.submit(form);
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0].defaultPrevented).toBe(true);
	});

	it("prevents navigation even with no onSubmitFunc", () => {
		const { container } = render(
			<ClassicyForm>
				<input />
			</ClassicyForm>,
		);
		const form = container.querySelector("form") as HTMLFormElement;
		const cancelled = !fireEvent.submit(form);
		expect(cancelled).toBe(true);
	});

	it("a submit button click submits the form", () => {
		const onSubmit = vi.fn();
		render(
			<ClassicyForm onSubmitFunc={onSubmit}>
				<button type="submit">OK</button>
			</ClassicyForm>,
		);
		fireEvent.click(screen.getByText("OK"));
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("applies the dialog layout inset variant", () => {
		const { container } = render(
			<ClassicyForm layout="dialog">
				<input />
			</ClassicyForm>,
		);
		expect(container.querySelector("form")).toHaveClass("classicyFormDialog");
	});

	it("passes through form HTML attributes", () => {
		const { container } = render(
			<ClassicyForm autoComplete="off" aria-label="prefs">
				<input />
			</ClassicyForm>,
		);
		const form = container.querySelector("form");
		expect(form).toHaveAttribute("autocomplete", "off");
		expect(form).toHaveAttribute("aria-label", "prefs");
	});
});

describe("ClassicyFormButtonRow", () => {
	it("renders the HIG button row wrapper", () => {
		render(
			<ClassicyFormButtonRow>
				<button type="button">Cancel</button>
				<button type="submit">OK</button>
			</ClassicyFormButtonRow>,
		);
		expect(screen.getByText("OK").parentElement).toHaveClass(
			"classicyFormButtonRow",
		);
	});
});
