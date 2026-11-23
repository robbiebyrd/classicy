import { inflateSync } from "fflate";
import deflatedWorker from "pdfjs-dist/build/pdf.worker.min.mjs?classicy-deflate";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// The pdf.js worker ships raw-deflated as base64 text (plan 0019-fb7 Part 2,
// bin/classicyDeflateAsset.ts), about a third of the data: URI a `?url`
// import inlines. When pdf.js first loads, the PDF viewer rebuilds that same
// URI from it, so pdf.js takes the path it always has (a blob: module worker
// importing the data: URI, its main-thread fallback included) and fetches
// nothing: PDFs open on file:, CDN and custom-scheme hosts alike.

/**
 * What the build plugin's payload starts with: CLASSICY_DEFLATE_MARK in
 * bin/classicyDeflateAsset.ts, which runtime code cannot import (a test pins
 * the two equal).
 */
export const CLASSICY_PDF_WORKER_DEFLATE_MARK =
	"classicy-deflate:deflate-raw;base64,";

const WORKER_DATA_URI_PREFIX = "data:text/javascript;base64,";

// Bytes per String.fromCharCode call: well under every engine's argument
// limit (JavaScriptCore's is 65536), and a multiple of 3, so no piece but the
// last ends in padding and the pieces' base64 joins into the whole's.
const BASE64_PIECE_BYTES = 3 * 0x1000;

function base64Of(bytes: Uint8Array): string {
	const pieces: string[] = [];
	for (let start = 0; start < bytes.length; start += BASE64_PIECE_BYTES) {
		// Applied, not spread: a spread walks the typed array's iterator, about
		// four times slower over the worker's 1.26 MB.
		const piece = bytes.subarray(start, start + BASE64_PIECE_BYTES);
		pieces.push(btoa(Reflect.apply(String.fromCharCode, null, piece)));
	}
	return pieces.join("");
}

function bytesOfBase64(base64: string): Uint8Array {
	const binary = atob(base64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

/**
 * The pdf.js worker's `data:text/javascript;base64,…` URI, rebuilt from a
 * `?classicy-deflate` payload; `""` (with an error logged) when the payload
 * has no mark or does not inflate.
 */
export function classicyPdfWorkerSrcFrom(deflated: string): string {
	if (!deflated.startsWith(CLASSICY_PDF_WORKER_DEFLATE_MARK)) {
		classicyLog(
			"error",
			"PDFViewer",
			"The pdf.js worker's compressed copy has no deflate mark, so no PDF can open.",
		);
		return "";
	}
	try {
		const worker = inflateSync(
			bytesOfBase64(deflated.slice(CLASSICY_PDF_WORKER_DEFLATE_MARK.length)),
		);
		return WORKER_DATA_URI_PREFIX + base64Of(worker);
	} catch (error) {
		classicyLog(
			"error",
			"PDFViewer",
			"The pdf.js worker's compressed copy did not inflate, so no PDF can open.",
			error,
		);
		return "";
	}
}

let workerSrc = "";

/**
 * The pdf.js worker's data: URI, inflated on the first call. Only a URI is
 * kept: after a failure (`""`, logged) the next call inflates, and logs,
 * again.
 */
export function classicyPdfWorkerSrc(): string {
	if (!workerSrc) workerSrc = classicyPdfWorkerSrcFrom(deflatedWorker);
	return workerSrc;
}
