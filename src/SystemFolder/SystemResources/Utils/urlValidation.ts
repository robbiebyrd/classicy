/**
 * Validates that a URL string is either a safe absolute HTTP(S) URL
 * or a relative path. Rejects javascript:, data:, file:, and other
 * potentially dangerous schemes.
 */
export function isValidHttpUrl(url: string): boolean {
  if (!url) return false;

  // Allow relative URLs (paths starting with /)
  if (url.startsWith("/")) return true;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
