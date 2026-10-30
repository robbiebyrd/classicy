import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { resetClassicyFileSystemSharedTrees } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

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

// jsdom has no media playback: HTMLMediaElement's load(), play() and pause()
// report "Not implemented" to the console on every call (play() then returns
// undefined, not a Promise). Replace just those three with silent no-ops, play()
// resolving as a browser's does once playback starts, so the run's output keeps
// only real errors. Each stays a writable, configurable prototype method, so a
// test can still vi.spyOn / mock it. Node-environment test files have no
// HTMLMediaElement and are left alone.
if (typeof HTMLMediaElement !== "undefined") {
	const stubs: Pick<HTMLMediaElement, "load" | "pause" | "play"> = {
		load: () => {},
		pause: () => {},
		play: () => Promise.resolve(),
	};
	for (const [method, value] of Object.entries(stubs)) {
		Object.defineProperty(HTMLMediaElement.prototype, method, {
			value,
			configurable: true,
			writable: true,
		});
	}
}

beforeEach(() => {
	Object.defineProperty(globalThis, "localStorage", {
		value: new MemoryStorage(),
		configurable: true,
		writable: true,
	});
	// File systems share one live tree per storage key; with storage wiped,
	// the next one must read it afresh rather than attach to the last test's.
	resetClassicyFileSystemSharedTrees();
});

afterEach(() => {
	cleanup();
});
