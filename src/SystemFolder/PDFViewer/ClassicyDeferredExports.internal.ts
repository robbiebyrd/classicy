// The export a library build gives a deferred module in place of its own
// (bin/classicyDeferredModule.ts, CLASSICY_DEFERRED_EXPORT): pdf.js's legacy
// build, whose body would otherwise run when the UMD bundle loads and throw
// without a DOM (story 0223-a0y).
const DEFERRED = "__classicyDeferred";

/**
 * The exports of a module the library build may defer: its deferred body's,
 * run on the first call, or the module itself where nothing deferred it
 * (vitest, Storybook and the example's dev server load it as it is).
 */
export function classicyDeferredExports<T extends object>(module: T): T {
	if (!(DEFERRED in module)) return module;
	// Unbound, so the module's top-level `this` is `undefined`, as in a module.
	const load = (module as unknown as Record<typeof DEFERRED, () => T>)[
		DEFERRED
	];
	return load();
}
