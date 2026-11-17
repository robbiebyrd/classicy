// The package's one deep freeze, shared by its hooks (hooks.ts) and its theme
// data export (index.ts). Internal: not re-exported.

/** `T` with every object in it read-only; functions stay as they are. */
export type DeepReadonly<T> = T extends (...args: never[]) => unknown
	? T
	: { readonly [K in keyof T]: DeepReadonly<T[K]> };

/** Freezes `value` and every plain object or array inside it. */
export const deepFreeze = <T extends object>(value: T): DeepReadonly<T> => {
	for (const child of Object.values(value))
		if (child !== null && typeof child === "object") deepFreeze(child);
	return Object.freeze(value) as DeepReadonly<T>;
};
