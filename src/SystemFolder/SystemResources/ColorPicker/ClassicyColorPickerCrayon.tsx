import classNames from "classnames";
import { type CSSProperties, type FC, useState } from "react";
import { classicyStateClasses } from "@/Appearance/vocabulary/ClassicyVocabulary";
import { intToHex } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyColors";
import type { ClassicyCrayon } from "./ClassicyColorPickerCrayons";

interface ClassicyColorPickerCrayonProps {
	color: number;
	crayons: ClassicyCrayon[];
	onChangeFunc: (color: number) => void;
	/** Extra class names, merged onto the root element after the component's own. */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

// Sixteen across: the stock 64-crayon box is four full rows, which fits the
// dialog's fixed panel. The stylesheet sizes each crayon from the box width
// (`--cp-crayon-cols`), so the count is also what sets the crayon size.
const COLS = 16;

// The crayon's shading tints, read from custom properties the Appearance
// Package declares on its root (inline SVG inherits them). As `style`, not
// presentation attributes, which do not reliably resolve `var()`.
const tint = (name: string): string =>
	`var(--classicy-color-picker-crayon-${name})`;

// Crayon SVG: pointed tip with faceted shading + body with label band.
// The body is mostly hidden behind the row in front; only the tip stays visible.
// Sized by the stylesheet (1:3); the 36 × 96 artwork is stretched to fill it.
const CrayonSVG: FC<{ fill: string }> = ({ fill }) => (
	<svg
		aria-hidden="true"
		focusable="false"
		viewBox="0 0 36 96"
		preserveAspectRatio="none"
		xmlns="http://www.w3.org/2000/svg"
	>
		{/* Tip base fill */}
		<polygon
			points="18,1 5,28 31,28"
			fill={fill}
			style={{ stroke: tint("outline") }}
			strokeWidth="1"
		/>
		{/* Left highlight facet */}
		<polygon points="18,1 5,28 18,28" style={{ fill: tint("facet-light") }} />
		{/* Right shadow facet */}
		<polygon points="18,1 31,28 18,28" style={{ fill: tint("facet-dark") }} />
		{/* Body */}
		<rect x="5" y="28" width="26" height="60" fill={fill} />
		{/* Left shadow strip */}
		<rect
			x="5"
			y="28"
			width="4"
			height="60"
			style={{ fill: tint("strip-dark") }}
		/>
		{/* Right highlight strip */}
		<rect
			x="27"
			y="28"
			width="4"
			height="60"
			style={{ fill: tint("strip-light") }}
		/>
		{/* Center gloss */}
		<rect x="16" y="28" width="5" height="58" style={{ fill: tint("gloss") }} />
		{/* Label band */}
		<rect x="5" y="64" width="26" height="14" style={{ fill: tint("band") }} />
		{/* Label lines */}
		<rect
			x="8"
			y="67"
			width="20"
			height="1.5"
			style={{ fill: tint("line-1") }}
		/>
		<rect
			x="8"
			y="72"
			width="14"
			height="1.5"
			style={{ fill: tint("line-2") }}
		/>
		{/* Bottom flat end */}
		<rect
			x="5"
			y="86"
			width="26"
			height="8"
			fill={fill}
			style={{ stroke: tint("end-outline") }}
			strokeWidth="0.75"
		/>
	</svg>
);

export const ClassicyColorPickerCrayon: FC<ClassicyColorPickerCrayonProps> = ({
	color,
	crayons,
	onChangeFunc,
	className,
	style,
}) => {
	const [hovered, setHovered] = useState<number | null>(null);
	const previewColor = hovered !== null ? hovered : color;

	const rows: ClassicyCrayon[][] = [];
	for (let i = 0; i < crayons.length; i += COLS) {
		rows.push(crayons.slice(i, i + COLS));
	}

	return (
		<div
			className={classNames("classicyColorPickerCrayonTab", className)}
			style={style}
		>
			<div
				className="classicyColorPickerCrayonBox"
				role="listbox"
				aria-label="Crayon colors"
			>
				<div
					className="classicyColorPickerCrayonRows"
					style={{ "--cp-crayon-cols": COLS } as CSSProperties}
				>
					{rows.map((row) => (
						<div key={row[0].color} className="classicyColorPickerCrayonRow">
							{row.map((crayon) => (
								<button
									key={crayon.color}
									type="button"
									role="option"
									aria-selected={crayon.color === color}
									aria-label={crayon.name}
									title={crayon.name}
									className={classNames(
										"classicyColorPickerCrayon",
										classicyStateClasses({ selected: crayon.color === color }),
									)}
									onClick={() => onChangeFunc(crayon.color)}
									onMouseEnter={() => setHovered(crayon.color)}
									onMouseLeave={() => setHovered(null)}
								>
									<CrayonSVG fill={intToHex(crayon.color)} />
								</button>
							))}
						</div>
					))}
				</div>
				<div className="classicyColorPickerCrayonBoxLip" />
			</div>
			<div
				className="classicyColorPickerCrayonPreviewStrip"
				style={
					{
						"--classicy-preview-color": intToHex(previewColor),
					} as CSSProperties
				}
				role="img"
				aria-label={`Preview: ${intToHex(previewColor)}`}
			/>
		</div>
	);
};
