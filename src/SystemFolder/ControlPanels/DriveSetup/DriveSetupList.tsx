import "./DriveSetupList.scss";
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
			<div className="driveSetupList__table" role="table">
				<div className="driveSetupList__headRow" role="row">
					<span role="columnheader">Volume Name(s)</span>
					<span role="columnheader">Type</span>
					<span role="columnheader">Bus</span>
					<span role="columnheader">ID</span>
					<span role="columnheader">LUN</span>
				</div>
				<div className="driveSetupList__body">
					{drives.map((d) => (
						// biome-ignore lint/a11y/useKeyWithClickEvents: rows are selectable; keyboard selection handled by parent window focus model
						<div
							key={d.name}
							role="row"
							aria-selected={selected === d.name}
							className={
								selected === d.name
									? "driveSetupList__row driveSetupList__row--selected"
									: "driveSetupList__row"
							}
							onClick={() => onSelect(d.name)}
						>
							<span role="cell">{d.name}</span>
							<span role="cell">{d.type}</span>
							<span role="cell">{d.bus}</span>
							<span role="cell">{d.id}</span>
							<span role="cell">{d.lun}</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};
