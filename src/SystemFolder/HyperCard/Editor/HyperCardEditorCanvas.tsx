/**
 * The editor's design surface: the draft stack's current card rendered through
 * the REAL player renderer (inert) with the interaction overlay on top — the
 * WYSIWYG guarantee is that browse mode and edit mode share HyperCardCard.
 */

import classNames from "classnames";
import type { CSSProperties, FC as FunctionalComponent } from "react";
import { HyperCardEditorOverlay } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorOverlay";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardCard } from "@/SystemFolder/HyperCard/HyperCardCard";
import { DEFAULT_CARD_SIZE } from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	type HCOpenStack,
	makeInitialRuntime,
} from "@/SystemFolder/HyperCard/HyperCardUtils";

interface HyperCardEditorCanvasProps {
	stackId: string;
	edit: HCEditState;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

/** Wrap the draft in a synthetic open-stack record for the player renderer. */
function syntheticOpen(edit: HCEditState): HCOpenStack {
	return {
		stackSource: "editor",
		stack: edit.draft,
		currentCardId: edit.currentCardId,
		history: [],
		variables: { ...(edit.draft.variables ?? {}) },
		fieldValues: {},
		partVisibility: {},
		fieldRev: {},
		runtime: makeInitialRuntime(),
	};
}

export const HyperCardEditorCanvas: FunctionalComponent<
	HyperCardEditorCanvasProps
> = ({ stackId, edit, className, style }) => {
	const [w, h] = edit.draft.size ?? DEFAULT_CARD_SIZE;
	return (
		<div
			className={classNames("classicyHyperCardEditorCanvas", className)}
			style={{ width: w, height: h, ...style }}
		>
			<HyperCardCard open={syntheticOpen(edit)} stackId={stackId} editing />
			<HyperCardEditorOverlay stackId={stackId} edit={edit} />
		</div>
	);
};
