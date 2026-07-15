import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

	it("applies the [10,10] click offset to the menu position", () => {
		render(
			<ClassicyContextualMenuProvider>
				<Trigger items={menuA} label="show-a" />
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.click(screen.getByText("show-a"));
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(wrapper.style.left).toBe("90px");
		expect(wrapper.style.top).toBe("90px");
	});

	it("hook is a no-op without a provider", () => {
		render(<Trigger items={menuA} label="show-a" />);
		fireEvent.click(screen.getByText("show-a"));
		expect(screen.queryByText("Alpha One")).not.toBeInTheDocument();
	});
});
