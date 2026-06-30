// src/SystemFolder/SystemResources/FileInput/ClassicyFileInput.tsx
import "./ClassicyFileInput.scss";
import classNames from "classnames";
import {
    type ChangeEvent,
    type FC as FunctionalComponent,
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

export const ClassicyFileInput: FunctionalComponent<ClassicyFileInputProps> = forwardRef<
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
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const tryAdd = useCallback(
        (currentFiles: File[], incoming: File[]): File[] | null => {
            const combined = [...currentFiles, ...incoming];
            if (maxFiles !== undefined && combined.length > maxFiles) {
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
            return combined;
        },
        [maxFiles, maxFileSizeMb],
    );

    const addFiles = useCallback(
        (incoming: File[]) => {
            setError(null);
            const next = tryAdd(files, incoming);
            if (next === null) return;
            setFiles(next);
            onChangeFunc?.(next);
        },
        [files, tryAdd, onChangeFunc],
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
        (name: string) => {
            const updated = files.filter((f) => f.name !== name);
            setFiles(updated);
            onChangeFunc?.(updated);
        },
        [files, onChangeFunc],
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
                    <span className="classicyFileInputError">{error}</span>
                )}
                {files.length > 0 && (
                    <ul className="classicyFileInputList">
                        {files.map((f) => (
                            <li key={f.name} className="classicyFileInputItem">
                                <span>{f.name}</span>
                                <ClassicyButton
                                    buttonSize="small"
                                    disabled={disabled}
                                    onClickFunc={() => handleRemove(f.name)}
                                    aria-label={`Remove ${f.name}`}
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
