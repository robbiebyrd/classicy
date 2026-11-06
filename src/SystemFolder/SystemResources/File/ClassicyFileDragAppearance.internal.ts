import { useCallback, useLayoutEffect, useRef } from "react";
import type {
	ClassicyAppearanceDragEnd,
	ClassicyAppearanceEvent,
} from "@/Appearance/ClassicyAppearancePackage";
import type { ClassicyFileDragOptions } from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";

/** What a file drag's `dragStart` carries to the package. */
export type ClassicyFileDragStartDetail = { kind: "file" };

/** What a file drag's `dragEnd` carries to the package. */
export type ClassicyFileDragEndDetail = ClassicyAppearanceDragEnd & {
	kind: "file";
	dropped: boolean;
	canceled: boolean;
};

/**
 * The `onStart`/`onEnd` pair a component passes `startClassicyFileDrag` so a
 * Finder outline drag reaches the active Appearance Package through the
 * component's own `useClassicyAppearance` emitter: one `dragStart
 * { kind: "file" }` at the drag threshold, then exactly one `dragEnd
 * { kind: "file", dropped, canceled, lost }`.
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
		onEnd: ({ dropped, canceled, lost }) =>
			emit("dragEnd", { kind: "file", dropped, canceled, lost }),
	};
}

/**
 * Ends a source's file drag when the source unmounts. Pass it the function
 * `startClassicyFileDrag` returns; on unmount it is called, so a drag in
 * progress ends as canceled: the outline is removed, nothing is dropped
 * (the unmounted source's `onDrop` never runs), and `onEnd` reports
 * `{ dropped: false, canceled: true, lost: false }`. It runs in a
 * layout-effect cleanup, ahead of `useClassicyAppearance`'s passive
 * `unmount` emit, so a package sees `dragStart, dragEnd, unmount`. Calling it after the drag already
 * ended is a no-op.
 */
export function useClassicyFileDragEndOnUnmount(): (
	abandon: () => void,
) => void {
	const abandonRef = useRef<(() => void) | null>(null);
	useLayoutEffect(
		() => () => {
			abandonRef.current?.();
			abandonRef.current = null;
		},
		[],
	);
	return useCallback((abandon: () => void) => {
		abandonRef.current = abandon;
	}, []);
}
