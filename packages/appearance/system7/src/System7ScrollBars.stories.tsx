// System 7's scroll bars under each of its two themes (plan 0018-dbd §3.6).
// The window stories place their windows where the matching System 7.5
// reference capture has them (docs/system7-reference-screenshots.md, the
// captures 640x480 framebuffers at 1x), so a bar's shot and its reference
// compare region for region. A pressed arrow is held with the pointer, and
// the drag outline follows it: no story can hold either.
import {
	ClassicyListBox,
	ClassicyScrollArea,
	ClassicyWindow,
	useAppManagerDispatch,
} from "@classicy/classicy";
import { StoryApp } from "@sb/helpers";
import { system7Parameters } from "@sb/system7";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, type ReactNode, useEffect, useRef } from "react";

const meta = {
	title: "Appearance/System 7 Scroll Bars",
	parameters: system7Parameters,
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Activates one of the package's themes once the desktop has mounted. */
function WithTheme({ id, children }: { id: string; children: ReactNode }) {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({ type: "ClassicyDesktopChangeTheme", activeTheme: id });
	}, [dispatch, id]);
	return children;
}

/** The color theme's story of a scene (the black-and-white one is the defaults'). */
const inColor = (scene: () => ReactNode): Story => ({
	render: () => <WithTheme id="system7-color">{scene()}</WithTheme>,
});

/** A window of the Storybook app. */
const Window = (
	props: Omit<ComponentProps<typeof ClassicyWindow>, "appId">,
) => <ClassicyWindow appId="storybook.app" {...props} />;

const textStyle = {
	fontFamily: "var(--body-font), sans-serif",
	fontSize: "var(--body-font-size)",
} as const;

/**
 * A window's contents `width` x `height`, scrolled down `scrolledDown`
 * pixels once laid out (the window's viewport is their parent).
 */
function Sheet({
	width,
	height,
	scrolledDown = 0,
}: {
	width: number;
	height: number;
	scrolledDown?: number;
}) {
	const ref = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const viewport = ref.current?.closest(".classicyScrollAreaViewport");
		if (viewport) viewport.scrollTop = scrolledDown;
	}, [scrolledDown]);
	return (
		<div
			ref={ref}
			style={{
				...textStyle,
				width,
				height,
				padding: 8,
				boxSizing: "border-box",
			}}
		>
			A sheet {width} pixels wide and {height} tall.
		</div>
	);
}

const header = (
	<div style={{ display: "flex", gap: "2em", padding: "0 1em" }}>
		<span>Name</span>
		<span>Size</span>
		<span>Kind</span>
	</div>
);

/**
 * The Finder's list window, its contents overflowing both ways: both bars
 * active, each box at the start of its track. Where
 * `*-finder-list-scrollable-active.png` has the System Folder window.
 */
const list = (scrolledDown = 0) => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="system-folder"
			title="System Folder"
			initialSize={[357, 262]}
			initialPosition={[7, 27]}
			header={header}
		>
			<Sheet width={600} height={400} scrolledDown={scrolledDown} />
		</Window>
	</StoryApp>
);

export const List: Story = { render: () => list() };
export const ListColor = inColor(() => list());

/**
 * The same window scrolled down its 191 pixels, the box where
 * `*-finder-list-scrollable-active-2.png` has it on its 179-pixel track (the
 * scroll times its 163 pixels of travel over 191, truncated): 38 pixels put
 * it 32 down, as the 1-bit capture has it, and 72 put it 61 down, as the
 * color one has it.
 */
export const Scrolled: Story = { render: () => list(38) };
export const ScrolledColor = inColor(() => list(72));

/**
 * A document window whose contents are wider than the window but not as
 * tall: the vertical bar has nothing to scroll ("fits": hollow arrows, a
 * plain track, no box). Where `*-finder-window-fits-active.png` has the
 * Macintosh HD window, whose bars both fit.
 */
const fits = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="hd"
			title="Macintosh HD"
			initialSize={[379, 215]}
			initialPosition={[47, 81]}
			header={header}
		>
			<Sheet width={700} height={120} />
		</Window>
	</StoryApp>
);

export const Fits: Story = { render: fits };
export const FitsColor = inColor(fits);

/**
 * The list window inactive behind the Macintosh HD window: its bars are
 * outlines alone (HIG p.160). Where `*-finder-list-scrollable-inactive.png`
 * has the two windows.
 */
const inactive = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="system-folder"
			title="System Folder"
			initialSize={[357, 262]}
			initialPosition={[7, 27]}
			header={header}
		>
			<Sheet width={600} height={400} />
		</Window>
		<Window
			id="hd"
			title="Macintosh HD"
			initialSize={[379, 215]}
			initialPosition={[47, 81]}
			header={header}
		>
			<Sheet width={200} height={100} />
		</Window>
	</StoryApp>
);

export const Inactive: Story = { render: inactive };
export const InactiveColor = inColor(inactive);

/**
 * One labeled area, scrolled to the middle of its content when asked. It
 * mirrors `Area` in the core's `ClassicyScrollArea.stories.tsx` (whose
 * states `areas` below repeats): the import boundary keeps this package from
 * importing the core's source, so the two are copies, and a change to one
 * belongs in the other.
 */
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
			<p style={{ ...textStyle, margin: "0 0 4px" }}>{caption}</p>
			<ClassicyScrollArea
				viewportRef={viewport}
				style={{ width: 200, height: 120 }}
				{...props}
			/>
		</div>
	);
}

const big = <div style={{ ...textStyle, width: 420, height: 320 }} />;

const files = Array.from({ length: 12 }, (_, i) => ({
	value: `item-${i + 1}`,
	label: `Item ${i + 1}`,
}));

/**
 * Scroll areas outside a window's own bars (Controls/ScrollArea's states):
 * both bars and their corner, one bar, `fits` and `inactive`, and a list
 * whose bar shares its frame. System 7's arrows are always at the bar's two
 * ends.
 */
const areas = () => (
	<StoryApp id="storybook.app" name="Storybook">
		<Window
			id="scroll-areas"
			title="Scroll Areas"
			initialSize={[470, 470]}
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
					{big}
				</Area>
				<Area caption="One bar">
					<div style={{ width: 180, height: 320 }} />
				</Area>
				<Area caption="Fits" vertical="always" horizontal="always">
					<div style={{ width: 150, height: 80 }} />
				</Area>
				<Area caption="Inactive" inactive middle>
					{big}
				</Area>
				<div style={{ width: 200 }}>
					<ClassicyListBox
						id="files"
						label="List"
						labelPosition="above"
						options={files}
						visibleRows={6}
					/>
				</div>
			</div>
		</Window>
	</StoryApp>
);

export const ScrollAreas: Story = { render: areas };
export const ScrollAreasColor = inColor(areas);
