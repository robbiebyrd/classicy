import { inflateSync } from "fflate";
import deflatedWorker from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?classicy-deflate";

// The pdf.js worker ships raw-deflated as base64 text (plan 0019-fb7 Part 2,
// bin/classicyDeflateAsset.ts), about a third of the data: URI a `?url`
// import inlines. When pdf.js first loads, the PDF viewer rebuilds that same
// URI from it, so pdf.js takes the path it always has (a blob: module worker
// importing the data: URI, its main-thread fallback included) and fetches
// nothing: PDFs open on file:, CDN and custom-scheme hosts alike. It is the
// legacy build's worker, as PDFViewerDocument loads the legacy build's API:
// the modern worker calls Map.prototype.getOrInsertComputed, which the oldest
// supported browsers (Chrome 120, Safari 16.2, Firefox 113) lack.
//
// This module imports nothing from Classicy (only fflate and the deflated
// worker): in the ES build it is a lazy chunk, and a chunk that imported
// from the entry would name it as "./classicy.es.js". A host serving the
// entry under any other URL (a query string, a CDN redirect, a renamed file)
// would then load a second copy of the library on the first PDF, or none at
// all. So it reports a failure as data, and PDFViewerDocument, in the entry,
// logs it (verify:dist invariant 17 fails on a lazy chunk that imports the
// entry).

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
 * The pdf.js worker's `data:text/javascript;base64,…` URI (`ok`), or why it
 * could not be rebuilt: `problem`, a sentence for the log, and `error`, what
 * inflating threw, when it threw.
 */
export type ClassicyPdfWorkerSrc =
	| { readonly ok: true; readonly src: string }
	| {
			readonly ok: false;
			readonly problem: string;
			readonly error?: unknown;
	  };

/**
 * The pdf.js worker's URI, rebuilt from a `?classicy-deflate` payload; a
 * problem when the payload has no mark or does not inflate. Logs nothing.
 */
export function classicyPdfWorkerSrcFrom(
	deflated: string,
): ClassicyPdfWorkerSrc {
	if (!deflated.startsWith(CLASSICY_PDF_WORKER_DEFLATE_MARK))
		return {
			ok: false,
			problem:
				"The pdf.js worker's compressed copy has no deflate mark, so no PDF can open.",
		};
	try {
		const worker = inflateSync(
			bytesOfBase64(deflated.slice(CLASSICY_PDF_WORKER_DEFLATE_MARK.length)),
		);
		return { ok: true, src: WORKER_DATA_URI_PREFIX + base64Of(worker) };
	} catch (error) {
		return {
			ok: false,
			problem:
				"The pdf.js worker's compressed copy did not inflate, so no PDF can open.",
			error,
		};
	}
}

let workerSrc: ClassicyPdfWorkerSrc | null = null;

/**
 * The pdf.js worker's URI, inflated on the first call. Only a rebuilt URI is
 * kept: after a problem the next call inflates again.
 */
export function classicyPdfWorkerSrc(): ClassicyPdfWorkerSrc {
	if (workerSrc) return workerSrc;
	const result = classicyPdfWorkerSrcFrom(deflatedWorker);
	if (result.ok) workerSrc = result;
	return result;
}
