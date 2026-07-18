/**
 * Inspector option schemas: which typed fields each part type's `options`
 * object exposes. Built-ins are authored here; plugin parts supply theirs via
 * registerHyperCardPartEditorMeta. Parts absent from both edit options as raw
 * JSON rows in the inspector.
 */

import { BUILTIN_PART_DESCRIPTORS } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import {
	getHyperCardPartEditorMeta,
	getRegisteredEditorPartTypes,
	type HCOptionField,
} from "@/SystemFolder/HyperCard/HyperCardPlugins";

export const BUILTIN_OPTIONS_SCHEMAS: Record<string, HCOptionField[]> = {
	radio: [{ key: "choices", label: "Choices", kind: "choices" }],
	popup: [{ key: "choices", label: "Choices", kind: "choices" }],
	slider: [
		{ key: "min", label: "Minimum", kind: "number", default: 0 },
		{ key: "max", label: "Maximum", kind: "number", default: 100 },
		{ key: "step", label: "Step", kind: "number", default: 1 },
	],
	progress: [{ key: "max", label: "Maximum", kind: "number", default: 100 }],
	image: [{ key: "src", label: "Image URL", kind: "text" }],
	field: [{ key: "multiline", label: "Multiline", kind: "checkbox" }],
};

/** Schema for a part type: built-in first, then plugin editor meta. */
export function optionsSchemaFor(type: string): HCOptionField[] | undefined {
	return (
		BUILTIN_OPTIONS_SCHEMAS[type] ??
		getHyperCardPartEditorMeta(type)?.optionsSchema
	);
}

/** Palette listing: the built-ins followed by registered plugin part types. */
export function paletteEntries(): { type: string; label: string }[] {
	return [
		...BUILTIN_PART_DESCRIPTORS.map((d) => ({ type: d.type, label: d.label })),
		...getRegisteredEditorPartTypes().map(({ type, meta }) => ({
			type,
			label: meta.label,
		})),
	];
}
