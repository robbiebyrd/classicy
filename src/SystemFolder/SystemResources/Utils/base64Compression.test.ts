// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
	compressToBase64,
	decompressFromBase64,
} from "@/SystemFolder/SystemResources/Utils/base64Compression";

describe("base64Compression", () => {
	it("round-trips non-trivial binary data", async () => {
		const original = new TextEncoder().encode(
			"The quick brown fox jumps over the lazy dog. ".repeat(20),
		);
		const encoded = await compressToBase64(original);
		const decoded = await decompressFromBase64(encoded);
		expect(decoded).toEqual(original);
	});

	it("round-trips empty data", async () => {
		const original = new Uint8Array(0);
		const encoded = await compressToBase64(original);
		const decoded = await decompressFromBase64(encoded);
		expect(decoded).toEqual(original);
	});

	it("produces a URL-safe string with no +, /, or = characters", async () => {
		// Enough entropy that a naive standard-base64 encoding would almost
		// certainly contain at least one of +, /, or = somewhere.
		const original = crypto.getRandomValues(new Uint8Array(256));
		const encoded = await compressToBase64(original);
		expect(encoded).not.toMatch(/[+/=]/);
	});

	it("accepts an ArrayBuffer as well as a Uint8Array", async () => {
		const bytes = new TextEncoder().encode("hello");
		const buffer = bytes.buffer.slice(
			bytes.byteOffset,
			bytes.byteOffset + bytes.byteLength,
		);
		const encoded = await compressToBase64(buffer);
		const decoded = await decompressFromBase64(encoded);
		expect(decoded).toEqual(bytes);
	});

	it("rejects invalid base64 input", async () => {
		await expect(
			decompressFromBase64("not valid base64!! ***"),
		).rejects.toThrow();
	});

	it("rejects valid base64 that is not valid gzip data", async () => {
		const notGzipped = btoa("just some plain text, not gzip-compressed")
			.replace(/\+/g, "-")
			.replace(/\//g, "_")
			.replace(/=+$/, "");
		await expect(decompressFromBase64(notGzipped)).rejects.toThrow();
	});
});
