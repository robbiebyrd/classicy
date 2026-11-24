/**
 * The storage key of the desktop's file system: the
 * `ClassicyAppManagerProvider`'s `fileSystemStorageKey`, else
 * `"classicyStorage"`. The hooks read it from context; this store-free copy
 * is for reducers (Recent Items' `isClassicyRecentDocumentPath`), which
 * cannot. The provider publishes it as it renders, before any child acts.
 */
export const CLASSICY_DEFAULT_FILE_SYSTEM_STORAGE_KEY = "classicyStorage";

let desktopStorageKey = CLASSICY_DEFAULT_FILE_SYSTEM_STORAGE_KEY;

export const setClassicyDesktopFileSystemStorageKey = (key?: string): void => {
	desktopStorageKey = key ?? CLASSICY_DEFAULT_FILE_SYSTEM_STORAGE_KEY;
};

export const classicyDesktopFileSystemStorageKey = (): string =>
	desktopStorageKey;
