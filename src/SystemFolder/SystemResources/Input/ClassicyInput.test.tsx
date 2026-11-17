import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Input/ClassicyInput.scss", () => ({}));
vi.mock(
	"@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel.scss",
	() => ({}),
);

describe("ClassicyInput", () => {
	it("renders an input element with placeholder", () => {
		render(<ClassicyInput id="test-input" placeholder="Enter text" />);
		expect(screen.getByPlaceholderText("Enter text")).toBeInTheDocument();
	});

	it("renders an input with the given id", () => {
		render(<ClassicyInput id="my-field" />);
		expect(document.getElementById("my-field")).toBeInTheDocument();
	});

	it("calls onChangeFunc when user types", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(<ClassicyInput id="test-input" onChangeFunc={onChange} />);
		await user.type(screen.getByRole("textbox"), "hello");
		expect(onChange).toHaveBeenCalled();
	});

	it("shows every character as the user types into a prefilled field", async () => {
		const user = userEvent.setup();
		render(<ClassicyInput id="test-input" prefillValue="" />);
		const input = screen.getByRole<HTMLInputElement>("textbox");
		await user.type(input, "hello");
		expect(input.value).toBe("hello");
	});

	it("appends typed characters after an initial prefillValue", async () => {
		const user = userEvent.setup();
		render(<ClassicyInput id="test-input" prefillValue="A" />);
		const input = screen.getByRole<HTMLInputElement>("textbox");
		await user.type(input, "BC");
		expect(input.value).toBe("ABC");
	});

	it("resyncs the displayed value when prefillValue changes", () => {
		const { rerender } = render(
			<ClassicyInput id="test-input" prefillValue="first" />,
		);
		const input = screen.getByRole<HTMLInputElement>("textbox");
		expect(input.value).toBe("first");
		rerender(<ClassicyInput id="test-input" prefillValue="second" />);
		expect(input.value).toBe("second");
	});

	it("calls onEnterFunc when Enter key is pressed", async () => {
		const user = userEvent.setup();
		const onEnter = vi.fn();
		render(<ClassicyInput id="test-input" onEnterFunc={onEnter} />);
		const input = screen.getByRole("textbox");
		await user.click(input);
		await user.keyboard("{Enter}");
		expect(onEnter).toHaveBeenCalledTimes(1);
	});

	it("respects disabled prop", () => {
		render(<ClassicyInput id="test-input" disabled={true} />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});

	it("renders a label when labelTitle is provided", () => {
		render(<ClassicyInput id="test-input" labelTitle="Username" />);
		expect(screen.getByText("Username")).toBeInTheDocument();
	});

	it("does not render a label when labelTitle is omitted", () => {
		render(<ClassicyInput id="test-input" />);
		expect(screen.queryByRole("label")).not.toBeInTheDocument();
	});

	it("defaults the input type to text", () => {
		render(<ClassicyInput id="typed-default" />);
		expect(document.getElementById("typed-default")).toHaveAttribute(
			"type",
			"text",
		);
	});

	it("passes a custom type through to the input", () => {
		render(<ClassicyInput id="typed-password" type="password" />);
		expect(document.getElementById("typed-password")).toHaveAttribute(
			"type",
			"password",
		);
	});
});

// The forwarded ref is merged with the component's own root ref (for the
// appearance hook), so every ref form React supports must still reach the
// <input>: object refs, classic callback refs (null on detach) and React 19
// callback refs that return a cleanup (no null call on detach).
describe("ClassicyInput forwarded ref", () => {
	it("sets and clears an object ref", () => {
		const ref = createRef<HTMLInputElement>();
		const { unmount } = render(<ClassicyInput id="i" ref={ref} />);
		expect(ref.current).toBeInstanceOf(HTMLInputElement);
		unmount();
		expect(ref.current).toBeNull();
	});

	it("calls a classic callback ref with the element, then null", () => {
		const calls: (HTMLInputElement | null)[] = [];
		const ref = (el: HTMLInputElement | null) => {
			calls.push(el);
		};
		const { rerender, unmount } = render(<ClassicyInput id="i" ref={ref} />);
		rerender(<ClassicyInput id="i" ref={ref} />);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toBeInstanceOf(HTMLInputElement);
		unmount();
		expect(calls).toEqual([calls[0], null]);
	});

	it("runs a cleanup-returning callback ref's cleanup instead of calling it with null", () => {
		const calls: (HTMLInputElement | null)[] = [];
		const cleanup = vi.fn();
		const ref = (el: HTMLInputElement | null) => {
			calls.push(el);
			return cleanup;
		};
		const { unmount } = render(<ClassicyInput id="i" ref={ref} />);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toBeInstanceOf(HTMLInputElement);
		unmount();
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(calls).toHaveLength(1);
	});
});

