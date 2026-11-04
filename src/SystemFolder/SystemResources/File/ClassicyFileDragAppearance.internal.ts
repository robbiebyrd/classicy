import type { ClassicyAppearanceEvent } from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyFileDragOptions } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";

/** What a file drag's `dragStart` carries to the package. */
export type ClassicyFileDragStartDetail = { kind: "file" };

/** What a file drag's `dragEnd` carries to the package. */
export type ClassicyFileDragEndDetail = {
	kind: "file";
	dropped: boolean;
	cancelled: boolean;
};

/**
 * The `onStart`/`onEnd` pair a component passes `startClassicyFileDrag` so a
 * Finder outline drag reaches the active Appearance Package through the
 * component's own `useClassicyAppearance` emitter: one `dragStart
 * { kind: "file" }` at the drag threshold, then exactly one `dragEnd
 * { kind: "file", dropped, cancelled }`.
 *
 * The detail is built field by field, so it never carries the dragged items'
 * paths or names, the drop target, or the pointer: like a window or icon
 * drag, a package learns the gesture, not the user's data. Pointer only, so
 * no `input`, as for every other drag event.
 */
export function classicyFileDragAppearanceCallbacks(
	emit: (
		event: Extract<ClassicyAppearanceEvent, "dragStart" | "dragEnd">,
		detail: ClassicyFileDragStartDetail | ClassicyFileDragEndDetail,
	) => void,
): Required<Pick<ClassicyFileDragOptions, "onStart" | "onEnd">> {
	return {
		onStart: () => emit("dragStart", { kind: "file" }),
		onEnd: ({ dropped, cancelled }) =>
			emit("dragEnd", { kind: "file", dropped, cancelled }),
	};
}
