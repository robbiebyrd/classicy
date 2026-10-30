import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";

const dispatchMock = vi.fn();
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManagerDispatch: () => dispatchMock,
	}),
);

const trackMock = vi.fn();
vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: trackMock }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Link/ClassicyLink.scss", () => ({}));

import { ClassicyLink } from "@/SystemFolder/SystemResources/Link/ClassicyLink";

describe("ClassicyLink", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders a real anchor with the href", () => {
		render(<ClassicyLink href="https://example.com">Docs</ClassicyLink>);
		const a = screen.getByText("Docs");
		expect(a.tagName).toBe("A");
		expect(a).toHaveAttribute("href", "https://example.com");
		expect(a).toHaveClass("classicyLink");
	});

	it("routes a plain click through ClassicyDesktopOpenUrl with the default disposition", () => {
		render(<ClassicyLink href="https://example.com">Docs</ClassicyLink>);
		fireEvent.click(screen.getByText("Docs"));
		expect(dispatchMock).toHaveBeenCalledWith({
			type: "ClassicyDesktopOpenUrl",
			url: "https://example.com",
			disposition: "classicy",
		});
	});

	it("passes an explicit disposition through", () => {
		render(
			<ClassicyLink href="https://example.com" disposition="browser-new">
				Docs
			</ClassicyLink>,
		);
		fireEvent.click(screen.getByText("Docs"));
		expect(dispatchMock).toHaveBeenCalledWith(
			expect.objectContaining({ disposition: "browser-new" }),
		);
	});

	it("leaves modifier-clicks to the browser", () => {
		render(<ClassicyLink href="https://example.com">Docs</ClassicyLink>);
		// The browser's own handling is a navigation, which jsdom cannot do. A
		// document listener (after React's root listener) records whether the
		// link left the default alone, then cancels the navigation itself.
		const leftToBrowser: boolean[] = [];
		const stopNavigation = (e: MouseEvent) => {
			leftToBrowser.push(!e.defaultPrevented);
			e.preventDefault();
		};
		document.addEventListener("click", stopNavigation);
		try {
			fireEvent.click(screen.getByText("Docs"), { metaKey: true });
			fireEvent.click(screen.getByText("Docs"), { ctrlKey: true });
		} finally {
			document.removeEventListener("click", stopNavigation);
		}
		expect(leftToBrowser).toEqual([true, true]);
		expect(dispatchMock).not.toHaveBeenCalled();
	});

	it("dispatches an internal event instead of navigating", () => {
		render(
			<ClassicyLink
				event="ClassicyAppOpen"
				eventData={{ app: { id: "TV.app" } }}
			>
				Open TV
			</ClassicyLink>,
		);
		const a = screen.getByText("Open TV");
		// Event-only links carry button semantics and are keyboard-focusable.
		expect(a).toHaveAttribute("role", "button");
		expect(a).toHaveAttribute("tabIndex", "0");
		fireEvent.click(a);
		expect(dispatchMock).toHaveBeenCalledWith({
			type: "ClassicyAppOpen",
			app: { id: "TV.app" },
		});
	});

	it("activates an event-only link from the keyboard", () => {
		render(<ClassicyLink event="MyEvent">Go</ClassicyLink>);
		fireEvent.keyDown(screen.getByText("Go"), { key: "Enter" });
		expect(dispatchMock).toHaveBeenCalledWith({ type: "MyEvent" });
	});

	it("lets a consumer onClickFunc cancel the built-in behavior", () => {
		render(
			<ClassicyLink
				href="https://example.com"
				onClickFunc={(e) => e.preventDefault()}
			>
				Docs
			</ClassicyLink>,
		);
		fireEvent.click(screen.getByText("Docs"));
		expect(dispatchMock).not.toHaveBeenCalled();
	});

	it("is inert when disabled", () => {
		render(
			<ClassicyLink href="https://example.com" disabled>
				Docs
			</ClassicyLink>,
		);
		const a = screen.getByText("Docs");
		expect(a).toHaveAttribute("aria-disabled", "true");
		expect(a).toHaveAttribute("tabIndex", "-1");
		fireEvent.click(a);
		expect(dispatchMock).not.toHaveBeenCalled();
		expect(trackMock).not.toHaveBeenCalled();
	});
});

describe("ClassicyLink keyboard activation without an href (#307)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("runs onClickFunc on Enter and Space for an event link, then dispatches", () => {
		const onClickFunc = vi.fn();
		render(
			<ClassicyLink event="ClassicyAppDemoGo" onClickFunc={onClickFunc}>
				Go
			</ClassicyLink>,
		);
		fireEvent.keyDown(screen.getByText("Go"), { key: "Enter" });
		fireEvent.keyDown(screen.getByText("Go"), { key: " " });
		expect(onClickFunc).toHaveBeenCalledTimes(2);
		expect(dispatchMock).toHaveBeenCalledTimes(2);
		expect(dispatchMock).toHaveBeenCalledWith({ type: "ClassicyAppDemoGo" });
	});

	it("lets onClickFunc cancel the event from the keyboard, as it can from a click", () => {
		render(
			<ClassicyLink
				event="ClassicyAppDemoGo"
				onClickFunc={(e) => e.preventDefault()}
			>
				Go
			</ClassicyLink>,
		);
		fireEvent.keyDown(screen.getByText("Go"), { key: "Enter" });
		expect(dispatchMock).not.toHaveBeenCalled();
	});

	it("runs onClickFunc on Enter for a link with neither href nor event", () => {
		const onClickFunc = vi.fn();
		render(<ClassicyLink onClickFunc={onClickFunc}>Do it</ClassicyLink>);
		fireEvent.keyDown(screen.getByText("Do it"), { key: "Enter" });
		expect(onClickFunc).toHaveBeenCalledOnce();
		expect(dispatchMock).not.toHaveBeenCalled();
	});

	it("does nothing from the keyboard when disabled", () => {
		const onClickFunc = vi.fn();
		render(
			<ClassicyLink
				event="ClassicyAppDemoGo"
				onClickFunc={onClickFunc}
				disabled
			>
				Go
			</ClassicyLink>,
		);
		fireEvent.keyDown(screen.getByText("Go"), { key: "Enter" });
		expect(onClickFunc).not.toHaveBeenCalled();
		expect(dispatchMock).not.toHaveBeenCalled();
	});
});
