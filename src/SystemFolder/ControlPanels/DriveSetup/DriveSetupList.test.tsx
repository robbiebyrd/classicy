import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DriveSetupList } from "./DriveSetupList";

const drives = [
	{
		name: "Macintosh HD",
		type: "Macintosh Volume",
		bus: "ATA",
		id: "0",
		lun: "0",
	},
	{
		name: "Backup Disk",
		type: "Macintosh Volume",
		bus: "ATA",
		id: "1",
		lun: "0",
	},
];

afterEach(cleanup);

describe("DriveSetupList", () => {
	it("renders the header and one row per drive", () => {
		render(
			<DriveSetupList drives={drives} selected={null} onSelect={() => {}} />,
		);
		expect(screen.getByText("List of Drives")).toBeInTheDocument();
		expect(screen.getByText("Macintosh HD")).toBeInTheDocument();
		expect(screen.getByText("Backup Disk")).toBeInTheDocument();
	});

	it("calls onSelect with the drive name when a row is clicked", () => {
		const onSelect = vi.fn();
		render(
			<DriveSetupList drives={drives} selected={null} onSelect={onSelect} />,
		);
		fireEvent.click(screen.getByText("Backup Disk"));
		expect(onSelect).toHaveBeenCalledWith("Backup Disk");
	});

	it("renders as a semantic table with column headers", () => {
		render(
			<DriveSetupList drives={drives} selected={null} onSelect={() => {}} />,
		);
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "Volume Name(s)" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("columnheader", { name: "LUN" }),
		).toBeInTheDocument();
	});

	it("marks the selected row with aria-selected on its table row", () => {
		render(
			<DriveSetupList
				drives={drives}
				selected="Macintosh HD"
				onSelect={() => {}}
			/>,
		);
		const selectedRow = screen.getByText("Macintosh HD").closest("tr");
		expect(selectedRow).toHaveAttribute("aria-selected", "true");
	});
});
