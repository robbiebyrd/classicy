import { desktopParameters } from "@sb/helpers";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { useEffect } from "react";
import { fn } from "storybook/test";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyFindResult,
	registerClassicyFindSource,
} from "@/SystemFolder/FindFile/ClassicyFindSources";
import { FindFile } from "./FindFile";

const meta = {
	title: "Desktop/FindFile",
	component: FindFile,
	parameters: desktopParameters,
} satisfies Meta<typeof FindFile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens Find File, as the Finder's File ▸ Find… (⌥F) does. */
const OpenFindFile = () => {
	const dispatch = useAppManagerDispatch();
	useEffect(() => {
		dispatch({ type: "ClassicyAppFindFileShowFind" });
	}, [dispatch]);
	return null;
};

/**
 * Find File, Mac OS 8.1's: "Find items [on local disks] whose [name]
 * [contains] […]". Type part of a name (try "read") and press Return: Items
 * Found lists what matched, with the path pane under it. More Choices adds a
 * row (size, kind, label, dates, version, comments, lock, folder attribute,
 * file type, creator; Option-click the first pop-up for visibility and
 * name/icon lock). Open Item (⌥O) opens a result as the Finder would; Open
 * Enclosing Folder (⌥E) shows it selected in its Finder window. (The
 * decorator's desktop mounts Find File; this story only opens it.)
 */
export const Default: Story = {
	render: () => <OpenFindFile />,
};

const PLANETS = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn"];

/** A search source a site would register: here, a list searched after a short wait. */
const WithSource = () => {
	useEffect(
		() =>
			registerClassicyFindSource({
				id: "storybook-planets",
				name: "Planets",
				search: (query, { signal }) =>
					new Promise<ClassicyFindResult[]>((resolve, reject) => {
						const timer = setTimeout(
							() =>
								resolve(
									PLANETS.filter((p) =>
										p.toLowerCase().includes(query.trim().toLowerCase()),
									).map((name) => ({
										name,
										kind: "planet",
										// Logged in the Actions panel.
										open: fn().mockName(`open ${name}`),
									})),
								),
							300,
						);
						signal.addEventListener("abort", () => {
							clearTimeout(timer);
							reject(signal.reason);
						});
					}),
			}),
		[],
	);
	return <OpenFindFile />;
};

/**
 * With a search source registered (`registerClassicyFindSource`), Find File
 * gains Sherlock's Search Internet tab (Mac OS 8.5): type words (try "ur"),
 * leave the channel on, and press Search. A new search, or Stop, aborts the
 * one running.
 */
export const WithSearchSource: Story = {
	render: () => <WithSource />,
};
