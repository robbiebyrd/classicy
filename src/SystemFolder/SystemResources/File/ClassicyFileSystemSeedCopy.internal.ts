import type { ClassicyFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * A deep copy of seed data (a default tree, a seed migration's entry) to put
 * into a live tree (story 0098). The live tree is edited in place, so seeding
 * it with the host's or the library's own objects would write a session's
 * edits into them: into `DefaultFSContent` or a host's `defaultFileSystem`,
 * which every other storage key, a later boot with no storage, and Drive
 * Setup's Initialize read. Data `structuredClone` refuses (one holding a
 * function, say) is copied as JSON instead, the form it is persisted in
 * anyway, with a warning.
 */
export const copyClassicyFileSystemSeed = <T = ClassicyFileSystemEntry>(
	seed: T,
): T => {
	try {
		return structuredClone(seed);
	} catch (error) {
		classicyLog(
			"warn",
			"ClassicyFileSystem",
			"seed data cannot be structured-cloned; copying its JSON form",
			error,
		);
		return JSON.parse(JSON.stringify(seed)) as T;
	}
};
