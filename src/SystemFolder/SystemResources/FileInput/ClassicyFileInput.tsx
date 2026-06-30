// src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx
import "./ClassicyFileInput.scss";
import classNames from "classnames";
import {
    type ChangeEvent,
    forwardRef,
    useCallback,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import {
    ClassicyControlLabel,
    type ClassicyControlLabelSize,
    type ClassicyLabelPosition,
    labelPositionClass,
} from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";

export interface ClassicyFileInputHandle {
    addFiles: (incoming: File[]) => void;
}

interface ClassicyFileInputProps {
    id: string;
    accept?: string;
    multiple?: boolean;
    maxFiles?: number;
    maxFileSizeMb?: number;
    disabled?: boolean;
    labelTitle?: string;
    labelPosition?: ClassicyLabelPosition;
    labelSize?: ClassicyControlLabelSize;
    labelDisabled?: boolean;
    onChangeFunc?: (files: File[]) => void;
}

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
            )}
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
                    <span role="alert" className="classicyFileInputError">{error}</span>
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
                                    ✕
                                </ClassicyButton>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
});
