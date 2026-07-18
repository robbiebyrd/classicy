/**
 * Visual script builder: per-event ordered action lists with typed per-verb
 * fields, nested if/repeat blocks, add/remove/reorder. Stateless over the
 * handlers prop — every mutation computes the next full handlers object and
 * dispatches one SetScript (undo granularity = one mutation).
 */

import type { ChangeEvent, FC as FunctionalComponent } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { HCScriptTarget } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import {
	HC_EVENT_NAMES,
	type HCAction,
	type HCEventHandlers,
	type HCEventName,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	getHyperCardCommandEditorMeta,
	getRegisteredEditorCommands,
	type HCOptionField,
} from "@/SystemFolder/HyperCard/HyperCardPlugins";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";

const text = (key: string, label?: string): HCOptionField => ({
	key,
	label: label ?? key,
	kind: "text",
});
const num = (key: string, label?: string): HCOptionField => ({
	key,
	label: label ?? key,
	kind: "number",
});

/** Flat editable params per built-in verb (nested lists handled structurally). */
export const BUILTIN_ACTION_SPECS: Record<string, HCOptionField[]> = {
	go: [text("to")],
	put: [text("value"), text("var"), text("field")],
	add: [text("value"), text("var"), text("field")],
	subtract: [text("value"), text("var"), text("field")],
	multiply: [text("value"), text("var"), text("field")],
	divide: [text("value"), text("var"), text("field")],
	set: [text("part"), text("property"), text("value")],
	show: [text("part")],
	hide: [text("part")],
	beep: [],
	play: [text("sound")],
	answer: [
		text("message"),
		{ key: "buttons", label: "buttons", kind: "choices" },
		text("var"),
		text("field"),
	],
	ask: [text("prompt"), text("default"), text("var"), text("field")],
	visual: [text("effect")],
	wait: [num("ms")],
	openApp: [text("app"), text("event")],
	if: [text("condition")],
	repeat: [num("times"), text("while")],
};

/** Default new action per verb (nested verbs seed their branch arrays). */
function newAction(verb: string): HCAction {
	if (verb === "wait") return { do: "wait", ms: 0 };
	if (verb === "if") return { do: "if", condition: "", then: [] };
	if (verb === "repeat") return { do: "repeat", times: 1, body: [] };
	return { do: verb } as HCAction;
}

/** Address of an action list inside handlers. */
export interface HCActionPath {
	event: HCEventName;
	hops: { index: number; branch: "then" | "else" | "body" }[];
}

export function listAt(
	handlers: HCEventHandlers,
	path: HCActionPath,
): HCAction[] {
	let list: HCAction[] = handlers[path.event] ?? [];
	for (const hop of path.hops) {
		const parent = list[hop.index] as unknown as Record<string, HCAction[]>;
		list = parent?.[hop.branch] ?? [];
	}
	return list;
}

export function withListAt(
	handlers: HCEventHandlers,
	path: HCActionPath,
	next: HCAction[],
): HCEventHandlers {
	const clone = JSON.parse(JSON.stringify(handlers)) as HCEventHandlers;
	if (path.hops.length === 0) {
		if (next.length === 0) delete clone[path.event];
		else clone[path.event] = next;
		return clone;
	}
	let list = clone[path.event] ?? [];
	for (const hop of path.hops.slice(0, -1)) {
		list = (list[hop.index] as unknown as Record<string, HCAction[]>)[
			hop.branch
		];
	}
	const last = path.hops[path.hops.length - 1];
	(list[last.index] as unknown as Record<string, HCAction[]>)[last.branch] =
		next;
	return clone;
}

interface HyperCardScriptBuilderProps {
	stackId: string;
	target: HCScriptTarget;
	handlers: HCEventHandlers;
}

export const HyperCardScriptBuilder: FunctionalComponent<
	HyperCardScriptBuilderProps
> = ({ stackId, target, handlers }) => {
	const dispatch = useAppManagerDispatch();
	const commands = getRegisteredEditorCommands();
	const verbOptions = [
		...Object.keys(BUILTIN_ACTION_SPECS).map((v) => ({ value: v, label: v })),
		...commands.map((c) => ({ value: c.name, label: c.meta.label })),
	];

	const commit = (next: HCEventHandlers) =>
		dispatch({
			type: "ClassicyAppHCEditSetScript",
			stackId,
			target,
			handlers: next,
		});

	const events = HC_EVENT_NAMES.filter((e) => handlers[e] !== undefined);
	const absent = HC_EVENT_NAMES.filter((e) => !(e in handlers));

	return (
		<div className={"classicyHyperCardScriptBuilder"}>
			{events.map((event) => (
				<div key={event} className={"classicyHyperCardScriptEvent"}>
					<ClassicyControlLabel label={event} />
					<ActionList
						path={{ event, hops: [] }}
						handlers={handlers}
						commit={commit}
						verbOptions={verbOptions}
					/>
				</div>
			))}
			{absent.length > 0 ? (
				<ClassicyPopUpMenu
					id={"add:handler"}
					label={"Add handler"}
					placeholder={"event…"}
					options={absent.map((e) => ({ value: e, label: e }))}
					selected={""}
					onChangeFunc={(e: ChangeEvent<HTMLSelectElement>) => {
						const event = e.target.value as HCEventName;
						if (event) commit({ ...handlers, [event]: [] });
					}}
				/>
			) : null}
		</div>
	);
};

