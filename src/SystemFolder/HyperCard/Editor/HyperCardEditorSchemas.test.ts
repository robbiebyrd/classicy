import { describe, expect, it } from "vitest";
import {
	BUILTIN_OPTIONS_SCHEMAS,
	optionsSchemaFor,
	paletteEntries,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorSchemas";
import { registerHyperCardPartEditorMeta } from "@/SystemFolder/HyperCard/HyperCardPlugins";

describe("built-in options schemas", () => {
	it("covers the option-bearing built-ins with the right kinds", () => {
		expect(BUILTIN_OPTIONS_SCHEMAS.slider.map((f) => f.key)).toEqual([
			"min",
			"max",
			"step",
		]);
		expect(BUILTIN_OPTIONS_SCHEMAS.popup[0]).toMatchObject({
			key: "choices",
			kind: "choices",
		});
		expect(BUILTIN_OPTIONS_SCHEMAS.image[0]).toMatchObject({
			key: "src",
			kind: "text",
		});
		expect(BUILTIN_OPTIONS_SCHEMAS.field[0]).toMatchObject({
			key: "multiline",
			kind: "checkbox",
		});
	});

	it("optionsSchemaFor prefers built-ins, falls back to plugin meta, else undefined", () => {
		registerHyperCardPartEditorMeta("schemaTest", {
			label: "Schema Test",
			optionsSchema: [{ key: "url", label: "URL", kind: "text" }],
		});
		expect(optionsSchemaFor("slider")).toBe(BUILTIN_OPTIONS_SCHEMAS.slider);
		expect(optionsSchemaFor("schemaTest")?.[0].key).toBe("url");
		expect(optionsSchemaFor("button")).toBeUndefined();
	});

	it("paletteEntries lists 10 built-ins then registered plugin types", () => {
		const entries = paletteEntries();
		expect(entries.slice(0, 10).map((e) => e.type)).toContain("button");
		expect(entries.some((e) => e.type === "schemaTest")).toBe(true);
	});
});
