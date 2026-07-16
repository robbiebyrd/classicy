import { createContext, useContext, useMemo } from "react";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	ClassicyFileSystem,
	mergeClassicyFileSystemEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	APP_SHORTCUT_ICON_KIND,
	withApplicationsFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import { withExtensionsFolder } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions";
import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";

export type ClassicyDefaultFileSystemMode = "merge" | "exclusive";

type ClassicyDefaultFileSystemContextValue = {
	defaultFileSystem?: ClassicyFileSystemTree;
	mode: ClassicyDefaultFileSystemMode;
};

export const ClassicyDefaultFileSystemContext =
	createContext<ClassicyDefaultFileSystemContextValue>({ mode: "merge" });

/**
 * Constructs a ClassicyFileSystem seeded from the nearest
 * ClassicyAppManagerProvider's defaultFileSystem/defaultFileSystemMode props,
 * falling back to DefaultFSContent when no provider (or no override) is
 * present. Seed-only behavior (a fresh visitor sees the resolved tree, a
 * returning visitor keeps their persisted state) comes from
 * ClassicyFileSystem's own constructor — no extra hydration tracking here.
 */
export function useClassicyFileSystem(
	storageKey?: string,
	separator?: string,
): ClassicyFileSystem {
	const { defaultFileSystem, mode } = useContext(
		ClassicyDefaultFileSystemContext,
	);

	// Stable key over the app-shortcut icon set so the file system is only
	// rebuilt when an app registers/unregisters — not on icon moves or focus.
	const appShortcutsKey = useAppManager((s) =>
		s.System.Manager.Desktop.icons
			.filter((i) => i.kind === APP_SHORTCUT_ICON_KIND)
			.map((i) => `${i.appId}\u0000${i.appName}\u0000${i.icon}`)
			.join("\u0001"),
	);

	// Stable key over the extension-app set so the tree is only rebuilt when
	// an extension registers/unregisters — not on focus or window changes.
	const extensionAppsKey = useAppManager((s) =>
		Object.values(s.System.Manager.Applications.apps)
			.filter((a) => a.extension)
			.map((a) => `${a.id}\u0000${a.name}\u0000${a.icon}`)
			.join("\u0001"),
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: appShortcutsKey and extensionAppsKey are intentional invalidation keys — the icon/app sets are read via getState() so moves/focus don't re-render
	return useMemo(() => {
		const resolved = !defaultFileSystem
			? DefaultFSContent
			: mode === "exclusive"
				? defaultFileSystem
				: mergeClassicyFileSystemEntries(DefaultFSContent, defaultFileSystem);
		const fs = new ClassicyFileSystem(storageKey, resolved, separator);
		// Overlay the derived Applications folder after construction so it is
		// live-only: the constructor's localStorage persist has already run,
		// and returning visitors' persisted trees can't shadow newly added
		// apps. appShortcutsKey keeps this in sync with the icon set.
		fs.fs = withApplicationsFolder(
			fs.fs,
			useAppManager.getState().System.Manager.Desktop.icons,
		);
		// Same live-only overlay strategy for System Folder/Extensions, derived
		// from apps flagged extension rather than desktop icons (extensions have
		// no desktop icon). extensionAppsKey keeps this in sync with the store.
		fs.fs = withExtensionsFolder(
			fs.fs,
			Object.values(useAppManager.getState().System.Manager.Applications.apps),
		);
		return fs;
	}, [
		defaultFileSystem,
		mode,
		storageKey,
		separator,
		appShortcutsKey,
		extensionAppsKey,
	]);
}
