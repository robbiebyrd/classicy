import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyContextualMenuTarget } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

const menu: ClassicyMenuItem[] = [{ id: "copy", title: "Copy Value" }];

describe("ClassicyContextualMenuTarget", () => {
	it("shows its menu on right-click", () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menu}>
					<span>wrapped control</span>
				</ClassicyContextualMenuTarget>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("wrapped control"));
		expect(screen.getByText("Copy Value")).toBeInTheDocument();
	});

	it("claims the event so outer handlers never see it", () => {
		const outerHandler = vi.fn();
		render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
				<div onContextMenu={outerHandler}>
					<ClassicyContextualMenuTarget menuItems={menu}>
						<span>wrapped control</span>
					</ClassicyContextualMenuTarget>
				</div>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("wrapped control"));
		expect(outerHandler).not.toHaveBeenCalled();
	});

	it("does nothing when a child already claimed the event via preventDefault", () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menu}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
					<span
						onContextMenu={(e) => {
							e.preventDefault();
						}}
					>
						custom right-click child
					</span>
				</ClassicyContextualMenuTarget>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("custom right-click child"));
		expect(screen.queryByText("Copy Value")).not.toBeInTheDocument();
	});

	it("inner target wins over outer target (nested wrappers)", () => {
		const innerMenu: ClassicyMenuItem[] = [{ id: "in", title: "Inner Item" }];
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyContextualMenuTarget menuItems={menu}>
					<ClassicyContextualMenuTarget menuItems={innerMenu}>
						<span>inner control</span>
					</ClassicyContextualMenuTarget>
				</ClassicyContextualMenuTarget>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("inner control"));
		expect(screen.getByText("Inner Item")).toBeInTheDocument();
		expect(screen.queryByText("Copy Value")).not.toBeInTheDocument();
	});
});
