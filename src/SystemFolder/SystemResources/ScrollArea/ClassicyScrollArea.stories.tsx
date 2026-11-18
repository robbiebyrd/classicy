import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useEffect, useRef } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import { ClassicyScrollArea } from "./ClassicyScrollArea";

const meta = {
	title: "Controls/ScrollArea",
	component: ClassicyScrollArea,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyScrollArea>;

export default meta;
// The stories draw the areas themselves in `render` and ignore the args.
type Story = StoryObj<typeof ClassicyScrollArea>;

const captionStyle = {
	margin: "0 0 4px",
	fontFamily: "var(--body-font), sans-serif",
	fontSize: "var(--body-font-size)",
} as const;

/** Content exactly `width` x `height`, lined so scrolling shows. */
const Sheet = ({ width, height }: { width: number; height: number }) => (
	<div
		style={{
			width,
			height,
			padding: 8,
			boxSizing: "border-box",
			overflow: "hidden",
			whiteSpace: "nowrap",
			fontFamily: "var(--body-font), sans-serif",
			fontSize: "var(--body-font-size)",
		}}
	>
		{Array.from({ length: Math.floor(height / 16) - 1 }, (_, i) => (
			// biome-ignore lint/suspicious/noArrayIndexKey: static filler rows
			<div key={i}>{`Line ${i + 1}. `.repeat(6)}</div>
		))}
	</div>
);

/** One labeled area, scrolled to the middle of its content when asked. */
function Area({
	caption,
	middle = false,
	...props
}: ComponentProps<typeof ClassicyScrollArea> & {
	caption: string;
	middle?: boolean;
}) {
	const viewport = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const el = viewport.current;
		if (!middle || !el) return;
		el.scrollTop = (el.scrollHeight - el.clientHeight) / 2;
		el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
	}, [middle]);
	return (
		<div>
			<p style={captionStyle}>{caption}</p>
			<ClassicyScrollArea
				viewportRef={viewport}
				style={{ width: 200, height: 120 }}
				{...props}
			/>
		</div>
	);
}

/**
 * Every state a package draws, in one window: both bars and their corner,
 * one bar, `fits` (bars kept with `"always"` though nothing overflows: no
 * thumb) and `inactive` (as in a window behind the active one).
 */
const States = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<ClassicyWindow
			id="scroll-areas"
			appId="storybook.app"
			title="Scroll Areas"
			initialSize={[470, 340]}
			initialPosition={[40, 40]}
			scrollable={false}
		>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "auto auto",
					gap: 16,
					padding: 12,
				}}
			>
				<Area caption="Both bars, scrolled halfway" middle>
					<Sheet width={420} height={320} />
				</Area>
				<Area caption="One bar">
					<Sheet width={180} height={320} />
				</Area>
				<Area caption="Fits" vertical="always" horizontal="always">
					<Sheet width={150} height={80} />
				</Area>
				<Area caption="Inactive" inactive middle>
					<Sheet width={420} height={320} />
				</Area>
			</div>
		</ClassicyWindow>
	</StoryApp>
);

export const Default: Story = { render: () => <States /> };

/** Turns Smart Scrolling off for the story: the arrows at either end. */
function SplitArrowsScene() {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopSetSmartScrolling",
			smartScrolling: false,
		});
	}, [dispatch]);
	return <States />;
}

/**
 * The same areas with Smart Scrolling off (the Appearance Manager's Themes
 * tab): each bar's arrows split to its ends, as the browser drew them.
 */
export const SplitArrows: Story = { render: () => <SplitArrowsScene /> };
