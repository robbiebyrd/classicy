import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassicyRichTextEditor } from "./ClassicyRichTextEditor";

// micromark decodes Markdown's named character references with
// decode-named-character-reference. The library build takes its default
// entry, a lookup table, not its browser one, which decoded through a DOM
// element made at load (story 0223-a0y, bin/classicyNodeEntry.ts, whose
// test decodes through that entry itself).
describe("ClassicyRichTextEditor named character references", () => {
	it("decodes &amp;, &eacute; and &copy; in the document", async () => {
		render(
			<ClassicyRichTextEditor content={"Caf&eacute; &amp; bar &copy; 1998"} />,
		);
		expect(await screen.findByText("Café & bar © 1998")).toBeInTheDocument();
	});

	it("keeps a reference that names no character as written", async () => {
		render(<ClassicyRichTextEditor content={"Fish &notachar; chips"} />);
		expect(
			await screen.findByText("Fish &notachar; chips"),
		).toBeInTheDocument();
	});
});
