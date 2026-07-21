import { createContext, useContext, useEffect, useMemo } from "react";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
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

// Reconciliation must run once per storageKey, not once per fs instance —
// rebuilds (app registration, fsVersion bumps) must not re-trigger it.
const reconciledStorageKeys = new Set<string>();

/** Test helper: allow reconciliation to run again. */
export function resetClassicyFileSystemReconciliation(storageKey?: string) {
	if (storageKey) {
		reconciledStorageKeys.delete(storageKey);
	} else {
		reconciledStorageKeys.clear();
	}
}

/**
 * Resolve the effective default filesystem tree from an optional override and
 * the provider mode. Shared by useClassicyFileSystem and Drive Setup so
 * "default" means the same thing in both places.
 */
export function resolveDefaultFileSystem(
	defaultFileSystem: ClassicyFileSystemTree | undefined,
	mode: ClassicyDefaultFileSystemMode,
): ClassicyFileSystemTree {
	if (!defaultFileSystem) {
		return DefaultFSContent as unknown as ClassicyFileSystemTree;
	}
	return mode === "exclusive"
		? defaultFileSystem
		: (mergeClassicyFileSystemEntries(
				DefaultFSContent,
				defaultFileSystem,
			) as ClassicyFileSystemTree);
}

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

	// Invalidation key: bumped after an adapter reconcile replaces the tree, so
	// the fs rebuilds through the normal seed-from-localStorage path.
	const fsVersion = useAppManager(
		(s) => s.System.Manager.Desktop.fsVersion ?? 0,
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: appShortcutsKey and extensionAppsKey are intentional invalidation keys — the icon/app sets are read via getState() so moves/focus don't re-render
	const fs = useMemo(() => {
		const resolved = resolveDefaultFileSystem(defaultFileSystem, mode);
		const fs = new ClassicyFileSystem(storageKey, resolved, separator);
		// Overlay the derived Applications folder after construction so it is
		// live-only: the constructor's localStorage persist has already run,
		// and returning visitors' persisted trees can't shadow newly added
		// apps. appShortcutsKey keeps this in sync with the icon set.
		fs.applyDerivedTree(
			withApplicationsFolder(
				fs.fs,
				useAppManager.getState().System.Manager.Desktop.icons,
			),
		);
		// Same live-only overlay strategy for System Folder/Extensions, derived
		// from apps flagged extension rather than desktop icons (extensions have
		// no desktop icon). extensionAppsKey keeps this in sync with the store.
		fs.applyDerivedTree(
			withExtensionsFolder(
				fs.fs,
				Object.values(
					useAppManager.getState().System.Manager.Applications.apps,
				),
			),
		);
		return fs;
	}, [
		defaultFileSystem,
		mode,
		storageKey,
		separator,
		appShortcutsKey,
		extensionAppsKey,
		fsVersion,
	]);

	// Two-way boot sync: offer the local snapshot to reconciling adapters once
	// per storageKey. A replace has already persisted; the bump rebuilds the fs
	// from localStorage so every consumer sees the adopted tree.
	useEffect(() => {
		if (reconciledStorageKeys.has(fs.storageKey)) return;
		reconciledStorageKeys.add(fs.storageKey);
		void fs
			.reconcileWithAdapters()
			.then((replaced) => {
				if (replaced) {
					dispatch({ type: "ClassicyDesktopFileSystemVersionBump" });
				}
			})
			.catch((error) => {
				console.error(
					"[ClassicyFileSystem] boot reconciliation failed; keeping local",
					error,
				);
			});
	}, [fs]);

	return fs;
}
