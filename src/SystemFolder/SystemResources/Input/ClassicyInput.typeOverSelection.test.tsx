// Text typed or pasted over a selection that runs to the field's end (the
// whole text, select all) replaces it, as in any text field. The field's
// `selected` state is read once the new value has committed, never while
// the browser is still inserting it (story 0227-815, fix round 1: found
// replacing Find File's name).
import { act, fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";

const Field = () => {
	const [text, setText] = useState("abc");
	return (
		<>
			<ClassicyInput
				id="field"
				prefillValue={text}
				onChangeFunc={(e) => setText(e.target.value)}
			/>
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

describe("ClassicyInput typing over a selection", () => {
	// A browser runs microtasks between an event's listeners: a selection
	// read in an `input` listener on the field re-rendered it with the old
	// value before React heard the change, and the typed text was lost
	// (Chromium, select all then type). jsdom dispatches without those
	// checkpoints, so the cause is pinned here and the loss in the browser
	// check (report, fix round 1).
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
			render(<Field />);
		} finally {
			spy.mockRestore();
		}
		expect(added).toContain("select");
		expect(added).not.toContain("input");
	});

	it("keeps the text that replaces a whole-text selection", () => {
		const { getByTestId } = render(<Field />);
		const el = document.getElementById("field") as HTMLInputElement;
		act(() => {
			el.focus();
			el.setSelectionRange(0, 3);
			fireEvent.select(el);
		});
		expect(el.closest(".classicyInput, input")).toBeTruthy();
		// The browser replaces the selection, then fires `input`.
		act(() => {
			setNativeValue(el, "z");
			el.setSelectionRange(1, 1);
			el.dispatchEvent(
				new InputEvent("input", {
					bubbles: true,
					inputType: "insertText",
					data: "z",
				}),
			);
		});
		expect(el.value).toBe("z");
		expect(getByTestId("text").textContent).toBe("z");
	});
});