const ActionList: FunctionalComponent<{
	path: HCActionPath;
	handlers: HCEventHandlers;
	commit: (next: HCEventHandlers) => void;
	verbOptions: { value: string; label: string }[];
}> = ({ path, handlers, commit, verbOptions }) => {
	const actions = listAt(handlers, path);
	const pathKey =
		path.event + path.hops.map((h) => `.${h.index}.${h.branch}`).join("");

	const replace = (next: HCAction[]) =>
		commit(withListAt(handlers, path, next));

	return (
		<div className={"classicyHyperCardActionList"}>
			{actions.map((action, i) => {
				const a = action as unknown as Record<string, unknown>;
				const verb = String(a.do);
				// Built-in verbs use their spec; plugin commands use their registered
				// editor-meta fields; unknown verbs get no fields (row still shows
				// verb + reorder/delete, and the JSON tab can edit its params).
				const fields =
					BUILTIN_ACTION_SPECS[verb] ??
					getHyperCardCommandEditorMeta(verb)?.fields ??
					[];
				return (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: actions have no stable id; index is the only available identity
						key={`${pathKey}:${i}`}
						className={"classicyHyperCardActionRow"}
					>
						<ClassicyControlLabel label={verb} />
						{fields.map((field) => (
							<ActionField
								// biome-ignore lint/suspicious/noArrayIndexKey: row index disambiguates identical field keys across sibling rows
								key={`${pathKey}:${i}:${field.key}`}
								id={`${pathKey}:${i}:${field.key}`}
								field={field}
								value={a[field.key]}
								onCommit={(value) => {
									const next = [...actions];
									const updated = { ...a };
									if (value === undefined) delete updated[field.key];
									else updated[field.key] = value;
									next[i] = updated as unknown as HCAction;
									replace(next);
								}}
							/>
						))}
						<ClassicyButton
							onClickFunc={() => {
								if (i === 0) return;
								const next = [...actions];
								[next[i - 1], next[i]] = [next[i], next[i - 1]];
								replace(next);
							}}
						>
							↑
						</ClassicyButton>
						<ClassicyButton
							onClickFunc={() => {
								if (i === actions.length - 1) return;
								const next = [...actions];
								[next[i], next[i + 1]] = [next[i + 1], next[i]];
								replace(next);
							}}
						>
							↓
						</ClassicyButton>
						<ClassicyButton
							onClickFunc={() => replace(actions.filter((_, j) => j !== i))}
						>
							Delete
						</ClassicyButton>
						{(verb === "if"
							? a.else !== undefined
								? (["then", "else"] as const)
								: (["then"] as const)
							: verb === "repeat"
								? (["body"] as const)
								: ([] as const)
						).map((branch) => (
							<div
								// biome-ignore lint/suspicious/noArrayIndexKey: row index disambiguates nested branch blocks across sibling rows
								key={`${pathKey}:${i}:${branch}`}
								className={"classicyHyperCardActionNested"}
							>
								<ClassicyControlLabel label={branch} />
								<ActionList
									path={{
										event: path.event,
										hops: [...path.hops, { index: i, branch }],
									}}
									handlers={handlers}
									commit={commit}
									verbOptions={verbOptions}
								/>
							</div>
						))}
					</div>
				);
			})}
			{/*
			 * ClassicyPopUpMenu (commit 0826717) no longer renders a hidden native
			 * <select> mirror — its options only enter the DOM once the custom
			 * listbox is opened. The add-action control needs a real, always-queryable
			 * <select> (script-editor tests target it directly), so it's a plain
			 * native element here rather than ClassicyPopUpMenu. Option labels are
			 * "+ "-prefixed so they never collide with a verb's bare-text row label
			 * (e.g. an existing "beep" action row vs. this control's "beep" choice).
			 */}
			<select
				key={`${pathKey}:${actions.length}`}
				id={`add:${pathKey}`}
				className={"classicyHyperCardActionAddSelect"}
				defaultValue={""}
				onChange={(e: ChangeEvent<HTMLSelectElement>) => {
					const verb = e.target.value;
					if (verb) replace([...actions, newAction(verb)]);
				}}
			>
				<option value="">+ add action…</option>
				{verbOptions.map((o) => (
					<option key={o.value} value={o.value}>
						{`+ ${o.label}`}
					</option>
				))}
			</select>
		</div>
	);
};

const ActionField: FunctionalComponent<{
	id: string;
	field: HCOptionField;
	value: unknown;
	onCommit: (value: unknown) => void;
}> = ({ id, field, value, onCommit }) => {
	if (field.kind === "choices") {
		const seeded = Array.isArray(value) ? (value as string[]).join(", ") : "";
		let latest = seeded;
		return (
			// biome-ignore lint/a11y/noStaticElementInteractions: uncontrolled input commit via blur
			<div
				onBlur={() => {
					if (latest === seeded) return;
					const parts = latest
						.split(",")
						.map((s) => s.trim())
						.filter((s) => s.length > 0);
					onCommit(parts.length > 0 ? parts : undefined);
				}}
			>
				<ClassicyInput
					id={id}
					labelTitle={field.label}
					prefillValue={seeded}
					onChangeFunc={(e) => {
						latest = e.target.value;
					}}
				/>
			</div>
		);
	}
	const seeded = value === undefined ? "" : String(value);
	let latest = seeded;
	const commitLatest = () => {
		if (latest === seeded) return;
		if (latest === "") onCommit(undefined);
		else onCommit(field.kind === "number" ? Number(latest) : latest);
	};
	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: uncontrolled input commit via blur/keydown
		<div
			onBlur={commitLatest}
			onKeyDown={(e) => {
				if (e.key === "Enter") commitLatest();
			}}
		>
			<ClassicyInput
				id={id}
				labelTitle={field.label}
				prefillValue={seeded}
				type={field.kind === "number" ? "number" : undefined}
				onChangeFunc={(e) => {
					latest = e.target.value;
				}}
			/>
		</div>
	);
};
