// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	listClassicyAppearancePackages,
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import * as ClassicyLog from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	activeClassicyScreenSaverPackageId,
	isClassicyScreenSaverOffered,
	listClassicyScreenSaversFor,
	resolveClassicyScreenSaverFor,
} from "./ClassicyScreenSaverOffer";
import {
	type ClassicyScreenSaverDefinition,
	registerClassicyScreenSaver,
	resetClassicyScreenSaversForTests,
} from "./ClassicyScreenSaverRegistry";

const component = () => null;
let n = 0;
// Ids are unique per test: the saver registry has no reset, and its entries
// would otherwise leak between cases.
const uid = (name: string) => `${name}-${++n}`;
const saver = (
	id: string,
	packages?: string[],
	name = id,
): ClassicyScreenSaverDefinition =>
	registerClassicyScreenSaver({ id, name, component, packages });

const LAYOUT: ClassicyAppearancePackage["layout"] = {
	window: { growBoxCorner: "bottom-right" },
	menuBar: { placement: "screen" },
	desktop: { iconGridOrigin: "top-right" },
};
const pkg = (
	id: string,
	extra: Partial<ClassicyAppearancePackage> = {},
): ClassicyAppearancePackage => ({
	id,
	name: id,
	css: "",
	defaults: { ...structuredClone(CLASSICY_CORE_DEFAULT_THEME), package: id },
	layout: LAYOUT,
	...extra,
});

afterEach(() => {
	resetClassicyScreenSaversForTests();
	resetClassicyAppearancePackagesForTests();
	vi.restoreAllMocks();
});

describe("screen saver offers", () => {
	it("a saver naming no packages is offered under every package", () => {
		const s = saver(uid("any"));
		expect(isClassicyScreenSaverOffered(s, "a")).toBe(true);
		expect(isClassicyScreenSaverOffered(s, "b")).toBe(true);
		const empty = saver(uid("empty"), []);
		expect(isClassicyScreenSaverOffered(empty, "a")).toBe(true);
		expect(listClassicyScreenSaversFor("zzz").map((x) => x.id)).toContain(s.id);
	});

	it('a saver naming ["a"] is offered only under "a"', () => {
		const s = saver(uid("only-a"), ["a"]);
		expect(isClassicyScreenSaverOffered(s, "a")).toBe(true);
		expect(isClassicyScreenSaverOffered(s, "b")).toBe(false);
		expect(listClassicyScreenSaversFor("b").map((x) => x.id)).not.toContain(
			s.id,
		);
	});

	it("lists offered savers sorted by name", () => {
		const p = uid("sorted");
		saver(uid("z"), [p], "Zed");
		saver(uid("a"), [p], "Ay");
		expect(listClassicyScreenSaversFor(p).map((x) => x.name)).toEqual([
			"Ay",
			"Zed",
		]);
	});

	it("the stored choice wins when offered", () => {
		const p = uid("pk");
		const first = saver(uid("first"), [p]);
		const second = saver(uid("second"), [p]);
		registerClassicyAppearancePackage(pkg(p, { defaultScreenSaver: first.id }));
		expect(resolveClassicyScreenSaverFor(p, second.id)?.id).toBe(second.id);
	});

	it("the package default stands in when the stored choice belongs to another package, and the stored value is untouched", () => {
		const p = uid("pk");
		const other = uid("other");
		const foreign = saver(uid("foreign"), [other]);
		saver(uid("early"), [p]);
		const def = saver(uid("def"), [p]);
		registerClassicyAppearancePackage(pkg(p, { defaultScreenSaver: def.id }));
		const stored = { selectedSaver: foreign.id };
		expect(resolveClassicyScreenSaverFor(p, stored.selectedSaver)?.id).toBe(
			def.id,
		);
		expect(stored.selectedSaver).toBe(foreign.id);
		// Back under its own package the stored choice is in effect again.
		expect(resolveClassicyScreenSaverFor(other, stored.selectedSaver)?.id).toBe(
			foreign.id,
		);
	});

	it("the first offered saver in registration order is used when neither is offered", () => {
		const p = uid("pk");
		const zed = saver(uid("zed"), [p], "Zed");
		saver(uid("ay"), [p], "Ay");
		registerClassicyAppearancePackage(pkg(p));
		expect(resolveClassicyScreenSaverFor(p, "missing")?.id).toBe(zed.id);
	});

	it("a package offering none resolves to undefined", () => {
		saver(uid("scoped"), ["elsewhere"]);
		expect(listClassicyScreenSaversFor("nowhere")).toEqual([]);
		expect(resolveClassicyScreenSaverFor("nowhere", "unknown")).toBeUndefined();
	});

	it("re-registering an id replaces its packages", () => {
		const id = uid("re");
		const s1 = saver(id, ["a"]);
		expect(isClassicyScreenSaverOffered(s1, "b")).toBe(false);
		saver(id, ["b"]);
		expect(listClassicyScreenSaversFor("b").map((x) => x.id)).toContain(id);
		expect(listClassicyScreenSaversFor("a").map((x) => x.id)).not.toContain(id);
	});

	it("a package whose defaultScreenSaver is unregistered logs one classicyLog warning and still registers", () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		const p = uid("warned");
		const p2 = pkg(p, { defaultScreenSaver: "no-such-saver" });
		registerClassicyAppearancePackage(p2);
		registerClassicyAppearancePackage(p2);
		const warns = log.mock.calls.filter(
			(c) => c[0] === "warn" && String(c[2]).includes("no-such-saver"),
		);
		expect(warns).toHaveLength(1);
		expect(warns[0][1]).toBe("ClassicyAppearance");
		expect(listClassicyAppearancePackages().map((x) => x.id)).toContain(p);
	});

	it("does not warn when the default is registered and offered", () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		const p = uid("quiet");
		const s = saver(uid("ok"), [p]);
		registerClassicyAppearancePackage(pkg(p, { defaultScreenSaver: s.id }));
		expect(log.mock.calls.filter((c) => c[0] === "warn")).toHaveLength(0);
	});

	it("warns when the default is registered but offered only under another package", () => {
		const log = vi.spyOn(ClassicyLog, "classicyLog");
		const p = uid("loud");
		const s = saver(uid("else"), ["elsewhere"]);
		registerClassicyAppearancePackage(pkg(p, { defaultScreenSaver: s.id }));
		expect(log.mock.calls.filter((c) => c[0] === "warn")).toHaveLength(1);
	});
});

describe("activeClassicyScreenSaverPackageId", () => {
	const state = (packageId: string) =>
		({
			System: { Manager: { Appearance: { packageId } } },
		}) as unknown as Parameters<typeof activeClassicyScreenSaverPackageId>[0];

	it("resolves the state's registered package id", () => {
		registerClassicyAppearancePackage(pkg("platinum"));
		registerClassicyAppearancePackage(pkg("other-pk"));
		expect(activeClassicyScreenSaverPackageId(state("other-pk"))).toBe(
			"other-pk",
		);
	});

	it("falls back to the default package for an unregistered id", () => {
		registerClassicyAppearancePackage(pkg("platinum"));
		expect(activeClassicyScreenSaverPackageId(state("gone"))).toBe("platinum");
	});

	it("is the default id when nothing is registered", () => {
		expect(activeClassicyScreenSaverPackageId(state("gone"))).toBe("platinum");
	});
});
