// @vitest-environment node
import { describe, expect, it } from "vitest";
import { resolveSeedMigrations } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import type { ClassicyFileSystemTree } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyFileSystemSeedMigration } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemSeedMigrations";
import { DefaultFSSeedMigrations } from "@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem";

const hostTree = {
	"Host HD": { _type: "drive" },
} as unknown as ClassicyFileSystemTree;
const hostMigrations: ClassicyFileSystemSeedMigration[] = [
	{ op: "delete", path: "Host HD:Old.txt" },
];

describe("resolveSeedMigrations", () => {
	it("runs the core's migrations alone when the host passes none", () => {
		expect(resolveSeedMigrations(undefined, "merge", undefined)).toEqual(
			DefaultFSSeedMigrations,
		);
	});

	it("runs the core's migrations before the host's when the trees merge", () => {
		expect(resolveSeedMigrations(hostTree, "merge", hostMigrations)).toEqual([
			...DefaultFSSeedMigrations,
			...hostMigrations,
		]);
	});

	it("runs only the host's when its tree replaces the core's", () => {
		expect(
			resolveSeedMigrations(hostTree, "exclusive", hostMigrations),
		).toEqual(hostMigrations);
		expect(resolveSeedMigrations(hostTree, "exclusive", undefined)).toEqual([]);
	});

	it("still runs the core's in exclusive mode with no host tree, since the core's tree is seeded", () => {
		expect(resolveSeedMigrations(undefined, "exclusive", undefined)).toEqual(
			DefaultFSSeedMigrations,
		);
	});
});
