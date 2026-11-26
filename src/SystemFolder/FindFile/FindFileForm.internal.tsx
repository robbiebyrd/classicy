import {
	type FC as FunctionalComponent,
	type MouseEvent,
	useMemo,
	useState,
} from "react";
import {
	CLASSICY_FIND_CRITERIA,
	type ClassicyFindChoice,
	type ClassicyFindCriterion,
	type ClassicyFindCriterionKey,
	classicyFindCriterion,
	classicyFindCriterionDefinition,
	classicyFindDayDate,
	classicyFindDayString,
} from "@/SystemFolder/FindFile/ClassicyFindCriteria";
import type { ClassicyFindSource } from "@/SystemFolder/FindFile/ClassicyFindSources";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlGroup } from "@/SystemFolder/SystemResources/ControlGroup/ClassicyControlGroup";
import { ClassicyDatePicker } from "@/SystemFolder/SystemResources/DatePicker/ClassicyDatePicker";
import { ClassicyForm } from "@/SystemFolder/SystemResources/Form/ClassicyForm";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import {
	ClassicyPopUpMenu,
	type ClassicyPopUpMenuOption,
} from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";
import {
	ClassicyTable,
	type ClassicyTableColumn,
} from "@/SystemFolder/SystemResources/Table/ClassicyTable";

/**
 * A pop-up's options from choices with `null` dividers: each divider becomes
 * a `dividerBefore` on the option after it.
 */
export const classicyFindPopUpOptions = (
	choices: readonly (ClassicyFindChoice | null)[],
	icons?: Readonly<Record<string, string | undefined>>,
): ClassicyPopUpMenuOption[] => {
	const options: ClassicyPopUpMenuOption[] = [];
	let divider = false;
	for (const choice of choices) {
		if (choice === null) {
			divider = true;
			continue;
		}
		const icon = icons?.[choice.value];
		options.push({
			value: choice.value,
			label: choice.label,
			...(icon ? { icon } : {}),
			...(divider ? { dividerBefore: true } : {}),
		});
		divider = false;
	}
	return options;
};

type CriterionRowProps = {
	index: number;
	row: ClassicyFindCriterion;
	today: string;
	disabled: boolean;
	onChange: (row: ClassicyFindCriterion) => void;
};

/** One row: the criterion, its operator, its value (8.1's layout). */
const FindFileCriterionRow: FunctionalComponent<CriterionRowProps> = ({
	index,
	row,
	today,
	disabled,
	onChange,
}) => {
	const definition = classicyFindCriterionDefinition(row.key);
	// Option held as the pop-up opens adds 8.1's hidden criteria; a row that
	// already uses one keeps them listed.
	const [extended, setExtended] = useState(false);
	const criterionOptions = useMemo(
		() =>
			CLASSICY_FIND_CRITERIA.filter(
				(c) => !c.optionOnly || extended || definition.optionOnly,
			).map((c, i, list) => ({
				value: c.key,
				label: c.label,
				// The hidden criteria are a group of their own (8.1).
				...(c.optionOnly && !list[i - 1]?.optionOnly
					? { dividerBefore: true }
					: {}),
			})),
		[extended, definition.optionOnly],
	);
	const operators = definition.operators.filter(
		(o): o is ClassicyFindChoice => o !== null,
	);
	const idPrefix = `classicy-find-file-row-${index}`;
	const remember = (e: MouseEvent) => setExtended(e.altKey);

	let valueControl = null;
	switch (definition.input) {
		case "text":
			valueControl = (
				<ClassicyInput
					analyticsPrivate
					// A fresh field for each criterion: its value starts afresh.
					key={`${idPrefix}-${row.key}`}
					id={`${idPrefix}-value`}
					className="classicyFindFileValue"
					prefillValue={row.value}
					disabled={disabled}
					onChangeFunc={(e) => onChange({ ...row, value: e.target.value })}
				/>
			);
			break;
		case "size":
			valueControl = (
				<span className="classicyFindFileSize">
					<ClassicyInput
						analyticsPrivate
						key={`${idPrefix}-${row.key}`}
						id={`${idPrefix}-value`}
						className="classicyFindFileValue"
						prefillValue={row.value}
						disabled={disabled}
						onChangeFunc={(e) => onChange({ ...row, value: e.target.value })}
					/>
					<span className="classicyFindFileSizeUnit">K</span>
				</span>
			);
			break;
		case "date":
			valueControl = (
				<ClassicyDatePicker
					key={`${idPrefix}-${row.key}`}
					id={`${idPrefix}-value`}
					className="classicyFindFileValue"
					prefillValue={classicyFindDayDate(row.value)}
					disabled={disabled}
					onChangeFunc={(date) =>
						onChange({ ...row, value: classicyFindDayString(date) })
					}
				/>
			);
			break;
		default:
			valueControl = (
				<ClassicyPopUpMenu
					id={`${idPrefix}-value`}
					className="classicyFindFileValue"
					options={classicyFindPopUpOptions(definition.choices ?? [])}
					selected={row.value}
					disabled={disabled}
					onChangeFunc={(e) => onChange({ ...row, value: e.target.value })}
				/>
			);
	}

	return (
		<div className="classicyFindFileCriterion">
			{/* Notes whether Option is held as the pop-up inside opens. */}
			<div
				className="classicyFindFileCriterionKey"
				onMouseDownCapture={remember}
			>
				<ClassicyPopUpMenu
					id={`${idPrefix}-criterion`}
					options={criterionOptions}
					selected={row.key}
					disabled={disabled}
					onChangeFunc={(e) =>
						onChange(
							classicyFindCriterion(
								e.target.value as ClassicyFindCriterionKey,
								today,
							),
						)
					}
				/>
			</div>
			{operators.length > 1 ? (
				<ClassicyPopUpMenu
					id={`${idPrefix}-operator`}
					className="classicyFindFileOperator"
					options={classicyFindPopUpOptions(definition.operators)}
					selected={row.operator}
					disabled={disabled}
					onChangeFunc={(e) => onChange({ ...row, operator: e.target.value })}
				/>
			) : (
				<span className="classicyFindFileOperatorText">
					{operators[0]?.label}
				</span>
			)}
			{valueControl}
		</div>
	);
};

