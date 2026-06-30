import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";

vi.mock(
	"@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

describe("ClassicyTextEditor", () => {
	it("shows the initial prefillValue", () => {
		const { container } = render(
			<ClassicyTextEditor id="t" prefillValue="hello" disabled />,
		);
		expect(container.querySelector("textarea")?.value).toBe("hello");
	});

	it("reflects a prefillValue that changes after mount", () => {
		// Reproduces the bug: content fetched asynchronously and supplied via a later
		// prefillValue must appear, not be ignored because the field is uncontrolled.
		const { container, rerender } = render(
			<ClassicyTextEditor id="t" prefillValue="Loading…" disabled />,
		);
		expect(container.querySelector("textarea")?.value).toBe("Loading…");

		rerender(<ClassicyTextEditor id="t" prefillValue="the real body" disabled />);
		expect(container.querySelector("textarea")?.value).toBe("the real body");
	});

	it("falls back to content when prefillValue is absent", () => {
		const { container } = render(
			<ClassicyTextEditor id="t" content="from content" disabled />,
		);
		expect(container.querySelector("textarea")?.value).toBe("from content");
	});

	it("calls onChangeFunc when the textarea content changes", () => {
		const onChange = vi.fn();
		render(<ClassicyTextEditor id="te-1" onChangeFunc={onChange} />);
		fireEvent.change(screen.getByRole("textbox"), { target: { value: "new text" } });
		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange.mock.calls[0][0].target.value).toBe("new text");
	});

	it("does not throw when onChangeFunc is omitted", () => {
		render(<ClassicyTextEditor id="te-1" />);
		expect(() =>
			fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } })
		).not.toThrow();
	});

	it("respects disabled prop", () => {
		render(<ClassicyTextEditor id="te-1" disabled />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});
});
