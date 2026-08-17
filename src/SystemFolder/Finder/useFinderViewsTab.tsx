import { useCallback, useMemo, useState } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type {
	FinderStandardViews,
	FinderViewType,
} from "@/SystemFolder/Finder/FinderContext";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import type { TabIndividual } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

const SORT_OPTIONS = [
	{ value: "name", label: "by Name" },
	{ value: "modified", label: "by Date Modified" },
	{ value: "created", label: "by Date Created" },
	{ value: "size", label: "by Size" },
	{ value: "kind", label: "by Kind" },
	{ value: "label", label: "by Label" },
];

const COLUMN_LABELS: { key: string; label: string }[] = [
	{ key: "modified", label: "Date Modified" },
	{ key: "created", label: "Date Created" },
	{ key: "size", label: "Size" },
	{ key: "kind", label: "Kind" },
	{ key: "label", label: "Label" },
	{ key: "comments", label: "Comments" },
	{ key: "version", label: "Version" },
];

export const useFinderViewsTab = (
	standardViews: FinderStandardViews,
): TabIndividual => {
	const dispatch = useAppManagerDispatch();
	// Which pane is showing. UI state, not a preference: it selects what you
	// are editing rather than recording a choice, so it is deliberately not
	// persisted and resets to Icons on each open.
	const [pane, setPane] = useState<FinderViewType>("icons");

	const setOption = useCallback(
		(view: FinderViewType, option: string, value: unknown) => {
			dispatch({
				type: "ClassicyAppFinderSetStandardViewOption",
				view,
				option,
				value,
			});
		},
		[dispatch],
	);

	const icons = standardViews.icons;
	const list = standardViews.list;

	const children = useMemo(
		() => (
			<div className={"finderPreferencesViews"}>
				<ClassicyControlGroup label={"View Options"}>
					<ClassicyPopUpMenu
						id={"finder_prefs_view_type"}
						label={"View type:"}
						labelPosition={"left"}
						selected={pane}
						options={[
							{ value: "icons", label: "Icons" },
							{ value: "list", label: "List" },
						]}
						onChangeFunc={(e) => setPane(e.target.value as FinderViewType)}
					/>

					{pane === "icons" ? (
						<div className={"finderPreferencesPane"}>
							<p className={"finderPreferencesGroupHeading"}>
								Icon Arrangement:
							</p>
							<ClassicyRadioInput
								name={"finder_prefs_icon_arrangement"}
								onClickFunc={(id) =>
									setOption("icons", "arrangement", id.split("__").pop())
								}
								inputs={[
									{
										id: "finder_prefs_icon_arrangement__none",
										label: "None",
										checked: icons.arrangement === "none",
									},
									{
										id: "finder_prefs_icon_arrangement__grid",
										label: "Always snap to grid",
										checked: icons.arrangement === "grid",
									},
									{
										id: "finder_prefs_icon_arrangement__sorted",
										label: "Keep arranged:",
										checked: icons.arrangement === "sorted",
									},
								]}
							/>
							{/* No `label` here on purpose: the adjacent radio item already
							    carries the text "Keep arranged:" — a `label` prop would
							    render it a second time immediately to the right, both
							    visually (Mac OS 8's original dialog shows only the value,
							    e.g. "by Name", beside the radio) and for assistive tech
							    (two controls both announced as "Keep arranged:"). With no
							    `label`, ClassicyPopUpMenu's aria-label falls back to the
							    current selection's own label. */}
							<ClassicyPopUpMenu
								id={"finder_prefs_icon_sort"}
								disabled={icons.arrangement !== "sorted"}
								selected={icons.keepArrangedBy}
								options={SORT_OPTIONS}
								onChangeFunc={(e) =>
									setOption("icons", "keepArrangedBy", e.target.value)
								}
							/>
							<ClassicyRadioInput
								name={"finder_prefs_icon_size"}
								onClickFunc={(id) =>
									setOption("icons", "iconSize", id.split("__").pop())
								}
								inputs={[
									{
										id: "finder_prefs_icon_size__small",
										label: "Small icons",
										checked: icons.iconSize === "small",
									},
									{
										id: "finder_prefs_icon_size__large",
										label: "Large icons",
										checked: icons.iconSize !== "small",
									},
								]}
							/>
						</div>
					) : (
						<div className={"finderPreferencesPane"}>
							<ClassicyCheckbox
								id={"finder_prefs_relative_date"}
								label={"Use relative date"}
								checked={list.useRelativeDate}
								onClickFunc={(checked) =>
									setOption("list", "useRelativeDate", checked)
								}
							/>
							<ClassicyCheckbox
								id={"finder_prefs_folder_sizes"}
								label={"Calculate folder sizes"}
								checked={list.calculateFolderSizes}
								onClickFunc={(checked) =>
									setOption("list", "calculateFolderSizes", checked)
								}
							/>
							<p className={"finderPreferencesGroupHeading"}>Show Columns:</p>
							{COLUMN_LABELS.map(({ key, label }) => (
								<ClassicyCheckbox
									key={key}
									id={`finder_prefs_column_${key}`}
									label={label}
									checked={
										(list.columns as Record<string, boolean>)[key] === true
									}
									onClickFunc={(checked) =>
										setOption("list", `columns.${key}`, checked)
									}
								/>
							))}
							<ClassicyRadioInput
								name={"finder_prefs_list_icon_size"}
								onClickFunc={(id) =>
									setOption("list", "iconSize", id.split("__").pop())
								}
								inputs={[
									{
										id: "finder_prefs_list_icon_size__small",
										label: "Small icons",
										checked: list.iconSize === "small",
									},
									{
										id: "finder_prefs_list_icon_size__medium",
										label: "Medium icons",
										checked: list.iconSize === "medium",
									},
									{
										id: "finder_prefs_list_icon_size__large",
										label: "Large icons",
										checked: list.iconSize === "large",
									},
								]}
							/>
						</div>
					)}
				</ClassicyControlGroup>
			</div>
		),
		[pane, icons, list, setOption],
	);

	return { title: "Views", children };
};
