import { act, fireEvent, render, screen } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the core default theme names (a
// package whose defaults name an unregistered pack is refused).
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import {
	CLASSICY_MENU_DEFAULT_IDLE_TIMEOUT_MS,
	ClassicyMenuProvider,
	useClassicyMenuIdleTimeout,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

// A consumer exposing the context so we can drive the sticky-menu timer.
const Consumer = () => {
	const { activateMenuBar, pokeActivity, closeSignal } =
		useContext(ClassicyMenuContext);
	return (
		<div>
			<span data-testid="close-signal">{closeSignal}</span>
			<button type="button" onClick={activateMenuBar}>
				activate
			</button>
			<button type="button" onClick={pokeActivity}>
				poke
			</button>
		</div>
	);
};

describe("ClassicyMenuProvider sticky-menu idle auto-close", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it("does not auto-close while the menu is not active", () => {
		const onClose = vi.fn();
		render(
			<ClassicyMenuProvider onClose={onClose} idleTimeoutMs={15000}>
				<Consumer />
			</ClassicyMenuProvider>,
		);
		act(() => {
			vi.advanceTimersByTime(20000);
		});
		expect(onClose).not.toHaveBeenCalled();
	});

	it("auto-closes 15s after the menu opens", () => {
		const onClose = vi.fn();
		render(
			<ClassicyMenuProvider onClose={onClose} idleTimeoutMs={15000}>
				<Consumer />
			</ClassicyMenuProvider>,
		);
		fireEvent.click(screen.getByText("activate"));
		act(() => {
			vi.advanceTimersByTime(14999);
		});
		expect(onClose).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(1);
		});
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("resets the idle timer on activity (pokeActivity)", () => {
		const onClose = vi.fn();
		render(
			<ClassicyMenuProvider onClose={onClose} idleTimeoutMs={15000}>
				<Consumer />
			</ClassicyMenuProvider>,
		);
		fireEvent.click(screen.getByText("activate"));
		act(() => {
			vi.advanceTimersByTime(10000);
		});
		fireEvent.click(screen.getByText("poke"));
		act(() => {
			vi.advanceTimersByTime(10000); // 20s total, but only 10s since poke
		});
		expect(onClose).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(5000); // now 15s since poke
		});
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("auto-closes a startActive menu (contextual) without activation", () => {
		const onClose = vi.fn();
		render(
			<ClassicyMenuProvider
				onClose={onClose}
				idleTimeoutMs={15000}
				startActive={true}
			>
				<Consumer />
			</ClassicyMenuProvider>,
		);
		act(() => {
			vi.advanceTimersByTime(15000);
		});
		expect(onClose).toHaveBeenCalledOnce();
	});
});

// The time-out is the active package's `layout.menuBar.idleTimeoutMs` when a
// provider is given none (the audit's 7.6 / 14.4): absent, Mac OS 8's
// fifteen seconds (HIGOS8 p.92); Windows 98's 0, never, as a Windows menu
// stays until the next click (WIG Ch.7, p.97; Ch.14, p.333).
describe("ClassicyMenuProvider idle time-out from the package layout", () => {
	const registerWith = (layout: object) => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage({
			id: "menu-timeouts",
			name: "Menu time-outs",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "menu-timeouts-default",
				package: "menu-timeouts",
			},
			layout: layout as never,
		});
	};
	const Reader = () => (
		<span data-testid="timeout">{useClassicyMenuIdleTimeout()}</span>
	);

	beforeEach(() => {
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
		resetClassicyAppearancePackagesForTests();
	});

	it("is fifteen seconds when the package declares none", () => {
		registerWith(CLASSICY_DEFAULT_APPEARANCE_LAYOUT);
		const onClose = vi.fn();
		render(
			<ClassicyMenuProvider onClose={onClose}>
				<Consumer />
				<Reader />
			</ClassicyMenuProvider>,
		);
		expect(screen.getByTestId("timeout").textContent).toBe(
			String(CLASSICY_MENU_DEFAULT_IDLE_TIMEOUT_MS),
		);
		fireEvent.click(screen.getByText("activate"));
		act(() => {
			vi.advanceTimersByTime(15000);
		});
		expect(onClose).toHaveBeenCalledOnce();
	});

	it("never closes a menu under Windows 98's idleTimeoutMs 0, a menu bar's or a pop-up's", () => {
		registerWith(windows98.layout);
		const onClose = vi.fn();
		render(
			<>
				<ClassicyMenuProvider onClose={onClose}>
					<Consumer />
					<Reader />
				</ClassicyMenuProvider>
				<ClassicyMenuProvider onClose={onClose} startActive>
					<span />
				</ClassicyMenuProvider>
			</>,
		);
		expect(screen.getByTestId("timeout").textContent).toBe("0");
		fireEvent.click(screen.getByText("activate"));
		act(() => {
			vi.advanceTimersByTime(60 * 60 * 1000);
		});
		expect(onClose).not.toHaveBeenCalled();
	});

	it("follows a declared time-out, and a provider's own prop wins over it", () => {
		registerWith({
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			menuBar: { placement: "screen", idleTimeoutMs: 5000 },
		});
		const fromPackage = vi.fn();
		const fromProp = vi.fn();
		render(
			<>
				<ClassicyMenuProvider onClose={fromPackage} startActive>
					<span />
				</ClassicyMenuProvider>
				<ClassicyMenuProvider
					onClose={fromProp}
					startActive
					idleTimeoutMs={20000}
				>
					<span />
				</ClassicyMenuProvider>
			</>,
		);
		act(() => {
			vi.advanceTimersByTime(5000);
		});
		expect(fromPackage).toHaveBeenCalledOnce();
		expect(fromProp).not.toHaveBeenCalled();
		act(() => {
			vi.advanceTimersByTime(15000);
		});
		expect(fromProp).toHaveBeenCalledOnce();
	});
});
