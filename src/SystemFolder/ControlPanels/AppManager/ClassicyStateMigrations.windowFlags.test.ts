import { produce } from "immer";
import { describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
	mergeClassicyState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { migrateClassicyState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyStateMigrations";

/**
 * `resizing`, `dragging` and `moving` belong to a gesture in progress, which
 * a load ends. `sanitizeStateForPersistence` drops them on save; migration
 * drops them from state saved before that (or written mid-gesture), so a
 * stale `dragging: true` never makes a window follow the pointer.
 */

/** Default state plus app `X.app` holding window `w` with `flags`. */
const withWindowFlags = (flags: Record<string, boolean>): ClassicyStore =>
	produce(DefaultAppManagerState, (draft) => {
		draft.System.Manager.Applications.apps["X.app"] = {
			id: "X.app",
			name: "X",
			icon: "",
			open: true,
			data: {},
			windows: {
				w: {
					id: "w",
					closed: false,
					size: [100, 100],
					position: [10, 40],
					minimumSize: [0, 0],
					...flags,
				},
			},
		};
	});

const windowOf = (state: ClassicyStore) =>
	state.System.Manager.Applications.apps["X.app"].windows.w;

describe("migrateClassicyState — gesture flags", () => {
	it("drops resizing, dragging and moving from a saved window", () => {
		const saved = JSON.parse(
			JSON.stringify(
				withWindowFlags({ resizing: true, dragging: true, moving: true }),
			),
		) as ClassicyStore;
		const win = windowOf(migrateClassicyState(saved));
		expect(win.position).toEqual([10, 40]);
		expect(win.size).toEqual([100, 100]);
		expect("resizing" in win).toBe(false);
		expect("dragging" in win).toBe(false);
		expect("moving" in win).toBe(false);
	});

	it("never mutates the state it is given", () => {
		const saved = withWindowFlags({ dragging: true });
		migrateClassicyState(saved);
		expect(windowOf(saved).dragging).toBe(true);
	});

	it("is idempotent: state with no flags comes back as the same object", () => {
		const clean = migrateClassicyState(withWindowFlags({ dragging: true }));
		expect(migrateClassicyState(clean)).toBe(clean);
		const plain = withWindowFlags({});
		expect(migrateClassicyState(plain)).toBe(plain);
	});

	it("drops them from a 0.x windows array, after it becomes a record", () => {
		const saved = JSON.parse(
			JSON.stringify(withWindowFlags({ moving: true })),
		) as Record<string, unknown> & ClassicyStore;
		const app = saved.System.Manager.Applications.apps["X.app"];
		(app as unknown as { windows: unknown }).windows = Object.values(
			app.windows,
		);
		const win = windowOf(migrateClassicyState(saved));
		expect(win.id).toBe("w");
		expect("moving" in win).toBe(false);
	});

	it("drops them from a mergeClassicyState result", () => {
		const overrides = JSON.parse(
			JSON.stringify(withWindowFlags({ resizing: true })),
		) as Parameters<typeof mergeClassicyState>[1];
		const merged = mergeClassicyState(DefaultAppManagerState, overrides);
		expect("resizing" in windowOf(merged)).toBe(false);
	});
});
