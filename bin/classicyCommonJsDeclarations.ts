import { writeFile } from "node:fs/promises";
import { withClassicyRelativeSpecifiers } from "./classicyDeclarationSpecifiers.ts";

// Declarations for the CommonJS entry (story 0223-a0y). Each package is
// "type": "module", so TypeScript reads every `.d.ts` in it as an ES module,
// and a CommonJS host (`.cts`, or `module: node16` without "type": "module")
// that `require()`s the package fails under node16 (TS1479: an ES module
// cannot be required), although at runtime `require()` reaches the UMD
// bundle's CommonJS loader. The build writes each declaration again as a
// `.d.cts` beside it, its relative specifiers pointing at the `.cjs` siblings,
// and the exports map's `require` names the `.d.cts` entry under `types`.

/** A `.d.ts` file's CommonJS twin: `index.d.ts` → `index.d.cts`. */
export const classicyCommonJsDeclarationFile = (file: string): string =>
	file.replace(/\.d\.ts$/, ".d.cts");

/**
 * A declaration's `code` as its `.d.cts` twin: each relative `.js` specifier
 * becomes `.cjs`, so the twin imports its own kind (`./hooks.js` →
 * `./hooks.cjs`, which TypeScript resolves to `./hooks.d.cts`). Package
 * specifiers are left to the packages' own `require` declarations.
 */
export const classicyCommonJsDeclaration = (code: string): string =>
	withClassicyRelativeSpecifiers(code, (specifier) =>
		specifier.replace(/\.js$/, ".cjs"),
	);

/**
 * vite-plugin-dts's `afterBuild`: writes the `.d.cts` twin of every `.d.ts`
 * the build emitted (`emittedFiles`, path → content as written).
 */
export const classicyCommonJsDeclarationsWriter =
	() =>
	async (emittedFiles: Map<string, string>): Promise<void> => {
		await Promise.all(
			[...emittedFiles]
				.filter(([file]) => file.endsWith(".d.ts"))
				.map(([file, content]) =>
					writeFile(
						classicyCommonJsDeclarationFile(file),
						classicyCommonJsDeclaration(content),
						"utf8",
					),
				),
		);
	};

/**
 * verify:dist's problems with the `.d.cts` twins in a declarations folder:
 * `files` are its paths (relative, any separator), `read` returns one's
 * text. Each `.d.ts` needs its twin, exactly as the writer makes it, and
 * each twin its `.d.ts`.
 */
export function findClassicyCommonJsDeclarationProblems(
	typesDir: string,
	files: ReadonlyArray<string>,
	read: (file: string) => string,
): string[] {
	// Normalized path → the path as given, which `read` takes.
	const given = new Map(
		files.map((file) => [file.split("\\").join("/"), file] as const),
	);
	const all = new Set(given.keys());
	const text = (file: string) => read(given.get(file) ?? file);
	const problems: string[] = [];
	for (const file of [...all].sort()) {
		if (file.endsWith(".d.ts")) {
			const twin = classicyCommonJsDeclarationFile(file);
			if (!all.has(twin))
				problems.push(
					`${typesDir}/${twin}: missing -> a CommonJS TypeScript host reads it for require(); check afterBuild (classicyCommonJsDeclarationsWriter) on dts in vite.config.ts.`,
				);
			else if (text(twin) !== classicyCommonJsDeclaration(text(file)))
				problems.push(
					`${typesDir}/${twin}: is not ${file} with its relative specifiers ending in .cjs -> it is written by classicyCommonJsDeclarationsWriter (bin/classicyCommonJsDeclarations.ts), not by hand.`,
				);
		} else if (
			file.endsWith(".d.cts") &&
			!all.has(file.replace(/\.d\.cts$/, ".d.ts"))
		)
			problems.push(
				`${typesDir}/${file}: has no ${file.replace(/\.d\.cts$/, ".d.ts")} -> a .d.cts is only ever a .d.ts's CommonJS twin.`,
			);
	}
	return problems;
}
