/**
 * Context-sensitive property inspector: a selected part's identity, geometry,
 * flags, style, content, and schema-driven options; with nothing selected, the
 * current card's and the stack's properties plus the variables table. All
 * commits dispatch ClassicyAppHCEdit* actions; inputs are uncontrolled and
 * keyed on selection + field so selection changes remount them.
 */

import type { FC as FunctionalComponent } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { optionsSchemaFor } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorSchemas";
import {
	type HCEditState,
	peekLayerParts,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import type { HCPart, HCRect } from "@/SystemFolder/HyperCard/HyperCardModel";
import type { HCOptionField } from "@/SystemFolder/HyperCard/HyperCardPlugins";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";

interface HyperCardInspectorProps {
	stackId: string;
	edit: HCEditState;
}

/** Uncontrolled input that commits its latest text on Enter or blur. */
const CommitField: FunctionalComponent<{
	id: string;
	label: string;
	value: string;
	onCommit: (value: string) => void;
	type?: string;
}> = ({ id, label, value, onCommit, type }) => {
	let latest = value;
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: uncontrolled input commit via blur/keydown
		<div
			className={"classicyHyperCardInspectorField"}
			onBlur={() => {
				if (latest !== value) onCommit(latest);
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter" && latest !== value) onCommit(latest);
			}}
		>
			<ClassicyInput
				id={id}
				labelTitle={label}
				prefillValue={value}
				type={type}
				onChangeFunc={(e) => {
					latest = e.target.value;
				}}
			/>
		</div>
	);
};

const STYLE_FIELDS: {
	key: "shape" | "align" | "fontSize";
	label: string;
	values: string[];
}[] = [
	{
		key: "shape",
		label: "Shape",
		values: ["rectangle", "roundRect", "transparent", "default"],
	},
	{ key: "align", label: "Align", values: ["left", "center", "right"] },
	{ key: "fontSize", label: "Font size", values: ["small", "medium", "large"] },
];

export const HyperCardInspector: FunctionalComponent<
	HyperCardInspectorProps
