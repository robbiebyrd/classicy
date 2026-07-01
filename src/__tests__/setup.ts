import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";

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
