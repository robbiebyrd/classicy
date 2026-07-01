import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { gzip, gunzip } from "node:zlib";
import { promisify } from "node:util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

// Node 23+ ships an experimental, file-backed global `localStorage` that throws
// `SecurityError: Cannot initialize local storage without a --localstorage-file
// path` and, when a path is supplied, is shared across all Vitest workers —
// breaking per-test isolation. It shadows jsdom's own in-memory storage. Replace
// it with a fresh in-memory Storage before every test so each test (and each
// worker) gets an isolated, spec-compliant localStorage.
class MemoryStorage implements Storage {
	private store = new Map<string, string>();

	get length(): number {
		return this.store.size;
	}

	clear(): void {
		this.store.clear();
	}

	getItem(key: string): string | null {
		return this.store.has(key) ? (this.store.get(key) as string) : null;
	}

	key(index: number): string | null {
		return Array.from(this.store.keys())[index] ?? null;
	}

	removeItem(key: string): void {
		this.store.delete(key);
	}

	setItem(key: string, value: string): void {
		this.store.set(key, String(value));
	}
}

// Polyfill CompressionStream and DecompressionStream for jsdom test environment.
// These are Web APIs available in Node 18+ and modern browsers, but jsdom doesn't
// implement them yet. We use TransformStream with Node's zlib to provide the interface.
if (!globalThis.CompressionStream) {
	class CompressionStream {
		readonly readable: ReadableStream<Uint8Array>;
		readonly writable: WritableStream<Uint8Array>;

		constructor(format: string) {
			if (format !== "gzip") {
				throw new Error(`Unsupported compression format: ${format}`);
			}

			const chunks: Uint8Array[] = [];

			const transformer: Transformer<Uint8Array, Uint8Array> = {
				async flush(controller) {
					if (chunks.length === 0) {
						controller.terminate();
						return;
					}
					try {
						const combined = new Uint8Array(
							chunks.reduce((sum, c) => sum + c.length, 0),
						);
						let offset = 0;
						for (const chunk of chunks) {
							combined.set(chunk, offset);
							offset += chunk.length;
						}
						const compressed = await gzipAsync(combined);
						// Ensure we always return Uint8Array, not Buffer
						const result = compressed instanceof Uint8Array
							? compressed
							: new Uint8Array(compressed);
						controller.enqueue(result);
					} catch (err) {
						controller.error(err);
					}
				},
				transform: async (chunk) => {
					chunks.push(new Uint8Array(chunk));
				},
			};

			const ts = new TransformStream(transformer);
			this.writable = ts.writable;
			this.readable = ts.readable;
		}
	}

	class DecompressionStream {
		readonly readable: ReadableStream<Uint8Array>;
		readonly writable: WritableStream<Uint8Array>;

		constructor(format: string) {
			if (format !== "gzip") {
				throw new Error(`Unsupported decompression format: ${format}`);
			}

			const chunks: Uint8Array[] = [];

			const transformer: Transformer<Uint8Array, Uint8Array> = {
				async flush(controller) {
					if (chunks.length === 0) {
						controller.terminate();
						return;
					}
					try {
						const combined = new Uint8Array(
							chunks.reduce((sum, c) => sum + c.length, 0),
						);
						let offset = 0;
						for (const chunk of chunks) {
							combined.set(chunk, offset);
							offset += chunk.length;
						}
						const decompressed = await gunzipAsync(combined);
						// Ensure we always return Uint8Array, not Buffer
						const result = decompressed instanceof Uint8Array
							? decompressed
							: new Uint8Array(decompressed);
						controller.enqueue(result);
					} catch (err) {
						controller.error(err);
					}
				},
				transform: async (chunk) => {
					chunks.push(new Uint8Array(chunk));
				},
			};

			const ts = new TransformStream(transformer);
			this.writable = ts.writable;
			this.readable = ts.readable;
		}
	}

	(globalThis as any).CompressionStream = CompressionStream;
	(globalThis as any).DecompressionStream = DecompressionStream;
}

// Polyfill Blob.stream() if not available
if (!Blob.prototype.stream) {
	Blob.prototype.stream = function () {
		const blob = this;
		return new ReadableStream({
			async start(controller) {
				const reader = new FileReader();
				reader.onload = () => {
					controller.enqueue(new Uint8Array(reader.result as ArrayBuffer));
					controller.close();
				};
				reader.onerror = () => {
					controller.error(reader.error);
				};
				reader.readAsArrayBuffer(blob);
			},
		});
	};
}

beforeEach(() => {
	Object.defineProperty(globalThis, "localStorage", {
		value: new MemoryStorage(),
		configurable: true,
		writable: true,
	});
});

afterEach(() => {
	cleanup();
});
