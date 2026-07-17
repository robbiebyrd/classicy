import "./ClassicyImageWell.scss";
import classNames from "classnames";
import {
	type DragEvent,
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useState,
} from "react";

type ClassicyImageWellProps = PropsWithChildren<{
	/** Image source to display in the well. */
	src?: string;
	/** Alt text for the displayed image. */
	alt?: string;
	/** Whether the well is enabled. Default `true`. */
	enabled?: boolean;
	/** Whether the well is selected (shows an accent frame). */
	selected?: boolean;
	/**
	 * Optional drop handler. Providing it makes the well a drag-and-drop target;
	 * receives the dropped files and the raw drag event.
	 */
	onDrop?: (files: FileList, e: DragEvent<HTMLDivElement>) => void;
	/** Accessible label for the well. */
	label?: string;
}>;

export const ClassicyImageWell: FunctionalComponent<ClassicyImageWellProps> = ({
	src,
	alt = "",
	enabled = true,
	selected = false,
	onDrop,
	label,
	children,
}) => {
	const isDropTarget = enabled && typeof onDrop === "function";
	const [dragOver, setDragOver] = useState(false);

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		if (!isDropTarget) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
		setDragOver(true);
	};

	const handleDragLeave = () => {
		if (!isDropTarget) return;
		setDragOver(false);
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		if (!isDropTarget) return;
		e.preventDefault();
		setDragOver(false);
		onDrop?.(e.dataTransfer.files, e);
	};

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: an image well is a passive display frame that doubles as a mouse-only drag-and-drop target
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-label is valid for the resolved role ("img" or "group"); the role is dynamic so static analysis can't prove it
		<div
			className={classNames("classicyImageWell", {
				classicyImageWellDisabled: !enabled,
				classicyImageWellSelected: selected,
				classicyImageWellDragOver: dragOver,
			})}
			data-state={enabled ? (selected ? "selected" : "enabled") : "disabled"}
			// When an inner <img> carries the image semantics, the frame stays a
			// plain container; with custom children it presents as the image itself.
			role={src ? "group" : "img"}
			aria-label={label || alt || undefined}
			aria-disabled={!enabled || undefined}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
		>
			{src ? (
				<img
					className="classicyImageWellImage"
					src={src}
					alt={alt}
					draggable={false}
				/>
			) : (
				children
			)}
		</div>
	);
};
