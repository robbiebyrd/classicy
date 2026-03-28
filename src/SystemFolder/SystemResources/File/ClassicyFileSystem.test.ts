import { describe, it, expect } from "vitest";
import { isValidFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemValidation";

describe("isValidFileSystemEntry", () => {
  it("accepts a valid FS entry with _type", () => {
    expect(isValidFileSystemEntry({ _type: "directory", "Macintosh HD": { _type: "drive" } })).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidFileSystemEntry(null)).toBe(false);
  });

  it("rejects a string", () => {
    expect(isValidFileSystemEntry("not an object")).toBe(false);
  });

  it("rejects an array", () => {
    expect(isValidFileSystemEntry([1, 2, 3])).toBe(false);
  });

  it("rejects an empty object", () => {
    expect(isValidFileSystemEntry({})).toBe(false);
  });

  it("rejects an object with __proto__ key", () => {
    const obj = JSON.parse('{"__proto__": {"polluted": true}, "_type": "directory"}');
    expect(isValidFileSystemEntry(obj)).toBe(false);
  });

  it("rejects an object with constructor key", () => {
    expect(isValidFileSystemEntry({ constructor: {}, _type: "directory" })).toBe(false);
  });

  it("accepts a nested FS structure", () => {
    const fs = {
      _type: "directory",
      "Macintosh HD": {
        _type: "drive",
        _icon: "icon.png",
        "System Folder": {
          _type: "directory",
        },
      },
    };
    expect(isValidFileSystemEntry(fs)).toBe(true);
  });
});
