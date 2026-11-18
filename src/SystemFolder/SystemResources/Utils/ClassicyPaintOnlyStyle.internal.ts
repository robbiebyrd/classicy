/**
 * Marks an element whose inline style a component rewrites only to repaint
 * that element (a custom property its own background reads, such as an
 * indeterminate progress bar's stripe offset, every frame), never to move
 * or resize anything. The observers that measure on a style change (the
 * pattern-origin watcher, the scroll area) skip such an element's style
 * writes, so a repaint each frame costs them nothing.
 */
export const CLASSICY_PAINT_ONLY_STYLE_ATTRIBUTE =
	"data-classicy-paint-only-style";

/** Whether `record` is a style write on an element marked paint-only. */
export const isClassicyPaintOnlyStyleChange = (
	record: MutationRecord,
): boolean =>
	record.type === "attributes" &&
	record.attributeName === "style" &&
	record.target instanceof Element &&
	record.target.hasAttribute(CLASSICY_PAINT_ONLY_STYLE_ATTRIBUTE);
