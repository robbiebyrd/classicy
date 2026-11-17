import "./DriveSetupList.scss";
import classNames from "classnames";
import type { CSSProperties, FC } from "react";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import {
	ClassicyTable,
	type ClassicyTableColumn,
} from "@/SystemFolder/SystemResources/Table/ClassicyTable";
import type { DriveRow } from "./ClassicyDriveSetupUtils";

type DriveSetupListProps = {
	drives: DriveRow[];
	selected: string | null;
	onSelect: (name: string) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style for the root element. */
	style?: CSSProperties;
};

// Drive Setup's columns, in the old 40/24/14/11/11 proportions. The table is
// laid out fixed at full width, so columns narrower in total than the list
// stretch to fill it; wider ones would overflow it.
const DRIVE_COLUMNS: ClassicyTableColumn<DriveRow>[] = [
	{ id: "name", title: "Volume Name(s)", accessor: (d) => d.name, width: 120 },
	{ id: "type", title: "Type", accessor: (d) => d.type, width: 72 },
	{ id: "bus", title: "Bus", accessor: (d) => d.bus, width: 42 },
	{ id: "id", title: "ID", accessor: (d) => d.id, width: 33 },
	{ id: "lun", title: "LUN", accessor: (d) => d.lun, width: 33 },
];

export const DriveSetupList: FC<DriveSetupListProps> = ({
	drives,
	selected,
	onSelect,
	className,
	style,
}) => {
	return (
		<div
			className={classNames("classicyDriveSetupList", className)}
			style={style}
		>
			<ClassicyControlLabel label="List of Drives" />
			<ClassicyTable
				className="classicyDriveSetupListTable"
				columns={DRIVE_COLUMNS}
				rows={drives}
				getRowId={(d) => d.name}
				selectionMode="single"
				selected={selected ? [selected] : []}
				onSelectionChange={(ids) => {
					if (ids[0]) onSelect(ids[0]);
				}}
				rowClassName={() => "classicyDriveSetupListRow"}
			/>
		</div>
	);
};
