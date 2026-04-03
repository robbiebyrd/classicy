import { ClassicyApp, ClassicyIcons, ClassicyWindow, quitMenuItemHelper } from "classicy";
import { useEffect, useRef } from "react";
import styles from "./PagerDecoder.module.scss";
import { usePagerIndex } from "./usePagerIndex";
import { usePagerPlayback } from "./usePagerPlayback";

const PagerDecoder = () => {
	const appId = "PagerDecoder.app";
	const appName = "Pager Decoder";
	const appIcon = ClassicyIcons.applications.internetExplorer.mailbox;

	const { index, progress, error } = usePagerIndex();
	const { lines, streamingText, streamingMeta } = usePagerPlayback(index);

	const bottomRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [lines.length]);

	const appMenu = [
		{
			id: "file",
			title: "File",
			menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
		},
	];

	return (
		<ClassicyApp id={appId} name={appName} icon={appIcon} defaultWindow="pager-terminal">
			<ClassicyWindow
				id="pager-terminal"
				title="Pager Decoder"
				appId={appId}
				initialSize={[620, 440]}
				initialPosition={[80, 60]}
				appMenu={appMenu}
				resizable
				growable
			>
				<div className={styles.terminal}>
					{!index && (
						<p className={styles.loading}>
							{error
								? `Error: ${error}`
								: `Loading... ${Math.round(progress * 100)}%`}
						</p>
					)}
					{lines.map((line) => (
						<div key={line.id} className={styles.line}>
							<span className={styles.meta}>[{line.timeKey}] {line.provider} </span>
							{line.text}
						</div>
					))}
					{streamingMeta && (
						<div className={styles.line}>
							<span className={styles.meta}>
								[{streamingMeta.timeKey}] {streamingMeta.provider}{" "}
							</span>
							{streamingText}
							<span className={styles.cursor} aria-hidden="true" />
						</div>
					)}
					{index && !streamingMeta && (
						<span className={styles.cursor} aria-hidden="true" />
					)}
					<div ref={bottomRef} />
				</div>
			</ClassicyWindow>
		</ClassicyApp>
	);
};

export default PagerDecoder;
