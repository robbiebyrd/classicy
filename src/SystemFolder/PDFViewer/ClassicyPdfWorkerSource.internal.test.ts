import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFLATE_MARK } from "../../../bin/classicyDeflateAsset";
import {
	CLASSICY_PDF_WORKER_DEFLATE_MARK,
	type ClassicyPdfWorkerSrc,
	classicyPdfWorkerSrcFrom,
} from "./ClassicyPdfWorkerSource.internal";

// The pdf.js worker ships raw-deflated (plan 0019-fb7 §3.1) and is rebuilt at
// runtime into the data: URI pdf.js received from the `?url` import before
// (§3.2). It is the legacy build's worker (§3.4): the modern one calls
// Map.prototype.getOrInsertComputed, which the oldest supported browsers
// (Chrome 120, Safari 16.2, Firefox 113) lack. fflate's inflateSync is
// wrapped in a spy that calls the real one, so the memo can be counted.
vi.mock("fflate", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fflate")>();
	return { ...actual, inflateSync: vi.fn(actual.inflateSync) };
});

const WORKER = createRequire(import.meta.url).resolve(
	"pdfjs-dist/legacy/build/pdf.worker.min.mjs",
);
const DATA_URI_PREFIX = "data:text/javascript;base64,";
const NO_MARK =
	"The pdf.js worker's compressed copy has no deflate mark, so no PDF can open.";
const NO_INFLATE =
	"The pdf.js worker's compressed copy did not inflate, so no PDF can open.";

/**
 * A fresh copy of the module (its memo empty), with the fflate instance it
 * imports and the inflate spy's count cleared.
 */
async function freshWorkerSource() {
	vi.resetModules();
	const fflate = await import("fflate");
	const source = await import("./ClassicyPdfWorkerSource.internal");
	const inflate = vi.mocked(fflate.inflateSync);
	inflate.mockClear();
	return { inflate, source };
}

/** The URI of a result that must hold one. */
const srcOf = (result: ClassicyPdfWorkerSrc): string => {
	if (!result.ok) throw new Error(`expected a URI, got: ${result.problem}`);
	return result.src;
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe("classicyPdfWorkerSrc", () => {
	it("builds the data: URI of pdf.js's legacy worker", async () => {
		const { source } = await freshWorkerSource();
		const expected = DATA_URI_PREFIX + readFileSync(WORKER).toString("base64");
		const src = srcOf(source.classicyPdfWorkerSrc());
		expect(src.startsWith(DATA_URI_PREFIX)).toBe(true);
		expect(src).toHaveLength(expected.length);
		// Compared as a boolean: a failing diff of two 1.7 MB strings is noise.
		expect(src === expected).toBe(true);
	});

	it("inflates once", async () => {
		const { inflate, source } = await freshWorkerSource();
		const first = srcOf(source.classicyPdfWorkerSrc());
		const second = srcOf(source.classicyPdfWorkerSrc());
		expect(inflate).toHaveBeenCalledTimes(1);
		expect(second === first).toBe(true);
	});

	it("keeps no failed result: the next call inflates again", async () => {
		const { inflate, source } = await freshWorkerSource();
		const invalid = new Error("invalid block type");
		inflate.mockImplementationOnce(() => {
			throw invalid;
		});
		expect(source.classicyPdfWorkerSrc()).toEqual({
			ok: false,
			problem: NO_INFLATE,
			error: invalid,
		});
		const retried = srcOf(source.classicyPdfWorkerSrc());
		expect(retried.startsWith(DATA_URI_PREFIX)).toBe(true);
		source.classicyPdfWorkerSrc();
		expect(inflate).toHaveBeenCalledTimes(2);
	});
});

describe("classicyPdfWorkerSrcFrom", () => {
	it("its mark equals the build plugin's", () => {
		expect(CLASSICY_PDF_WORKER_DEFLATE_MARK).toBe(CLASSICY_DEFLATE_MARK);
	});

	it("reports a payload without the mark as a problem", () =>
		expect(classicyPdfWorkerSrcFrom("AAAA")).toEqual({
			ok: false,
			problem: NO_MARK,
		}));

	it("reports a corrupt payload as a problem, with what inflating threw", () =>
		expect(classicyPdfWorkerSrcFrom(`${CLASSICY_DEFLATE_MARK}AAAA`)).toEqual({
			ok: false,
			problem: NO_INFLATE,
			error: expect.any(Error),
		}));

	it("encodes a length that is not a multiple of 3 with padding only at the end", async () => {
		const { deflateRawSync } = await import("node:zlib");
		// Past one encoding piece, and two bytes over a multiple of 3.
		const bytes = Buffer.alloc(100_001, 0);
		for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7919) % 256;
		const deflated =
			CLASSICY_DEFLATE_MARK + deflateRawSync(bytes).toString("base64");
		expect(classicyPdfWorkerSrcFrom(deflated)).toEqual({
			ok: true,
			src: DATA_URI_PREFIX + bytes.toString("base64"),
		});
	});
});

// In the ES build this module is a lazy chunk. Importing anything of
// Classicy's would make that chunk import the entry as "./classicy.es.js",
// so a host serving the entry under another URL would load a second copy of
// the library, or none, on the first PDF (verify:dist invariant 17 checks
// the built chunk).
describe("ClassicyPdfWorkerSource.internal.ts", () => {
	it("imports only fflate and the deflated worker", () => {
		const text = readFileSync(
			join(__dirname, "ClassicyPdfWorkerSource.internal.ts"),
			"utf8",
		);
		const specifiers = [
			...text.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*"([^"]+)"/gm),
			...text.matchAll(/^\s*import\s*"([^"]+)"/gm),
			...text.matchAll(/\bimport\s*\(\s*"([^"]+)"\s*\)/g),
		].map((match) => match[1]);
		expect(specifiers).toEqual([
			"fflate",
			"pdfjs-dist/legacy/build/pdf.worker.min.mjs?classicy-deflate",
		]);
	});
});
