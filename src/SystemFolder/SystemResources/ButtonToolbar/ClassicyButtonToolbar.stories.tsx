import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";
import {
	ClassicyButtonToolbar,
	ClassicyButtonToolbarGroup,
} from "./ClassicyButtonToolbar";

const meta = {
	title: "Controls/ButtonToolbar",
	component: ClassicyButtonToolbar,
} satisfies Meta<typeof ClassicyButtonToolbar>;

export default meta;
// Every story here draws the component itself in `render` and ignores the
// args, so the stories are typed against the component (every arg optional),
// not `typeof meta`, which would demand its required props as story args.
type Story = StoryObj<typeof ClassicyButtonToolbar>;

// Use a bundled icon (Vite rewrites the URL against the build base) rather than
// an absolute "/assets/..." path, so the story renders correctly when Storybook
// is served from a sub-path (e.g. a PR preview at /<repo>/pr-preview/pr-N/).
const icon = (): string => resolveClassicyAsset("icons", "system.info") ?? "";

/**
 * One group of icon-only bevel buttons: squared by the toolbar, packed flush,
 * and no divider, since dividers only go between groups.
 */
export const SingleGroup: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon()} iconAlt="Back" />
				<ClassicyBevelButton icon={icon()} iconAlt="Forward" />
				<ClassicyBevelButton icon={icon()} iconAlt="Stop" />
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

/**
 * Three groups with dividers drawn automatically between them. Tab into the
 * toolbar once, then use the arrow keys (wrapping) and Home/End to move
 * between buttons across groups.
 */
export const MultipleGroups: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon()} iconAlt="Back" />
				<ClassicyBevelButton icon={icon()} iconAlt="Forward" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon()} iconAlt="Zoom in" />
				<ClassicyBevelButton icon={icon()} iconAlt="Zoom out" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon()} iconAlt="Settings" />
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

/**
 * Icon-only buttons go square inside a toolbar; buttons with a text label keep
 * their rectangular shape.
 */
export const MixedIconAndText: Story = {
	render: () => (
		<ClassicyButtonToolbar>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton icon={icon()} iconAlt="New" />
				<ClassicyBevelButton icon={icon()} iconAlt="Open" />
			</ClassicyButtonToolbarGroup>
			<ClassicyButtonToolbarGroup>
				<ClassicyBevelButton>Subscribe</ClassicyBevelButton>
				<ClassicyBevelButton>Unsubscribe</ClassicyBevelButton>
			</ClassicyButtonToolbarGroup>
		</ClassicyButtonToolbar>
	),
};

const alignments = ["Left", "Center", "Right"] as const;

/**
 * A toggle group (Bold/Italic) beside a radio group (alignment). A
 * `mode="radio"` bevel button only ever turns itself on — it knows nothing of
 * its siblings — so the group is driven by one shared state value wired to
 * each button's `on`/`onChangeFunc`, just as an HTML radio group needs a
 * shared `name`.
 */
export const ToggleAndRadioGroups: Story = {
	render: function Render() {
		const [alignment, setAlignment] =
			useState<(typeof alignments)[number]>("Left");
		return (
			<ClassicyButtonToolbar>
				<ClassicyButtonToolbarGroup>
					<ClassicyBevelButton mode="toggle" icon={icon()} iconAlt="Bold" />
					<ClassicyBevelButton mode="toggle" icon={icon()} iconAlt="Italic" />
				</ClassicyButtonToolbarGroup>
				<ClassicyButtonToolbarGroup>
					{alignments.map((label) => (
						<ClassicyBevelButton
							key={label}
							mode="radio"
							icon={icon()}
							iconAlt={label}
							on={alignment === label}
							onChangeFunc={() => setAlignment(label)}
						/>
					))}
				</ClassicyButtonToolbarGroup>
			</ClassicyButtonToolbar>
		);
	},
};

/**
 * All three `size`s stacked for comparison. `large` is the default; `medium`
 * and `small` scale every control in the toolbar as a unit.
 */
export const Sizes: Story = {
	render: () => (
		<div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
			{(["large", "medium", "small"] as const).map((size) => (
				<ClassicyButtonToolbar key={size} size={size}>
					<ClassicyButtonToolbarGroup>
						<ClassicyBevelButton icon={icon()} iconAlt="Back" />
						<ClassicyBevelButton icon={icon()} iconAlt="Forward" />
					</ClassicyButtonToolbarGroup>
					<ClassicyButtonToolbarGroup>
						<ClassicyBevelButton>Subscribe</ClassicyBevelButton>
					</ClassicyButtonToolbarGroup>
				</ClassicyButtonToolbar>
			))}
		</div>
	),
};
