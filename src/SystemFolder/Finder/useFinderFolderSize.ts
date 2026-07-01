import { useEffect, useState } from "react";
import type { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

export function useFinderFolderSize(
	path: string,
	fs: ClassicyFileSystem,
): number | undefined {
	const [size, setSize] = useState<number | undefined>(undefined);

	useEffect(() => {
		let cancelled = false;
		setSize(undefined);

		const entry = fs.resolve(path);
		if (entry) {
			fs.calculateSizeDir(entry).then((resolvedSize) => {
				if (!cancelled) setSize(resolvedSize);
			});
		}

		return () => {
			cancelled = true;
		};
	}, [path, fs]);

	return size;
}
