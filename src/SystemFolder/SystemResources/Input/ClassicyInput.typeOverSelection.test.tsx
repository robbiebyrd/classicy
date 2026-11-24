// Text typed or pasted over a selection that runs to the field's end (the
// whole text, select all) replaces it, as in any text field. The field's
// `selected` state is read once the new value has committed, never while
// the browser is still inserting it (story 0227-815: found replacing Find
// File's name in Chromium).
import { act, render } from "@testing-library/react";
import { useState } from "react";
import { flushSync } from "react-dom";
import { describe, expect, it, vi } from "vitest";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";

const Field = ({ echo }: { echo: boolean }) => {
	const [text, setText] = useState("abc");
	return (
		<>
			{echo ? (
				<ClassicyInput
					id="field"
					prefillValue={text}
					onChangeFunc={(e) => setText(e.target.value)}
				/>
			) : (
				<ClassicyInput id="field" prefillValue="abc" />
			)}
			<output data-testid="text">{text}</output>
		</>
	);
};

const setNativeValue = (el: HTMLInputElement, value: string) => {
	const setter = Object.getOwnPropertyDescriptor(
		HTMLInputElement.prototype,
		"value",
	)?.set;
	setter?.call(el, value);
};

/**
 * Render the field, and stand in for the browser's microtask checkpoint
 * between an event's listeners, which jsdom does not run: a listener on the
 * field, after its own, flushes React's pending work before the event
 * reaches React (the re-review's probe, fr-d-review6/p2).
 */
const renderField = (echo: boolean) => {
	const view = render(<Field echo={echo} />);
	const el = document.getElementById("field") as HTMLInputElement;
	el.addEventListener("input", () => {
		flushSync(() => {});
	});
	return { ...view, el };
};

/** What a browser does when the user types or pastes: value, caret, `input`. */
const insert = (
	el: HTMLInputElement,
	value: string,
	inputType = "insertText",
) => {
	setNativeValue(el, value);
	el.setSelectionRange(value.length, value.length);
	el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType }));
};

const selectRange = (el: HTMLInputElement, start: number, end: number) =>
	act(() => {
		el.focus();
		el.setSelectionRange(start, end);
		el.dispatchEvent(new Event("select", { bubbles: true }));
	});

describe("ClassicyInput typing over a selection", () => {
	it.each([
		["echoed back through prefillValue", true],
		["left to the field", false],
	])("keeps the text typed over the whole text (%s)", (_name, echo) => {
		const { el } = renderField(echo);
		selectRange(el, 0, 3);
		expect(el.getAttribute("data-classicy-selection")).toBe("all");
		// Select all of "abc", type "z", then "q": "zq" (the old field kept
		// "abc", then gave "abcq", as Chromium showed).
		insert(el, "z");
		expect(el.value).toBe("z");
		insert(el, "zq");
		expect(el.value).toBe("zq");
		act(() => {});
		expect(el.hasAttribute("data-classicy-selection")).toBe(false);
	});

	it("keeps text pasted over the tail of the text", () => {
		const { el, getByTestId } = renderField(true);
		selectRange(el, 1, 3);
		expect(el.getAttribute("data-classicy-selection")).toBe("tail");
		insert(el, "aPASTE", "insertFromPaste");
		expect(el.value).toBe("aPASTE");
		act(() => {});
		expect(getByTestId("text").textContent).toBe("aPASTE");
	});

	it("reads its selection on no `input` listener of its own", () => {
		const added: string[] = [];
		const spy = vi
			.spyOn(HTMLInputElement.prototype, "addEventListener")
			.mockImplementation(function (
				this: HTMLInputElement,
				type: string,
				...rest: unknown[]
			) {
				added.push(type);
				return EventTarget.prototype.addEventListener.call(
					this,
					type,
					...(rest as [EventListener]),
				);
			});
		try {
			render(<Field echo={true} />);
		} finally {
			spy.mockRestore();
		}
		expect(added).toContain("select");
		expect(added).not.toContain("input");
	});
});
