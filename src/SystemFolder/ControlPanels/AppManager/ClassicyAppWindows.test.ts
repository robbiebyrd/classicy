import { produce } from "immer";
import { describe, expect, it } from "vitest";
import type {
	ClassicyStoreSystemApp,
	ClassicyStoreSystemAppWindow,
} from "./ClassicyAppManager";
import {
	countAppWindows,
	getAppWindow,
	hasAppWindow,
	listAppWindows,
	mostRecentAppWindow,
	removeAppWindow,
	setAppWindow,
	updateAppWindow,
} from "./ClassicyAppWindows";

function makeWindow(
	id: string,
	extra: Partial<ClassicyStoreSystemAppWindow> = {},
): ClassicyStoreSystemAppWindow {
	return {
		id,
		closed: false,
		size: [400, 300],
		position: [10, 10],
		minimumSize: [100, 100],
		...extra,
	};
}

function makeApp(
	...windows: ClassicyStoreSystemAppWindow[]
): ClassicyStoreSystemApp {
	return {
		id: "Test.app",
		name: "Test",
		icon: "",
		open: true,
		windows,
	};
}

describe("getAppWindow", () => {
	it("returns the window registered under the id", () => {
		const app = makeApp(makeWindow("a"), makeWindow("b", { title: "B" }));
		expect(getAppWindow(app, "b")?.title).toBe("B");
	});

	it("returns undefined for an unknown id", () => {
		expect(getAppWindow(makeApp(makeWindow("a")), "zzz")).toBeUndefined();
	});

	it("tolerates a missing app, a missing collection and a missing id", () => {
		expect(getAppWindow(undefined, "a")).toBeUndefined();
		expect(getAppWindow(null, "a")).toBeUndefined();
		expect(getAppWindow({}, "a")).toBeUndefined();
		expect(getAppWindow(makeApp(makeWindow("a")), undefined)).toBeUndefined();
	});
});

describe("listAppWindows", () => {
	it("lists every window in registration order", () => {
		const app = makeApp(makeWindow("one"), makeWindow("two"));
		expect(listAppWindows(app).map((w) => w.id)).toEqual(["one", "two"]);
	});

	it("returns a fresh array that can be sorted without touching the app", () => {
		const app = makeApp(makeWindow("b"), makeWindow("a"));
		const list = listAppWindows(app);
		list.sort((x, y) => x.id.localeCompare(y.id));
		expect(listAppWindows(app).map((w) => w.id)).toEqual(["b", "a"]);
	});

	it("returns an empty list for a missing app or collection", () => {
		expect(listAppWindows(undefined)).toEqual([]);
		expect(listAppWindows({})).toEqual([]);
	});
});

describe("hasAppWindow / countAppWindows", () => {
	it("reports membership and size", () => {
		const app = makeApp(makeWindow("a"), makeWindow("b", { closed: true }));
		expect(hasAppWindow(app, "a")).toBe(true);
		expect(hasAppWindow(app, "b")).toBe(true);
		expect(hasAppWindow(app, "c")).toBe(false);
		expect(countAppWindows(app)).toBe(2);
	});

	it("treats a missing app as empty", () => {
		expect(hasAppWindow(undefined, "a")).toBe(false);
		expect(countAppWindows(undefined)).toBe(0);
		expect(countAppWindows({})).toBe(0);
	});
});

describe("setAppWindow", () => {
	it("inserts a window under a new id", () => {
		const app = makeApp(makeWindow("a"));
		setAppWindow(app, makeWindow("b"));
		expect(countAppWindows(app)).toBe(2);
		expect(getAppWindow(app, "b")).toBeDefined();
	});

	it("replaces the window already registered under the id", () => {
		const app = makeApp(makeWindow("a", { title: "old" }), makeWindow("b"));
		setAppWindow(app, makeWindow("a", { title: "new" }));
		expect(countAppWindows(app)).toBe(2);
		expect(getAppWindow(app, "a")?.title).toBe("new");
	});

	it("creates the collection when the app has none", () => {
		const app = makeApp();
		(app as { windows?: unknown }).windows = undefined;
		setAppWindow(app, makeWindow("a"));
		expect(listAppWindows(app).map((w) => w.id)).toEqual(["a"]);
	});
});

