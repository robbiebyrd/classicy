import { act, cleanup, render } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";
import {
	classicyEscapeCancels,
	onClassicyEscapeCancel,
	useClassicyEscapeCancel,
} from "./useClassicyEscapeCancel.internal";

// Escape takes a direct manipulation back (WIG Ch.4 "Shortcut Keys", p.27;
// Ch.1 "Forgiveness", pp.2-3) only under a package whose layout says
// `input.escapeCancels` (Windows 98); with no package registered the
// default layout declares nothing.
afterEach(() => {
	cleanup();
	resetClassicyAppearancePackagesForTests();
});

const useWindowsLayout = () =>
	registerClassicyAppearancePackage({
		id: "windows-escape",
		name: "Windows escape",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "windows-escape-default",
			package: "windows-escape",
		},
		layout: windows98.layout as never,
	});

const pressEscape = (target: EventTarget = document.body, key = "Escape") => {
	const event = new KeyboardEvent("keydown", {
		key,
		bubbles: true,
		cancelable: true,
	});
	target.dispatchEvent(event);
	return event;
};

describe("classicyEscapeCancels", () => {
	it("reads `input.escapeCancels`", () => {
		expect(classicyEscapeCancels({ input: { escapeCancels: true } })).toBe(
			true,
		);
		expect(classicyEscapeCancels({ input: { escapeCancels: false } })).toBe(
			false,
		);
		expect(classicyEscapeCancels({})).toBe(false);
	});
});

describe("onClassicyEscapeCancel", () => {
	it("cancels once at the first Escape, preventing it and stopping it at the document", () => {
		const onCancel = vi.fn();
		const bubbled = vi.fn();
		window.addEventListener("keydown", bubbled);
		const stop = onClassicyEscapeCancel(onCancel, {
			input: { escapeCancels: true },
		});
		expect(pressEscape(document.body, "a").defaultPrevented).toBe(false);
		expect(onCancel).not.toHaveBeenCalled();
		const event = pressEscape();
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(event.defaultPrevented).toBe(true);
		// Stopped at the document: the window never hears it.
		expect(bubbled.mock.calls.some(([heard]) => heard === event)).toBe(false);
		// Once: the listener went with it.
		expect(pressEscape().defaultPrevented).toBe(false);
		expect(onCancel).toHaveBeenCalledTimes(1);
		stop();
		window.removeEventListener("keydown", bubbled);
	});

	it("does nothing once stopped, or without the key", () => {
		const onCancel = vi.fn();
		onClassicyEscapeCancel(onCancel, { input: { escapeCancels: true } })();
		expect(pressEscape().defaultPrevented).toBe(false);
		onClassicyEscapeCancel(onCancel, {});
		expect(pressEscape().defaultPrevented).toBe(false);
		expect(onCancel).not.toHaveBeenCalled();
	});

	it("reads the active package's layout when given none", () => {
		const onCancel = vi.fn();
		const stopMac = onClassicyEscapeCancel(onCancel);
		pressEscape();
		expect(onCancel).not.toHaveBeenCalled();
		stopMac();
		useWindowsLayout();
		const stop = onClassicyEscapeCancel(onCancel);
		pressEscape();
		expect(onCancel).toHaveBeenCalledTimes(1);
		stop();
	});
});

describe("useClassicyEscapeCancel", () => {
	const Gesture = ({ onCancel }: { onCancel: () => void }) => {
		const [active, setActive] = useState(false);
		useClassicyEscapeCancel(active, () => {
			setActive(false);
			onCancel();
		});
		return (
			<button type="button" onClick={() => setActive((a) => !a)}>
				{active ? "dragging" : "idle"}
			</button>
		);
	};

	it("cancels the gesture while it is active under the Windows layout", () => {
		useWindowsLayout();
		const onCancel = vi.fn();
		const { getByRole } = render(<Gesture onCancel={onCancel} />);
		// Idle: Escape goes on its way.
		expect(pressEscape().defaultPrevented).toBe(false);
		act(() => getByRole("button").click());
		expect(getByRole("button").textContent).toBe("dragging");
		let event: KeyboardEvent | undefined;
		act(() => {
			event = pressEscape(getByRole("button"));
		});
		expect(event?.defaultPrevented).toBe(true);
		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(getByRole("button").textContent).toBe("idle");
		expect(pressEscape().defaultPrevented).toBe(false);
	});

	it("listens for nothing under the default layout", () => {
		const onCancel = vi.fn();
		const { getByRole } = render(<Gesture onCancel={onCancel} />);
		act(() => getByRole("button").click());
		expect(pressEscape().defaultPrevented).toBe(false);
		expect(onCancel).not.toHaveBeenCalled();
		expect(getByRole("button").textContent).toBe("dragging");
	});

	it("stops listening when the gesture ends or the component unmounts", () => {
		useWindowsLayout();
		const onCancel = vi.fn();
		const { getByRole, unmount } = render(<Gesture onCancel={onCancel} />);
		act(() => getByRole("button").click());
		act(() => getByRole("button").click());
		expect(pressEscape().defaultPrevented).toBe(false);
		act(() => getByRole("button").click());
		unmount();
		expect(pressEscape().defaultPrevented).toBe(false);
		expect(onCancel).not.toHaveBeenCalled();
	});
});
