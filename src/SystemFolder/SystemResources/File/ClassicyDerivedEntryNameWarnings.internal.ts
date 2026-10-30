import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Every fallback already warned about, keyed on folder, display name, the
// losing entry's id and the name it was given: the derived folders rebuild on
// every file-system change, so a collision is reported once, not once per
// build (K-R3), and again only when the name used changes (a static file
// taking "<own name> (<id>)" moves it to "… 2").
const warned = new Set<string>();

/** Report every derived-folder name fallback again (tests). */
export const resetClassicyDerivedEntryNameWarnings = (): void => {
	warned.clear();
};

/**
 * Logs, once per folder, display name, `id` and `used`, that an entry could
 * not take its name in a derived folder (K-R4, K-R7, story 0096), naming the
 * form actually used: the entry's own name, or `used` itself (the
 * "<own name> (<id>)" suffix form). When the entry was shown under its own
 * name (`displayName === ownName`), the name was taken, not unusable, and the
 * message says so.
 */
export const warnClassicyDerivedEntryNameFallback = (
	folderName: string,
	displayName: string,
	id: string,
	ownName: string,
	used: string,
	details: Record<string, string | undefined>,
): void => {
	const key = `${folderName}\u0000${displayName}\u0000${id}\u0000${used}`;
	if (warned.has(key)) return;
	warned.add(key);
	const form = used === ownName ? "its own name" : `"${used}"`;
	classicyLog(
		"warn",
		"ClassicyFileSystem",
		displayName === ownName
			? `Name "${ownName}" already taken in ${folderName}; using ${form}`
			: `App display name unusable in ${folderName}; using ${form}`,
		details,
	);
};