describe("removeAppWindow", () => {
	it("removes the window and reports it", () => {
		const app = makeApp(makeWindow("a"), makeWindow("b"));
		expect(removeAppWindow(app, "a")).toBe(true);
		expect(hasAppWindow(app, "a")).toBe(false);
		expect(listAppWindows(app).map((w) => w.id)).toEqual(["b"]);
	});

	it("is a no-op for an unknown window or a missing app", () => {
		const app = makeApp(makeWindow("a"));
		expect(removeAppWindow(app, "zzz")).toBe(false);
		expect(countAppWindows(app)).toBe(1);
		expect(removeAppWindow(undefined, "a")).toBe(false);
	});
});

describe("updateAppWindow", () => {
	it("shallow-merges a patch", () => {
		const app = makeApp(makeWindow("a", { title: "keep" }));
		const updated = updateAppWindow(app, "a", { collapsed: true });
		expect(updated?.collapsed).toBe(true);
		expect(getAppWindow(app, "a")).toMatchObject({
			collapsed: true,
			title: "keep",
		});
	});

	it("runs a mutator on the window", () => {
		const app = makeApp(makeWindow("a"));
		updateAppWindow(app, "a", (w) => {
			w.position = [50, 60];
		});
		expect(getAppWindow(app, "a")?.position).toEqual([50, 60]);
	});

	it("does nothing and returns undefined for an unknown window or app", () => {
		const app = makeApp(makeWindow("a"));
		let called = false;
		expect(
			updateAppWindow(app, "zzz", () => {
				called = true;
			}),
		).toBeUndefined();
		expect(called).toBe(false);
		expect(updateAppWindow(undefined, "a", { closed: true })).toBeUndefined();
		expect(getAppWindow(app, "a")?.closed).toBe(false);
	});
});

describe("write helpers on an immer draft", () => {
	it("produce a new state, leave the base untouched and share untouched windows", () => {
		const base = makeApp(makeWindow("a"), makeWindow("b"));
		const next = produce(base, (draft) => {
			updateAppWindow(draft, "a", { zoomed: true });
			setAppWindow(draft, makeWindow("c"));
		});
		expect(getAppWindow(base, "a")?.zoomed).toBeUndefined();
		expect(countAppWindows(base)).toBe(2);
		expect(getAppWindow(next, "a")?.zoomed).toBe(true);
		expect(countAppWindows(next)).toBe(3);
		expect(getAppWindow(next, "b")).toBe(getAppWindow(base, "b"));
	});

	it("keeps the collection reference when nothing changes", () => {
		const base = makeApp(makeWindow("a"));
		const next = produce(base, (draft) => {
			updateAppWindow(draft, "zzz", { zoomed: true });
		});
		expect(next.windows).toBe(base.windows);
	});

	it("removes a window from the draft only", () => {
		const base = makeApp(makeWindow("a"), makeWindow("b"));
		const next = produce(base, (draft) => {
			removeAppWindow(draft, "a");
		});
		expect(hasAppWindow(base, "a")).toBe(true);
		expect(hasAppWindow(next, "a")).toBe(false);
	});
});

describe("mostRecentAppWindow", () => {
	it("picks the highest zOrder", () => {
		const pick = mostRecentAppWindow([
			makeWindow("a", { zOrder: 10 }),
			makeWindow("b", { zOrder: 30 }),
			makeWindow("c", { zOrder: 20 }),
		]);
		expect(pick?.id).toBe("b");
	});

	it("treats a missing zOrder as 0", () => {
		const pick = mostRecentAppWindow([
			makeWindow("never-focused"),
			makeWindow("focused", { zOrder: 1 }),
		]);
		expect(pick?.id).toBe("focused");
	});

	it("keeps the earlier window on a tie", () => {
		const pick = mostRecentAppWindow([
			makeWindow("first", { zOrder: 5 }),
			makeWindow("second", { zOrder: 5 }),
		]);
		expect(pick?.id).toBe("first");
	});

	it("returns undefined for no windows", () => {
		expect(mostRecentAppWindow([])).toBeUndefined();
	});
});
