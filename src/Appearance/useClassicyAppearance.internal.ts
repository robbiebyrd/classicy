// useClassicyAppearance's module state that tests reset. Kept out of the
// public barrel (`.internal.ts`).

/** Dropped attributes are reported once per package and key, in development. */
export const reportedDroppedAttributes = new Set<string>();

/**
 * Test helper: forget which dropped attributes were already reported, so a
 * test can assert the once-per-package-and-key warning from a clean slate.
 * @internal
 */
export const resetClassicyAppearanceAttributeWarningsForTests = (): void => {
	reportedDroppedAttributes.clear();
};
