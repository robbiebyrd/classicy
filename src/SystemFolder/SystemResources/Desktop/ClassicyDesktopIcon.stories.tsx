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

const AddIconWithBalloonHelp = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "app_shortcut",
			balloonHelp: {
				title: "Storybook",
				content: "Rest the pointer here to see balloon help.",
				delay: 300,
			},
		});
	}, [dispatch]);
	return null;
};

export const WithBalloonHelp: Story = {
	render: () => <AddIconWithBalloonHelp />,
};

const AddAliasIcon = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({
			type: "ClassicyDesktopIconAdd",
			app: { id: "storybook.app", name: "Storybook", icon: SB_ICON },
			kind: "app_shortcut",
		});
	}, [dispatch]);
	return null;
};

export const Alias: Story = {
	render: () => <AddAliasIcon />,
};
