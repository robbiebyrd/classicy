import { desktopParameters, SB_ICON } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopIcon } from "./ClassicyDesktopIcon";

const meta = {
	title: "Desktop/DesktopIcon",
	component: ClassicyDesktopIcon,
	parameters: desktopParameters,
} satisfies Meta<typeof ClassicyDesktopIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

const AddIcon = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "app",
		});
	}, [dispatch]);
	return null;
};

export const Default: Story = {
	render: () => <AddIcon />,
};
