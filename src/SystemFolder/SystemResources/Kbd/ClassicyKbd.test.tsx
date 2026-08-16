import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyKbd } from "@/SystemFolder/SystemResources/Kbd/ClassicyKbd";

vi.mock("@/SystemFolder/SystemResources/Kbd/ClassicyKbd.scss", () => ({}));

describe("ClassicyKbd", () => {
	it("renders a semantic <kbd> with canonical Platinum glyphs", () => {
		const { container } = render(<ClassicyKbd shortcut="Cmd+Shift+S" />);
		const kbd = container.querySelector("kbd");
		expect(kbd).not.toBeNull();
		expect(kbd).toHaveTextContent("⇧⌘S");
		expect(kbd).toHaveClass("classicyKbd", "classicyKbdInline");
	});

	it("is idempotent for already-formatted glyph strings", () => {
		const { container } = render(<ClassicyKbd shortcut="⌘N" />);
		expect(container.querySelector("kbd")).toHaveTextContent("⌘N");
	});

	it("renders children verbatim when no shortcut is given", () => {
		const { container } = render(<ClassicyKbd>Esc</ClassicyKbd>);
		expect(container.querySelector("kbd")).toHaveTextContent("Esc");
	});

	it("renders nothing for an empty shortcut", () => {
		const { container } = render(<ClassicyKbd shortcut="" />);
		expect(container.querySelector("kbd")).toBeNull();
	});

	it("renders nothing with neither shortcut nor children", () => {
		const { container } = render(<ClassicyKbd />);
		expect(container.querySelector("kbd")).toBeNull();
	});

	it("keycaps variant renders one cap per key in HIG order", () => {
		const { container } = render(
			<ClassicyKbd shortcut="Cmd+Shift+S" variant="keycaps" />,
		);
		const caps = container.querySelectorAll(".classicyKbdKeycap");
		expect([...caps].map((c) => c.textContent)).toEqual(["⇧", "⌘", "S"]);
		// Nested <kbd> per cap is the HTML-sanctioned "keys to press" markup.
		for (const cap of caps) {
			expect(cap.tagName).toBe("KBD");
		}
	});

	it("merges a caller className", () => {
		const { container } = render(
			<ClassicyKbd shortcut="F1" className="myClass" />,
		);
		expect(container.querySelector("kbd")).toHaveClass(
			"classicyKbd",
			"myClass",
		);
	});
});
