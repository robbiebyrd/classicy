import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	ClassicyContextualMenuProvider,
	useClassicyContextualMenu,
} from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const menuA: ClassicyMenuItem[] = [{ id: "a1", title: "Alpha One" }];
const menuB: ClassicyMenuItem[] = [{ id: "b1", title: "Beta One" }];

const Trigger = ({
	items,
	label,
}: {
	items: ClassicyMenuItem[];
	label: string;
}) => {
	const { showContextMenu, hideContextMenu } = useClassicyContextualMenu();
	return (
		<>
			<button type="button" onClick={() => showContextMenu(items, [100, 100])}>
				{label}
			</button>
			<button type="button" onClick={() => hideContextMenu()}>
				hide-{label}
			</button>
		</>
	);
};

describe("ClassicyContextualMenuProvider", () => {
	it("shows the menu when showContextMenu is called", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("replaces an open menu when showContextMenu is called again", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
				<Trigger items={menuB} label="show-b" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.click(screen.getByText("show-b"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
		expect(screen.getByText("Beta One")).toBeInTheDocument();
	});

	it("hides the menu when hideContextMenu is called", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.click(screen.getByText("hide-show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});

	it("hides the menu on outside mousedown (existing ClassicyContextualMenu behavior)", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		fireEvent.mouseDown(document.body);
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});

	it("applies the HIG +1px down-right click offset to the menu position", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// clickAt [100,100] + [1,1] offset
		expect(wrapper.style.left).toBe("101px");
		expect(wrapper.style.top).toBe("101px");
	});

	it("injects a disabled Help item as the first item when none is supplied", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		const items = Array.from(
			document.querySelectorAll(".classicyContextMenu > li"),
		);
		expect(items[0]).toHaveTextContent("Help");
		expect(items[0]).toHaveClass("classicyMenuItemDisabled");
		// The caller's own items still render after Help.
		expect(screen.getByText("Alpha One")).toBeInTheDocument();
	});

	it("does not inject a second Help item when the caller supplied one", () => {
		const withHelp: ClassicyMenuItem[] = [
			{ id: "help", title: "Help", disabled: true },
			{ id: "x1", title: "Extra One" },
		];
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={withHelp} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.getAllByText("Help")).toHaveLength(1);
	});

	it("flips the root menu leftward when it would overflow the right edge", () => {
		const rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue({
				width: 300,
				height: 0,
				top: 0,
				bottom: 0,
				left: 0,
				right: 0,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);
		const WideTrigger = () => {
			const { showContextMenu } = useClassicyContextualMenu();
			return (
				<button
					type="button"
					onClick={() => showContextMenu(menuA, [window.innerWidth - 5, 100])}
				>
					show-wide
				</button>
			);
		};
		render(
			<ClassicyContextualMenuProvider>
				<WideTrigger />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-wide"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// left was innerWidth-5+1; with a 300px menu overflowing, it flips to
		// (clickX - width), clamped to >= 0.
		const expected = Math.max(0, window.innerWidth - 5 + 1 - 300);
		expect(wrapper.style.left).toBe(`${expected}px`);
		rectSpy.mockRestore();
	});

	it("hook is a no-op without a provider", () => {
		render(<Trigger items={menuA} label="show-a" />);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});
});
