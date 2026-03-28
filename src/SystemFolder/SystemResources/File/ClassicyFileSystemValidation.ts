const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Validates that a parsed value is a plausible ClassicyFileSystemEntry.
 * Checks:
 * - Is a non-null, non-array object
 * - Has at least one key
 * - No prototype pollution keys (__proto__, constructor, prototype)
 * - Has a _type field or contains child entries that do
 */
export function isValidFileSystemEntry(value: unknown): boolean {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);
  if (keys.length === 0) {
    return false;
  }

  // Block prototype pollution vectors
  if (keys.some((key) => DANGEROUS_KEYS.has(key))) {
    return false;
  }

  // Must have _type or at least one child with _type
  const record = value as Record<string, unknown>;
  if (typeof record._type === "string") {
    return true;
  }

  return keys.some((key) => {
    const child = record[key];
    return (
      typeof child === "object" &&
      child !== null &&
      !Array.isArray(child) &&
      typeof (child as Record<string, unknown>)._type === "string"
    );
  });
}
