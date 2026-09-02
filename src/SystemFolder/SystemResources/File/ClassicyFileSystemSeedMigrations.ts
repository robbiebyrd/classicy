import type { ClassicyFileSystemEntry } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";

/**
 * One-time, idempotent corrections applied to a *returning* visitor's
 * persisted filesystem tree — the tree that ClassicyFileSystem's constructor
 * loads wholesale from localStorage, bypassing whatever the current default
 * content looks like. Fixing DefaultFileSystem.ts (or classicy's own
 * DefaultFSContent) only ever reaches a fresh visitor; these migrations are
 * the mechanism for reaching everyone else.
 *
 * Every op is guarded so it can never clobber a visitor's own changes or
 * double-apply: rename/add refuse to touch an already-occupied destination,
 * replace/delete only fire when the current `_data` exactly matches the
 * known-old value they're correcting.
 */
export type ClassicyFileSystemSeedMigration =
	| { op: "rename"; from: string; to: string }
	| { op: "replace"; path: string; ifData: string; data: string }
	| { op: "delete"; path: string; ifData?: string }
	| { op: "add"; path: string; entry: ClassicyFileSystemEntry };

// Mirrors ClassicyFileSystem's own FORBIDDEN_PATH_SEGMENTS chokepoint. Kept
// as a local literal (rather than imported) because this module operates on
// a plain tree independent of any ClassicyFileSystem instance.
const FORBIDDEN_PATH_SEGMENTS = new Set([
	"__proto__",
	"constructor",
	"prototype",
]);

function splitPath(path: string, separator: string): string[] | null {
	const segments = path.split(separator).filter((segment) => segment !== "");
	if (segments.some((segment) => FORBIDDEN_PATH_SEGMENTS.has(segment))) {
		return null;
	}
	return segments;
}

type ParentRef = {
	parent: Record<string, ClassicyFileSystemEntry>;
	key: string;
};

/** Walks to the parent object holding `segments`' last key, own-properties only. */
function resolveParent(
	tree: ClassicyFileSystemEntry,
	segments: string[],
): ParentRef | null {
	if (segments.length === 0) return null;
	const key = segments[segments.length - 1];
	let parent: unknown = tree;
	for (const segment of segments.slice(0, -1)) {
		if (
			!parent ||
			typeof parent !== "object" ||
			!Object.hasOwn(parent, segment)
		) {
			return null;
		}
		parent = (parent as Record<string, unknown>)[segment];
	}
	if (!parent || typeof parent !== "object") return null;
	return { parent: parent as Record<string, ClassicyFileSystemEntry>, key };
}

function applyRename(
	tree: ClassicyFileSystemEntry,
	migration: Extract<ClassicyFileSystemSeedMigration, { op: "rename" }>,
	separator: string,
): void {
	const fromSegments = splitPath(migration.from, separator);
	const toSegments = splitPath(migration.to, separator);
	if (!fromSegments || !toSegments) return;

	const source = resolveParent(tree, fromSegments);
	if (!source || !Object.hasOwn(source.parent, source.key)) return;

	const target = resolveParent(tree, toSegments);
	if (!target || Object.hasOwn(target.parent, target.key)) return;

	const entry = source.parent[source.key];
	delete source.parent[source.key];
	target.parent[target.key] = entry;
	classicyLog(
		"info",
		"ClassicyFileSystemSeedMigrations",
		`renamed "${migration.from}" to "${migration.to}"`,
	);
}

function applyReplace(
	tree: ClassicyFileSystemEntry,
	migration: Extract<ClassicyFileSystemSeedMigration, { op: "replace" }>,
	separator: string,
): void {
	const segments = splitPath(migration.path, separator);
	if (!segments) return;

	const ref = resolveParent(tree, segments);
	if (!ref || !Object.hasOwn(ref.parent, ref.key)) return;

	const entry = ref.parent[ref.key];
	if (!entry || entry._data !== migration.ifData) return;

	entry._data = migration.data;
	classicyLog(
		"info",
		"ClassicyFileSystemSeedMigrations",
		`replaced stale content at "${migration.path}"`,
	);
}

function applyDelete(
	tree: ClassicyFileSystemEntry,
	migration: Extract<ClassicyFileSystemSeedMigration, { op: "delete" }>,
	separator: string,
): void {
	const segments = splitPath(migration.path, separator);
	if (!segments) return;

	const ref = resolveParent(tree, segments);
	if (!ref || !Object.hasOwn(ref.parent, ref.key)) return;

	if (migration.ifData !== undefined) {
		const entry = ref.parent[ref.key];
		if (!entry || entry._data !== migration.ifData) return;
	}

	delete ref.parent[ref.key];
	classicyLog(
		"info",
		"ClassicyFileSystemSeedMigrations",
		`deleted stale entry at "${migration.path}"`,
	);
}

function applyAdd(
	tree: ClassicyFileSystemEntry,
	migration: Extract<ClassicyFileSystemSeedMigration, { op: "add" }>,
	separator: string,
): void {
	const segments = splitPath(migration.path, separator);
	if (!segments) return;

	const ref = resolveParent(tree, segments);
	if (!ref || Object.hasOwn(ref.parent, ref.key)) return;

	ref.parent[ref.key] = migration.entry;
	classicyLog(
		"info",
		"ClassicyFileSystemSeedMigrations",
		`added missing entry at "${migration.path}"`,
	);
}

/**
 * Applies each migration, in order, directly against `tree`. Safe to call on
 * every boot: every op is a guarded no-op once it no longer applies (already
 * fixed, source missing, or a visitor's own edit shadows it).
 */
export function applyClassicyFileSystemSeedMigrations(
	// biome-ignore lint/suspicious/noExplicitAny: mirrors ClassicyFileSystem's own defaultFS param — fixture/default trees don't conform to ClassicyFileSystemEntry's strict _type at every literal call site
	tree: any,
	migrations: ClassicyFileSystemSeedMigration[] | undefined,
	separator: string = ":",
): void {
	if (!migrations || migrations.length === 0) return;
	for (const migration of migrations) {
		switch (migration.op) {
			case "rename":
				applyRename(tree, migration, separator);
				break;
			case "replace":
				applyReplace(tree, migration, separator);
				break;
			case "delete":
				applyDelete(tree, migration, separator);
				break;
			case "add":
				applyAdd(tree, migration, separator);
				break;
		}
	}
}
