/**
 * Renders a single HyperCard card: each {@link HCPart} is mapped to a Classicy
 * component and absolute-positioned on a fixed-size card canvas. Field-like
 * parts stay self-owned (uncontrolled/seeded) and commit on blur/Enter; a
 * programmatic put/set bumps the field revision so the input remounts with fresh
 * text (see the `key` on each field).
 */

import {
	type ChangeEvent,
	type CSSProperties,
	type FC as FunctionalComponent,
	useEffect,
	useRef,
} from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { makeEvalContext } from "@/SystemFolder/HyperCard/HyperCardEngine";
import { evaluateToString } from "@/SystemFolder/HyperCard/HyperCardExpression";
import {
	DEFAULT_CARD_SIZE,
	type HCEventName,
	type HCPart,
	type HCValue,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import { getHyperCardPart } from "@/SystemFolder/HyperCard/HyperCardPlugins";
import {
	collectCardParts,
	fieldKey,
	getCard,
	type HCOpenStack,
} from "@/SystemFolder/HyperCard/HyperCardUtils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyCheckbox } from "@/SystemFolder/SystemResources/Checkbox/ClassicyCheckbox";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyInput } from "@/SystemFolder/SystemResources/Input/ClassicyInput";
import { ClassicyPopUpMenu } from "@/SystemFolder/SystemResources/PopUpMenu/ClassicyPopUpMenu";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";
import { ClassicyRadioInput } from "@/SystemFolder/SystemResources/RadioInput/ClassicyRadioInput";
import { ClassicySlider } from "@/SystemFolder/SystemResources/Slider/ClassicySlider";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";
import "./HyperCard.scss";

interface HyperCardCardProps {
	open: HCOpenStack;
	stackId: string;
}

function rectStyle(part: HCPart): CSSProperties {
	const [x, y, w, h] = part.rect ?? [0, 0, 0, 0];
	const style: CSSProperties = { left: x, top: y };
	if (w) style.width = w;
	if (h) style.height = h;
	return style;
}

export const HyperCardCard: FunctionalComponent<HyperCardCardProps> = ({
	open,
	stackId,
}) => {
	const dispatch = useAppManagerDispatch();
	const card = getCard(open.stack, open.currentCardId);
	const [canvasW, canvasH] = open.stack.size ?? DEFAULT_CARD_SIZE;

	if (!card) return null;

	const fireEvent = (partId: string, value?: string) => {
		dispatch({
			type: "ClassicyAppHyperCardEvent",
			stackId,
			partId,
			event: "onMouseUp",
			...(value !== undefined ? { value } : {}),
		});
	};

	const commitField = (partId: string, value: string) => {
		dispatch({
			type: "ClassicyAppHyperCardCommitField",
			stackId,
			partId,
			value,
		});
	};

	const fire = (partId: string, event?: HCEventName) => {
		dispatch({
			type: "ClassicyAppHyperCardEvent",
			stackId,
			partId,
			event: event ?? "onMouseUp",
		});
	};

	const parts = collectCardParts(open.stack, card);

	return (
		<div
			className={"classicyHyperCardCanvas"}
			style={{ width: canvasW, height: canvasH }}
		>
			{parts.map(({ part, backgroundId }) => {
				const visible = open.partVisibility[part.id] ?? part.visible ?? true;
				if (!visible) return null;
				const key = fieldKey(part, open.currentCardId, backgroundId);
				const rev = open.fieldRev[key] ?? 0;
				const value = open.fieldValues[key] ?? part.content ?? "";
				return (
					<div
						key={part.id}
						className={"classicyHyperCardPart"}
						style={rectStyle(part)}
					>
						{renderPart(part, {
							value,
							revKey: `${key}:${rev}`,
							fireEvent,
							commitField,
							fire,
							stackId,
							getVariable: (n) => open.variables[n],
							resolve: (expr) => evaluateToString(expr, makeEvalContext(open)),
						})}
					</div>
				);
			})}
		</div>
	);
};

interface RenderCtx {
	value: string;
	revKey: string;
	fireEvent: (partId: string, value?: string) => void;
	commitField: (partId: string, value: string) => void;
	fire: (partId: string, event?: HCEventName) => void;
	stackId: string;
	getVariable: (name: string) => HCValue | undefined;
	resolve: (expr: string) => string;
}

function renderPart(part: HCPart, ctx: RenderCtx) {
	switch (part.type) {
		case "button":
			return (
				<ClassicyButton onClickFunc={() => ctx.fireEvent(part.id)}>
					{part.name ?? part.content ?? "Button"}
				</ClassicyButton>
			);
		case "checkbox":
			return (
				<ClassicyCheckbox
					id={part.id}
					label={part.name ?? part.content ?? ""}
					checked={ctx.value === "true"}
					onClickFunc={(checked) => ctx.fireEvent(part.id, String(checked))}
				/>
			);
		case "radio": {
			const choices = asChoices(part.options?.choices);
			return (
				<ClassicyRadioInput
					name={part.id}
					label={part.name ?? ""}
					inputs={choices.map((c) => ({
						id: c.value,
						label: c.label,
						checked: c.value === ctx.value,
					}))}
					onClickFunc={(id) => ctx.fireEvent(part.id, id)}
				/>
			);
		}
		case "popup": {
			const choices = asChoices(part.options?.choices);
			return (
				<ClassicyPopUpMenu
					id={part.id}
					label={part.name ?? ""}
					options={choices}
					selected={ctx.value}
					onChangeFunc={(e) => ctx.fireEvent(part.id, e.target.value)}
				/>
			);
		}
		case "slider":
			return (
				<ClassicySlider
					id={part.id}
					labelTitle={part.name ?? ""}
					value={Number(ctx.value) || 0}
					min={numOpt(part.options?.min, 0)}
					max={numOpt(part.options?.max, 100)}
					step={numOpt(part.options?.step, 1)}
					onCommitFunc={(v) => ctx.fireEvent(part.id, String(v))}
				/>
			);
		case "progress":
			return (
				<ClassicyProgressBar
					value={Number(ctx.value) || 0}
					max={numOpt(part.options?.max, 100)}
					label={part.name}
				/>
			);
		case "label":
			return <ClassicyControlLabel label={ctx.value || part.name || ""} />;
		case "image":
			return (
				<img
					className={"classicyHyperCardImage"}
					src={String(part.options?.src ?? "")}
					alt={part.name ?? ""}
				/>
			);
		case "field":
			return (
				<HyperCardField
					part={part}
					value={ctx.value}
					revKey={ctx.revKey}
					onCommit={(v) => ctx.commitField(part.id, v)}
				/>
			);
		case "group":
			return <div className={"classicyHyperCardGroup"}>{part.name ?? ""}</div>;
	}
	// Unknown type → a plugin-registered custom part, or a placeholder.
	const Custom = getHyperCardPart(part.type);
	if (Custom) {
		return (
			<Custom
				part={part}
				partId={part.id}
				stackId={ctx.stackId}
				options={part.options ?? {}}
				locked={part.locked ?? false}
				value={ctx.value}
				setValue={(v) => ctx.commitField(part.id, v)}
				fire={(event) => ctx.fire(part.id, event)}
				getVariable={ctx.getVariable}
				resolve={ctx.resolve}
			/>
		);
	}
	return (
		<div className={"classicyHyperCardMissingPart"}>
			Missing part “{part.type}”
		</div>
	);
}

interface HyperCardFieldProps {
	part: HCPart;
	value: string;
	revKey: string;
	onCommit: (value: string) => void;
}

/**
 * A self-owned field editor: the DOM owns the text while typing; the latest
 * value is committed on blur or Enter. Remounts (via `key={revKey}`) when a
 * script writes to the field so programmatic changes take effect.
 */
const HyperCardField: FunctionalComponent<HyperCardFieldProps> = ({
	part,
	value,
	revKey,
	onCommit,
}) => {
	const latest = useRef(value);
	useEffect(() => {
		latest.current = value;
	}, [value]);

	if (part.locked) {
		return <div className={"classicyHyperCardLockedField"}>{value}</div>;
	}

	const multiline = Boolean(part.options?.multiline);
	const commit = () => onCommit(latest.current);
	const track = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
		latest.current = e.target.value;
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: wrapper only forwards blur to commit the child field
		<div className={"classicyHyperCardFieldWrap"} onBlur={commit}>
			{multiline ? (
				<ClassicyTextEditor
					key={revKey}
					id={part.id}
					prefillValue={value}
					border={true}
					onChangeFunc={track}
				/>
			) : (
				<ClassicyInput
					key={revKey}
					id={part.id}
					prefillValue={value}
					onChangeFunc={track}
					onEnterFunc={commit}
				/>
			)}
		</div>
	);
};

// --- option helpers -------------------------------------------------------

interface Choice {
	value: string;
	label: string;
}

function asChoices(raw: unknown): Choice[] {
	if (!Array.isArray(raw)) return [];
	return raw.map((c) => {
		if (typeof c === "string") return { value: c, label: c };
		const obj = c as Record<string, unknown>;
		const value = String(obj.value ?? obj.id ?? obj.label ?? "");
		return { value, label: String(obj.label ?? value) };
	});
}

function numOpt(raw: unknown, fallback: number): number {
	const n = Number(raw);
	return Number.isFinite(n) ? n : fallback;
}
