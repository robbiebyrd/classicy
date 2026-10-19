import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect, useState } from "react";
import { fn } from "storybook/test";
import { ClassicyImageWell } from "./ClassicyImageWell";

// Inline SVG data URI — no binary asset needed.
const sampleImage =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='48' height='48'%3E%3Crect width='48' height='48' fill='%23cccccc'/%3E%3Ccircle cx='24' cy='24' r='14' fill='%234a90d9'/%3E%3C/svg%3E";

const meta = {
	title: "Controls/ImageWell",
	component: ClassicyImageWell,
	args: {
		src: sampleImage,
		alt: "Sample picture",
	},
} satisfies Meta<typeof ClassicyImageWell>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An enabled well displaying an image in its recessed frame. */
export const Enabled: Story = {};

/** `selected` draws the accent frame around the well. */
export const Selected: Story = {
	args: { selected: true },
};

/** `enabled={false}` dims the well; it also stops accepting drops. */
export const Disabled: Story = {
	args: { enabled: false },
};

/**
 * An empty drop target: with `onDrop` set, dragging files over the well
 * highlights it, and the dropped `FileList` is logged in the Actions panel.
 */
export const DropTarget: Story = {
	args: {
		src: undefined,
		children: "Drop an image here",
		onDrop: fn(),
	},
};

/**
 * The well does not load what is dropped on it: this story turns the first
 * dropped image into an object URL and feeds it back as `src`.
 */
export const DropToReplace: Story = {
	args: { label: "Picture", onDrop: fn() },
	render: (args) => {
		const [url, setUrl] = useState<string | undefined>(undefined);
		useEffect(
			() => () => {
				if (url) URL.revokeObjectURL(url);
			},
			[url],
		);
		return (
			<ClassicyImageWell
				{...args}
				src={url ?? args.src}
				onDrop={(files, e) => {
					args.onDrop?.(files, e);
					const image = Array.from(files).find((f) =>
						f.type.startsWith("image/"),
					);
					if (image) setUrl(URL.createObjectURL(image));
				}}
			/>
		);
	},
};
