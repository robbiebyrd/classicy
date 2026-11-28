import type { CSSProperties, FC as FunctionalComponent } from "react";
import { useRef } from "react";
import {
	useWindows98Saver,
	type Windows98SaverSetup,
} from "./useWindows98Saver";
import { windows98SaverClassNames } from "./windows98SaverClassNames";

type Windows98SaverCanvasProps = {
	/** The saver's own root class (`classicySaverFlyingWindows`). */
	rootClass: string;
	/** A host's extra classes, after the root's. */
	className?: string;
	/** A host's inline style, after the root's. */
	style?: CSSProperties;
	/** How the saver runs (useWindows98Saver). */
	setup: Windows98SaverSetup;
	/** The saver's options, serialized: a change starts it over. */
	optionsKey: string;
};

/**
 * A Windows 98 saver's root, filling the overlay, with the canvas it draws
 * on (`classicySaverWindows98Canvas`, laid over the root and drawn whole
 * pixels by the package's stylesheet).
 */
export const Windows98SaverCanvas: FunctionalComponent<
	Windows98SaverCanvasProps
> = ({ rootClass, className, style, setup, optionsKey }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	useWindows98Saver(canvasRef, setup, optionsKey);
	return (
		<div
			className={windows98SaverClassNames(rootClass, className)}
			style={style}
		>
			<canvas ref={canvasRef} className="classicySaverWindows98Canvas" />
		</div>
	);
};
