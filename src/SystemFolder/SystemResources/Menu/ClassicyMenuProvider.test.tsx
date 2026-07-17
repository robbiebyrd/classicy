import { act, fireEvent, render, screen } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClassicyMenuContext } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuContext";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";

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
