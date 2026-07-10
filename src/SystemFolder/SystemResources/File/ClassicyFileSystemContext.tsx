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

	// biome-ignore lint/correctness/useExhaustiveDependencies: appShortcutsKey is an intentional invalidation key — the icon set is read via getState() so icon moves/focus don't re-render
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
		return fs;
	}, [defaultFileSystem, mode, storageKey, separator, appShortcutsKey]);
}
