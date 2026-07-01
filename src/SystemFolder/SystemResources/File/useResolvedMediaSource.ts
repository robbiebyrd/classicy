import { useEffect, useState } from "react";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

/**
 * Resolves a ClassicyFileSystemEntrySource into a src usable by <img>/<video>.
 * A plain `_url` passes through unchanged; `_data` (gzip+base64url-encoded
 * bytes, see base64Compression.ts) is decompressed and turned into a Blob
 * object URL, which is revoked on unmount or when the source changes.
 */
export function useResolvedMediaSource(
	url: string | undefined,
	data: string | undefined,
	mimeType: string | undefined,
): string | undefined {
	const [resolved, setResolved] = useState<string | undefined>(url);

	useEffect(() => {
		if (url) {
			setResolved(url);
			return;
		}
		if (!data) {
			setResolved(undefined);
			return;
		}
		let cancelled = false;
		let objectUrl: string | undefined;
		decompressFromBase64(data).then((bytes) => {
			if (cancelled) return;
			const buffer = bytes.buffer.slice(
				bytes.byteOffset,
				bytes.byteOffset + bytes.byteLength,
			) as ArrayBuffer;
			const blob = new Blob([buffer], { type: mimeType || "application/octet-stream" });
			objectUrl = URL.createObjectURL(blob);
			setResolved(objectUrl);
		});
		return () => {
			cancelled = true;
			if (objectUrl) URL.revokeObjectURL(objectUrl);
		};
	}, [url, data, mimeType]);

	return resolved;
}