// Story 0217-etx: the field's `selected` state while it has focus and its
// whole text is selected, so a package can highlight its whole line (System
// 7, as TextEdit did, `*-dialog-standardfile-save.png`).
describe("ClassicyInput's selected state", () => {
	const field = () => document.getElementById("name") as HTMLInputElement;

	it("is set while the whole text is selected, and cleared by a caret or a blur", async () => {
		const user = userEvent.setup();
		render(<ClassicyInput id="name" prefillValue="untitled 1" />);
		expect(field().classList.contains("selected")).toBe(false);
		field().focus();
		field().select();
		await vi.waitFor(() =>
			expect(field().classList.contains("selected")).toBe(true),
		);
		await user.keyboard("{ArrowRight}");
		await vi.waitFor(() =>
			expect(field().classList.contains("selected")).toBe(false),
		);
		field().select();
		await vi.waitFor(() =>
			expect(field().classList.contains("selected")).toBe(true),
		);
		field().blur();
		await vi.waitFor(() =>
			expect(field().classList.contains("selected")).toBe(false),
		);
	});

	it("is not set for a selection short of the text's end, or an empty field", async () => {
		render(<ClassicyInput id="name" prefillValue="untitled 1" />);
		field().focus();
		field().setSelectionRange(0, 4);
		field().dispatchEvent(new Event("select"));
		expect(field().classList.contains("selected")).toBe(false);
		field().setSelectionRange(2, 6);
		expect(field().classList.contains("selected")).toBe(false);
		field().value = "";
		field().select();
		expect(field().classList.contains("selected")).toBe(false);
	});

	// Review I-1: Chrome before 127 and Safari 16.2 (both on the browser
	// floor) dispatch `selectionchange` at the document only, and a caret
	// collapse fires no `select`. These stop every selection event aimed at
	// the field itself, so only the document hears of the change.
	const muteFieldSelectionEvents = () => {
		const stop = (e: Event) => {
			if (e.target === field()) e.stopImmediatePropagation();
		};
		for (const type of ["select", "selectionchange"])
			window.addEventListener(type, stop, true);
		return () => {
			for (const type of ["select", "selectionchange"])
				window.removeEventListener(type, stop, true);
		};
	};
	const isSelected = () => field().classList.contains("selected");

	it("clears when the selection collapses with no event at the field (selectionchange at the document)", async () => {
		render(<ClassicyInput id="name" prefillValue="untitled 1" />);
		field().focus();
		field().select();
		await vi.waitFor(() => expect(isSelected()).toBe(true));
		const unmute = muteFieldSelectionEvents();
		try {
			field().setSelectionRange(10, 10);
			expect(isSelected()).toBe(true);
			document.dispatchEvent(new Event("selectionchange"));
			await vi.waitFor(() => expect(isSelected()).toBe(false));
		} finally {
			unmute();
		}
	});

	it("reads again on the click that follows a pointer release", async () => {
		render(<ClassicyInput id="name" prefillValue="untitled 1" />);
		field().focus();
		field().select();
		await vi.waitFor(() => expect(isSelected()).toBe(true));
		const unmute = muteFieldSelectionEvents();
		try {
			// The release is read before the click collapses the selection.
			field().dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
			field().setSelectionRange(10, 10);
			field().dispatchEvent(new MouseEvent("click", { bubbles: true }));
			await vi.waitFor(() => expect(isSelected()).toBe(false));
		} finally {
			unmute();
		}
	});

	it("reads again a frame after a pointer release that no click follows", async () => {
		render(<ClassicyInput id="name" prefillValue="untitled 1" />);
		field().focus();
		field().select();
		await vi.waitFor(() => expect(isSelected()).toBe(true));
		const unmute = muteFieldSelectionEvents();
		try {
			field().dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
			field().setSelectionRange(10, 10);
			await vi.waitFor(() => expect(isSelected()).toBe(false));
		} finally {
			unmute();
		}
	});

	it("reads again a frame after a key goes down, before it is released", async () => {
		render(<ClassicyInput id="name" prefillValue="untitled 1" />);
		field().focus();
		field().select();
		await vi.waitFor(() => expect(isSelected()).toBe(true));
		const unmute = muteFieldSelectionEvents();
		try {
			// A held arrow key moves the caret after its keydown, and its
			// keyup is yet to come.
			field().dispatchEvent(
				new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
			);
			field().setSelectionRange(0, 0);
			await vi.waitFor(() => expect(isSelected()).toBe(false));
		} finally {
			unmute();
		}
	});

	it("reads again when its value changes while focused", async () => {
		const { rerender } = render(
			<ClassicyInput id="name" prefillValue="untitled 1" />,
		);
		field().focus();
		field().select();
		await vi.waitFor(() => expect(isSelected()).toBe(true));
		const unmute = muteFieldSelectionEvents();
		try {
			// Setting the value puts the caret at its end, firing nothing.
			rerender(<ClassicyInput id="name" prefillValue="untitled 2" />);
			expect(field().value).toBe("untitled 2");
			await vi.waitFor(() => expect(isSelected()).toBe(false));
		} finally {
			unmute();
		}
	});

	// Review M-1: a selection that runs to the text's end is highlighted to
	// the field's right edge by TextEdit, from where it starts. The field
	// publishes that start, from its content box's left edge and with its
	// own scrolling, as `--classicy-input-selection-start`.
	it("is set for a selection that runs to the end, publishing where it starts", async () => {
		// jsdom lays nothing out: a probe's width is 7 px per character.
		const rect = vi
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				const width =
					this.tagName === "SPAN" ? (this.textContent ?? "").length * 7 : 0;
				return new DOMRect(0, 0, width, 0);
			});
		try {
			render(<ClassicyInput id="name" prefillValue="untitled 1" />);
			const start = () =>
				field().style.getPropertyValue("--classicy-input-selection-start");
			field().focus();
			field().select();
			await vi.waitFor(() => expect(isSelected()).toBe(true));
			expect(start()).toBe("0px");
			field().setSelectionRange(4, 10);
			await vi.waitFor(() => expect(start()).toBe("28px"));
			expect(isSelected()).toBe(true);
			Object.defineProperty(field(), "scrollLeft", {
				configurable: true,
				value: 5,
			});
			field().setSelectionRange(9, 10);
			await vi.waitFor(() => expect(start()).toBe("58px"));
			field().setSelectionRange(10, 10);
			await vi.waitFor(() => expect(isSelected()).toBe(false));
			expect(start()).toBe("");
		} finally {
			rect.mockRestore();
		}
	});

	it("measures a password field's selection start over its masked text", async () => {
		const measured: string[] = [];
		const rect = vi
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				if (this.tagName === "SPAN") measured.push(this.textContent ?? "");
				return new DOMRect(0, 0, 0, 0);
			});
		try {
			render(<ClassicyInput id="name" type="password" prefillValue="secret" />);
			field().focus();
			field().setSelectionRange(3, 6);
			await vi.waitFor(() => expect(isSelected()).toBe(true));
			expect(measured.at(-1)).toMatch(/^[\u2022\u25cf]{3}$/);
			expect(measured).not.toContain("sec");
		} finally {
			rect.mockRestore();
		}
	});
});
