import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	ClassicyEmptyTrashAlert,
	classicySpecialMenuItems,
} from "@/SystemFolder/SystemResources/Desktop/ClassicySpecialMenu";

vi.mock("@/SystemFolder/SystemResources/Alert/ClassicyAlert", () => ({
	ClassicyAlert: ({
		label,
		message,
		buttons,
		onClose,
	}: {
		label: string;
		message?: string;
		buttons: { id: string; label: string; onClick?: () => void }[];
		onClose: () => void;
	}) => (
		<div>
			<p>{label}</p>
			{message ? <p>{message}</p> : null}
			{buttons.map((b) => (
				<button
					key={b.id}
					type="button"
					onClick={() => {
						b.onClick?.();
						onClose();
					}}
				>
					{b.label}
				</button>
			))}
		</div>
	),
}));

describe("classicySpecialMenuItems", () => {
	it("offers Empty Trash… then Reset PRAM…, each opening its alert", () => {
		const dispatch = vi.fn();
		const items = classicySpecialMenuItems(dispatch, "x");
		expect(items.map((i) => i.title)).toEqual([
			"Empty Trash…",
			undefined,
			"Reset PRAM…",
		]);
		items[0].onClickFunc?.();
		items[2].onClickFunc?.();
		expect(dispatch.mock.calls.map(([a]) => a)).toEqual([
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "emptyTrash" },
			{ type: "ClassicyDesktopShowSystemDialog", dialog: "resetPram" },
		]);
	});
});

describe("ClassicyEmptyTrashAlert", () => {
	it("warns how many items will be removed for good, and empties on OK", () => {
		const onEmpty = vi.fn();
		const onClose = vi.fn();
		render(
			<ClassicyEmptyTrashAlert
				itemCount={3}
				onEmpty={onEmpty}
				onClose={onClose}
			/>,
		);
		expect(
			screen.getByText(
				"The Trash contains 3 items. Are you sure you want to permanently remove these items?",
			),
		).toBeInTheDocument();
		expect(screen.getByText("You can’t undo this action.")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Cancel"));
		expect(onEmpty).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("OK"));
		expect(onEmpty).toHaveBeenCalledOnce();
		expect(onClose).toHaveBeenCalledTimes(2);
	});

	it("speaks of one item in the singular", () => {
		render(
			<ClassicyEmptyTrashAlert
				itemCount={1}
				onEmpty={vi.fn()}
				onClose={vi.fn()}
			/>,
		);
		expect(
			screen.getByText(
				"The Trash contains 1 item. Are you sure you want to permanently remove it?",
			),
		).toBeInTheDocument();
	});

	it("only notes an empty Trash", () => {
		const onEmpty = vi.fn();
		render(
			<ClassicyEmptyTrashAlert
				itemCount={0}
				onEmpty={onEmpty}
				onClose={vi.fn()}
			/>,
		);
		expect(screen.getByText("The Trash is empty.")).toBeInTheDocument();
		fireEvent.click(screen.getByText("OK"));
		expect(onEmpty).not.toHaveBeenCalled();
	});
});
