import { type FC as FunctionalComponent, useLayoutEffect, useRef } from "react";

/** Props for `ClassicyRenameField`. */
export type ClassicyRenameFieldProps = {
	/** The name being edited: the field's text, selected whole on mount. */
	name: string;
	/** The field's class: the caption it stands in for draws it. */
	className: string;
	/** Return, or a click elsewhere (the field's blur): the text as typed. */
	onCommit: (value: string) => void;
	/** Escape. */
	onCancel: () => void;
};

/**
 * An item's name field while it is renamed in place, where its caption was:
 * the name, selected whole, focused once it mounts. Return or a click
 * elsewhere (the field's blur) commits the text once; Escape cancels. Its
 * presses, clicks and keys stop here, so the item neither drags, selects
 * nor opens under them. The icon view's icons (`classicyIconRename`), the
 * list view's names and desktop icons share it.
 */
export const ClassicyRenameField: FunctionalComponent<
	ClassicyRenameFieldProps
> = ({ name, className, onCommit, onCancel }) => {
	const inputRef = useRef<HTMLInputElement>(null);
	const doneRef = useRef(false);
	useLayoutEffect(() => {
		const input = inputRef.current;
		if (!input) return;
		input.focus({ preventScroll: true });
		input.select();
	}, []);
	const finish = (commit: boolean) => {
		if (doneRef.current) return;
		doneRef.current = true;
		if (commit) onCommit(inputRef.current?.value ?? name);
		else onCancel();
	};
	const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();
	return (
		<input
			ref={inputRef}
			className={className}
			type={"text"}
			defaultValue={name}
			aria-label={"Name"}
			spellCheck={false}
			onMouseDown={stop}
			onMouseUp={stop}
			onClick={stop}
			onDoubleClick={stop}
			onContextMenu={stop}
			onKeyDown={(e) => {
				e.stopPropagation();
				if (e.key === "Enter") {
					e.preventDefault();
					finish(true);
				} else if (e.key === "Escape") {
					e.preventDefault();
					finish(false);
				}
			}}
			onBlur={() => finish(true)}
		/>
	);
};
