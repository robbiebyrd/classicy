// @vitest-environment node
import { describe, expect, it } from "vitest";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// Covers the prototype-pollution hardening of pathArray()/resolve():
// - pathArray() rejects (returns null for) any segment matching
//   __proto__ / constructor / prototype, rather than silently dropping it.
// - resolve()'s reduce uses Object.hasOwn(prev, curr) so it can never walk
//   the prototype chain, even for keys that legitimately exist there
//   (e.g. toString) or for paths pathArray lets through.
const fixture = () => ({
	_type: "directory",
	"Macintosh HD": {
		_type: ClassicyFileSystemEntryFileType.Drive,
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"Read Me.txt": {
				_type: ClassicyFileSystemEntryFileType.TextFile,
				_data: "hello",
			},
		},
	},
});

describe("ClassicyFileSystem — prototype pollution hardening", () => {
	describe("pathArray", () => {
		it("returns null when a segment is __proto__", () => {
			const fs = new ClassicyFileSystem("pollution-patharray-proto", fixture());
			expect(fs.pathArray("Macintosh HD:__proto__:pwned")).toBeNull();
		});

		it("returns null when a segment is constructor", () => {
			const fs = new ClassicyFileSystem("pollution-patharray-ctor", fixture());
			expect(fs.pathArray("Macintosh HD:constructor:prototype")).toBeNull();
		});

		it("returns null when a segment is prototype", () => {
			const fs = new ClassicyFileSystem(
				"pollution-patharray-proto-word",
				fixture(),
			);
			expect(fs.pathArray("Macintosh HD:prototype")).toBeNull();
		});

		it("returns the split segments for an ordinary path", () => {
			const fs = new ClassicyFileSystem("pollution-patharray-ok", fixture());
			expect(fs.pathArray("Macintosh HD:Documents")).toEqual([
				"Macintosh HD",
				"Documents",
			]);
		});
	});

	describe("resolve", () => {
		it("returns undefined instead of Object.prototype for constructor:prototype", () => {
			const fs = new ClassicyFileSystem(
				"pollution-resolve-ctor-proto",
				fixture(),
			);
			expect(fs.resolve("Macintosh HD:constructor:prototype")).toBeUndefined();
		});

		it("returns undefined for a path containing __proto__", () => {
			const fs = new ClassicyFileSystem("pollution-resolve-proto", fixture());
			expect(fs.resolve("Macintosh HD:__proto__:polluted")).toBeUndefined();
		});

		it("never walks the prototype chain, even for an inherited key like toString", () => {
			const fs = new ClassicyFileSystem(
				"pollution-resolve-tostring",
				fixture(),
			);
			expect(fs.resolve("Macintosh HD:toString")).toBeUndefined();
		});

		it("still resolves ordinary nested paths", () => {
			const fs = new ClassicyFileSystem("pollution-resolve-ok", fixture());
			expect(fs.resolve("Macintosh HD:Documents:Read Me.txt")._data).toBe(
				"hello",
			);
		});
	});

	describe("setMetadata", () => {
		it("returns false and adds no key to Object.prototype for constructor:prototype", () => {
			const fs = new ClassicyFileSystem(
				"pollution-setmeta-ctor-proto",
				fixture(),
			);
			const result = fs.setMetadata("Macintosh HD:constructor:prototype", {
				_label: "pwned",
			});
			expect(result).toBe(false);
			expect(Object.hasOwn(Object.prototype, "_label")).toBe(false);
			expect(({} as Record<string, unknown>)._label).toBeUndefined();
		});

		it("returns false and adds no key to Object.prototype for a __proto__ path", () => {
			const fs = new ClassicyFileSystem("pollution-setmeta-proto", fixture());
			const result = fs.setMetadata("Macintosh HD:__proto__", {
				_label: "pwned",
			});
			expect(result).toBe(false);
			expect(({} as Record<string, unknown>)._label).toBeUndefined();
		});
	});

	describe("mkDir", () => {
		it("adds no key to Object.prototype for a __proto__ segment", () => {
			const fs = new ClassicyFileSystem("pollution-mkdir-proto", fixture());
			fs.mkDir("Macintosh HD:__proto__:pwned");
			expect(({} as Record<string, unknown>).pwned).toBeUndefined();
			expect(Object.hasOwn(Object.prototype, "pwned")).toBe(false);
		});

		it("does not create a resolvable entry for the rejected path", () => {
			const fs = new ClassicyFileSystem(
				"pollution-mkdir-unresolvable",
				fixture(),
			);
			fs.mkDir("Macintosh HD:__proto__:pwned");
			expect(fs.resolve("Macintosh HD:__proto__:pwned")).toBeUndefined();
		});

		it("still creates ordinary directories", () => {
			const fs = new ClassicyFileSystem("pollution-mkdir-ok", fixture());
			fs.mkDir("Macintosh HD:Projects");
			expect(fs.resolve("Macintosh HD:Projects")._type).toBe("directory");
		});
	});
});
