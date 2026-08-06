import { describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	classicyDesktopStateEventReducer,
	DefaultAppManagerState,
	registerAppEventHandler,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	getClassicyUntrustedActionAllowlist,
	isUntrustedActionAllowed,
	isUntrustedActionAllowlisted,
	registerClassicyUntrustedActionAllowlist,
} from "./ClassicyActionTrust";

// NOTE ON TEST ORDER: the allowlist is a module-level singleton (mirroring
// registerAppEventHandler / registerClassicyFileSystemAdapter — no reset
// API). The "default contents" assertion below MUST run before any other
// test in this file registers additional types, so it stays the first
// `describe` block. Every other test registers a Date.now()-suffixed type to
// avoid cross-test collisions, matching the convention already used in
// ClassicyActionTrust.test.ts.

describe("default allowlist (criterion: empty or ClassicyAppOpen-only)", () => {
	it("contains nothing but ClassicyAppOpen before any registration call", () => {
		const defaults = getClassicyUntrustedActionAllowlist();
		expect(defaults.every((type) => type === "ClassicyAppOpen")).toBe(true);
	});

	it("permits ClassicyAppOpen for untrusted dispatch by default — HyperCard's core function", () => {
		// This is the load-bearing assertion for subtask 04: an ordinary
		// HyperCard openApp effect must work with zero host configuration.
		expect(isUntrustedActionAllowed("ClassicyAppOpen")).toBe(true);
	});
});

describe("registerClassicyUntrustedActionAllowlist", () => {
	it("is a no-op (no throw, no duplicate) when the same type is registered twice", () => {
		const actionType = `ClassicyAppAllowlistDupTest_${Date.now()}`;
		expect(() => {
			registerClassicyUntrustedActionAllowlist(actionType);
			registerClassicyUntrustedActionAllowlist(actionType);
		}).not.toThrow();

		const occurrences = getClassicyUntrustedActionAllowlist().filter(
			(type) => type === actionType,
		);
		expect(occurrences).toHaveLength(1);
	});

	it("makes a previously-unlisted, unguarded action type allowlisted", () => {
		const actionType = `ClassicyAppAllowlistRegisterTest_${Date.now()}`;
		expect(isUntrustedActionAllowlisted(actionType)).toBe(false);

		registerClassicyUntrustedActionAllowlist(actionType);

		expect(isUntrustedActionAllowlisted(actionType)).toBe(true);
		expect(isUntrustedActionAllowed(actionType)).toBe(true);
	});
});

describe("isUntrustedActionAllowed — deny-by-default gate above the kernel floor", () => {
	it("rejects a non-allowlisted, unguarded action type (deny-by-default)", () => {
		const actionType = `ClassicyAppNeverAllowlistedTest_${Date.now()}`;
		expect(isUntrustedActionAllowed(actionType)).toBe(false);
	});

	it("an allowlisted action type dispatched untrusted reaches its handler", () => {
		const prefix = `ClassicyAppAllowlistHandlerTest_${Date.now()}`;
		const actionType = `${prefix}Action`;
		const handler = vi.fn((ds: ClassicyStore) => ds);
		registerAppEventHandler(prefix, handler);
		registerClassicyUntrustedActionAllowlist(actionType);

		expect(isUntrustedActionAllowed(actionType)).toBe(true);

		const ds = structuredClone(DefaultAppManagerState);
		classicyDesktopStateEventReducer(ds, { type: actionType }, "untrusted");

		expect(handler).toHaveBeenCalledTimes(1);
	});

	it("a non-allowlisted action type dispatched untrusted is rejected end-to-end via the gate", () => {
		// isUntrustedActionAllowed is the authoritative pre-dispatch check a host
		// call site (e.g. HyperCard's effect dispatcher) is expected to consult
		// before ever calling dispatch — the kernel reducer's own floor
		// (isActionTrustPermitted) is permit-unless-guarded and, on its own,
		// would still let an arbitrary unguarded type like this one through.
		const actionType = `ClassicyAppNotAllowlistedGateTest_${Date.now()}`;
		expect(isUntrustedActionAllowed(actionType)).toBe(false);
	});
});

describe("allowlisting can never override the kernel guard (criterion 26)", () => {
	it("allowlisting ClassicyDesktopSetTheme still does not let an untrusted dispatch reach the desktop handler", () => {
		registerClassicyUntrustedActionAllowlist("ClassicyDesktopSetTheme");

		// The gate itself refuses: allowlist membership can't beat the floor.
		expect(isUntrustedActionAllowed("ClassicyDesktopSetTheme")).toBe(false);

		// And even if a caller ignored the gate and dispatched anyway, the
		// kernel guard wired into the reducer in subtask 02 — untouched here —
		// still rejects it before the desktop handler ever runs.
		const before = structuredClone(DefaultAppManagerState);
		const after = structuredClone(DefaultAppManagerState);
		classicyDesktopStateEventReducer(
			after,
			{ type: "ClassicyDesktopSetTheme", theme: { id: "evil-theme" } },
			"untrusted",
		);

		expect(after).toEqual(before);
	});
});
