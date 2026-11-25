import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("ClassicyTextEditor scroll bars while the text fits", () => {
	// jsdom lays nothing out: the text always fits.
	const bars = (container: HTMLElement) =>
		container.querySelectorAll<HTMLElement>('[data-classicy-part="scrollbar"]');

	it("draws none by default, as a field", () => {
		const { container } = render(<ClassicyTextEditor id="t" content="hi" />);
		expect(bars(container)).toHaveLength(0);
	});

	it("keeps both, fits, with fitsScrollBars (a document such as SimpleText's)", () => {
		const { container } = render(
			<ClassicyTextEditor id="t" content="hi" fitsScrollBars />,
		);
		const drawn = bars(container);
		expect(drawn).toHaveLength(2);
		for (const bar of drawn) expect(bar.classList.contains("fits")).toBe(true);
		expect(
			container.querySelector('[data-classicy-part="scroll-corner"]'),
		).not.toBeNull();
	});
});

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

		rerender(
			<ClassicyTextEditor id="t" prefillValue="the real body" disabled />,
		);
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
		fireEvent.change(screen.getByRole("textbox"), {
			target: { value: "new text" },
		});
		expect(onChange).toHaveBeenCalledOnce();
		expect(onChange.mock.calls[0][0].target.value).toBe("new text");
	});

	it("does not throw when onChangeFunc is omitted", () => {
		render(<ClassicyTextEditor id="te-1" />);
		expect(() =>
			fireEvent.change(screen.getByRole("textbox"), { target: { value: "x" } }),
		).not.toThrow();
	});

	it("respects disabled prop", () => {
		render(<ClassicyTextEditor id="te-1" disabled />);
		expect(screen.getByRole("textbox")).toBeDisabled();
	});
});

// `autoHeight` grows the field with its text by CSS `field-sizing: content`
// (Chrome 123). Firefox, Safari and Chrome 120-122, inside the floor, lack
// it, so there the editor sizes the field to its text itself.
describe("ClassicyTextEditor autoHeight without field-sizing", () => {
	const lineHeight = 15;
	let supported = false;
	const originalCss = globalThis.CSS;
	beforeEach(() => {
		supported = false;
		vi.stubGlobal("CSS", {
			supports: (property: string, value: string) =>
				supported && property === "field-sizing" && value === "content",
		});
		// jsdom lays nothing out: the text's height is a line per line of it,
		// what it overflows a field 0 px tall by.
		vi.spyOn(
			HTMLTextAreaElement.prototype,
			"scrollHeight",
			"get",
		).mockImplementation(function (this: HTMLTextAreaElement) {
			return this.value.split("\n").length * lineHeight;
		});
	});
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		globalThis.CSS = originalCss;
	});
	const field = (container: HTMLElement) =>
		container.querySelector("textarea") as HTMLTextAreaElement;

	it("sizes the field to its text, and again as the text changes", () => {
		const { container } = render(
			<ClassicyTextEditor id="t" content={"one\ntwo"} autoHeight />,
		);
		expect(field(container).style.height).toBe(`${2 * lineHeight}px`);
		fireEvent.change(field(container), {
			target: { value: "one\ntwo\nthree\nfour" },
		});
		expect(field(container).style.height).toBe(`${4 * lineHeight}px`);
	});

	it("leaves the field to CSS where field-sizing is supported", () => {
		supported = true;
		const { container } = render(
			<ClassicyTextEditor id="t" content={"one\ntwo"} autoHeight />,
		);
		expect(field(container).style.height).toBe("");
	});

	it("sizes nothing without autoHeight", () => {
		const { container } = render(
			<ClassicyTextEditor id="t" content={"one\ntwo"} />,
		);
		expect(field(container).style.height).toBe("");
	});

	it("gives the field back to its stylesheet when autoHeight is turned off", () => {
		const { container, rerender } = render(
			<ClassicyTextEditor id="t" content={"one\ntwo"} autoHeight />,
		);
		expect(field(container).style.height).not.toBe("");
		rerender(<ClassicyTextEditor id="t" content={"one\ntwo"} />);
		expect(field(container).style.height).toBe("");
	});
});

// A document's view state (the WIG audit's 2.1; WIG Ch.2 "Persistence",
// p.12: "cursor position, scroll position"): the caret put back when the
// editor mounts, and reported once it stops moving. Without either prop the
// caret starts at the beginning and nothing is reported, as before.
describe("ClassicyTextEditor caret view state", () => {
	afterEach(() => {
		vi.useRealTimers();
	});
	const field = () => screen.getByRole("textbox") as HTMLTextAreaElement;

	it("starts the caret at the beginning without initialCaret", () => {
		render(<ClassicyTextEditor id="t" content="hello world" />);
		expect(field().selectionStart).toBe(0);
	});

	it("puts the caret at initialCaret, clamped to the text, without focusing", () => {
		render(
			<ClassicyTextEditor id="t" content="hello world" initialCaret={6} />,
		);
		expect(field().selectionStart).toBe(6);
		expect(field().selectionEnd).toBe(6);
		expect(document.activeElement).not.toBe(field());
	});

	it("clamps an initialCaret past the end, and ignores one that is not finite", () => {
		const { unmount } = render(
			<ClassicyTextEditor id="t" content="hi" initialCaret={40} />,
		);
		expect(field().selectionStart).toBe(2);
		unmount();
		render(
			<ClassicyTextEditor id="t" content="hi" initialCaret={Number.NaN} />,
		);
		expect(field().selectionStart).toBe(0);
	});

	it("reports the caret once it stops moving, only when it changes", () => {
		vi.useFakeTimers();
		const onCaretSettled = vi.fn();
		render(
			<ClassicyTextEditor
				id="t"
				content="hello world"
				initialCaret={6}
				onCaretSettled={onCaretSettled}
			/>,
		);
		// The caret put back is never reported.
		fireEvent.select(field());
		vi.advanceTimersByTime(300);
		expect(onCaretSettled).not.toHaveBeenCalled();
		field().setSelectionRange(3, 3);
		fireEvent.select(field());
		vi.advanceTimersByTime(100);
		field().setSelectionRange(9, 9);
		fireEvent.select(field());
		vi.advanceTimersByTime(150);
		expect(onCaretSettled).not.toHaveBeenCalled();
		vi.advanceTimersByTime(100);
		expect(onCaretSettled).toHaveBeenCalledTimes(1);
		expect(onCaretSettled).toHaveBeenLastCalledWith(9);
	});

	it("makes a report still due when it unmounts", () => {
		vi.useFakeTimers();
		const onCaretSettled = vi.fn();
		const { unmount } = render(
			<ClassicyTextEditor
				id="t"
				content="hello world"
				onCaretSettled={onCaretSettled}
			/>,
		);
		field().setSelectionRange(4, 4);
		fireEvent.select(field());
		unmount();
		expect(onCaretSettled).toHaveBeenCalledWith(4);
	});

	it("hands initialScroll and onScrollSettled to its scroll area", () => {
		vi.useFakeTimers();
		const onScrollSettled = vi.fn();
		render(
			<ClassicyTextEditor
				id="t"
				content="hello"
				initialScroll={[0, 0]}
				onScrollSettled={onScrollSettled}
			/>,
		);
		// jsdom lays nothing out, so the textarea's own setter keeps what it
		// is given: a scroll reports it.
		field().scrollTop = 30;
		fireEvent.scroll(field());
		vi.advanceTimersByTime(300);
		expect(onScrollSettled).toHaveBeenCalledWith([0, field().scrollTop]);
	});
});
