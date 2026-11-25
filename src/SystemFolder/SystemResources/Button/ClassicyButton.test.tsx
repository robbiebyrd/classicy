import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	render,
	screen,
	userEvent,
} from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Button/ClassicyButton.scss",
	() => ({}),
);

describe("ClassicyButton", () => {
	it("renders button with children as text", () => {
		render(<ClassicyButton>Click me</ClassicyButton>);
		expect(
			screen.getByRole("button", { name: "Click me" }),
		).toBeInTheDocument();
	});

	it("calls onClickFunc when clicked", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<ClassicyButton onClickFunc={onClick}>Action</ClassicyButton>);
		await user.click(screen.getByRole("button", { name: "Action" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("respects disabled prop — button is disabled and click does not fire", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(
			<ClassicyButton disabled={true} onClickFunc={onClick}>
				Disabled
			</ClassicyButton>,
		);
		const btn = screen.getByRole("button", { name: "Disabled" });
		expect(btn).toBeDisabled();
		await user.click(btn);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("adds default class when isDefault=true", () => {
		render(<ClassicyButton isDefault={true}>OK</ClassicyButton>);
		expect(screen.getByRole("button", { name: "OK" })).toHaveClass("default");
	});

	it("merges a consumer className with its own and state classes instead of replacing them", () => {
		render(
			<ClassicyButton className="host" isDefault depressed>
				Go
			</ClassicyButton>,
		);
		expect(screen.getByRole("button")).toHaveClass(
			"classicyButton",
			"default",
			"pressed",
			"host",
		);
	});

	it("does not add default class when isDefault=false (default)", () => {
		render(<ClassicyButton>Cancel</ClassicyButton>);
		expect(screen.getByRole("button", { name: "Cancel" })).not.toHaveClass(
			"default",
		);
	});

	it('has type="button" by default', () => {
		render(<ClassicyButton>Submit</ClassicyButton>);
		expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute(
			"type",
			"button",
		);
	});

	it("uses the provided buttonType", () => {
		render(<ClassicyButton buttonType="submit">Go</ClassicyButton>);
		// role is set to the buttonType value in the component
		const btn = document.querySelector('button[type="submit"]');
		expect(btn).toBeInTheDocument();
	});

	it("defaults to md padding and margin classes", () => {
		render(<ClassicyButton>Default</ClassicyButton>);
		const btn = screen.getByRole("button", { name: "Default" });
		expect(btn).toHaveClass("classicyButtonPaddingMd");
		expect(btn).toHaveClass("classicyButtonMarginMd");
	});

	it("applies the requested padding variant", () => {
		render(<ClassicyButton padding="lg">Pad</ClassicyButton>);
		const btn = screen.getByRole("button", { name: "Pad" });
		expect(btn).toHaveClass("classicyButtonPaddingLg");
		expect(btn).not.toHaveClass("classicyButtonPaddingMd");
	});

	it("applies the requested margin variant", () => {
		render(<ClassicyButton margin="xl">Marg</ClassicyButton>);
		const btn = screen.getByRole("button", { name: "Marg" });
		expect(btn).toHaveClass("classicyButtonMarginXl");
		expect(btn).not.toHaveClass("classicyButtonMarginMd");
	});

	it("omits any padding class on square buttons but keeps the margin class", () => {
		render(
			<ClassicyButton buttonShape="square" padding="lg" margin="lg">
				Sq
			</ClassicyButton>,
		);
		const btn = screen.getByRole("button", { name: "Sq" });
		expect(btn.className).not.toMatch(/classicyButtonPadding/);
		expect(btn).toHaveClass("classicyButtonMarginLg");
	});

	it("forwards aria-label to the underlying button element", () => {
		render(<ClassicyButton aria-label="Remove file.png">✕</ClassicyButton>);
		expect(
			screen.getByRole("button", { name: "Remove file.png" }),
		).toBeInTheDocument();
	});

	it("forwards a ref to the underlying button element (so a dialog can bind it as default)", () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<ClassicyButton ref={ref} isDefault={true}>
				OK
			</ClassicyButton>,
		);
		expect(ref.current).toBeInstanceOf(HTMLButtonElement);
		expect(ref.current).toHaveClass("default");
	});

	it("adds a transient keyboard-activation highlight on Enter and clears it (~8 ticks)", () => {
		vi.useFakeTimers();
		try {
			render(<ClassicyButton>Go</ClassicyButton>);
			const btn = screen.getByRole("button", { name: "Go" });
			expect(btn).not.toHaveClass("classicyButtonKeyActive");

			fireEvent.keyDown(btn, { key: "Enter" });
			expect(btn).toHaveClass("classicyButtonKeyActive");
			expect(btn).toHaveAttribute("aria-pressed", "true");

			act(() => {
				vi.advanceTimersByTime(200);
			});
			expect(btn).not.toHaveClass("classicyButtonKeyActive");
		} finally {
			vi.useRealTimers();
		}
	});

	it("also highlights on Space activation", () => {
		vi.useFakeTimers();
		try {
			render(<ClassicyButton>Go</ClassicyButton>);
			const btn = screen.getByRole("button", { name: "Go" });
			fireEvent.keyDown(btn, { key: " " });
			expect(btn).toHaveClass("classicyButtonKeyActive");
			act(() => {
				vi.advanceTimersByTime(200);
			});
			expect(btn).not.toHaveClass("classicyButtonKeyActive");
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not highlight from the keyboard when disabled", () => {
		render(<ClassicyButton disabled={true}>Nope</ClassicyButton>);
		const btn = screen.getByRole("button", { name: "Nope" });
		fireEvent.keyDown(btn, { key: "Enter" });
		expect(btn).not.toHaveClass("classicyButtonKeyActive");
	});

	it("still forwards a consumer onKeyDown handler", () => {
		const onKeyDown = vi.fn();
		render(<ClassicyButton onKeyDown={onKeyDown}>Go</ClassicyButton>);
		fireEvent.keyDown(screen.getByRole("button", { name: "Go" }), {
			key: "Enter",
		});
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});
});

// The forwarded ref is merged with the component's own root ref (for the
// appearance hook), so every ref form React supports must still reach the
// <button>: object refs, classic callback refs (null on detach) and React 19
// callback refs that return a cleanup (no null call on detach).
describe("ClassicyButton forwarded ref", () => {
	it("detaches the old ref and attaches the new one when the ref changes", () => {
		const firstCleanup = vi.fn();
		const firstCalls: (HTMLButtonElement | null)[] = [];
		const first = (el: HTMLButtonElement | null) => {
			firstCalls.push(el);
			return firstCleanup;
		};
		const secondCleanup = vi.fn();
		const secondCalls: (HTMLButtonElement | null)[] = [];
		const second = (el: HTMLButtonElement | null) => {
			secondCalls.push(el);
			return secondCleanup;
		};
		const { rerender, unmount } = render(
			<ClassicyButton ref={first}>x</ClassicyButton>,
		);
		rerender(<ClassicyButton ref={second}>x</ClassicyButton>);
		expect(firstCleanup).toHaveBeenCalledTimes(1);
		expect(firstCalls).toHaveLength(1);
		expect(secondCalls).toHaveLength(1);
		expect(secondCalls[0]).toBeInstanceOf(HTMLButtonElement);
		expect(secondCalls[0]).toBe(firstCalls[0]);
		unmount();
		expect(secondCleanup).toHaveBeenCalledTimes(1);
		expect(secondCalls).toHaveLength(1);
		expect(firstCleanup).toHaveBeenCalledTimes(1);
	});

	it("clears an object ref when it is swapped for a callback ref", () => {
		const objectRef = createRef<HTMLButtonElement>();
		const calls: (HTMLButtonElement | null)[] = [];
		const callbackRef = (el: HTMLButtonElement | null) => {
			calls.push(el);
		};
		const { rerender } = render(
			<ClassicyButton ref={objectRef}>x</ClassicyButton>,
		);
		const button = objectRef.current;
		expect(button).toBeInstanceOf(HTMLButtonElement);
		rerender(<ClassicyButton ref={callbackRef}>x</ClassicyButton>);
		expect(objectRef.current).toBeNull();
		expect(calls).toEqual([button]);
	});

	it("sets and clears an object ref", () => {
		const ref = createRef<HTMLButtonElement>();
		const { unmount } = render(<ClassicyButton ref={ref}>x</ClassicyButton>);
		expect(ref.current).toBeInstanceOf(HTMLButtonElement);
		unmount();
		expect(ref.current).toBeNull();
	});

	it("calls a classic callback ref with the element, then null", () => {
		const calls: (HTMLButtonElement | null)[] = [];
		const ref = (el: HTMLButtonElement | null) => {
			calls.push(el);
		};
		const { rerender, unmount } = render(
			<ClassicyButton ref={ref}>x</ClassicyButton>,
		);
		rerender(<ClassicyButton ref={ref}>x</ClassicyButton>);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toBeInstanceOf(HTMLButtonElement);
		unmount();
		expect(calls).toEqual([calls[0], null]);
	});

	it("runs a cleanup-returning callback ref's cleanup instead of calling it with null", () => {
		const calls: (HTMLButtonElement | null)[] = [];
		const cleanup = vi.fn();
		const ref = (el: HTMLButtonElement | null) => {
			calls.push(el);
			return cleanup;
		};
		const { unmount } = render(<ClassicyButton ref={ref}>x</ClassicyButton>);
		expect(calls).toHaveLength(1);
		expect(calls[0]).toBeInstanceOf(HTMLButtonElement);
		unmount();
		expect(cleanup).toHaveBeenCalledTimes(1);
		expect(calls).toHaveLength(1);
	});
});

// The remaining chapters' audit's 4.11 / B.12 (WIG Ch.4 "Access Keys",
// p.27; Ch.8 "Navigation in Secondary Windows", pp.148-149; Appendix B
// Table B.5, p.360): under a package's `layout.menu.accessKeys` a push
// button's access key, given or (under "auto") picked, is drawn as the
// `access-key` part and focuses and clicks it; OK and Cancel take none.
describe("ClassicyButton — access keys", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const useWindowsLayout = (menu?: Record<string, string>) =>
		registerClassicyAppearancePackage({
			id: "windows-buttons",
			name: "Windows buttons",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-buttons-default",
				package: "windows-buttons",
			},
			layout: {
				...windows98.layout,
				...(menu ? { menu } : {}),
			} as never,
		});
	const part = (name: string) =>
		screen
			.getByRole("button", { name })
			.querySelector("[data-classicy-part='access-key']");
	const alt = (k: string, target: Element) =>
		fireEvent.keyDown(target, {
			key: k,
			code: `Key${k.toUpperCase()}`,
			altKey: true,
		});
	const Dialog = ({
		yes,
		save,
		ok,
	}: {
		yes: () => void;
		save: () => void;
		ok: () => void;
	}) => (
		<div className="classicyWindow">
			<input aria-label="name" />
			<ClassicyButton accessKey="y" onClickFunc={yes}>
				Yes
			</ClassicyButton>
			<ClassicyButton onClickFunc={save}>Save</ClassicyButton>
			<ClassicyButton onClickFunc={ok}>OK</ClassicyButton>
			<ClassicyButton>Cancel</ClassicyButton>
		</div>
	);

	it("draws and takes a given key and an automatic one, OK and Cancel none, under the Windows layout", () => {
		useWindowsLayout();
		const yes = vi.fn();
		const save = vi.fn();
		const ok = vi.fn();
		render(<Dialog yes={yes} save={save} ok={ok} />);
		expect(part("Yes")).toHaveTextContent("Y");
		expect(part("Save")).toHaveTextContent("S");
		expect(part("OK")).toBeNull();
		expect(part("Cancel")).toBeNull();
		// One mechanism: no native accesskey beside it.
		expect(screen.getByRole("button", { name: "Yes" })).not.toHaveAttribute(
			"accesskey",
		);
		const name = screen.getByRole("textbox", { name: "name" });
		name.focus();
		expect(alt("y", name)).toBe(false);
		expect(yes).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("button", { name: "Yes" })).toHaveFocus();
		// The key alone, from a button, which takes no letters.
		fireEvent.keyDown(screen.getByRole("button", { name: "Yes" }), {
			key: "s",
			code: "KeyS",
		});
		expect(save).toHaveBeenCalledTimes(1);
		expect(screen.getByRole("button", { name: "Save" })).toHaveFocus();
		// The key alone from a text field types it.
		name.focus();
		fireEvent.keyDown(name, { key: "y", code: "KeyY" });
		expect(yes).toHaveBeenCalledTimes(1);
		// OK has no key: Alt+O reaches nothing.
		alt("o", name);
		expect(ok).not.toHaveBeenCalled();
	});

	it("gives an explicit key alone under explicit, and an empty key none", () => {
		useWindowsLayout({ keys: "windows", accessKeys: "explicit" });
		render(
			<div className="classicyWindow">
				<ClassicyButton accessKey="y">Yes</ClassicyButton>
				<ClassicyButton>Save</ClassicyButton>
				<ClassicyButton accessKey="">Retry</ClassicyButton>
				<ClassicyButton accessKey="o">OK</ClassicyButton>
			</div>,
		);
		expect(part("Yes")).toHaveTextContent("Y");
		expect(part("Save")).toBeNull();
		expect(part("Retry")).toBeNull();
		// OK and Cancel take a key a host gives them.
		expect(part("OK")).toHaveTextContent("O");
	});

	it("draws nothing and takes no key by default (Platinum), keeping accessKey the native attribute", () => {
		const yes = vi.fn();
		render(
			<div className="classicyWindow">
				<input aria-label="name" />
				<ClassicyButton accessKey="y" onClickFunc={yes}>
					Yes
				</ClassicyButton>
				<ClassicyButton>Save</ClassicyButton>
			</div>,
		);
		const button = screen.getByRole("button", { name: "Yes" });
		expect(button.querySelector("[data-classicy-part]")).toBeNull();
		expect(button.innerHTML).toBe("Yes");
		expect(part("Save")).toBeNull();
		expect(button).toHaveAttribute("accesskey", "y");
		const name = screen.getByRole("textbox", { name: "name" });
		name.focus();
		expect(alt("y", name)).toBe(true);
		expect(yes).not.toHaveBeenCalled();
		expect(name).toHaveFocus();
	});
});
