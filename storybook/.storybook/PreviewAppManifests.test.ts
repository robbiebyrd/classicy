// Storybook's preview must register exactly the app manifests (and so the
// reducers, routed by each manifest's prefixes) that a host gets from
// `import "@classicy/classicy"`, so a story dispatching an app's action reaches its
// reducer with no extra import (story 0097-p8k). Each side is loaded into a
// fresh module registry, so the two never see each other's registrations.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
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

// The registrations survive a production build only if the bundler keeps
// the bare imports that make them: the package's `sideEffects` list marks
// every other module of the core free of side effects, so a module imported
// for its top-level `registerApp` call alone is dropped unless it is listed
// (a static import elsewhere happening to use one of its exports kept them
// so far, which one new import into a shared module undid). The list must
// hold the bundled-apps module and every module it imports.
describe("the bundled apps' registrations in a production build", () => {
	const root = resolve(__dirname, "../..");
	const sideEffects: string[] = JSON.parse(
		readFileSync(resolve(root, "package.json"), "utf8"),
	).sideEffects;
	const BUNDLED = "src/SystemFolder/ClassicyBundledApps.internal.ts";
	const imported = [
		...readFileSync(resolve(root, BUNDLED), "utf8").matchAll(
			/^import "@\/(.+?)";$/gm,
		),
	].map(([, path]) => {
		const file = [".ts", ".tsx"]
			.map((ext) => `src/${path}${ext}`)
			.find((candidate) => existsSync(resolve(root, candidate)));
		if (!file) throw new Error(`${path} imported by ${BUNDLED} not found`);
		return file;
	});

	it("lists the bundled-apps module and each module it imports in sideEffects", () => {
		expect(imported.length).toBeGreaterThanOrEqual(18);
		for (const file of [BUNDLED, ...imported])
			expect(sideEffects, file).toContain(`./${file}`);
	});

	it("imports the bundled-apps module from the preview", () => {
		expect(readFileSync(resolve(__dirname, "preview.tsx"), "utf8")).toMatch(
			/^import "@\/SystemFolder\/ClassicyBundledApps\.internal";$/m,
		);
	});
});
