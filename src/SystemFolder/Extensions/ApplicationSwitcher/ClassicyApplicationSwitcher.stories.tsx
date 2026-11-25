import { desktopParameters, StoryApp } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { type FC, useEffect } from "react";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	APPLICATION_SWITCHER_CLOSE,
	APPLICATION_SWITCHER_SET_PALETTE,
	APPLICATION_SWITCHER_TEAR_OFF,
	type ClassicyApplicationSwitcherData,
} from "./ClassicyApplicationSwitcherContext";

/**
 * The Application Switcher (Mac OS 8.5), which the desktop mounts: drag past
 * the bottom of the Application menu and let go to tear it off into this
 * palette; click a button to switch, Option-click to switch and hide the
 * application in front. The zoom box shows or hides the names, Option-click
 * on it switches the icon size, Option-Shift-click the orientation.
 * Control-` switches to the next application, Control-Shift-` to the
 * previous one.
 */
const meta = {
	title: "Desktop/Application Switcher",
	// An object literal with a `docs` literal: Storybook writes the comment
	// above into `parameters.docs.description`, and a `parameters` or a
	// `docs` that is not a literal is replaced, not merged
	// (StoryMetaParameters.repo.test.ts).
	parameters: { ...desktopParameters, docs: { ...desktopParameters.docs } },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const TWO = ["Notes", "Calendar"];
const MANY = [
	"Address Book",
	"Calendar",
	"Graphing Calculator",
	"Mail",
	"Notes",
	"Scrapbook",
	"Stickies",
];

/** Opens `apps` beside the Finder, then shows the palette with `options`. */
const Torn: FC<{
	options?: Pick<
		ClassicyApplicationSwitcherData,
		"showNames" | "iconSize" | "orientation"
	>;
	apps?: string[];
}> = ({ options, apps = TWO }) => {
	const dispatch = useAppManagerDispatch();
	// By value, so a re-render with an equal literal changes nothing.
	const optionsKey = JSON.stringify(options ?? {});
	useEffect(() => {
		const timer = window.setTimeout(() => {
			dispatch({
				type: APPLICATION_SWITCHER_SET_PALETTE,
				showNames: true,
				iconSize: "small",
				orientation: "vertical",
				...JSON.parse(optionsKey),
			});
			dispatch({ type: APPLICATION_SWITCHER_TEAR_OFF, position: [420, 120] });
		}, 300);
		return () => {
			window.clearTimeout(timer);
			dispatch({ type: APPLICATION_SWITCHER_CLOSE });
		};
	}, [dispatch, optionsKey]);
	return (
		<>
			{apps.map((name) => (
				<StoryApp
					key={name}
					id={`storybook.${name.toLowerCase().replace(/\s+/g, "-")}.app`}
					name={name}
				/>
			))}
		</>
	);
};

/** The palette as it tears off: names and small icons, down a column. */
export const Palette: Story = { render: () => <Torn /> };

/** The zoom box clicked: icons alone. */
export const IconsOnly: Story = {
	render: () => <Torn options={{ showNames: false }} />,
};

/** Option-click on the zoom box: large icons. */
export const LargeIcons: Story = {
	render: () => <Torn options={{ showNames: false, iconSize: "large" }} />,
};

/** Option-Shift-click on the zoom box: across, the drag bar down the side. */
export const Horizontal: Story = {
	render: () => (
		<Torn options={{ iconSize: "large", orientation: "horizontal" }} />
	),
};

/**
 * More applications than a short or narrow desktop holds in one line: the
 * palette wraps into another column (another row, across), by what the
 * desktop can hold. `bin/check-app-switcher-palette.ts` checks the count,
 * and that it settles, in a browser.
 */
export const ManyApplications: Story = {
	render: () => <Torn options={{ iconSize: "large" }} apps={MANY} />,
};
