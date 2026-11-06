import { execFileSync } from "node:child_process";
import {
	chmodSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// `pnpm build:audio` (bin/make_audio_sprites.sh) builds the sound packs where
// they live: Platinum's package (plan 0015-kxa §3.3), since the core ships no
// sprites. The script is run with stand-ins for `npx` (audiosprite, which
// needs ffmpeg; released sprites come from CI's distro ffmpeg) and `node` (its
// JSON rewrite), which only record their arguments, so nothing is encoded or
// written.

let stubs = "";

afterEach(() => {
	if (stubs) rmSync(stubs, { recursive: true, force: true });
	stubs = "";
});

const runWithStubs = (): string[] => {
	stubs = mkdtempSync(path.join(tmpdir(), "classicy-audio-"));
	const log = path.join(stubs, "calls.log");
	for (const tool of ["npx", "node"]) {
		const file = path.join(stubs, tool);
		writeFileSync(
			file,
			// One line per call; an argument's own newlines (node -e's script)
			// become spaces.
			`#!/bin/sh\n{ printf '%s' "${tool}"; for a in "$@"; do printf ' %s' "$a" | tr '\\n' ' '; done; echo; } >> "${log}"\n`,
		);
		chmodSync(file, 0o755);
	}
	execFileSync("bash", ["bin/make_audio_sprites.sh"], {
		env: { ...process.env, PATH: `${stubs}:${process.env.PATH}` },
		stdio: "pipe",
	});
	return readFileSync(log, "utf8").trim().split("\n");
};

describe("pnpm build:audio", () => {
	it("is bin/make_audio_sprites.sh with its defaults, and the watcher follows the sprites", () => {
		const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
		expect(scripts["build:audio"]).toBe("./bin/make_audio_sprites.sh");
		expect(scripts["build:watchaudio"]).toContain(
			'--watch "packages/appearance/platinum/assets/sounds/**"',
		);
		expect(scripts["build:watchaudio"]).not.toMatch(/"assets\/sounds/);
	});

	it("builds Platinum's pack from the package's sprites, beside them", () => {
		const calls = runWithStubs();
		const dir = "./packages/appearance/platinum/assets/sounds";
		expect(calls).toHaveLength(2);
		expect(calls[0]).toMatch(/^npx -y audiosprite -f howler2 /);
		expect(calls[0]).toContain(` -o ${dir}/platinum/platinum `);
		expect(calls[0]).toContain(" -e ogg,m4a,mp3,ac3 ");
		expect(calls[0].endsWith(` ${dir}/platinum/sprites/*.mp3`)).toBe(true);
		// The JSON rewrite (id, name, relative src) of the pack it wrote.
		expect(calls[1].endsWith(` ${dir}/platinum/platinum.json`)).toBe(true);
	});
});
