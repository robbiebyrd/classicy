import type { Meta, StoryObj } from "@storybook/react-vite";
import { useRef } from "react";
import { fn } from "storybook/test";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import {
	ClassicyFileInput,
	type ClassicyFileInputHandle,
} from "./ClassicyFileInput";

const meta = {
	title: "Controls/FileInput",
	component: ClassicyFileInput,
	args: { onChangeFunc: fn() },
} satisfies Meta<typeof ClassicyFileInput>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A single-file picker: "Choose File…" opens the browser's file dialog. */
export const Default: Story = {
	args: { id: "file-default", labelTitle: "Attachment" },
};

/**
 * Several images, capped at five files of up to 10 MB each. An addition that
 * breaks either limit is refused and reported inline.
 */
export const MultipleImages: Story = {
	args: {
		id: "file-multi",
		labelTitle: "Pictures",
		multiple: true,
		accept: "image/*",
		maxFiles: 5,
		maxFileSizeMb: 10,
	},
};

/**
 * Files added from code through the ref's `addFiles` — how a drop target feeds
 * the list. The same `maxFiles` check applies, so the fourth click is refused.
 */
export const AddFilesFromCode: Story = {
	args: {
		id: "file-handle",
		labelTitle: "Documents",
		multiple: true,
		maxFiles: 3,
	},
	render: (args) => {
		const ref = useRef<ClassicyFileInputHandle>(null);
		const counter = useRef(0);
		const addNote = () => {
			counter.current += 1;
			ref.current?.addFiles([
				new File(["Hello"], `Note ${counter.current}.txt`, {
					type: "text/plain",
				}),
			]);
		};
		return (
			<>
				<ClassicyFileInput {...args} ref={ref} />
				<ClassicyButton onClickFunc={addNote}>Add a Note</ClassicyButton>
			</>
		);
	},
};

/** Disabled: the Choose button is inactive and the label is dimmed. */
export const Disabled: Story = {
	args: { id: "file-disabled", labelTitle: "Attachment", disabled: true },
};
