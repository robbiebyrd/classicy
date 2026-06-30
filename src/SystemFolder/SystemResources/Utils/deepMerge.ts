export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Deep-merge `overrides` onto a structural clone of `base`.
 * Plain objects merge recursively; arrays and primitives from `overrides`
 * replace the base value wholesale; `undefined` override values are skipped;
 * `base` is never mutated. Replacement values (arrays, primitives, or whole
 * sub-objects) are cloned into the result, so the returned value shares no
 * object references with either `base` or `overrides`.
 */
export function deepMergeReplacingArrays<T>(
	base: T,
	overrides: DeepPartial<T>,
): T {
	const mergeInto = (
		target: Record<string, unknown>,
		source: Record<string, unknown>,
	): void => {
		for (const key of Object.keys(source)) {
			const next = source[key];
			if (next === undefined) continue;
			const current = target[key];
			if (isPlainObject(next) && isPlainObject(current)) {
				const cloned = { ...current };
				mergeInto(cloned, next);
				target[key] = cloned;
			} else {
				target[key] =
					typeof next === "object" && next !== null
						? structuredClone(next)
						: next;
			}
		}
	};

	const result = structuredClone(base);
	mergeInto(
		result as unknown as Record<string, unknown>,
		overrides as unknown as Record<string, unknown>,
	);
	return result;
}
