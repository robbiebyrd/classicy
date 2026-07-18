/**
 * Stage-1 save path: validate and download the draft as a .stack.json file.
 * (The pluggable save-provider registry arrives in stage 2; this module is
 * where its built-in Download provider will live.)
 */

import {
	type HCStack,
	validateStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";

/** Serialize a stack the way the repo's .stack.json files are formatted. */
export function serializeStack(stack: HCStack): string {
	return `${JSON.stringify(stack, null, "\t")}\n`;
}

export function stackFileName(stack: HCStack): string {
	const slug = stack.name
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return `${slug || "untitled"}.stack.json`;
}

export function downloadStack(
	stack: HCStack,
): { ok: true } | { ok: false; errors: string[] } {
	// Validate the JSON round-trip — exactly what a future loader will see.
	const result = validateStack(JSON.parse(serializeStack(stack)));
	if (!result.ok) return result;

	const blob = new Blob([serializeStack(stack)], { type: "application/json" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = stackFileName(stack);
	anchor.click();
	URL.revokeObjectURL(url);
	return { ok: true };
}
