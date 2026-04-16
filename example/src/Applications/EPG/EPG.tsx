import {
	ClassicyApp,
	ClassicyButton,
	ClassicyControlLabel,
	ClassicyIcons,
	ClassicyWindow,
	quitMenuItemHelper,
	useAppManager,
} from "classicy";
import classNames from "classnames";
import type React from "react";
import {
	Fragment,
	type ReactElement,
	useCallback,
	useMemo,
	useState,
} from "react";
import epgStyles from "./EPG.module.scss";
import data from "./testdata.json" with { type: "json" };

interface ClassicyEPGProps {
	minutesPerGrid?: number; // in Minutes
	gridTimeWidth?: number; // in Minutes
	gridWidth?: number; // in Minutes
	gridStart?: Date;
	channelHeaderWidth?: number;
}

export type EPGProgram = {
	title: string;
	description?: string;
	notes?: string;
	start: string;
	end: string;
	icons?: string[];
	selected?: boolean;
};

export type EPGChannel = {
	name: string;
	title?: string;
	number: string;
	callSign: string;
	location: string;
	icon: string;
	grid: EPGProgram[];
};

function roundDownToNearestMinuntes(date: Date, roundMinutes: number) {
	const minutes = date.getMinutes();
	date.setMinutes(minutes - (minutes % roundMinutes), 0, 0);
	return date;
}

