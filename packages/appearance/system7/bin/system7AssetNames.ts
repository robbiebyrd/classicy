// The name each of System 7's package files ships as in dist/assets (plan
// 0018-dbd §4.1), shared by vite.config.ts (`assetFileNames`) and
// bin/verify-dist.mjs. Every file ships flat under its own name, except the
// variant and size folders' files, which share names across folders
// (`icons/color/32/system-files-document.png` and
// `icons/bw/16/system-files-document.png`, `art/color/apple-menu.png` and
// `art/bw/apple-menu.png`): those ship with their folders in the name,
// `icons-color-32-system-files-document.png`, `art-bw-apple-menu.png`.

const FOLDERED =
	/(?:^|\/)assets\/((?:icons\/[^/]+\/[^/]+)|(?:art\/[^/]+))\/([^/]+)$/;

/** The dist/assets name of a package source file, given its path. */
export const system7AssetFileName = (source: string): string => {
	const path = source.replace(/\\/g, "/");
	const match = FOLDERED.exec(path);
	if (match?.[1] && match[2])
		return `${match[1].replaceAll("/", "-")}-${match[2]}`;
	return path.slice(path.lastIndexOf("/") + 1);
};
