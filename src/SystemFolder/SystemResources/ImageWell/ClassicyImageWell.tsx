import "./ClassicyImageWell.scss";
import classNames from "classnames";
import {
	type CSSProperties,
	type DragEvent,
	type FC as FunctionalComponent,
	type PropsWithChildren,
	useState,
} from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";

type ClassicyImageWellProps = PropsWithChildren<{
	/** Image source to display in the well. When set, it replaces `children`. */
	src?: string;
	/** Alt text for the displayed image. Defaults to `""`. */
	alt?: string;
	/** Whether the well is enabled; a disabled well is dimmed and ignores drops. Defaults to `true`. */
	enabled?: boolean;
	/** Whether the well is selected (shows an accent frame). Defaults to `false`. */
	selected?: boolean;
	/**
	 * Optional drop handler. Providing it makes the well a drag-and-drop target;
	 * receives the dropped files and the raw drag event.
	 */
	onDrop?: (files: FileList, e: DragEvent<HTMLDivElement>) => void;
	/** Accessible label for the well (falls back to `alt`). Not drawn. */
	label?: string;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}>;

/**
 * The Platinum image well (HIGOS8 Ch.2 "Image Wells", p.47): a 2 px recessed
 * frame with a white fill that displays an image — the droppable-image-slot
 * equivalent of `<img>` (keep a raw `<img>` for plain static pictures). Show
 * `src`, or any custom `children` (a placeholder, an icon) when there is none.
 *
 * Passing `onDrop` turns the well into a drag-and-drop target: it highlights
 * while files are dragged over it and hands them over as a `FileList`. It is
 * not a button — it takes no clicks or keyboard focus — and it does not load
 * the dropped file itself; read it and pass the result back as `src`.
 */
export const ClassicyImageWell: FunctionalComponent<ClassicyImageWellProps> = ({
	src,
	alt = "",
	enabled = true,
	selected = false,
	onDrop,
	label,
	children,
	className,
	style,
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
			className={classNames(
				"classicyImageWell",
				classicyStateClasses({ disabled: !enabled, selected }),
				{ classicyImageWellDragOver: dragOver },
				className,
			)}
			style={style}
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