export const EPG: React.FC<ClassicyEPGProps> = ({
	minutesPerGrid = 5,
	gridTimeWidth = 30,
	gridWidth = 180,
	gridStart,
	channelHeaderWidth = 5,
}) => {
	const appName = "EPG";
	const appId = "EPG.app";
	const appIcon = ClassicyIcons.applications.epg.app as string;
	const appMenu = useMemo(
		() => [
			{
				id: "file",
				title: "File",
				menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
			},
		],
		[appIcon],
	);

	const desktop = useAppManager();

	const [showSettings, setShowSettings] = useState<boolean>(false);

	const gridData = data as EPGChannel[];

	const { dateTime, timeZoneOffset } = desktop.System.Manager.DateAndTime;
	const initialGridStart =
		gridStart ||
		new Date(
			new Date(dateTime).getTime() + parseInt(timeZoneOffset, 10) * 3600000,
		);
	const [gridStartTime, setGridStartTime] = useState(
		roundDownToNearestMinuntes(initialGridStart, gridTimeWidth),
	);

	const gridEndTime = useMemo(() => {
		const endTime = new Date(gridStartTime);
		endTime.setMinutes(endTime.getMinutes() + gridWidth);
		return endTime;
	}, [gridStartTime, gridWidth]);

	const currentTime = new Date(
		new Date(dateTime).getTime() + parseInt(timeZoneOffset, 10) * 3600000,
	);
	const indicator = Math.floor(
		(currentTime.getTime() - gridStartTime.getTime()) /
			(1000 * 60 * minutesPerGrid),
	);

	const jumpBack = () => {
		setGridStartTime(new Date(gridStartTime.getTime() - 30 * 60 * 1000));
	};

	const jumpForward = () => {
		setGridStartTime(new Date(gridStartTime.getTime() + 30 * 60 * 1000));
	};

	const jumpToNow = () => {
		const { dateTime, timeZoneOffset } = desktop.System.Manager.DateAndTime;
		const now = new Date(
			new Date(dateTime).getTime() + parseInt(timeZoneOffset, 10) * 3600000,
		);

		setGridStartTime(roundDownToNearestMinuntes(now, gridTimeWidth));
	};

	const getProgramData = useCallback(
		(channel: EPGChannel, channelIndex: number) => {
			return channel.grid.map((gridItem) => {
				const totalGridSlots = gridWidth / minutesPerGrid;

				const itemStart = new Date(gridItem.start);
				const itemEnd = new Date(gridItem.end);
				let gridProgramStart =
					(Date.parse(gridItem.start) - gridStartTime.getTime()) /
					60000 /
					minutesPerGrid;
				let gridProgramEnd =
					(Date.parse(gridItem.end) - Date.parse(gridItem.start)) /
					60000 /
					minutesPerGrid;

				if (gridProgramStart < 0) {
					gridProgramEnd = gridProgramStart + gridProgramEnd;
					gridProgramStart = 0;
				}

				if (gridProgramEnd > gridWidth / minutesPerGrid) {
					gridProgramEnd = totalGridSlots;
				}

				if (
					gridProgramEnd <= 0 ||
					itemStart > gridEndTime ||
					itemEnd < gridStartTime ||
					gridProgramStart + 2 > totalGridSlots
				) {
					return null;
				}

				const { dateTime, timeZoneOffset } = desktop.System.Manager.DateAndTime;
				const currentTime = new Date(
					new Date(dateTime).getTime() + parseInt(timeZoneOffset, 10) * 3600000,
				);
				const highlight = itemStart <= currentTime && itemEnd >= currentTime;

				if (!gridItem) return null;

				return (
					<div
						key={channel.name + gridItem.start + gridItem.end}
						className={classNames(
							epgStyles.epgEntry,
							highlight ? epgStyles.selected : undefined,
						)}
						style={{
							gridRowStart: channelIndex + 2,
							gridColumn: `${gridProgramStart + 2}/ span ${gridProgramEnd}`,
						}}
					>
						<div className={epgStyles.epgEntryTitle}>
							{gridItem.title}
							<div className={epgStyles.epgEntryDescription}>
								{gridItem.description}
							</div>
						</div>
						<div className={epgStyles.epgEntryIcons}>
							{gridItem.icons?.map((icon) => {
								return (
									<img
										key={
											channel.name +
											Date.parse(gridItem.start) +
											Date.parse(gridItem.end) +
											icon
										}
										className={epgStyles.epgEntryIcon}
										src={ClassicyIcons.applications.epg[icon] as string}
										alt={icon}
									/>
								);
							})}
						</div>
					</div>
				);
			});
		},
		[gridWidth, minutesPerGrid, gridStartTime, gridEndTime, desktop],
	);

	const epgHeader = useMemo(() => {
		const headers: ReactElement[] = [
			<div
				key={"column_header_date"}
				className={epgStyles.epgHeaderTime}
				style={{
					gridColumn: `1 / span 1`,
				}}
			>
				{gridStartTime.toLocaleDateString([], {
					month: "numeric",
					day: "numeric",
					year: "numeric",
				})}
			</div>,
		];

		for (
			let i = 1;
			i <= gridWidth / minutesPerGrid;
			i += gridTimeWidth / minutesPerGrid
		) {
			const d = new Date(
				gridStartTime.getTime() + (i - 1) * minutesPerGrid * 60000,
			);
			headers.push(
				<div
					key={d.toLocaleTimeString()}
					className={epgStyles.epgHeaderTime}
					style={{
						gridColumn: `${i + 1} / span ${minutesPerGrid + 1}`,
					}}
				>
					<div className={epgStyles.epgHeaderTimeInner}>
						{d.toLocaleTimeString([], {
							hour: "numeric",
							minute: "2-digit",
						})}
					</div>
				</div>,
			);
		}
		return headers;
	}, [gridStartTime, gridWidth, minutesPerGrid, gridTimeWidth]);

	const epgData = useMemo(() => {
		return gridData.map((channel, channelIndex) => {
			return (
				<Fragment key={`${channel.name}_${channel.number}`}>
					<div
						className={epgStyles.epgChannel}
						style={{
							gridRowStart: channelIndex + 2,
							gridColumnStart: 1,
							gridColumnEnd: 2,
						}}
					>
						<img
							className={epgStyles.epgChannelIcon}
							src={
								ClassicyIcons.applications.epg.channels[channel.icon] as string
							}
							alt={`${channel.number} ${channel.callSign} - ${channel.location}`}
						/>
						{channel.name}
					</div>
					{getProgramData(channel, channelIndex)}
				</Fragment>
			);
		});
	}, [getProgramData]);

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			defaultWindow={`${appId}_main`}
		>
			{showSettings && (
				<ClassicyWindow
					id={`${appId}_settings`}
					title={appName}
					appId={appId}
					closable={false}
					resizable={false}
					zoomable={false}
					scrollable={false}
					collapsable={false}
					initialSize={[200, 100]}
					initialPosition={[100, 100]}
					minimumSize={[200, 100]}
					modal={true}
					hidden={true}
					appMenu={appMenu}
				>
					<div
						style={{
							display: "flex",
							justifyContent: "center",
							flexDirection: "column",
						}}
					>
						<ClassicyControlLabel label={"Nothing Here"}></ClassicyControlLabel>
						<ClassicyButton onClickFunc={() => setShowSettings(!showSettings)}>
							Close
						</ClassicyButton>
					</div>
				</ClassicyWindow>
			)}
			<ClassicyWindow
				id={`${appId}_main`}
				title={appName}
				appId={appId}
				closable={true}
				resizable={true}
				zoomable={true}
				scrollable={true}
				collapsable={true}
				initialSize={[800, 400]}
				initialPosition={[100, 50]}
				minimumSize={[600, 300]}
				modal={false}
				appMenu={appMenu}
			>
				<div
					style={{
						backgroundColor: "var(--color-system-03)",
						height: "100%",
					}}
				>
					<div>
						<ClassicyButton onClickFunc={() => setShowSettings(!showSettings)}>
							Settings
						</ClassicyButton>
						<ClassicyButton onClickFunc={jumpBack}>&lt;&lt;</ClassicyButton>
						<ClassicyButton onClickFunc={jumpToNow}>Now</ClassicyButton>
						<ClassicyButton onClickFunc={jumpForward}>&gt;&gt;</ClassicyButton>
					</div>
					<div
						className={epgStyles.epgHolder}
						style={{ borderTop: "1px solid var(--color-system-07)" }}
					>
						{gridStartTime < currentTime && currentTime < gridEndTime && (
							<div
								className={classNames(
									epgStyles.epgGridSetup,
									epgStyles.epgIndicatorHolder,
								)}
								style={{
									pointerEvents: "none",
									gridTemplateColumns: `${channelHeaderWidth}fr repeat(${gridWidth / minutesPerGrid}, 1fr)`,
								}}
							>
								<div
									className={epgStyles.epgIndicator}
									style={{
										gridColumnStart: indicator + 2,
										gridColumnEnd: indicator + 3,
									}}
								>
									<div className={epgStyles.epgIndicatorCenter}></div>
								</div>
							</div>
						)}
						<div
							className={classNames(epgStyles.epgGridSetup)}
							style={{
								gridTemplateColumns: `${channelHeaderWidth}fr repeat(${gridWidth / minutesPerGrid}, 1fr)`,
								backgroundColor: "var(--color-white)",
								position: "relative",
							}}
						>
							{epgHeader}
						</div>
						<div
							className={classNames([
								epgStyles.epgGridSetup,
								epgStyles.epgGridSetupBorder,
								epgStyles.epgGridAnimatedBackground,
							])}
							style={{
								gridTemplateColumns: `${channelHeaderWidth}fr repeat(${gridWidth / minutesPerGrid}, 1fr)`,
								backgroundImage: `url(${ClassicyIcons.ui.stripe})`,
							}}
						>
							{epgData}
						</div>
					</div>
				</div>
			</ClassicyWindow>
		</ClassicyApp>
	);
};
