/**
 * The storage key of the desktop's file system: the mounted
 * `ClassicyAppManagerProvider`'s `fileSystemStorageKey`, else
 * `"classicyStorage"`. The hooks read it from context; this store-free copy
 * is for reducers (Recent Items' `isClassicyRecentDocumentPath`), which
 * cannot.
 *
 * Each provider publishes its key under a token of its own as it renders
 * (before any child acts) and withdraws it when it unmounts. With two
 * providers on one page (Storybook, tests) they share one store, so one key
 * must win: the provider that published first and is still mounted, the
 * outermost or longest-lived; when it unmounts the next one's key is in
 * effect, and with none mounted the default is.
 */
export const CLASSICY_DEFAULT_FILE_SYSTEM_STORAGE_KEY = "classicyStorage";

const published = new Map<symbol, string | undefined>();

/** Publish (or update) one provider's key; `token` identifies the provider. */
export const publishClassicyDesktopFileSystemStorageKey = (
	token: symbol,
	key: string | undefined,
): void => {
	published.set(token, key);
};

/** Withdraw a provider's key (it unmounted). */
export const withdrawClassicyDesktopFileSystemStorageKey = (
	token: symbol,
): void => {
	published.delete(token);
};

/** The key in effect for the desktop's file system. */
export const classicyDesktopFileSystemStorageKey = (): string => {
	for (const key of published.values())
		return key ?? CLASSICY_DEFAULT_FILE_SYSTEM_STORAGE_KEY;
	return CLASSICY_DEFAULT_FILE_SYSTEM_STORAGE_KEY;
};
