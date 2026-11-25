import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";

// MDXEditor does not run under jsdom: a stand-in draws a toolbar and the
// content editable the editor's text is, and keeps each `overlayContainer`
// it is given.
const overlays = vi.hoisted(() => [] as (HTMLElement | undefined)[]);
vi.mock("@mdxeditor/editor", () => {
	const plugin = () => ({});
	const Nothing = () => null;
	return {
		headingsPlugin: plugin,
		quotePlugin: plugin,
		thematicBreakPlugin: plugin,
		markdownShortcutPlugin: plugin,
		toolbarPlugin: plugin,
		BoldItalicUnderlineToggles: Nothing,
		CodeToggle: Nothing,
		InsertThematicBreak: Nothing,
		UndoRedo: Nothing,
		MDXEditor: ({
			markdown,
			overlayContainer,
		}: {
			markdown: string;
			overlayContainer?: HTMLElement;
		}) => {
			overlays.push(overlayContainer);
			return (
				<div>
					<div role="toolbar">
						<button type="button">Bold</button>
					</div>
					<div
						data-testid="text"
						contentEditable
						suppressContentEditableWarning
						className="prose"
					>
						{markdown}
					</div>
				</div>
			);
		},
	};
});
vi.mock(
	"@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor.scss",
	() => ({}),
);

import { ClassicyRichTextEditor } from "@/SystemFolder/SystemResources/RichTextEditor/ClassicyRichTextEditor";

// The remaining chapters' audit's 5.29 (WIG Ch.5 "Command Method", p.59):
// a right-click on the editor's text shows its own Edit menu under Windows'
// text keys; its toolbar keeps the window's.
describe("ClassicyRichTextEditor under textField.contextMenu", () => {
	let restore: (() => void) | undefined;
	afterEach(() => {
		restore?.();
		restore = undefined;
	});
	const renderEditor = () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyRichTextEditor content="hello world" />
			</ClassicyContextualMenuProvider>,
		);
		const text = screen.getByTestId("text");
		// jsdom computes no `isContentEditable`.
		Object.defineProperty(text, "isContentEditable", { value: true });
		return text;
	};

	it("shows the text's own Edit menu, with its selection kept, and leaves the toolbar alone", () => {
		restore = activateTestWindowsKeysPackage({
			textField: { contextMenu: "edit" },
		});
		const text = renderEditor();
		const range = document.createRange();
		range.setStart(text.firstChild as Text, 0);
		range.setEnd(text.firstChild as Text, 5);
		const selection = document.getSelection() as Selection;
		selection.removeAllRanges();
		selection.addRange(range);
		expect(fireEvent.mouseDown(text, { button: 2 })).toBe(false);
		expect(fireEvent.contextMenu(text, { clientX: 5, clientY: 5 })).toBe(false);
		expect(document.activeElement).toBe(text);
		const copy = document.getElementById("classicy-text-field-copy");
		expect(copy).not.toBeNull();
		expect(copy?.classList.contains("disabled")).toBe(false);
		fireEvent.mouseDown(document.body);
		expect(
			fireEvent.contextMenu(screen.getByText("Bold"), {
				clientX: 5,
				clientY: 5,
			}),
		).toBe(true);
		expect(document.getElementById("classicy-text-field-copy")).toBeNull();
	});

	it("shows none by default", () => {
		const text = renderEditor();
		expect(fireEvent.mouseDown(text, { button: 2 })).toBe(true);
		expect(fireEvent.contextMenu(text, { clientX: 5, clientY: 5 })).toBe(true);
		expect(document.getElementById("classicy-text-field-copy")).toBeNull();
	});
});

// The toolbar's tooltips (MDXEditor's Radix tooltips) open in the desktop
// the editor is in, where the active package draws them (the WIG audit's
// 12.10; WIG Ch.12 "Tooltips", p.276): one `classicyRichTextEditorPopups`
// element for the editor's life, appended to its root's `.classicyDesktop`
// (`document.body` outside one) and passed as MDXEditor's
// `overlayContainer` from the first render, whichever package draws the
// desktop.
describe("ClassicyRichTextEditor's pop-ups", () => {
	beforeEach(() => {
		overlays.length = 0;
	});

	it.each([
		"platinum",
		"system7",
		"windows98",
	])("opens them in the desktop it is in under %s", (id) => {
		const { rerender, unmount } = render(
			<div className="classicyDesktop" data-classicy-appearance={id}>
				<ClassicyRichTextEditor content="hello" />
			</div>,
		);
		const desktop = document.querySelector(".classicyDesktop");
		const popups = desktop?.querySelector(
			":scope > .classicyRichTextEditorPopups",
		);
		expect(popups).not.toBeNull();
		expect(overlays.length).toBeGreaterThan(0);
		expect(new Set(overlays)).toEqual(new Set([popups]));
		rerender(
			<div className="classicyDesktop" data-classicy-appearance={id}>
				<ClassicyRichTextEditor content="hello again" />
			</div>,
		);
		expect(new Set(overlays)).toEqual(new Set([popups]));
		unmount();
		expect(popups?.isConnected).toBe(false);
	});

	it("opens them in the document's body outside a desktop", () => {
		const { unmount } = render(<ClassicyRichTextEditor content="hello" />);
		const popups = overlays[0];
		expect(popups).toHaveClass("classicyRichTextEditorPopups");
		expect(popups?.parentElement).toBe(document.body);
		unmount();
		expect(popups?.isConnected).toBe(false);
	});
});
