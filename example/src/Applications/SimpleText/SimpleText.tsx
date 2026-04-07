import { useCallback, useMemo } from "react";
import {
	ClassicyApp,
	ClassicyFileSystem,
	ClassicyFileSystemEntryFileType,
	ClassicyIcons,
	ClassicyRichTextEditor,
	ClassicyTextEditor,
	ClassicyWindow,
	quitMenuItemHelper,
	useAppManager,
	useAppManagerDispatch,
} from "classicy";

const SimpleText = () => {
	const appName = "SimpleText";
	const appId = "SimpleText.app";
	const appIcon = ClassicyIcons.applications.textedit.app;

	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const fs = useMemo(() => new ClassicyFileSystem(), []);

	const openFiles: string[] = appState?.data?.openFiles ?? [];

	const closeFile = useCallback(
		(path: string) => {
			desktopEventDispatch({
				type: `ClassicyApp${appName}CloseFile`,
				app: { id: appId },
				path,
			});
		},
		[desktopEventDispatch],
	);

	const defaultText = `> *Here's to the crazy ones.*\n
> *The misfits.*\n
> *The rebels.*\n
> *The troublemakers.*\n
> *The round pegs in the square holes.*\n
> *The ones who see things differently.*\n
> *They're not fond of rules.*\n
> *And they have no respect for the status quo.*\n
> *You can praise them, disagree with them, quote them, disbelieve them, glorify or vilify them.*\n
> *About the only thing you can't do is ignore them.*\n
> *Because they change things.*\n
> *They invent. They imagine. They heal.*\n
> *They explore. They create. They inspire.*\n
> *They push the human race forward.*\n
> *Maybe they have to be crazy.*\n
> *How else can you stare at an empty canvas and see a work of art?*\n
> *Or sit in silence and hear a song that's never been written?*\n
> *Or gaze at a red planet and see a laboratory on wheels?*\n
> *We make tools for these kinds of people.*\n
> *While some see them as the crazy ones, we see genius.*\n
> *Because the people who are crazy enough to think they can change the world, are the ones who do."*`;

	const appMenu = [
		{
			id: "file",
			title: "File",
			menuChildren: [quitMenuItemHelper(appId, appName, appIcon)],
		},
	];

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			defaultWindow={"simple-text-demo"}
			handlesFileTypes={[
				ClassicyFileSystemEntryFileType.TextFile,
				ClassicyFileSystemEntryFileType.Markdown,
			]}
			handlesOwnFiles={true}
		>
			<ClassicyWindow
				id={"simple-text-demo"}
				title={"Here's to..."}
				appId={appId}
				initialSize={[100, 500]}
				initialPosition={[350, 100]}
				appMenu={appMenu}
			>
				<ClassicyRichTextEditor content={defaultText} />
			</ClassicyWindow>
			{openFiles.map((filePath: string, idx: number) => {
				const entry = fs.resolve(filePath);
				const content =
					typeof entry?._data === "string" ? entry._data : "";
				const fileType = entry?._type as ClassicyFileSystemEntryFileType;
				const fileName = filePath.split(":").pop() || filePath;

				return (
					<ClassicyWindow
						key={`${appId}_file_${filePath}`}
						id={`${appId}_file_${filePath}`}
						title={fileName}
						appId={appId}
						initialSize={[400, 350]}
						initialPosition={[200 + idx * 30, 100 + idx * 30]}
						appMenu={appMenu}
						onCloseFunc={() => closeFile(filePath)}
					>
						{fileType === ClassicyFileSystemEntryFileType.Markdown ? (
							<ClassicyRichTextEditor content={content} />
						) : (
							<ClassicyTextEditor content={content} />
						)}
					</ClassicyWindow>
				);
			})}
		</ClassicyApp>
	);
};

export default SimpleText;
