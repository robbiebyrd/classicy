import "./FinderAboutThisComputer.scss";
import type { FC as FunctionalComponent } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import packageJson from "../../../package.json";

const BUILT_IN_MEMORY_MB = 64;
const OS_USED_MB = 20.5;
const VIRTUAL_MEMORY = "Off";
const LARGEST_UNUSED_MB = BUILT_IN_MEMORY_MB - OS_USED_MB;

const appId = "Finder.app";

const { version } = packageJson;
const pkgExtra = packageJson as Record<string, unknown>;
const release = typeof pkgExtra.release === "string" ? pkgExtra.release : undefined;

export const FinderAboutThisComputer: FunctionalComponent = () => {
	const dispatch = useAppManagerDispatch();

	const versionLabel = release
		? `Classicy ${version} (${release})`
		: `Classicy ${version}`;

	return (
		<ClassicyWindow
			id="finder_about_this_computer"
			appId={appId}
			title="About This Computer"
			closable={true}
			resizable={false}
			zoomable={false}
			scrollable={false}
			collapsable={false}
			initialSize={[520, 290]}
			initialPosition={["center", "center"]}
			onCloseFunc={() =>
				dispatch({ type: "ClassicyAppFinderAboutThisComputerClose" })
			}
		>
			<div className="finderAboutThisComputer">
				<div className="finderAboutThisComputerHeader">
					<div className="finderAboutThisComputerBanner">
						<span>{release ?? "Classicy"}</span>
					</div>
					<div className="finderAboutThisComputerVersion">
						<img src={ClassicyIcons.system.macos} alt="Classicy" />
						<span>{versionLabel}</span>
					</div>
				</div>
				<div className="finderAboutThisComputerInfo">
					<div className="finderAboutThisComputerMemoryStats">
						<p>
							<strong>Built-in Memory:</strong> {BUILT_IN_MEMORY_MB} MB
						</p>
						<p>
							<strong>Virtual Memory:</strong> {VIRTUAL_MEMORY}
						</p>
						<p>
							<strong>Largest Unused Block:</strong>{" "}
							{LARGEST_UNUSED_MB.toFixed(1)} MB
						</p>
					</div>
					<p className="finderAboutThisComputerCopyright">
						Not &trade; &amp; &copy; Apple Computer, Inc. 1983&ndash;1999
					</p>
				</div>
				<div className="finderAboutThisComputerUsage">
					<div className="finderAboutThisComputerUsageItem">
						<img src={ClassicyIcons.system.mac} alt="Classicy" />
						<span className="finderAboutThisComputerUsageName">Classicy</span>
						<span className="finderAboutThisComputerUsageSize">
							{OS_USED_MB} MB
						</span>
						<div className="finderAboutThisComputerUsageBar">
							<ClassicyProgressBar
								value={OS_USED_MB}
								max={BUILT_IN_MEMORY_MB}
							/>
						</div>
					</div>
				</div>
			</div>
		</ClassicyWindow>
	);
};
