import "./FinderAboutThisComputer.scss";
import type { FC as FunctionalComponent } from "react";
import { useEffect, useState } from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import { useAppManagerDispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyProgressBar } from "@/SystemFolder/SystemResources/ProgressBar/ClassicyProgressBar";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
import packageJson from "../../../package.json";

const BUILT_IN_MEMORY_MB = 64;
const OS_USED_MB_DEFAULT = 20.5;
const VIRTUAL_MEMORY = "Off";

interface MemoryMeasurement {
	bytes: number;
}

const appId = "Finder.app";

const { version } = packageJson;
const pkgExtra = packageJson as Record<string, unknown>;
const release = typeof pkgExtra.release === "string" ? pkgExtra.release : "Classicy";

export const FinderAboutThisComputer: FunctionalComponent = () => {
	const dispatch = useAppManagerDispatch();
	const [osUsedMb, setOsUsedMb] = useState<number>(OS_USED_MB_DEFAULT);

	useEffect(() => {
		const perf = performance as Performance & {
			measureUserAgentSpecificMemory?: () => Promise<MemoryMeasurement>;
		};
		if (typeof perf.measureUserAgentSpecificMemory === "function") {
			perf.measureUserAgentSpecificMemory()
				.then((result) => setOsUsedMb(result.bytes / (1024 * 1024)))
				.catch(() => {
					console.log("Could not measure memory usage, using default value");
					// API unavailable (e.g. missing cross-origin isolation) — keep default
				});
		} else {
			console.log("Memory measurement API not available, using default value");
		}
	}, []);

	const largestUnusedMb = BUILT_IN_MEMORY_MB - osUsedMb;

	const versionLabel = release
		? `Classicy ${version} (${release})`
		: `Classicy ${version}`;

	return (
		<ClassicyWindow
			id="finder_about_this_computer"
			appId={appId}
			hideIcon={true}
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
					<div className="finderAboutThisComputerBanner"
						style={{
							backgroundSize: "cover",
							backgroundPosition: "bottom left",
							backgroundImage: `url(${ClassicyIcons.classicy.bg})`,
							backgroundRepeat: "no-repeat",
						}}
					>
						<img src={ClassicyIcons.classicy.logo} alt="Classicy"/>
						{/* <p>{release ?? "Classicy"}</p> */}
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
							{largestUnusedMb.toFixed(1)} MB
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
							{osUsedMb.toFixed(1)} MB
						</span>
						<div className="finderAboutThisComputerUsageBar">
							<ClassicyProgressBar
								value={osUsedMb}
								max={BUILT_IN_MEMORY_MB}
							/>
						</div>
					</div>
				</div>
			</div>
		</ClassicyWindow>
	);
};