export type FindFileCriteriaFormProps = {
	location: string;
	locationChoices: readonly (ClassicyFindChoice | null)[];
	locationIcons: Readonly<Record<string, string | undefined>>;
	onLocationChange: (location: string) => void;
	rows: readonly ClassicyFindCriterion[];
	today: string;
	onRowChange: (index: number, row: ClassicyFindCriterion) => void;
	canAddRow: boolean;
	onMoreChoices: () => void;
	onFewerChoices: () => void;
	/** Whether this form's search runs: its fields dim and Find reads Stop. */
	running: boolean;
	/** While it runs, the items found so far (8.1's "Items Found:N"). */
	progress?: number;
	onFind: () => void;
	onStop: () => void;
};

/** Find File's form: "Find items [where] whose", the rows, the buttons. */
export const FindFileCriteriaForm: FunctionalComponent<
	FindFileCriteriaFormProps
> = ({
	location,
	locationChoices,
	locationIcons,
	onLocationChange,
	rows,
	today,
	onRowChange,
	canAddRow,
	onMoreChoices,
	onFewerChoices,
	running,
	progress,
	onFind,
	onStop,
}) => (
	<ClassicyForm className="classicyFindFileForm" onSubmitFunc={onFind}>
		<div className="classicyFindFileLocation">
			<span className="classicyFindFileText">Find items</span>
			<ClassicyPopUpMenu
				id="classicy-find-file-location"
				// Its choices name the user's disks.
				analyticsPrivate
				options={classicyFindPopUpOptions(locationChoices, locationIcons)}
				selected={location}
				disabled={running}
				onChangeFunc={(e) => onLocationChange(e.target.value)}
			/>
			<span className="classicyFindFileText">whose</span>
			{running && (
				// 8.1 spins the asynchronous arrows at the row's right end while
				// it searches (HIGOS8 p.53;
				// `packages/appearance/platinum/resources/screenshots/find-file/81-contents-searching-count.png`);
				// the count beside Stop says the same to assistive technology.
				<span className="classicyFindFileBusy" aria-hidden="true">
					<ClassicyProgressBar chasingArrows />
				</span>
			)}
		</div>
		<ClassicyControlGroup className="classicyFindFileCriteria">
			{rows.map((row, index) => (
				<FindFileCriterionRow
					// biome-ignore lint/suspicious/noArrayIndexKey: a row is its place in the list; rows are only added or removed at the end
					key={index}
					index={index}
					row={row}
					today={today}
					disabled={running}
					onChange={(next) => onRowChange(index, next)}
				/>
			))}
		</ClassicyControlGroup>
		<div className="classicyFindFileButtons">
			<ClassicyButton
				disabled={!canAddRow || running}
				onClickFunc={onMoreChoices}
			>
				More Choices
			</ClassicyButton>
			{rows.length > 1 && (
				<ClassicyButton disabled={running} onClickFunc={onFewerChoices}>
					Fewer Choices
				</ClassicyButton>
			)}
			<span className="classicyFindFileButtonsSpacer" />
			{running && (
				// 8.1 counts the items found beside Stop while it searches
				// (`packages/appearance/platinum/resources/screenshots/find-file/81-contents-searching-count.png`).
				<span className="classicyFindFileProgress" aria-live="polite">
					{`Items Found:${progress ?? 0}`}
				</span>
			)}
			{running ? (
				<ClassicyButton isDefault onClickFunc={onStop}>
					Stop
				</ClassicyButton>
			) : (
				<ClassicyButton isDefault buttonType="submit">
					Find
				</ClassicyButton>
			)}
		</div>
	</ClassicyForm>
);

