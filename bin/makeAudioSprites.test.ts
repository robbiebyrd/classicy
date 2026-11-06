import { execFileSync } from "node:child_process";
import {
	chmodSync,
	existsSync,
	mkdirSync,
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
// written. A second group runs it against a scratch sound pack, with an
// audiosprite stand-in that writes placeholder outputs and calls the `ffmpeg`
// the script puts first on PATH, to pin the bit-exact flags and the skip when
// no source changed (a byte-identical rebuild; the real-encoder check is in
// the story report, as it is too slow for the suite).

let stubs = "";

afterEach(() => {
	if (stubs) rmSync(stubs, { recursive: true, force: true });
	stubs = "";
});

const runWithStubs = (): { calls: string[]; out: string } => {
	stubs = mkdtempSync(path.join(tmpdir(), "classicy-audio-"));
	const log = path.join(stubs, "calls.log");
	// Outputs go to a scratch directory: a finished run stamps its pack, and the
	// committed stamp must keep describing the committed sprites.
	const out = path.join(stubs, "out");
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
	// audiosprite stand-in: records its arguments.
	const audiosprite = path.join(stubs, "audiosprite");
	writeFileSync(
		audiosprite,
		`#!/bin/sh\n{ printf '%s' audiosprite; for a in "$@"; do printf ' %s' "$a"; done; echo; } >> "${log}"\nwhile [ $# -gt 0 ]; do [ "$1" = "-o" ] && mkdir -p "$(dirname "$2")"; shift; done\n`,
	);
	chmodSync(audiosprite, 0o755);
	execFileSync(
		"bash",
		[
			"bin/make_audio_sprites.sh",
			"./packages/appearance/platinum/src/assets/sounds",
			out,
		],
		{
			env: {
				...process.env,
				PATH: `${stubs}:${process.env.PATH}`,
				AUDIOSPRITE_BIN: audiosprite,
			},
			stdio: "pipe",
		},
	);
	return { calls: readFileSync(log, "utf8").trim().split("\n"), out };
};

describe("pnpm build:audio", () => {
	it("is bin/make_audio_sprites.sh with its defaults, and the watcher follows the sprites", () => {
		const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
		expect(scripts["build:audio"]).toBe("./bin/make_audio_sprites.sh");
		expect(scripts["build:watchaudio"]).toContain(
			'--watch "packages/appearance/platinum/src/assets/sounds/**"',
		);
		expect(scripts["build:watchaudio"]).not.toMatch(/"assets\/sounds/);
	});

	it("runs a pinned audiosprite, never one fetched from the network", () => {
		const pkg = JSON.parse(readFileSync("package.json", "utf8"));
		expect(pkg.devDependencies.audiosprite).toMatch(/^\d+\.\d+\.\d+$/);
		const script = readFileSync("bin/make_audio_sprites.sh", "utf8");
		expect(script).not.toMatch(/\bnpx\b.*audiosprite/);
		expect(script).toContain("./node_modules/.bin/audiosprite");
	});

	it("builds Platinum's pack from the package's sprites, beside them", () => {
		const { calls, out } = runWithStubs();
		const dir = "./packages/appearance/platinum/src/assets/sounds";
		expect(calls).toHaveLength(2);
		expect(calls[0]).toMatch(/^audiosprite -f howler2 /);
		expect(calls[0]).toContain(` -o ${out}/platinum/platinum `);
		expect(calls[0]).toContain(" -e ogg,m4a,mp3,ac3 ");
		expect(calls[0].endsWith(` ${dir}/platinum/sprites/*.mp3`)).toBe(true);
		// The JSON rewrite (id, name, relative src) of the pack it wrote.
		expect(calls[1].endsWith(` ${out}/platinum/platinum.json`)).toBe(true);
	});
});

describe("deterministic, change-driven sprites", () => {
	let work = "";
	afterEach(() => {
		if (work) rmSync(work, { recursive: true, force: true });
		work = "";
	});

	// A scratch pack "tone" with one source; returns a runner that reports the
	// stand-in audiosprite's runs and the flags its ffmpeg encode call got.
	const setup = () => {
		work = mkdtempSync(path.join(tmpdir(), "classicy-audio-pack-"));
		const sounds = path.join(work, "sounds");
		mkdirSync(path.join(sounds, "tone", "sprites"), { recursive: true });
		writeFileSync(path.join(sounds, "tone", "sprites", "A.mp3"), "source-a");
		const log = path.join(work, "ffmpeg.log");
		const bin = path.join(work, "bin");
		mkdirSync(bin);
		const write = (name: string, body: string) => {
			writeFileSync(path.join(bin, name), body);
			chmodSync(path.join(bin, name), 0o755);
		};
		// "Real" ffmpeg: records the arguments it finally gets.
		write("ffmpeg", `#!/bin/sh\necho "$*" >> "${log}"\n`);
		// audiosprite: writes the outputs, encoding through PATH's ffmpeg (the
		// script's shim), the way audiosprite does.
		write(
			"audiosprite",
			`#!/bin/sh
out=""; while [ $# -gt 0 ]; do [ "$1" = "-o" ] && out="$2"; shift; done
mkdir -p "$(dirname "$out")"
for ext in ogg m4a mp3 ac3; do ffmpeg -y -ar 44100 -f s16le -i in.raw "$out.$ext"; echo bytes > "$out.$ext"; done
echo '{"src":["x/tone.ogg"],"sprite":{}}' > "$out.json"
`,
		);
		// `node` (the JSON rewrite) is not needed: the stand-in's JSON is final.
		write("node", "#!/bin/sh\nexit 0\n");
		const run = (extraEnv: Record<string, string> = {}): string[] => {
			if (existsSync(log)) writeFileSync(log, "");
			execFileSync("bash", ["bin/make_audio_sprites.sh", sounds, sounds], {
				env: {
					...process.env,
					PATH: `${bin}:${process.env.PATH}`,
					AUDIOSPRITE_BIN: path.join(bin, "audiosprite"),
					...extraEnv,
				},
				stdio: "pipe",
			});
			return existsSync(log)
				? readFileSync(log, "utf8").trim().split("\n").filter(Boolean)
				: [];
		};
		return { sounds, run };
	};

	it("encodes bit-exact with no metadata, flags placed just before the output", () => {
		const { run } = setup();
		const encodes = run();
		expect(encodes).toHaveLength(4);
		for (const line of encodes) {
			expect(line).toMatch(
				/^-y -ar 44100 -f s16le -i in\.raw -fflags \+bitexact -map_metadata -1 \S+tone\.(ogg|m4a|mp3|ac3)$/,
			);
		}
	});

	it("skips the encode when the sources and script are unchanged", () => {
		const { sounds, run } = setup();
		expect(run()).toHaveLength(4);
		const stamp = path.join(sounds, "tone", "tone.sprites.sha256");
		expect(readFileSync(stamp, "utf8").trim()).toMatch(/^[0-9a-f]{64}$/);
		const before = readFileSync(path.join(sounds, "tone", "tone.ogg"));
		expect(run()).toHaveLength(0);
		expect(readFileSync(path.join(sounds, "tone", "tone.ogg"))).toEqual(before);
	});

	it("re-encodes when a source changes, an output is missing, or it is forced", () => {
		const { sounds, run } = setup();
		run();
		expect(run()).toHaveLength(0);
		writeFileSync(path.join(sounds, "tone", "sprites", "A.mp3"), "changed");
		expect(run()).toHaveLength(4);
		expect(run()).toHaveLength(0);
		writeFileSync(path.join(sounds, "tone", "sprites", "B.mp3"), "added");
		expect(run()).toHaveLength(4);
		rmSync(path.join(sounds, "tone", "tone.m4a"));
		expect(run()).toHaveLength(4);
		expect(run()).toHaveLength(0);
		expect(run({ CLASSICY_AUDIO_FORCE: "1" })).toHaveLength(4);
	});
});
