import { createContext, useContext, useMemo } from "react";
import {
	ClassicyFileSystem,
	mergeClassicyFileSystemEntries,
} from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { DefaultFSContent } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";
import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

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

	return useMemo(() => {
		const resolved = !defaultFileSystem
			? DefaultFSContent
			: mode === "exclusive"
				? defaultFileSystem
				: mergeClassicyFileSystemEntries(DefaultFSContent, defaultFileSystem);
		return new ClassicyFileSystem(storageKey, resolved, separator);
	}, [defaultFileSystem, mode, storageKey, separator]);
}
