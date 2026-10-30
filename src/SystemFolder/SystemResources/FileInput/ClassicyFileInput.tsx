// src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx
import "./ClassicyFileInput.scss";
import classNames from "classnames";
import {
	type ChangeEvent,
	type CSSProperties,
	forwardRef,
	useCallback,
	useImperativeHandle,
	useRef,
	useState,
} from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import {
	ClassicyControlLabel,
	type ClassicyControlLabelSize,
	type ClassicyLabelPosition,
	labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

/** Imperative handle exposed through `ClassicyFileInput`'s ref. */
export interface ClassicyFileInputHandle {
	/**
	 * Adds files programmatically (e.g. from a drop zone), applying the same
	 * `maxFiles` / `maxFileSizeMb` checks as the Choose button. `accept` is a
	 * hint to the browser's file dialog only and is not applied here.
	 */
	addFiles: (incoming: File[]) => void;
}

interface ClassicyFileInputProps {
	/** Id of the hidden native `<input type="file">`; links the label to it. */
	id: string;
	/** Native `accept` filter for the browser's file dialog (e.g. `"image/*"`). */
	accept?: string;
	/** Allow choosing several files; the button reads "Choose Files…". Defaults to `false`. */
	multiple?: boolean;
	/** Maximum number of files in the list; an addition that would exceed it is refused with an error. */
	maxFiles?: number;
	/** Maximum size of each file in MB; an oversized file is refused with an error. */
	maxFileSizeMb?: number;
	/** Disables the Choose and Remove buttons (and dims the label). Defaults to `false`. */
	disabled?: boolean;
	/** Visible label text. Omit for no label. */
	labelTitle?: string;
	/** Where the label sits relative to the control. Defaults to `"above"`. */
	labelPosition?: ClassicyLabelPosition;
	/** Label text size. Defaults to `"medium"`. */
	labelSize?: ClassicyControlLabelSize;
	/** Dims the label independently of the control. Defaults to `disabled`. */
	labelDisabled?: boolean;
	/** Called with the complete current file list after every add or remove. */
	onChangeFunc?: (files: File[]) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

/**
 * The `<input type="file">` equivalent: a Platinum "Choose File…" push button
 * over a hidden native file input, followed by the list of chosen files, each
 * with a small remove (✕) button. It picks files from the host computer; to
 * pick from the Classicy file system use `ClassicyFileOpenDialog` /
 * `ClassicyFileSaveDialog` instead.
 *
 * The list is uncontrolled and accumulates: every choice is appended, and
 * `onChangeFunc` receives the whole list. An addition that breaks `maxFiles`
 * or `maxFileSizeMb` is refused as a whole and shown as an inline error
 * (`role="alert"`). The ref exposes `{ addFiles(files) }` so a drop target
 * (e.g. a `ClassicyImageWell`) can feed the same list.
 */
export const ClassicyFileInput = forwardRef<
	ClassicyFileInputHandle,
	ClassicyFileInputProps
>(function ClassicyFileInput(
	{
		id,
		accept,
		multiple = false,
		maxFiles,
		maxFileSizeMb,
		disabled = false,
		labelTitle,
		labelPosition = "above",
		labelSize = "medium",
		labelDisabled,
		onChangeFunc,
		className,
		style,
	},
	ref,
) {
	type FileEntry = { id: string; file: File };
	const entryCounter = useRef(0);
	const [entries, setEntries] = useState<FileEntry[]>([]);
	const [error, setError] = useState<string | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	const tryAdd = useCallback(
		(currentEntries: FileEntry[], incoming: File[]): FileEntry[] | null => {
			const combined = currentEntries.length + incoming.length;
			if (maxFiles !== undefined && combined > maxFiles) {
				setError(`Max ${maxFiles} files allowed.`);
				return null;
			}
			if (maxFileSizeMb !== undefined) {
				const oversized = incoming.find(
					(f) => f.size > maxFileSizeMb * 1024 * 1024,
				);
				if (oversized) {
					setError(`"${oversized.name}" exceeds ${maxFileSizeMb} MB.`);
					return null;
				}
			}
			const newEntries = incoming.map((f) => ({
				id: `${f.name}:${f.size}:${f.lastModified}:${++entryCounter.current}`,
				file: f,
			}));
			return [...currentEntries, ...newEntries];
		},
		[maxFiles, maxFileSizeMb],
	);

	const addFiles = useCallback(
		(incoming: File[]) => {
			setError(null);
			const next = tryAdd(entries, incoming);
			if (next === null) return;
			setEntries(next);
			onChangeFunc?.(next.map((e) => e.file));
		},
		[entries, tryAdd, onChangeFunc],
	);

	useImperativeHandle(ref, () => ({ addFiles }), [addFiles]);

	const handleChange = useCallback(
		(e: ChangeEvent<HTMLInputElement>) => {
			const incoming = Array.from(e.target.files ?? []);
			if (incoming.length > 0) addFiles(incoming);
			if (inputRef.current) inputRef.current.value = "";
		},
		[addFiles],
	);

	const handleRemove = useCallback(
		(id: string) => {
			setError(null);
			const updated = entries.filter((e) => e.id !== id);
			setEntries(updated);
			onChangeFunc?.(updated.map((e) => e.file));
		},
		[entries, onChangeFunc],
	);

	return (
		<div
			className={classNames(
				"classicyFileInputHolder",
				labelPositionClass(labelPosition),
				className,
			)}
			style={style}
		>
			{labelTitle && (
				<ClassicyControlLabel
					label={labelTitle}
					labelFor={id}
					labelSize={labelSize}
					disabled={labelDisabled ?? disabled}
				/>
			)}
			<div className="classicyFileInputBody">
				<input
					id={id}
					ref={inputRef}
					type="file"
					accept={accept}
					multiple={multiple}
					disabled={disabled}
					className="classicyFileInputNative"
					onChange={handleChange}
				/>
				<ClassicyButton
					disabled={disabled}
					onClickFunc={() => inputRef.current?.click()}
				>
					{multiple ? "Choose Files…" : "Choose File…"}
				</ClassicyButton>
				{error && (
					<span
						role="alert"
						className={classNames(
							"classicyFileInputMessage",
							classicyStateClasses({ error: true }),
						)}
					>
						{error}
					</span>
				)}
				{entries.length > 0 && (
					<ul className="classicyFileInputList">
						{entries.map((entry) => (
							<li key={entry.id} className="classicyFileInputItem">
								<span>{entry.file.name}</span>
								<ClassicyButton
									buttonSize="small"
									disabled={disabled}
									onClickFunc={() => handleRemove(entry.id)}
									aria-label={`Remove ${entry.file.name}`}
								>
									<span
										className="classicyFileInputRemoveGlyph"
										aria-hidden={true}
									/>
								</ClassicyButton>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	);
});
