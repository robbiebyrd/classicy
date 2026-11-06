import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

// The core project resolves Platinum's `@classicy/classicy` import to
// platinumCoreImports.ts (vitest.config.ts). A value missing there would
// arrive as `undefined` rather than fail the import, so every value Platinum's
// source imports from the core is checked here, against the barrel.

const PLATINUM_SRC = path.resolve(
	process.cwd(),
	"packages/appearance/platinum/src",
);

/** Every value (not type) Platinum's non-test source imports from the core. */
const platinumCoreValues = (): string[] => {
	const names = new Set<string>();
	for (const file of readdirSync(PLATINUM_SRC, { recursive: true })
		.map(String)
		.filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))) {
		const source = ts.createSourceFile(
			file,
			readFileSync(path.join(PLATINUM_SRC, file), "utf8"),
			ts.ScriptTarget.Latest,
			true,
		);
		for (const node of source.statements) {
			if (
				!ts.isImportDeclaration(node) ||
				!ts.isStringLiteral(node.moduleSpecifier) ||
				node.moduleSpecifier.text !== "@classicy/classicy"
			)
				continue;
			const clause = node.importClause;
			if (!clause || clause.isTypeOnly) continue;
			const bindings = clause.namedBindings;
			if (bindings && ts.isNamedImports(bindings))
				for (const element of bindings.elements)
					if (!element.isTypeOnly)
						names.add((element.propertyName ?? element.name).text);
		}
	}
	return [...names].sort();
};

describe("platinumCoreImports", () => {
	it("re-exports, as the barrel's own, every value Platinum imports from the core", async () => {
		const values = platinumCoreValues();
		expect(values).toContain("registerClassicyAppearancePackage");
		const shim: Record<string, unknown> = await import("./platinumCoreImports");
		const barrel: Record<string, unknown> = await import("@/index");
		for (const name of values) {
			expect(shim[name], name).toBeDefined();
			expect(shim[name], name).toBe(barrel[name]);
		}
	}, 60_000);
});
