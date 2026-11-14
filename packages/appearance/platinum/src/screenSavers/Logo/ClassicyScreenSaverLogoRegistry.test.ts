import { afterEach, describe, expect, it, vi } from "vitest";
import {
	getClassicyScreenSaverLogo,
	listClassicyScreenSaverLogos,
	registerClassicyScreenSaverLogo,
	resolveClassicyScreenSaverLogo,
	subscribeClassicyScreenSaverLogos,
	unregisterClassicyScreenSaverLogo,
} from "./ClassicyScreenSaverLogoRegistry";

// Platinum's bundle carries the logo registry, and so does System 7's, which
// bundles the savers' registration module (design 0017-6me, "Screen savers";
// plan 0018-dbd §3.8). A host loading both evaluates the module twice; the two
// copies must be one registry, or a logo registered through Platinum's export
// would be missing from the Logo saver System 7's bundle registered last. The
// query makes the import a module of its own, evaluated again, as a second
// bundle's copy is.

type Registry = typeof import("./ClassicyScreenSaverLogoRegistry");
const loadCopy = async (name: string): Promise<Registry> => {
	const copy = `./ClassicyScreenSaverLogoRegistry.ts?${name}`;
	return import(/* @vite-ignore */ copy);
};

const BUILT_INS = ["berkeley-systems", "classicy", "startup-screen"];

afterEach(() => {
	for (const logo of listClassicyScreenSaverLogos())
		if (!BUILT_INS.includes(logo.id))
			unregisterClassicyScreenSaverLogo(logo.id);
});

describe("a second copy of the logo registry", () => {
	it("joins the first: its built-ins replace in place, three logos, not six", async () => {
		const before = listClassicyScreenSaverLogos().map((logo) => logo.id);
		expect(before).toEqual(BUILT_INS);
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyScreenSaverLogos(listener);
		const copy = await loadCopy("copy-built-ins");
		unsubscribe();
		expect(listClassicyScreenSaverLogos().map((logo) => logo.id)).toEqual(
			BUILT_INS,
		);
		// One list, read through either copy.
		expect(copy.listClassicyScreenSaverLogos()).toBe(
			listClassicyScreenSaverLogos(),
		);
		// The copy's registrations reached the first copy's subscribers.
		expect(listener).toHaveBeenCalled();
	});

	it("sees a logo registered through the other, both ways, and its removal", async () => {
		const copy = await loadCopy("copy-register");
		const listener = vi.fn();
		const unsubscribe = copy.subscribeClassicyScreenSaverLogos(listener);
		registerClassicyScreenSaverLogo({
			id: "host-mark",
			name: "Host Mark",
			src: "/host.png",
		});
		expect(copy.getClassicyScreenSaverLogo("host-mark")?.src).toBe("/host.png");
		expect(copy.resolveClassicyScreenSaverLogo("host-mark")?.id).toBe(
			"host-mark",
		);
		expect(listener).toHaveBeenCalledTimes(1);
		copy.registerClassicyScreenSaverLogo({
			id: "other-mark",
			name: "Other Mark",
			src: "/other.png",
		});
		expect(getClassicyScreenSaverLogo("other-mark")?.name).toBe("Other Mark");
		expect(resolveClassicyScreenSaverLogo("other-mark")?.id).toBe("other-mark");
		expect(unregisterClassicyScreenSaverLogo("other-mark")).toBe(true);
		expect(copy.getClassicyScreenSaverLogo("other-mark")).toBeUndefined();
		unsubscribe();
		expect(listener).toHaveBeenCalledTimes(3);
	});
});
