/**
 * Raw-JSON script tab: the target's handlers as pretty JSON; Apply validates
 * (parse + validateHandlers) and dispatches SetScript, or shows the first
 * error without dispatching.
 */

import { type FC as FunctionalComponent, useState } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { HCScriptTarget } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { validateHandlers } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptModel";
import type { HCEventHandlers } from "@/SystemFolder/HyperCard/HyperCardModel";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { ClassicyTextEditor } from "@/SystemFolder/SystemResources/TextEditor/ClassicyTextEditor";

interface HyperCardScriptJsonProps {
	stackId: string;
	target: HCScriptTarget;
	handlers: HCEventHandlers;
}

export const HyperCardScriptJson: FunctionalComponent<
	HyperCardScriptJsonProps
> = ({ stackId, target, handlers }) => {
	const dispatch = useAppManagerDispatch();
	const seeded = JSON.stringify(handlers, null, "\t");
	const [text, setText] = useState(seeded);
	const [error, setError] = useState<string | undefined>();

	const apply = () => {
		let parsed: unknown;
		try {
			parsed = JSON.parse(text);
		} catch (err) {
			setError(err instanceof Error ? err.message : String(err));
			return;
		}
		const result = validateHandlers(parsed);
		if ("errors" in result) {
			setError(result.errors[0]);
			return;
		}
		setError(undefined);
		dispatch({
			type: "ClassicyAppHCEditSetScript",
			stackId,
			target,
			handlers: result.handlers,
		});
	};

	return (
		<div className={"classicyHyperCardScriptJson"}>
			<ClassicyTextEditor
				key={`${stackId}:${JSON.stringify(target)}`}
				id={"hypercard_script_json"}
				border={true}
				prefillValue={seeded}
				onChangeFunc={(e) => setText(e.target.value)}
			/>
			{error ? <ClassicyControlLabel label={`✗ ${error}`} /> : null}
			<ClassicyButton onClickFunc={apply} isDefault={true}>
				Apply
			</ClassicyButton>
		</div>
	);
};
