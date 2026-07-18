/**
 * Stage-1 save path: validate and download the draft as a .stack.json file.
 * Also the home of the built-in Download save provider, which wraps that
 * same path for the provider-aware File menu and save-provider registry.
 */

import {
	type HCStack,
	validateStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	type HyperCardSaveProvider,
	registerHyperCardSaveProvider,
} from "@/SystemFolder/HyperCard/HyperCardPlugins";

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

/** The built-in save destination: download the .stack.json to the user's computer. */
export const downloadSaveProvider: HyperCardSaveProvider = {
	id: "download",
	label: "Download",
	canSave: () => true,
	save: async (stack, _meta) => {
		const result = downloadStack(stack);
		if ("errors" in result) return { ok: false, error: result.errors[0] };
		return { ok: true };
	},
};

export function registerDownloadSaveProvider(): void {
	registerHyperCardSaveProvider(downloadSaveProvider);
}
