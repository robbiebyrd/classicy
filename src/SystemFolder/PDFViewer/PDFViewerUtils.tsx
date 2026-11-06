import { z } from "zod";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";

export type PDFViewerData = {
	openFiles: string[];
};

/** Manifest schema for PDFViewer.app's `data` (see registerApp). */
export const PDFViewerDataSchema = z.looseObject({
	openFiles: z
		.array(z.string())
		.optional()
		.describe("File-system paths of PDFs currently open."),
});

export function isPDFViewerData(
	d: Record<string, unknown>,
): d is PDFViewerData {
	return (
		d !== null &&
		typeof d === "object" &&
		"openFiles" in d &&
		Array.isArray(d.openFiles)
	);
}

export const PDFViewerAppInfo = {
	name: "PDF Viewer",
	id: "PDFViewer.app",
	get icon() {
		return resolveClassicyAsset("icons", "system.files.document") ?? "";
	},
};
