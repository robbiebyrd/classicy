// The asset hooks hand useSyncExternalStore one getSnapshot per input, not
// a new closure on every render: React calls a changed getSnapshot again
// during render, so a per-render closure re-ran the lookup on every commit
// of every icon surface (story 0206-d4j).
import { render } from "@testing-library/react";
import { createElement } from "react";
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";

// The setup file has already loaded the registry with the real React, so a
// fresh copy is loaded under the mock below.
let registry: typeof import("@/Appearance/ClassicyAssetRegistry");
beforeAll(async () => {
	vi.resetModules();
	registry = await import("@/Appearance/ClassicyAssetRegistry");
});

const snapshots = vi.hoisted(() => ({ seen: [] as unknown[] }));

vi.mock("react", async (importOriginal) => {
	const actual = await importOriginal<typeof import("react")>();
	const useSyncExternalStore: typeof actual.useSyncExternalStore = (
		subscribe,
		getSnapshot,
		getServerSnapshot,
	) => {
		snapshots.seen.push(getSnapshot);
		return actual.useSyncExternalStore(
			subscribe,
			getSnapshot,
			getServerSnapshot,
		);
	};
	return { ...actual, default: actual, useSyncExternalStore };
});

/** Renders `hook(props)` with each props object in turn, in one root. */
const renderWith = <P extends object>(
	hook: (props: P) => unknown,
	...propsList: P[]
): unknown[] => {
	const Probe = (props: P) => {
		hook(props);
		return null;
	};
	const [first, ...rest] = propsList;
	snapshots.seen = [];
	const { rerender } = render(createElement(Probe, first));
	for (const props of rest) rerender(createElement(Probe, props));
	return snapshots.seen;
};

beforeEach(() => {
	registry.resetClassicyAssets();
	registry.registerClassicyAssets("icons", "platinum", {
		folder: { src: "/folder.png", small: "/folder-16.png" },
	});
});

afterEach(() => registry.resetClassicyAssets());

describe("asset hooks keep their getSnapshot across renders", () => {
	it("useClassicyIconImage, until src, size or selection changes", () => {
		const seen = renderWith(
			(p: { src: string; px: number | true; selected: boolean }) =>
				registry.useClassicyIconImage(p.src, p.px, p.selected),
			{ src: "/folder.png", px: 16, selected: false },
			{ src: "/folder.png", px: 16, selected: false },
			{ src: "/other.png", px: 16, selected: false },
			{ src: "/other.png", px: 32, selected: false },
			{ src: "/other.png", px: 32, selected: true },
		);
		expect(seen).toHaveLength(5);
		expect(seen[1]).toBe(seen[0]);
		expect(seen[2]).not.toBe(seen[1]);
		expect(seen[3]).not.toBe(seen[2]);
		expect(seen[4]).not.toBe(seen[3]);
	});

	it("useClassicyAsset, until the kind or path changes", () => {
		const seen = renderWith(
			(p: { kind: "icons" | "systemArt"; path: string }) =>
				registry.useClassicyAsset(p.kind, p.path),
			{ kind: "icons", path: "folder" },
			{ kind: "icons", path: "folder" },
			{ kind: "icons", path: "other" },
			{ kind: "systemArt", path: "other" },
		);
		expect(seen).toHaveLength(4);
		expect(seen[1]).toBe(seen[0]);
		expect(seen[2]).not.toBe(seen[1]);
		expect(seen[3]).not.toBe(seen[2]);
	});

	it("useClassicyAssetTree, until the kind changes", () => {
		const seen = renderWith(
			(p: { kind: "icons" | "cursors" }) =>
				registry.useClassicyAssetTree(p.kind),
			{ kind: "icons" },
			{ kind: "icons" },
			{ kind: "cursors" },
		);
		expect(seen).toHaveLength(3);
		expect(seen[1]).toBe(seen[0]);
		expect(seen[2]).not.toBe(seen[1]);
	});
});
