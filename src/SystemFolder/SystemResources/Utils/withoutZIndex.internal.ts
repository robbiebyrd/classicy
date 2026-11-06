import type { CSSProperties } from "react";

/**
 * A consumer `style` without `zIndex`, for components whose stacking belongs
 * to their state classes (windows, icons, desktop icons). Returns the same
 * object when it carries no `zIndex`, so a memoized style keeps its identity.
 */
export const withoutZIndex = (
	style: CSSProperties | undefined,
): CSSProperties | undefined => {
	if (style?.zIndex === undefined) return style;
	const { zIndex: _zIndex, ...rest } = style;
	return rest;
};
