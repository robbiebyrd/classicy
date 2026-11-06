import type { MDXEditorMethods } from "@mdxeditor/editor";
import { describe, expectTypeOf, it } from "vitest";
import type { ClassicyRichTextEditorMethods } from "./ClassicyRichTextEditor";

// The published declarations restate MDXEditor's methods rather than import
// them, so a host without @mdxeditor/editor type-checks against them (story
// 0153-k0e). The two must stay one type: `tsc --noEmit -p .` checks this file
// (vitest does not type-check), and the component's `ref={editorRef}` checks
// the other direction.
describe("ClassicyRichTextEditorMethods", () => {
	it("is MDXEditor's MDXEditorMethods", () =>
		expectTypeOf<ClassicyRichTextEditorMethods>().toEqualTypeOf<MDXEditorMethods>());
});
