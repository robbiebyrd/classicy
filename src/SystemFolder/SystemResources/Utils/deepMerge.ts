export type DeepPartial<T> = T extends object
	? { [K in keyof T]?: DeepPartial<T[K]> }
	: T;

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Stricter than isPlainObject: an object literal / null-prototype bag only,
// excluding class instances and built-ins (Date, Map, Set, RegExp, typed
// arrays) so a clone can copy those wholesale instead of walking their keys.
function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (typeof value !== "object" || value === null) return false;
	const proto = Object.getPrototypeOf(value);
	return proto === Object.prototype || proto === null;
}

/**
 * Deep-clone that tolerates functions. The app-manager store legitimately
 * holds function handlers (menu `onClickFunc`s live in state), and
 * structuredClone throws DataCloneError on any function anywhere in the graph.
 * Recurse through the containers that can hide a function — plain objects and
 * arrays — passing functions through by reference (a handler is shared, not
 * copied), and defer to structuredClone only at exotic leaves (Date, Map, Set,
 * typed arrays) so the anti-aliasing guarantee for data still holds.
 */
function cloneFunctionSafe<V>(value: V): V {
	if (typeof value === "function") return value;
	if (Array.isArray(value)) {
		return value.map(cloneFunctionSafe) as unknown as V;
	}
	// Strict: only descend into true plain objects. isPlainObject() is loose
	// (any non-array object), which would wrongly recurse into Dates/Maps and
	// flatten them to {}; those must reach the structuredClone leaf below.
	if (isPlainRecord(value)) {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value)) {
			out[key] = cloneFunctionSafe((value as Record<string, unknown>)[key]);
		}
		return out as unknown as V;
	}
	// Exotic built-ins (Date, Map, Set, typed arrays…) still get a real copy;
	// primitives fall through unchanged.
	return value !== null && typeof value === "object"
		? (structuredClone(value) as V)
		: value;
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
						? cloneFunctionSafe(next)
						: next;
			}
		}
	};

	const result = cloneFunctionSafe(base);
	mergeInto(
		result as unknown as Record<string, unknown>,
		overrides as unknown as Record<string, unknown>,
	);
	return result;
}
