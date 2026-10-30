import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import {
	controlStripCollapseGlyph,
	controlStripModuleArrow,
	controlStripScrollLeft,
	controlStripScrollLeftDisabled,
	controlStripScrollRight,
	controlStripScrollRightDisabled,
	controlStripTab,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripArt";
import {
	popUpSliderThumb,
	popUpSliderTrack,
} from "@/SystemFolder/SystemResources/PopUpSlider/ClassicyPopUpSliderArt";
import {
	ClassicyPixelArt,
	type ClassicyPixelArtRows,
} from "./ClassicyPixelArt";

const meta = {
	title: "System/PixelArt",
	component: ClassicyPixelArt,
} satisfies Meta<typeof ClassicyPixelArt>;

export default meta;
type Story = StoryObj<typeof meta>;
// For the stories that draw the component themselves in `render` and ignore
// the args: typed against the component (every arg optional), not
// `typeof meta`, which would demand its required props as story args.
type RenderStory = StoryObj<typeof ClassicyPixelArt>;

/**
 * Scales its children up without resampling, so each art pixel shows as a
 * crisp block. (The SVG uses `crispEdges`; CSS `zoom` keeps layout honest.)
 */
const Magnify = ({ by, children }: { by: number; children: ReactNode }) => (
	<div style={{ zoom: by, lineHeight: 0 }}>{children}</div>
);

const Labelled = ({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) => (
	<figure style={{ margin: 0, textAlign: "center" }}>
		{children}
		<figcaption style={{ marginTop: 6 }}>{label}</figcaption>
	</figure>
);

/**
 * The Control Strip's tab (HIGOS8 Figure 6-15, 17 × 24) at its native size —
 * exactly as the strip draws it. Switch the toolbar theme to watch the
 * greys follow the palette.
 */
export const NativeSize: Story = {
	args: { rows: controlStripTab },
};

/** The same tab magnified 8×, so the individual palette-token pixels show. */
export const Magnified: Story = {
	args: { rows: controlStripTab },
	decorators: [
		(Story) => (
			<Magnify by={8}>
				<Story />
			</Magnify>
		),
	],
};

const controlStripArt: [string, ClassicyPixelArtRows][] = [
	["Collapse box", controlStripCollapseGlyph],
	["Scroll left", controlStripScrollLeft],
	["Scroll left (disabled)", controlStripScrollLeftDisabled],
	["Scroll right", controlStripScrollRight],
	["Scroll right (disabled)", controlStripScrollRightDisabled],
	["Module pop-up arrow", controlStripModuleArrow],
	["Tab", controlStripTab],
];

/**
 * Every Control Strip glyph from `ClassicyControlStripArt`, magnified 4×.
 * The arrows and tab are drawn in black and the system greys; the collapse
 * box also carries a theme accent token (`b`), so it picks up the theme's
 * accent colour.
 */
export const ControlStripGlyphs: RenderStory = {
	render: () => (
		<div style={{ display: "flex", gap: 24, alignItems: "flex-end" }}>
			{controlStripArt.map(([label, rows]) => (
				<Labelled key={label} label={label}>
					<Magnify by={4}>
						<ClassicyPixelArt rows={rows} />
					</Magnify>
				</Labelled>
			))}
		</div>
	),
};

/**
 * The pop-up volume slider's track (10 × 68) and thumb (15 × 10) from
 * HIGOS8 Figure 2-16, as `ClassicyPopUpSlider` layers them, magnified 3×.
 */
export const PopUpSliderArt: RenderStory = {
	render: () => (
		<div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
			<Labelled label="Track">
				<Magnify by={3}>
					<ClassicyPixelArt rows={popUpSliderTrack} />
				</Magnify>
			</Labelled>
			<Labelled label="Thumb">
				<Magnify by={3}>
					<ClassicyPixelArt rows={popUpSliderThumb} />
				</Magnify>
			</Labelled>
		</div>
	),
};

/**
 * Hand-authored art: a beveled square with a black frame, white and
 * system-05 bevel, system-03 face and a centre in the theme accents `b`, `c`
 * and `d`. Every character is a palette token and `.` is transparent; edit
 * the `rows` control to draw your own.
 */
export const CustomArt: Story = {
	args: {
		rows: [
			".KKKKKKKKKK.",
			"KWWWWWWWWW5K",
			"KW333333335K",
			"KW3bbbbbb35K",
			"KW3bccccb35K",
			"KW3bcddcb35K",
			"KW3bcddcb35K",
			"KW3bccccb35K",
			"KW3bbbbbb35K",
			"KW333333335K",
			"K5555555555K",
			".KKKKKKKKKK.",
		],
	},
	decorators: [
		(Story) => (
			<Magnify by={8}>
				<Story />
			</Magnify>
		),
	],
};
