import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { CLASSICY_DEFLATE_MARK } from "../../../bin/classicyDeflateAsset";
import {
	CLASSICY_PDF_WORKER_DEFLATE_MARK,
	classicyPdfWorkerSrcFrom,
} from "./ClassicyPdfWorkerSource.internal";

// The pdf.js worker ships raw-deflated (plan 0019-fb7 §3.1) and is rebuilt at
// runtime into the data: URI pdf.js received from the `?url` import before
// (§3.2). fflate's inflateSync is wrapped in a spy that calls the real one,
// so the memo can be counted.
vi.mock("fflate", async (importOriginal) => {
	const actual = await importOriginal<typeof import("fflate")>();
	return { ...actual, inflateSync: vi.fn(actual.inflateSync) };
});

const WORKER = createRequire(import.meta.url).resolve(
	"pdfjs-dist/build/pdf.worker.min.mjs",
);
const DATA_URI_PREFIX = "data:text/javascript;base64,";

/**
 * A fresh copy of the module (its memo empty), with the fflate and
 * ClassicyLog instances it imports and the inflate spy's count cleared.
 */
async function freshWorkerSource() {
	vi.resetModules();
	const fflate = await import("fflate");
	const log = await import("@/SystemFolder/SystemResources/Log/ClassicyLog");
	const source = await import("./ClassicyPdfWorkerSource.internal");
	const inflate = vi.mocked(fflate.inflateSync);
	inflate.mockClear();
	return { inflate, log, source };
}

afterEach(() => {
	vi.restoreAllMocks();
});

describe("classicyPdfWorkerSrc", () => {
	it("builds the data: URI pdf.js received before", async () => {
		const { source } = await freshWorkerSource();
		const expected = DATA_URI_PREFIX + readFileSync(WORKER).toString("base64");
		const src = source.classicyPdfWorkerSrc();
		expect(src.startsWith(DATA_URI_PREFIX)).toBe(true);
		expect(src).toHaveLength(expected.length);
		// Compared as a boolean: a failing diff of two 1.7 MB strings is noise.
		expect(src === expected).toBe(true);
	});

	it("inflates once", async () => {
		const { inflate, source } = await freshWorkerSource();
		const first = source.classicyPdfWorkerSrc();
		const second = source.classicyPdfWorkerSrc();
		expect(inflate).toHaveBeenCalledTimes(1);
		expect(second === first).toBe(true);
	});

	it("keeps no failed result: the next call inflates again", async () => {
		const { inflate, log, source } = await freshWorkerSource();
		const logged = vi
			.spyOn(log, "classicyLog")
			.mockImplementation(() => undefined);
		inflate.mockImplementationOnce(() => {
			throw new Error("invalid block type");
		});
		expect(source.classicyPdfWorkerSrc()).toBe("");
		expect(logged).toHaveBeenCalledTimes(1);
		const retried = source.classicyPdfWorkerSrc();
		expect(retried.startsWith(DATA_URI_PREFIX)).toBe(true);
		source.classicyPdfWorkerSrc();
		expect(inflate).toHaveBeenCalledTimes(2);
		expect(logged).toHaveBeenCalledTimes(1);
	});
});

describe("classicyPdfWorkerSrcFrom", () => {
	it("its mark equals the build plugin's", () => {
		expect(CLASSICY_PDF_WORKER_DEFLATE_MARK).toBe(CLASSICY_DEFLATE_MARK);
	});

	it("returns '' and logs an error for a payload without the mark", () => {
		const logged = vi
			.spyOn(ClassicyLog, "classicyLog")
			.mockImplementation(() => undefined);
		expect(classicyPdfWorkerSrcFrom("AAAA")).toBe("");
		expect(logged).toHaveBeenCalledTimes(1);
		expect(logged).toHaveBeenCalledWith(
			"error",
			"PDFViewer",
			expect.any(String),
		);
	});

	it("returns '' and logs an error for a corrupt payload", () => {
		const logged = vi
			.spyOn(ClassicyLog, "classicyLog")
			.mockImplementation(() => undefined);
		expect(classicyPdfWorkerSrcFrom(`${CLASSICY_DEFLATE_MARK}AAAA`)).toBe("");
		expect(logged).toHaveBeenCalledTimes(1);
		expect(logged).toHaveBeenCalledWith(
			"error",
			"PDFViewer",
			expect.any(String),
			expect.any(Error),
		);
	});

	it("encodes a length that is not a multiple of 3 with padding only at the end", async () => {
		const { deflateRawSync } = await import("node:zlib");
		// Past one encoding piece, and two bytes over a multiple of 3.
		const bytes = Buffer.alloc(100_001, 0);
		for (let i = 0; i < bytes.length; i++) bytes[i] = (i * 7919) % 256;
		const deflated =
			CLASSICY_DEFLATE_MARK + deflateRawSync(bytes).toString("base64");
		expect(classicyPdfWorkerSrcFrom(deflated)).toBe(
			DATA_URI_PREFIX + bytes.toString("base64"),
		);
	});
});
