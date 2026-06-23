import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
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
});
