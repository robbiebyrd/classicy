import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// Every fallback already warned about, keyed on folder, display name and the
// losing entry's id: the derived folders rebuild on every file-system change,
// so a collision is reported once, not once per build (K-R3).
const warned = new Set<string>();

/** Report every derived-folder name fallback again (tests). */
export const resetClassicyDerivedEntryNameWarnings = (): void => {
	warned.clear();
};

/**
 * Logs, once per folder, display name and `id`, that a display name could
 * not be used in a derived folder (K-R4, K-R7), naming the form actually
 * used: the entry's own name, or `used` itself (the "<own name> (<id>)"
 * suffix form).
 */
export const warnClassicyDerivedEntryNameFallback = (
	folderName: string,
	displayName: string,
	id: string,
	ownName: string,
	used: string,
	details: Record<string, string | undefined>,
): void => {
	const key = `${folderName}\u0000${displayName}\u0000${id}`;
	if (warned.has(key)) return;
	warned.add(key);
	const form = used === ownName ? "its own name" : `"${used}"`;
	classicyLog(
		"warn",
		"ClassicyFileSystem",
		`App display name unusable in ${folderName}; using ${form}`,
		details,
	);
};
