import "./ClassicyFileBrowserViewTable.scss";
import {
	type FC as FunctionalComponent,
	memo,
	type RefObject,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import type { FinderIconViewOptions } from "@/SystemFolder/Finder/FinderContext";
import {
	asFinderDate,
	finderEntryComparator,
	iconViewIconSize,
} from "@/SystemFolder/Finder/FinderViewOptions";
import { getIconSize } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext";
import {
	cleanupIcon,
	iconImageByType,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import type { ClassicyFileSystemEntryMetadata } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { ClassicyIcon } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";

export type ClassicyFileBrowserViewIconsProps = {
	fs: ClassicyFileSystem;
	path: string;
	appId: string;
	dirOnClickFunc?: (path: string) => void;
	fileOnClickFunc?: (path: string) => void;
	holderRef?: RefObject<HTMLDivElement | null>;
	hideFilesCreatedAfter?: Date | string | number | null;
	iconViewOptions?: FinderIconViewOptions;
};

type iconType = {
	appId: string;
	name: string;
	invisible: boolean;
	icon: string;
	onClickFunc: () => void;
	holder: RefObject<HTMLDivElement | null>;
	initialPosition: [number, number];
	size?: number;
	snapTo?: [number, number];
	positionLocked?: boolean;
};

export const ClassicyFileBrowserViewIcons: FunctionalComponent<ClassicyFileBrowserViewIconsProps> =
	memo(
		({
			fs,
			path,
			appId,
			dirOnClickFunc,
			fileOnClickFunc,
			holderRef,
			hideFilesCreatedAfter = null,
			iconViewOptions,
		}) => {
			const activeTheme = useAppManager(
				(s) => s.System.Manager.Appearance.activeTheme,
			);

			// Falls back to an internally-owned ref when the caller does not pass
			// one (e.g. rendering this view standalone in tests), so the layout
			// effect below always has a DOM node to measure and attach icons to.
			const internalHolderRef = useRef<HTMLDivElement>(null);
			const resolvedHolderRef = holderRef ?? internalHolderRef;

			const [items, setItems] = useState<iconType[]>([]);

			// Destructured rather than depended on as `iconViewOptions` itself:
			// it is a fresh object on every render of the parent, and depending
			// on its identity would either re-run every render (defeating the
			// memoization) or, if a caller memoizes it, silently miss changes to
			// individual fields. Depending on the primitives keeps the effect
			// keyed on the values that actually drive layout.
			const arrangement = iconViewOptions?.arrangement;
			const keepArrangedBy = iconViewOptions?.keepArrangedBy;
			const iconSizeStep = iconViewOptions?.iconSize;

			useLayoutEffect(() => {
				if (!resolvedHolderRef.current) {
					return;
				}

				const openFileOrFolder = (
					properties: ClassicyFileSystemEntryMetadata,
					path: string,
					filename: string,
				) => {
					if (properties._type === "directory") {
						if (dirOnClickFunc) {
							return dirOnClickFunc(`${path}:${filename}`);
						}
						return;
					}
					if (fileOnClickFunc) {
						return fileOnClickFunc(`${path}:${filename}`);
					}
				};

				const containerMeasure: [number, number] = [
					resolvedHolderRef.current.getBoundingClientRect().width,
					resolvedHolderRef.current.getBoundingClientRect().height,
				];
				const directoryListing: ClassicyFileSystemEntryMetadata | object =
					fs.filterByType(path, undefined, true, hideFilesCreatedAfter);

				const entries = Object.entries(directoryListing);
				const ordered =
					arrangement === "sorted" && keepArrangedBy
						? [...entries].sort((a, b) =>
								finderEntryComparator(keepArrangedBy)(
									{
										name: a[0],
										// asFinderDate, not the raw field: the tree round-trips
										// through JSON, so these are ISO strings at runtime and
										// .getTime() inside the comparator would throw.
										modifiedOn: asFinderDate(a[1]._modifiedOn),
										createdOn: asFinderDate(a[1]._createdOn),
										size: a[1]._size,
										kind: a[1]._type,
										label: a[1]._label,
									},
									{
										name: b[0],
										modifiedOn: asFinderDate(b[1]._modifiedOn),
										createdOn: asFinderDate(b[1]._createdOn),
										size: b[1]._size,
										kind: b[1]._type,
										label: b[1]._label,
									},
								),
							)
						: entries;

				const iconSize = iconSizeStep
					? iconViewIconSize(getIconSize(activeTheme)[0], iconSizeStep)
					: undefined;
				const pitch: [number, number] | undefined =
					arrangement === "grid" && iconSize ? [iconSize, iconSize] : undefined;
				// "sorted" ("Keep arranged by…") derives both order and position from
				// the sort key, so dragging is disabled entirely. "grid" ("Snap to
				// grid") still allows free dragging; it only rounds the drop point
				// via `snapTo`. "none" is unrestricted, exactly as today.
				const positionLocked = arrangement === "sorted";

				const updatedIcons = ordered.map(([filename, properties], index) => {
					return {
						appId: appId,
						name: filename,
						invisible: properties._invisible,
						icon: properties._icon || iconImageByType(properties._type),
						onClickFunc: () => openFileOrFolder(properties, path, filename),
						holder: resolvedHolderRef,
						initialPosition: cleanupIcon(
							activeTheme,
							index,
							ordered.length,
							containerMeasure,
							iconSize,
						),
						size: iconSize,
						snapTo: pitch,
						positionLocked,
					};
				});
				setItems(updatedIcons);
			}, [
				appId,
				path,
				fs,
				dirOnClickFunc,
				fileOnClickFunc,
				activeTheme,
				resolvedHolderRef.current,
				resolvedHolderRef,
				hideFilesCreatedAfter,
				arrangement,
				keepArrangedBy,
				iconSizeStep,
			]);

			return (
				<div className={"classicyFileBrowserFill"} ref={resolvedHolderRef}>
					{items.map((item) => {
						return <ClassicyIcon {...item} key={item.name} />;
					})}
				</div>
			);
		},
	);

ClassicyFileBrowserViewIcons.displayName = "ClassicyFileBrowserViewIcons";