type ChannelRow = { id: string; name: string; icon?: string; on: boolean };

export type FindFileChannelsFormProps = {
	sources: readonly ClassicyFindSource[];
	off: readonly string[];
	onToggle: (id: string, on: boolean) => void;
	words: string;
	onWordsChange: (words: string) => void;
	/** Whether a search of the sources runs: Search reads Stop. */
	running: boolean;
	onSearch: () => void;
	onStop: () => void;
	/** The list's title: Sherlock's "Search Sites", or a host's word. */
	sitesLabel: string;
};

/**
 * The channels (Mac OS 8.5's Sherlock, Search Internet): the words, the
 * sources with an On box each, and Search.
 */
export const FindFileChannelsForm: FunctionalComponent<
	FindFileChannelsFormProps
> = ({
	sources,
	off,
	onToggle,
	words,
	onWordsChange,
	running,
	onSearch,
	onStop,
	sitesLabel,
}) => {
	const rows: ChannelRow[] = sources.map((s) => ({
		id: s.id,
		name: s.name,
		icon: s.icon,
		on: !off.includes(s.id),
	}));
	const columns: ClassicyTableColumn<ChannelRow>[] = [
		{
			id: "on",
			title: "On",
			accessor: (row) => (row.on ? 1 : 0),
			sortable: false,
			resizable: false,
			width: 36,
			render: (row) => (
				<ClassicyCheckbox
					id={`classicy-find-file-channel-${row.id}`}
					checked={row.on}
					disabled={running}
					onClickFunc={(checked) => onToggle(row.id, checked)}
				/>
			),
		},
		{
			id: "name",
			title: sitesLabel,
			accessor: (row) => row.name,
			sortable: false,
			render: (row) => (
				<span className="classicyFindFileChannelName">
					{row.icon && (
						<ClassicyIconImage
							className="classicyFindFileChannelIcon"
							src={row.icon}
							alt=""
							aria-hidden={true}
						/>
					)}
					{row.name}
				</span>
			),
		},
	];
	const noWords = words.trim() === "";
	const noneOn = rows.every((r) => !r.on);
	return (
		<ClassicyForm
			className="classicyFindFileForm"
			onSubmitFunc={() => {
				if (!noWords && !noneOn) onSearch();
			}}
		>
			<ClassicyInput
				analyticsPrivate
				id="classicy-find-file-words"
				labelTitle="Words"
				labelPosition="left"
				className="classicyFindFileWords"
				prefillValue={words}
				// Editable while a search runs: Return searches the new words,
				// and the search running is aborted.
				onChangeFunc={(e) => onWordsChange(e.target.value)}
			/>
			<div className="classicyFindFileChannels">
				<span className="classicyFindFileText">Search</span>
				<ClassicyTable<ChannelRow>
					className="classicyFindFileChannelList"
					columns={columns}
					rows={rows}
					getRowId={(row) => row.id}
					selectionMode="none"
				/>
			</div>
			<div className="classicyFindFileButtons">
				<span className="classicyFindFileButtonsSpacer" />
				{running ? (
					<ClassicyButton isDefault onClickFunc={onStop}>
						Stop
					</ClassicyButton>
				) : (
					<ClassicyButton
						isDefault
						buttonType="submit"
						disabled={noWords || noneOn}
					>
						Search
					</ClassicyButton>
				)}
			</div>
		</ClassicyForm>
	);
};
