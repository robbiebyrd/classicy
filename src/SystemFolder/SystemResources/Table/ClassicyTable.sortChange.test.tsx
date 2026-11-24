// The table reports a sort a header click makes (Find File's View menu,
// story 0227-815), never the one it starts with.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClassicyTable } from "@/SystemFolder/SystemResources/Table/ClassicyTable";

type Row = { id: string; name: string; kind: string };

describe("ClassicyTable onSortChange", () => {
	it("is called with the column a header click sorts by", () => {
		const onSortChange = vi.fn();
		render(
			<ClassicyTable<Row>
				columns={[
					{ id: "name", title: "Name", accessor: (r) => r.name },
					{ id: "kind", title: "Kind", accessor: (r) => r.kind },
				]}
				rows={[
					{ id: "1", name: "b", kind: "x" },
					{ id: "2", name: "a", kind: "y" },
				]}
				getRowId={(r) => r.id}
				defaultSort={{ columnId: "name" }}
				onSortChange={onSortChange}
			/>,
		);
		expect(onSortChange).not.toHaveBeenCalled();
		fireEvent.click(screen.getByText("Kind"));
		expect(onSortChange).toHaveBeenLastCalledWith({
			columnId: "kind",
			desc: false,
		});
	});
});
