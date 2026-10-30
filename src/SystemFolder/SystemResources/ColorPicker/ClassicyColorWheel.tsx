import classNames from "classnames";
import {
	type CSSProperties,
	type FC,
	type PointerEvent,
	useEffect,
	useRef,
} from "react";
import { useActiveClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import { hlsToRgb, hsvToRgb } from "./ClassicyColorPickerUtils";

interface ClassicyColorWheelProps {
	hue: number;
	saturation: number;
	brightness: number;
	mode: "hsv" | "hls";
	size?: number;
	onChangeFunc: (h: number, s: number) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

export const ClassicyColorWheel: FC<ClassicyColorWheelProps> = ({
	hue,
	saturation,
	brightness,
	mode,
	size = 200,
	onChangeFunc,
	className,
	style,
}) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const dragging = useRef(false);
	// The crosshair color is read from the package's stylesheet, so a package
	// switch must redraw the wheel even though no prop changed.
	const packageId = useActiveClassicyAppearancePackage().id;

	// biome-ignore lint/correctness/useExhaustiveDependencies: packageId is not read in the effect; it re-reads --classicy-color-picker-crosshair when the active package changes
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const radius = size / 2;
		const imageData = ctx.createImageData(size, size);
		const { data } = imageData;

		for (let py = 0; py < size; py++) {
			for (let px = 0; px < size; px++) {
				const dx = px - radius,
					dy = py - radius;
				const dist = Math.sqrt(dx * dx + dy * dy);
				const idx = (py * size + px) * 4;

				if (dist > radius) {
					data[idx + 3] = 0;
					continue;
				}

				let angle = Math.atan2(dy, dx) * (180 / Math.PI);
				if (angle < 0) angle += 360;
				const s = (dist / radius) * 100;

				const { r, g, b } =
					mode === "hsv"
						? hsvToRgb(angle, s, brightness)
						: hlsToRgb(angle, brightness, s);

				data[idx] = r;
				data[idx + 1] = g;
				data[idx + 2] = b;
				data[idx + 3] = 255;
			}
		}

		ctx.putImageData(imageData, 0, 0);

		// Draw crosshair at current hue / saturation, inverted against the wheel color beneath it
		const rad = hue * (Math.PI / 180);
		const r = (saturation / 100) * radius;
		const cx = radius + r * Math.cos(rad);
		const cy = radius + r * Math.sin(rad);
		const ARM = 7;

		// The crosshair color is the Appearance Package's (declared on its root).
		const crosshair =
			getComputedStyle(canvas)
				.getPropertyValue("--classicy-color-picker-crosshair")
				.trim() || "#ffffff";

		ctx.save();
		ctx.globalCompositeOperation = "difference";
		ctx.strokeStyle = crosshair;
		ctx.lineWidth = 1.5;
		ctx.beginPath();
		ctx.moveTo(cx - ARM, cy);
		ctx.lineTo(cx + ARM, cy);
		ctx.moveTo(cx, cy - ARM);
		ctx.lineTo(cx, cy + ARM);
		ctx.stroke();
		ctx.restore();
	}, [size, hue, saturation, brightness, mode, packageId]);

	// In rendered pixels, not bitmap pixels: the canvas is `size` square but
	// the stylesheet scales it to the room the panel has, so the radius is
	// whatever it is on screen.
	const hitTest = (
		e: PointerEvent<HTMLCanvasElement>,
	): { h: number; s: number } | null => {
		const canvas = canvasRef.current;
		if (!canvas) return null;
		const rect = canvas.getBoundingClientRect();
		const radius = rect.width / 2;
		if (radius <= 0) return null;
		const dx = e.clientX - rect.left - radius;
		const dy = e.clientY - rect.top - radius;
		const dist = Math.min(Math.sqrt(dx * dx + dy * dy), radius);
		let angle = Math.atan2(dy, dx) * (180 / Math.PI);
		if (angle < 0) angle += 360;
		return { h: Math.round(angle), s: Math.round((dist / radius) * 100) };
	};

	const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
		dragging.current = true;
		// Optional-called: jsdom has no pointer capture.
		(e.target as HTMLCanvasElement).setPointerCapture?.(e.pointerId);
		const hs = hitTest(e);
		if (hs) onChangeFunc(hs.h, hs.s);
	};

	const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
		if (!dragging.current) return;
		const hs = hitTest(e);
		if (hs) onChangeFunc(hs.h, hs.s);
	};

	const onPointerUp = () => {
		dragging.current = false;
	};

	return (
		<canvas
			ref={canvasRef}
			width={size}
			height={size}
			className={classNames("classicyColorPickerWheelCanvas", className)}
			style={style}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerUp}
		/>
	);
};
