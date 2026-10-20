import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useSyncExternalStore,
} from "react";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyMountedApps } from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";
import {
	arrangeClassicyControlStripModules,
	useClassicyControlStripRegistrations,
} from "@/SystemFolder/SystemResources/ControlStrip/ClassicyControlStripRegistry";
import {
	ClassicyFileSystem,
	getClassicyFileSystemVersion,
	mergeClassicyFileSystemEntries,
	subscribeClassicyFileSystem,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import {
	APP_SHORTCUT_ICON_KIND,
	withApplicationsFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemApplications";
import {
	type ClassicyControlStripModuleFile,
	withControlStripModulesFolder,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemControlStripModules";
import { withExtensionsFolder } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemExtensions";
import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyFileSystemSeedMigration } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

export type ClassicyDefaultFileSystemMode = "merge" | "exclusive";

type ClassicyDefaultFileSystemContextValue = {
	defaultFileSystem?: ClassicyFileSystemTree;
	mode: ClassicyDefaultFileSystemMode;
	seedMigrations?: ClassicyFileSystemSeedMigration[];
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
 *
 * Every instance for a storage key shares one live tree, and the hook
 * subscribes to it: any mutation, through any instance (a Finder drag, a Save
 * dialog's New Folder), hands every consumer a fresh `ClassicyFileSystem`, so
 * memoized views keyed on it re-read the tree.
 */
export function useClassicyFileSystem(
	storageKey?: string,
	separator?: string,
): ClassicyFileSystem {
	const { defaultFileSystem, mode, seedMigrations } = useContext(
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

	// Stable key over the installed Control Strip modules: registrations whose
	// owning app (if any) is mounted. Read from the module registry and the
	// mounted-app set, both runtime-only, so the derived folder follows them.
	const registrations = useClassicyControlStripRegistrations();
	const mountedApps = useClassicyMountedApps();
	// Serialized so an unrelated app mounting (which changes mountedApps)
	// doesn't rebuild the file system.
	const controlStripModulesKey = JSON.stringify(
		arrangeClassicyControlStripModules(registrations, { mountedApps }).map(
			({ definition }): ClassicyControlStripModuleFile => ({
				id: definition.id,
				name: definition.label,
				icon:
					definition.fileIcon ?? ClassicyIcons.system.controlStrip.moduleFile,
				appId: definition.appId,
			}),
		),
	);

	// Reload token: bumped after the stored tree is replaced behind the live
	// one's back (adapter reconcile, Drive Setup), so the shared tree is read
	// afresh from localStorage — see the ClassicyFileSystem constructor's epoch.
	const fsVersion = useAppManager(
		(s) => s.System.Manager.Desktop.fsVersion ?? 0,
	);

	// Mutation counter of the shared tree: changes on every journaled write.
	const resolvedStorageKey = storageKey ?? "classicyStorage";
	const subscribe = useCallback(
		(listener: () => void) =>
			subscribeClassicyFileSystem(resolvedStorageKey, listener),
		[resolvedStorageKey],
	);
	const treeVersion = useSyncExternalStore(
		subscribe,
		() => getClassicyFileSystemVersion(resolvedStorageKey),
		() => 0,
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: appShortcutsKey, extensionAppsKey and treeVersion are intentional invalidation keys — the icon/app sets are read via getState() so moves/focus don't re-render, and the tree is read through the shared instance
	const fs = useMemo(() => {
		const resolved = resolveDefaultFileSystem(defaultFileSystem, mode);
		const fs = new ClassicyFileSystem(
			storageKey,
			resolved,
			separator,
			seedMigrations,
			fsVersion,
		);
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
		// System Folder/Control Strip Modules: one file per installed module.
		fs.applyDerivedTree(
			withControlStripModulesFolder(
				fs.fs,
				JSON.parse(controlStripModulesKey) as ClassicyControlStripModuleFile[],
			),
		);
		return fs;
	}, [
		controlStripModulesKey,
		defaultFileSystem,
		mode,
		seedMigrations,
		storageKey,
		separator,
		appShortcutsKey,
		extensionAppsKey,
		fsVersion,
		treeVersion,
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
				classicyLog(
					"error",
					"ClassicyFileSystem",
					"boot reconciliation failed; keeping local",
					error,
				);
			});
	}, [fs]);

	return fs;
}

/**
 * A stable function returning a `ClassicyFileSystem` on the shared live tree
 * for `storageKey`, without subscribing to it — for event handlers (a drop, an
 * open) that need the file system but shouldn't re-render their component on
 * every change to it, as `useClassicyFileSystem` does. Each call attaches to
 * the tree current at that moment.
 */
export function useClassicyFileSystemAccessor(
	storageKey?: string,
	separator?: string,
): () => ClassicyFileSystem {
	const { defaultFileSystem, mode, seedMigrations } = useContext(
		ClassicyDefaultFileSystemContext,
	);
	const fsVersion = useAppManager(
		(s) => s.System.Manager.Desktop.fsVersion ?? 0,
	);
	return useCallback(
		() =>
			new ClassicyFileSystem(
				storageKey,
				resolveDefaultFileSystem(defaultFileSystem, mode),
				separator,
				seedMigrations,
				fsVersion,
			),
		[defaultFileSystem, mode, seedMigrations, storageKey, separator, fsVersion],
	);
}
