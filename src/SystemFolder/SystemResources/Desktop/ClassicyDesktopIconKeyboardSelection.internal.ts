// Which icons the desktop's own keyboard selection (its arrow keys and
// type-ahead; ruling I-R14) is selecting. The desktop marks the id before it
// dispatches the selection; the icon takes the mark when it sees itself become
// selected, and reports `select { input: "keyboard" }` only for a marked id.
// Any other selection change (a selection rectangle, a selection set in code)
// carries no mark, so it reports nothing, whatever key was pressed last.
//
// Module state, not store state: the mark lives from one keydown handler to
// the commit it causes, and must never be persisted.

const marked = new Set<string>();

/**
 * Mark `iconId` as the icon the desktop's keyboard selection is selecting.
 * Replaces any earlier mark, so a mark whose selection never committed (an
 * icon that unmounted first) cannot outlive the next key.
 * @internal
 */
export const markClassicyDesktopIconKeyboardSelection = (
	iconId: string,
): void => {
	marked.clear();
	marked.add(iconId);
};

/**
 * Whether `iconId` was marked by the desktop's keyboard selection; clears its
 * mark either way.
 * @internal
 */
export const takeClassicyDesktopIconKeyboardSelection = (
	iconId: string,
): boolean => marked.delete(iconId);

/**
 * Test helper: forget every mark.
 * @internal
 */
export const resetClassicyDesktopIconKeyboardSelectionForTests = (): void => {
	marked.clear();
};
