import "./DriveSetupList.scss";
import classNames from "classnames";
import type { FC } from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import type { DriveRow } from "./ClassicyDriveSetupUtils";

type DriveSetupListProps = {
	drives: DriveRow[];
	selected: string | null;
	onSelect: (name: string) => void;
};

export const DriveSetupList: FC<DriveSetupListProps> = ({
	drives,
	selected,
	onSelect,
}) => {
	return (
		<div className="classicyDriveSetupList">
			<ClassicyControlLabel label="List of Drives" />
			<div className="classicyDriveSetupListTable">
				<table className="classicyDriveSetupListGrid">
					<thead className="classicyDriveSetupListHead">
						<tr>
							<th>Volume Name(s)</th>
							<th>Type</th>
							<th>Bus</th>
							<th>ID</th>
							<th>LUN</th>
						</tr>
					</thead>
					<tbody>
						{drives.map((d) => (
							<tr
								key={d.name}
								aria-selected={selected === d.name}
								className={classNames(
									"classicyDriveSetupListRow",
									classicyStateClasses({ selected: selected === d.name }),
								)}
								onClick={() => onSelect(d.name)}
							>
								<td>{d.name}</td>
								<td>{d.type}</td>
								<td>{d.bus}</td>
								<td>{d.id}</td>
								<td>{d.lun}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};
