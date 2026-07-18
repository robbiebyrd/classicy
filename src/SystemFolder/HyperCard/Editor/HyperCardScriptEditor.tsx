/**
 * The script-editor window content: target header, Builder/JSON tab switch,
 * and Close. The Builder is the default tab; both tabs are views over the
 * same handlers in the draft (each Apply/mutation dispatches SetScript).
 */

import { type FC as FunctionalComponent, useEffect, useState } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { HCEditState } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardScriptBuilder } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptBuilder";
import { HyperCardScriptJson } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptJson";
import {
	getTargetHandlers,
	targetLabel,
} from "@/SystemFolder/HyperCard/Editor/HyperCardScriptModel";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

interface HyperCardScriptEditorProps {
	stackId: string;
	edit: HCEditState;
}

export const HyperCardScriptEditor: FunctionalComponent<
	HyperCardScriptEditorProps
> = ({ stackId, edit }) => {
	const dispatch = useAppManagerDispatch();
	const [tab, setTab] = useState<"builder" | "json">("builder");
	const target = edit.script?.target;
	const handlers = target
		? getTargetHandlers(edit.draft, edit, target)
		: undefined;

	// Target vanished (part deleted, background detached): close the editor.
	// Dispatching during render is a React anti-pattern, so this runs as an effect.
	useEffect(() => {
		if (target && handlers === undefined) {
			dispatch({ type: "ClassicyAppHCEditHideScript", stackId });
		}
	}, [target, handlers, stackId, dispatch]);

	if (!target || handlers === undefined) return null;

	return (
		<div className={"classicyHyperCardScriptEditor"}>
			<ClassicyControlLabel label={targetLabel(target)} />
			<div className={"classicyHyperCardScriptTabs"}>
				<ClassicyButton
					isDefault={tab === "builder"}
					onClickFunc={() => setTab("builder")}
				>
					Builder
				</ClassicyButton>
				<ClassicyButton
					isDefault={tab === "json"}
					onClickFunc={() => setTab("json")}
				>
					JSON
				</ClassicyButton>
				<ClassicyButton
					onClickFunc={() =>
						dispatch({ type: "ClassicyAppHCEditHideScript", stackId })
					}
				>
					Close
				</ClassicyButton>
			</div>
			{tab === "builder" ? (
				<HyperCardScriptBuilder
					stackId={stackId}
					target={target}
					handlers={handlers}
				/>
			) : (
				<HyperCardScriptJson
					key={JSON.stringify(target)}
					stackId={stackId}
					target={target}
					handlers={handlers}
				/>
			)}
		</div>
	);
};
