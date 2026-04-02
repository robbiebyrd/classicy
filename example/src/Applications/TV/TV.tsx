import {
	ClassicyApp,
	ClassicyButton,
	ClassicyControlLabel,
	ClassicyIcons,
	ClassicyWindow,
	quitMenuItemHelper,
} from "classicy";
import type React from "react";
import { useState } from "react";
import ReactPlayer from "react-player";
import styles from "./TV.module.scss";
import data from "./testdata.json" with { type: "json" };

type ClassicyTVProps = Record<string, never>;

export const TV: React.FC<ClassicyTVProps> = () => {
	const appName = "TV";
	const appId = "TV.app";
	const appIcon = ClassicyIcons.applications.epg.app as string;

	const [showSettings, setShowSettings] = useState<boolean>(false);
	const [activePlayer, setActivePlayer] = useState<number>(data[0].id);

	const appMenu = [
		{
			id: "file",
			title: "File",
			menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
		},
	];
	const hlsConfig = {
		hls: { startLevel: 0 },
	};

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
				<div className={styles.tvContainer}>
					<div className={styles.tvVideosHolder}>
						{data.slice(0, 12).map((item, index) => (
							<button
								key={item.id}
								style={{
									width: activePlayer === item.id ? "100%" : "",
									order: activePlayer === item.id ? -1 : index,
								}}
								onClick={() => setActivePlayer(item.id)}
								onKeyDown={(e) => {
									if (e.key === "Enter" || e.key === " ") {
										setActivePlayer(item.id);
									}
								}}
								type="button"
							>
								{activePlayer !== item.id && (
									<div className={styles.tvChannelTitleHolder}>
										<p className={styles.tvChannelTitle}>{item.source}</p>
									</div>
								)}
								<ReactPlayer
									src={item.url}
									playing={true}
									loop={false}
									controls={false}
									playsInline={true}
									volume={activePlayer === item.id ? 1 : 0}
									width={activePlayer === item.id ? "100%" : "auto"}
									height={activePlayer === item.id ? "auto" : "4em"}
									config={item.url.endsWith("m3u8") ? hlsConfig : undefined}
								/>
							</button>
						))}
					</div>
				</div>
			</ClassicyWindow>
		</ClassicyApp>
	);
};
