async function gzipCompress(bytes: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([new Uint8Array(bytes)])
		.stream()
		.pipeThrough(new CompressionStream("gzip"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function gzipDecompress(bytes: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([new Uint8Array(bytes)])
		.stream()
		.pipeThrough(new DecompressionStream("gzip"));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

function bytesToBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function base64UrlToBytes(base64url: string): Uint8Array {
	const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
	const padding = (4 - (base64.length % 4)) % 4;
	const binary = atob(base64 + "=".repeat(padding));
	return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * Gzip-compresses `data` and encodes it as a URL-safe base64 string
 * (RFC 4648 §5 — `-`/`_` alphabet, no padding).
 */
export async function compressToBase64(
	data: Uint8Array | ArrayBuffer,
): Promise<string> {
	const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
	const compressed = await gzipCompress(bytes);
	return bytesToBase64Url(compressed);
}

/**
 * Reverses `compressToBase64`: decodes a URL-safe base64 string and
 * gzip-decompresses it back to the original bytes.
 */
export async function decompressFromBase64(
	base64url: string,
): Promise<Uint8Array> {
	const compressed = base64UrlToBytes(base64url);
	return gzipDecompress(compressed);
}
