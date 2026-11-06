// Test helper: the file on disk behind an asset URL the test build resolved,
// so a test can pin where an asset is read from (plan 0015-kxa §3.3: Platinum
// reads its own files, not the core's assets/). Vitest serves a file inside
// the project root as a root-relative path (`/src/…`) and one outside it as
// `/@fs/<absolute path>`, and rewrites `new URL(…, import.meta.url)` to
// `http://localhost:<port>/…`; any other value (a `data:` URI) is no file.
import path from "node:path";

/**
 * The absolute path `url` was resolved from, with `root` the vitest
 * project's root, or `undefined` for a value that names no file.
 */
export const assetSourceFile = (
	url: string,
	root: string,
): string | undefined => {
	const local = url.replace(/^https?:\/\/[^/]+/, "").split("?")[0];
	if (!local.startsWith("/")) return undefined;
	if (local.startsWith("/@fs/")) return local.slice("/@fs".length);
	return path.join(root, local);
};