> = ({ stackId, edit }) => {
	const dispatch = useAppManagerDispatch();
	const parts =
		peekLayerParts(edit.draft, edit.currentCardId, edit.layer) ?? [];
	const part = edit.selectedPartId
		? parts.find((p) => p.id === edit.selectedPartId)
		: undefined;

	return (
		<div className={"classicyHyperCardInspector"}>
			{part ? renderPartSections(part) : renderCardStackSections()}
		</div>
	);

	function renderPartSections(part: HCPart) {
		const rect: HCRect = part.rect ?? [0, 0, 120, 60];
		const schema = optionsSchemaFor(part.type) ?? [];
		const schemaKeys = new Set(schema.map((f) => f.key));
		const extraKeys = Object.keys(part.options ?? {}).filter(
			(k) => !schemaKeys.has(k),
		);
		const setProps = (props: Record<string, unknown>) =>
			dispatch({
				type: "ClassicyAppHCEditSetPartProps",
				stackId,
				partId: part.id,
				props,
			});
		const keyOf = (field: string) => `${part.id}:${field}`;

		return (
			<>
				<ClassicyControlLabel label={`${part.type} "${part.id}"`} />
				<CommitField
					key={keyOf("id")}
					id={keyOf("id")}
					label={"ID"}
					value={part.id}
					onCommit={(v) => setProps({ id: v })}
				/>
				<CommitField
					key={keyOf("name")}
					id={keyOf("name")}
					label={"Name"}
					value={part.name ?? ""}
					onCommit={(v) => setProps({ name: v })}
				/>
				{(["x", "y", "w", "h"] as const).map((axis, i) => (
					<CommitField
						key={keyOf(axis)}
						id={keyOf(axis)}
						label={axis.toUpperCase()}
						value={String(rect[i])}
						type={"number"}
						onCommit={(v) => {
							const next = [...rect] as HCRect;
							next[i] = Number(v);
							dispatch({
								type: "ClassicyAppHCEditSetRect",
								stackId,
								partId: part.id,
								rect: next,
							});
						}}
					/>
				))}
				<ClassicyCheckbox
					id={keyOf("visible")}
					label={"Visible"}
					checked={part.visible ?? true}
					onClickFunc={(checked) => setProps({ visible: checked })}
				/>
				<ClassicyCheckbox
					id={keyOf("locked")}
					label={"Locked"}
					checked={part.locked ?? false}
					onClickFunc={(checked) => setProps({ locked: checked })}
				/>
				<ClassicyCheckbox
					id={keyOf("shared")}
					label={"Shared (background fields)"}
					checked={part.shared ?? false}
					onClickFunc={(checked) => setProps({ shared: checked })}
				/>
				{STYLE_FIELDS.map((sf) => (
					<ClassicyPopUpMenu
						key={keyOf(sf.key)}
						id={keyOf(sf.key)}
						label={sf.label}
						options={[
							{ value: "", label: "(default)" },
							...sf.values.map((v) => ({ value: v, label: v })),
						]}
						selected={part.style?.[sf.key] ?? ""}
						onChangeFunc={(e) =>
							dispatch({
								type: "ClassicyAppHCEditSetPartStyle",
								stackId,
								partId: part.id,
								style: { [sf.key]: e.target.value },
							})
						}
					/>
				))}
				<div
					key={keyOf("content")}
					className={"classicyHyperCardInspectorField"}
				>
					<CommitField
						id={keyOf("content")}
						label={"Content"}
						value={part.content ?? ""}
						onCommit={(v) => setProps({ content: v })}
					/>
				</div>
				{schema.map((field) => renderOptionField(part, field))}
				{extraKeys.map((k) =>
					renderOptionField(part, { key: k, label: k, kind: "json" }),
				)}
				<ClassicyButton
					onClickFunc={() =>
						dispatch({
							type: "ClassicyAppHCEditShowScript",
							stackId,
							target: { kind: "part", partId: part.id },
						})
					}
				>
					Script…
				</ClassicyButton>
			</>
		);
	}

	function renderOptionField(part: HCPart, field: HCOptionField) {
		const key = `${part.id}:opt:${field.key}`;
		const current = part.options?.[field.key] ?? field.default;
		const commit = (value: unknown) =>
			dispatch({
				type: "ClassicyAppHCEditSetPartOption",
				stackId,
				partId: part.id,
				key: field.key,
				value,
			});
		if (field.kind === "checkbox") {
			return (
				<ClassicyCheckbox
					key={key}
					id={key}
					label={field.label}
					checked={Boolean(current)}
					onClickFunc={(checked) => commit(checked)}
				/>
			);
		}
		if (field.kind === "choices") {
			const lines = Array.isArray(current)
				? (current as unknown[]).map(String).join("\n")
				: "";
			let latest = lines;
			return (
				// biome-ignore lint/a11y/noStaticElementInteractions: uncontrolled textarea commit via blur
				<div
					key={key}
					className={"classicyHyperCardInspectorField"}
					onBlur={() => {
						if (latest !== lines) {
							commit(latest.split("\n").filter((l) => l.length > 0));
						}
					}}
				>
					<ClassicyTextEditor
						id={key}
						labelTitle={field.label}
						border={true}
						prefillValue={lines}
						onChangeFunc={(e) => {
							latest = e.target.value;
						}}
					/>
				</div>
			);
		}
		if (field.kind === "json") {
			return (
				<CommitField
					key={key}
					id={key}
					label={`${field.label} (JSON)`}
					value={current === undefined ? "" : JSON.stringify(current)}
					onCommit={(v) => {
						if (v === "") {
							commit(undefined);
							return;
						}
						try {
							commit(JSON.parse(v));
						} catch {
							// invalid JSON: ignore the commit, the input keeps the text
						}
					}}
				/>
			);
		}
		return (
			<CommitField
				key={key}
				id={key}
				label={field.label}
				value={current === undefined ? "" : String(current)}
				type={field.kind === "number" ? "number" : undefined}
				onCommit={(v) => {
					if (v === "") commit(undefined);
					else commit(field.kind === "number" ? Number(v) : v);
				}}
			/>
		);
	}

	function renderCardStackSections() {
		const card = edit.draft.cards.find((c) => c.id === edit.currentCardId);
		const backgrounds = edit.draft.backgrounds ?? [];
		const variables = Object.entries(edit.draft.variables ?? {});
		const [w, h] = edit.draft.size ?? [512, 342];
		let newVarName = "";
		let newVarValue = "";
		return (
			<>
				<ClassicyControlLabel label={`Card "${card?.id ?? ""}"`} />
				<CommitField
					key={`card:${edit.currentCardId}:name`}
					id={`card:${edit.currentCardId}:name`}
					label={"Card name"}
					value={card?.name ?? ""}
					onCommit={(v) =>
						dispatch({
							type: "ClassicyAppHCEditSetCardProps",
							stackId,
							props: { name: v },
						})
					}
				/>
				<ClassicyPopUpMenu
					id={`card:${edit.currentCardId}:background`}
					label={"Background"}
					options={[
						{ value: "", label: "(none)" },
						...backgrounds.map((b) => ({
							value: b.id,
							label: b.name ?? b.id,
						})),
					]}
					selected={card?.background ?? ""}
					onChangeFunc={(e) =>
						dispatch({
							type: "ClassicyAppHCEditSetCardProps",
							stackId,
							props: { background: e.target.value },
						})
					}
				/>
				<ClassicyButton
					onClickFunc={() =>
						dispatch({
							type: "ClassicyAppHCEditShowScript",
							stackId,
							target: { kind: "card" },
						})
					}
				>
					Card Script…
				</ClassicyButton>
				{card?.background ? (
					<ClassicyButton
						onClickFunc={() =>
							dispatch({
								type: "ClassicyAppHCEditShowScript",
								stackId,
								target: { kind: "background" },
							})
						}
					>
						Background Script…
					</ClassicyButton>
				) : null}
				<ClassicyControlLabel label={"Stack"} />
				<CommitField
					key={"stack:name"}
					id={"stack:name"}
					label={"Stack name"}
					value={edit.draft.name}
					onCommit={(v) =>
						dispatch({
							type: "ClassicyAppHCEditSetStackProps",
							stackId,
							props: { name: v },
						})
					}
				/>
				<CommitField
					key={"stack:w"}
					id={"stack:w"}
					label={"Card width"}
					value={String(w)}
					type={"number"}
					onCommit={(v) =>
						dispatch({
							type: "ClassicyAppHCEditSetStackProps",
							stackId,
							props: { width: Number(v) },
						})
					}
				/>
				<CommitField
					key={"stack:h"}
					id={"stack:h"}
					label={"Card height"}
					value={String(h)}
					type={"number"}
					onCommit={(v) =>
						dispatch({
							type: "ClassicyAppHCEditSetStackProps",
							stackId,
							props: { height: Number(v) },
						})
					}
				/>
				<ClassicyButton
					onClickFunc={() =>
						dispatch({
							type: "ClassicyAppHCEditShowScript",
							stackId,
							target: { kind: "stack" },
						})
					}
				>
					Stack Script…
				</ClassicyButton>
				<ClassicyControlLabel label={"Variables"} />
				{variables.map(([name, value]) => (
					<div key={`var:${name}`} className={"classicyHyperCardInspectorRow"}>
						<CommitField
							id={`var:${name}`}
							label={name}
							value={String(value)}
							onCommit={(v) =>
								dispatch({
									type: "ClassicyAppHCEditSetStackVariable",
									stackId,
									name,
									value: Number.isFinite(Number(v)) && v !== "" ? Number(v) : v,
								})
							}
						/>
						<ClassicyButton
							onClickFunc={() =>
								dispatch({
									type: "ClassicyAppHCEditSetStackVariable",
									stackId,
									name,
									value: undefined,
								})
							}
						>
							Delete
						</ClassicyButton>
					</div>
				))}
				<div className={"classicyHyperCardInspectorRow"}>
					<ClassicyInput
						id={"var:new:name"}
						labelTitle={"New variable"}
						placeholder={"name"}
						onChangeFunc={(e) => {
							newVarName = e.target.value;
						}}
					/>
					<ClassicyInput
						id={"var:new:value"}
						placeholder={"value"}
						onChangeFunc={(e) => {
							newVarValue = e.target.value;
						}}
						onEnterFunc={() => {
							if (newVarName) {
								dispatch({
									type: "ClassicyAppHCEditSetStackVariable",
									stackId,
									name: newVarName,
									value:
										Number.isFinite(Number(newVarValue)) && newVarValue !== ""
											? Number(newVarValue)
											: newVarValue,
								});
							}
						}}
					/>
				</div>
			</>
		);
	}
};
