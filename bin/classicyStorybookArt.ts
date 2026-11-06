// verify:storybook: package art in a Storybook build is byte-identical to its
// source. The image plugin's svgo pass once rewrote it there (story 0146-doe),
// which the library's own verify:dist could not see. Plain erasable TypeScript,
// imported by check-storybook-art.mjs through Node's type stripping.

/** A file's base name and its bytes. */
export interface ClassicyArtFile {
	name: string;
	bytes: Uint8Array;
}

const HASH = "[A-Za-z0-9_-]{8}";

const escapeRegExp = (s: string): string =>
	s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whether `emitted` is `source` after Vite's `[name]-[hash][ext]` renaming. */
const isEmittedFrom = (emitted: string, source: string): boolean => {
	const dot = source.lastIndexOf(".");
	const stem = source.slice(0, dot);
	const ext = source.slice(dot);
	return new RegExp(`^${escapeRegExp(stem)}-${HASH}${escapeRegExp(ext)}$`).test(
		emitted,
	);
};

const sameBytes = (a: Uint8Array, b: Uint8Array): boolean =>
	a.length === b.length && a.every((byte, i) => byte === b[i]);

/**
 * Compares each source art file with the emitted files carrying its name.
 * `checked` is the sources that were emitted (art the build inlined has
 * nothing to compare); `altered` is those where no emitted copy matches the
 * source byte for byte. Both keep the source order.
 */
export const findAlteredStorybookArt = (
	sources: ReadonlyArray<ClassicyArtFile>,
	emitted: ReadonlyArray<ClassicyArtFile>,
): { altered: string[]; checked: string[] } => {
	const altered: string[] = [];
	const checked: string[] = [];
	for (const source of sources) {
		const copies = emitted.filter((e) => isEmittedFrom(e.name, source.name));
		if (!copies.length) continue;
		checked.push(source.name);
		if (!copies.some((c) => sameBytes(c.bytes, source.bytes))) {
			altered.push(source.name);
		}
	}
	return { altered, checked };
};
