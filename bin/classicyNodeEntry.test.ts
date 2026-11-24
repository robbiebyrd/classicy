import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import {
	CLASSICY_NODE_ENTRY_PACKAGES,
	classicyNodeEntryPlugin,
} from "./classicyNodeEntry";

// A package laid out as decode-named-character-reference is: a `browser`
// entry that touches the DOM at load and a `default` that does not.
const root = mkdtempSync(join(tmpdir(), "classicy-node-entry-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));
const write = (file: string, text: string) => {
	mkdirSync(dirname(join(root, file)), { recursive: true });
	writeFileSync(join(root, file), text);
};
write(
	"node_modules/decoder/package.json",
	JSON.stringify({
		name: "decoder",
		type: "module",
		exports: {
			worker: "./index.js",
			browser: "./index.dom.js",
			default: "./index.js",
		},
	}),
);
write("node_modules/decoder/index.js", "export const decode = () => '';\n");
write(
	"node_modules/decoder/index.dom.js",
	"const element = document.createElement('i');\n",
);
const importer = join(root, "src/parser.js");
write("src/parser.js", 'import { decode } from "decoder";\n');

type ResolveId = (source: string, importer?: string) => string | null;
const resolveId = (packages: readonly string[]) =>
	classicyNodeEntryPlugin(packages).resolveId as unknown as ResolveId;

describe("classicyNodeEntryPlugin", () => {
	it("names decode-named-character-reference, which 3.7.0 shipped with its DOM entry", () =>
		expect(CLASSICY_NODE_ENTRY_PACKAGES).toEqual([
			"decode-named-character-reference",
		]));

	it("runs before Vite's resolver", () =>
		expect(classicyNodeEntryPlugin().enforce).toBe("pre"));

	it("resolves a named package to its default entry, not its browser one", () =>
		expect(resolveId(["decoder"])("decoder", importer)).toBe(
			join(root, "node_modules/decoder/index.js"),
		));

	it("reads the importer's path without its query", () =>
		expect(resolveId(["decoder"])("decoder", `${importer}?v=1`)).toBe(
			join(root, "node_modules/decoder/index.js"),
		));

	it("leaves every other specifier, a subpath of the package included, to Vite", () => {
		const resolve = resolveId(["decoder"]);
		expect(resolve("react", importer)).toBeNull();
		expect(resolve("decoder/index.dom.js", importer)).toBeNull();
		expect(resolve("decoder", undefined)).toBeNull();
		expect(resolve("decoder", "\0virtual:module")).toBeNull();
	});

	// The real package, as the library build reaches it through micromark
	// (pnpm links the store's packages side by side in .pnpm/node_modules).
	it("resolves decode-named-character-reference to index.js from micromark", () => {
		const resolved = resolveId(CLASSICY_NODE_ENTRY_PACKAGES)(
			"decode-named-character-reference",
			join(
				import.meta.dirname,
				"../node_modules/.pnpm/node_modules/micromark/index.js",
			),
		);
		expect(resolved).toMatch(
			/[\\/]decode-named-character-reference[\\/]index\.js$/,
		);
		return import(pathToFileURL(resolved as string).href).then(
			({ decodeNamedCharacterReference: decode }) => {
				// The table decodes what the DOM did, without one.
				expect(decode("amp")).toBe("&");
				expect(decode("eacute")).toBe("é");
				expect(decode("copy")).toBe("©");
				expect(decode("notachar")).toBe(false);
			},
		);
	});
});
