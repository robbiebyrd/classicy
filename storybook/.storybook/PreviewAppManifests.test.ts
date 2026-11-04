// Storybook's preview must register exactly the app manifests (and so the
// reducers, routed by each manifest's prefixes) that a host gets from
// `import "classicy"`, so a story dispatching an app's action reaches its
// reducer with no extra import (story 0097-p8k). Each side is loaded into a
// fresh module registry, so the two never see each other's registrations.
import { describe, expect, it, vi } from "vitest";
import type { ClassicyAppManifest } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest";

type RegisteredApp = {
	id: string;
	description: string;
	prefixes: string[];
	actions: string[];
};

const summarize = (manifests: ClassicyAppManifest[]): RegisteredApp[] =>
	manifests
		.map((m) => ({
			id: m.id,
			// First-wins, like the prefixes' order, so both pin the order an app
			// spanning two modules (HyperCard.app) registers in.
			description: m.description,
			prefixes: m.prefixes,
			actions: Object.keys(m.actions).sort(),
		}))
		.sort((a, b) => a.id.localeCompare(b.id));

const libraryEntryApps = async () => {
	vi.resetModules();
	await import("@/index");
	const { listAppManifests } = await import(
		"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest"
	);
	return summarize(listAppManifests());
};

const previewApps = async () => {
	vi.resetModules();
	await import("./preview");
	const { listAppManifests } = await import(
		"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManifest"
	);
	return summarize(listAppManifests());
};

describe("Storybook preview app registrations", () => {
	it("registers the same app manifests as the library entry", async () => {
		const library = await libraryEntryApps();
		const preview = await previewApps();
		// Guard against two empty lists agreeing: the library entry registers
		// every bundled app, Movie Player's reducer included.
		expect(
			library.find((app) => app.id === "MoviePlayer.app")?.prefixes,
		).toEqual(["ClassicyAppMoviePlayer"]);
		expect(preview).toEqual(library);
	}, 60000);
});
