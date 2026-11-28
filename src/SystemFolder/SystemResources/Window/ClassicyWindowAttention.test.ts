import { afterEach, describe, expect, it } from "vitest";
import {
	classicyModalOpensInBackground,
	classicyUserIsActive,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowAttention.internal";

// Plan 0020-w98 E3 (the shell addendum's B17): when a modal asks to open in
// the background under the Windows shell.

describe("classicyModalOpensInBackground", () => {
	const base = {
		modal: true,
		hasTaskbar: true,
		appFocused: false,
		userActive: false,
	};

	it("is a modal of an inactive app, under a taskbar, while the user is idle", () => {
		expect(classicyModalOpensInBackground(base)).toBe(true);
	});

	it.each([
		["a document window", { modal: false }],
		["a package without a taskbar", { hasTaskbar: false }],
		["the focused app's modal", { appFocused: true }],
		["the user's own doing", { userActive: true }],
	])("is never %s", (_name, change) => {
		expect(classicyModalOpensInBackground({ ...base, ...change })).toBe(false);
	});
});

describe("classicyUserIsActive", () => {
	const set = (value: unknown) =>
		Object.defineProperty(navigator, "userActivation", {
			configurable: true,
			value,
		});
	afterEach(() => set(undefined));

	it("reads the browser's transient user activation", () => {
		set({ isActive: false });
		expect(classicyUserIsActive()).toBe(false);
		set({ isActive: true });
		expect(classicyUserIsActive()).toBe(true);
	});

	it("counts every moment as the user's without the API", () => {
		set(undefined);
		expect(classicyUserIsActive()).toBe(true);
		set({});
		expect(classicyUserIsActive()).toBe(true);
	});
});
