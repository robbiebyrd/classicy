import "./DriveSetupList.scss";
import classNames from "classnames";
import type { FC } from "react";
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
		<div className="driveSetupList">
			<h2 className="driveSetupList__header">List of Drives</h2>
			<div className="driveSetupList__tableContainer">
				<table className="driveSetupList__table">
					<thead className="driveSetupList__head">
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
								className={classNames("driveSetupList__row", {
									"driveSetupList__row--selected": selected === d.name,
								})}
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
