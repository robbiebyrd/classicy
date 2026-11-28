import { execFileSync, spawnSync } from "node:child_process";
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
// the story report, as it is too slow for the suite). A third, on the same
// scratch packs, pins a stamp that no locale reorders and the restamp mode
// (CLASSICY_AUDIO_RESTAMP=1), which rewrites stamps and encodes nothing
// (plan 0019-fb7 §4.1).

let stubs = "";

afterEach(() => {
	if (stubs) rmSync(stubs, { recursive: true, force: true });
	stubs = "";
});

const runWithStubs = (
	dir = "./packages/appearance/platinum/src/assets/sounds",
	extra: string[] = [],
): { calls: string[]; out: string } => {
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
	execFileSync("bash", ["bin/make_audio_sprites.sh", dir, out, ...extra], {
		env: {
			...process.env,
			PATH: `${stubs}:${process.env.PATH}`,
			AUDIOSPRITE_BIN: audiosprite,
		},
		stdio: "pipe",
	});
	return { calls: readFileSync(log, "utf8").trim().split("\n"), out };
};

describe("pnpm build:audio", () => {
	it("is bin/make_audio_sprites.sh with its defaults, then System 7's and Windows 98's WAVs, and the watcher follows the sprites", () => {
		const { scripts } = JSON.parse(readFileSync("package.json", "utf8"));
		// System 7's pack (plan 0018-dbd §4.2) is built from WAV sources with no
		// looping sprite: "," is a loop list with no names (an empty argument
		// would take the script's default, Platinum's four loops).
		expect(scripts["build:audio"]).toBe(
			"./bin/make_audio_sprites.sh && ./bin/make_audio_sprites.sh ./packages/appearance/system7/src/assets/sounds ./packages/appearance/system7/src/assets/sounds wav ogg,m4a , && ./bin/make_audio_sprites.sh ./packages/appearance/windows98/src/assets/sounds ./packages/appearance/windows98/src/assets/sounds wav ogg,m4a ,",
		);
		for (const pkg of ["platinum", "system7", "windows98"])
			expect(scripts["build:watchaudio"]).toContain(
				`--watch "packages/appearance/${pkg}/src/assets/sounds/**"`,
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
		expect(calls[0]).toContain(" -e ogg,m4a ");
		expect(calls[0].endsWith(` ${dir}/platinum/sprites/*.mp3`)).toBe(true);
		// The JSON rewrite (id, name, relative src) of the pack it wrote.
		expect(calls[1].endsWith(` ${out}/platinum/platinum.json`)).toBe(true);
	});

	it("builds System 7's pack from its WAV sprites, with no looping sprite", () => {
		const dir = "./packages/appearance/system7/src/assets/sounds";
		const { calls, out } = runWithStubs(dir, ["wav", "ogg,m4a", ","]);
		expect(calls).toHaveLength(2);
		expect(calls[0]).toContain(` -o ${out}/system7/system7 `);
		expect(calls[0]).toContain(" -e ogg,m4a ");
		expect(calls[0]).not.toContain("--loop");
		expect(calls[0].endsWith(` ${dir}/system7/sprites/*.wav`)).toBe(true);
		expect(calls[1].endsWith(` ${out}/system7/system7.json`)).toBe(true);
	});
});

describe("an empty loop list under set -u", () => {
	// macOS's /bin/bash is 3.2, where a bare "${a[@]}" of an empty array is an
	// unbound variable under `set -u` (bash 4.4 and later expand it to
	// nothing). System 7's loop list (",") names no sprite, so its array is
	// empty: every array expansion carries the `${a[@]+"${a[@]}"}` guard.
	const script = readFileSync("bin/make_audio_sprites.sh", "utf8");

	it("expands no array bare", () => {
		const code = script
			.split("\n")
			.filter((line) => !line.trim().startsWith("#"))
			.join("\n");
		const bare = [...code.matchAll(/(.)"\$\{(\w+)\[@\]\}"/g)].filter(
			([, before, name]) =>
				before !== "+" || !script.includes(`\${${name}[@]+"\${${name}[@]}"}`),
		);
		expect(bare.map(([match]) => match)).toEqual([]);
	});

	it('builds no --loop argument from "," or a lone name\'s empty fields', () => {
		// The script's own loop-list lines, run under set -u.
		const all = script.split("\n");
		const start = all.findIndex((line) => line.startsWith("loop_args=()"));
		const lines = all.slice(start, start + 5).join("\n");
		expect(lines).toContain("loop_args+=(--loop");
		const run = (loops: string) =>
			execFileSync(
				"bash",
				[
					"-c",
					`set -euo pipefail\nloops=$1\n${lines}\nprintf '[%s]' x \${loop_args[@]+"\${loop_args[@]}"}`,
					"bash",
					loops,
				],
				{ encoding: "utf8" },
			);
		expect(run(",")).toBe("[x]");
		expect(run("A,,B")).toBe("[x][--loop][A][--loop][B]");
	});
});

let work = "";
afterEach(() => {
	if (work) rmSync(work, { recursive: true, force: true });
	work = "";
});

// Scratch packs, by default "tone" with one source. `invoke` runs the script
// and reports its exit status and output, the stand-in audiosprite's runs
// and the flags its ffmpeg encode calls got; `run` is `invoke` that must
// succeed, returning the encode calls. An `undefined` in the environment
// removes that variable.
const setup = (packs: Record<string, string[]> = { tone: ["A.mp3"] }) => {
	work = mkdtempSync(path.join(tmpdir(), "classicy-audio-pack-"));
	const sounds = path.join(work, "sounds");
	for (const [name, sources] of Object.entries(packs)) {
		mkdirSync(path.join(sounds, name, "sprites"), { recursive: true });
		for (const source of sources)
			writeFileSync(
				path.join(sounds, name, "sprites", source),
				`source-${source}`,
			);
	}
	const log = path.join(work, "ffmpeg.log");
	const calls = path.join(work, "audiosprite.log");
	const bin = path.join(work, "bin");
	mkdirSync(bin);
	const write = (name: string, body: string) => {
		writeFileSync(path.join(bin, name), body);
		chmodSync(path.join(bin, name), 0o755);
	};
	// "Real" ffmpeg: records the arguments it finally gets.
	write("ffmpeg", `#!/bin/sh\necho "$*" >> "${log}"\n`);
	// audiosprite: records its output base and writes the outputs, encoding
	// through PATH's ffmpeg (the script's shim), the way audiosprite does.
	write(
		"audiosprite",
		`#!/bin/sh
out=""; while [ $# -gt 0 ]; do [ "$1" = "-o" ] && out="$2"; shift; done
echo "$out" >> "${calls}"
mkdir -p "$(dirname "$out")"
for ext in ogg m4a; do ffmpeg -y -ar 44100 -f s16le -i in.raw "$out.$ext"; echo bytes > "$out.$ext"; done
echo '{"src":["x/tone.ogg"],"sprite":{}}' > "$out.json"
`,
	);
	// `node` (the JSON rewrite) is not needed: the stand-in's JSON is final.
	write("node", "#!/bin/sh\nexit 0\n");
	const lines = (file: string): string[] =>
		existsSync(file)
			? readFileSync(file, "utf8").trim().split("\n").filter(Boolean)
			: [];
	const invoke = (extraEnv: Record<string, string | undefined> = {}) => {
		for (const file of [log, calls])
			if (existsSync(file)) writeFileSync(file, "");
		const env = Object.fromEntries(
			Object.entries({
				...process.env,
				PATH: `${bin}:${process.env.PATH}`,
				AUDIOSPRITE_BIN: path.join(bin, "audiosprite"),
				...extraEnv,
			}).filter((entry): entry is [string, string] => entry[1] != null),
		);
		const result = spawnSync(
			"bash",
			["bin/make_audio_sprites.sh", sounds, sounds],
			{ env, encoding: "utf8" },
		);
		return {
			status: result.status,
			stdout: result.stdout,
			stderr: result.stderr,
			encodes: lines(log),
			audiosprite: lines(calls),
		};
	};
	const run = (extraEnv: Record<string, string | undefined> = {}) => {
		const result = invoke(extraEnv);
		if (result.status !== 0)
			throw new Error(
				`make_audio_sprites.sh exited ${result.status}: ${result.stderr}`,
			);
		return result.encodes;
	};
	const stampFile = (name: string) =>
		path.join(sounds, name, `${name}.sprites.sha256`);
	const stamp = (name = "tone") => readFileSync(stampFile(name), "utf8");
	return { sounds, invoke, run, stamp, stampFile };
};

describe("deterministic, change-driven sprites", () => {
	it("encodes bit-exact with no metadata, flags placed just before the output", () => {
		const { run } = setup();
		const encodes = run();
		expect(encodes).toHaveLength(2);
		for (const line of encodes) {
			expect(line).toMatch(
				/^-y -ar 44100 -f s16le -i in\.raw -fflags \+bitexact -map_metadata -1 \S+tone\.(ogg|m4a)$/,
			);
		}
	});

	it("skips the encode when the sources and script are unchanged", () => {
		const { sounds, run } = setup();
		expect(run()).toHaveLength(2);
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
		expect(run()).toHaveLength(2);
		expect(run()).toHaveLength(0);
		writeFileSync(path.join(sounds, "tone", "sprites", "B.mp3"), "added");
		expect(run()).toHaveLength(2);
		rmSync(path.join(sounds, "tone", "tone.m4a"));
		expect(run()).toHaveLength(2);
		expect(run()).toHaveLength(0);
		expect(run({ CLASSICY_AUDIO_FORCE: "1" })).toHaveLength(2);
	});
});

describe("locale-independent stamps and a restamp mode", () => {
	it("sets LC_ALL=C before its first glob", () => {
		// The behavioral check below needs an en_US.UTF-8 locale to tell the
		// orders apart (bash falls back to C without one); this one needs none.
		const lines = readFileSync("bin/make_audio_sprites.sh", "utf8")
			.split("\n")
			.filter((line) => !line.trim().startsWith("#"));
		const exported = lines.indexOf("export LC_ALL=C");
		expect(exported).toBeGreaterThan(-1);
		expect(exported).toBeLessThan(
			lines.findIndex((line) => /\bfor\b.*\bin\b.*\*/.test(line)),
		);
	});

	it("the stamp is the same under LANG=en_US.UTF-8 and LANG=C", () => {
		// en_US.UTF-8 collation passes over the dot, so a bash glob there lists
		// TabClickDown.mp3 before TabClick.mp3; C sorts by byte, TabClick first.
		// Platinum's pack holds these three names, prefixed "Classicy".
		const { run, stamp, stampFile } = setup({
			tone: ["TabClick.mp3", "TabClickDown.mp3", "TabClickUp.mp3"],
		});
		const under = (lang: string) => {
			rmSync(stampFile("tone"), { force: true });
			expect(
				run({ LANG: lang, LC_ALL: undefined, LC_COLLATE: undefined }),
			).toHaveLength(2);
			return stamp();
		};
		const english = under("en_US.UTF-8");
		expect(english).toMatch(/^[0-9a-f]{64}\n$/);
		expect(under("C")).toBe(english);
	});

	it("CLASSICY_AUDIO_RESTAMP=1 rewrites the stamp without calling audiosprite", () => {
		const { sounds, invoke, run, stamp, stampFile } = setup();
		expect(run()).toHaveLength(2);
		const built = stamp();
		const ogg = readFileSync(path.join(sounds, "tone", "tone.ogg"));
		writeFileSync(stampFile("tone"), "stale\n");
		const restamp = invoke({ CLASSICY_AUDIO_RESTAMP: "1" });
		expect(restamp.status).toBe(0);
		expect(restamp.audiosprite).toEqual([]);
		expect(restamp.encodes).toEqual([]);
		expect(restamp.stdout).toContain("audio: tone restamped");
		expect(stamp()).toBe(built);
		expect(readFileSync(path.join(sounds, "tone", "tone.ogg"))).toEqual(ogg);
		// From the current inputs: after a source changes, the restamp is the
		// stamp a build of the changed source writes.
		writeFileSync(path.join(sounds, "tone", "sprites", "A.mp3"), "changed");
		expect(invoke({ CLASSICY_AUDIO_RESTAMP: "1" }).audiosprite).toEqual([]);
		const restamped = stamp();
		expect(restamped).not.toBe(built);
		expect(run({ CLASSICY_AUDIO_FORCE: "1" })).toHaveLength(2);
		expect(stamp()).toBe(restamped);
	});

	it("CLASSICY_AUDIO_RESTAMP=1 fails when a listed output is missing", () => {
		const { sounds, invoke, run, stamp, stampFile } = setup({
			hum: ["A.mp3"],
			tone: ["A.mp3"],
		});
		run();
		for (const name of ["hum", "tone"])
			writeFileSync(stampFile(name), "stale\n");
		rmSync(path.join(sounds, "hum", "hum.m4a"));
		rmSync(path.join(sounds, "hum", "hum.json"));
		const result = invoke({ CLASSICY_AUDIO_RESTAMP: "1" });
		expect(result.status).not.toBe(0);
		expect(result.stderr).toContain(path.join(sounds, "hum", "hum.m4a"));
		expect(result.stderr).toContain(path.join(sounds, "hum", "hum.json"));
		expect(result.audiosprite).toEqual([]);
		// Nothing is written for the pack that lacks an output...
		expect(stamp("hum")).toBe("stale\n");
		expect(result.stdout).not.toContain("audio: hum restamped");
		// ...while a pack with all of its outputs is restamped all the same.
		expect(result.stdout).toContain("audio: tone restamped");
		expect(stamp("tone")).toMatch(/^[0-9a-f]{64}\n$/);
	});

	it("a restamped pack is up to date on the next run", () => {
		const { invoke, run, stampFile } = setup();
		run();
		writeFileSync(stampFile("tone"), "stale\n");
		const restamp = invoke({ CLASSICY_AUDIO_RESTAMP: "1" });
		expect(restamp.status).toBe(0);
		expect(restamp.stdout).toContain("audio: tone restamped");
		const next = invoke();
		expect(next.status).toBe(0);
		expect(next.stdout).toContain("audio: tone is up to date");
		expect(next.encodes).toEqual([]);
		expect(next.audiosprite).toEqual([]);
	});
});

describe("runs under macOS's bash 3.2", () => {
	// macOS ships /bin/bash 3.2, and both the script and its ffmpeg shim run
	// under `#!/bin/bash`. The script was run to completion under a GNU bash
	// 3.2.57 build for both packs (story 0203-9w6); this check needs no bash
	// 3.2: it refuses the constructs bash added after 3.2, so a later edit
	// that relies on one fails here rather than on a Mac.
	const NEWER_THAN_3_2: [string, RegExp, string][] = [
		[
			"associative array",
			/\b(?:declare|local|typeset)\s+-\w*A/,
			"declare -A m",
		],
		["mapfile/readarray", /\b(?:mapfile|readarray)\b/, "mapfile -t lines < f"],
		[
			"case modification",
			/\$\{\w+(?:\[[^\]]*\])?(?:,,?|\^\^?)\}/,
			`echo "\${x,,}"`,
		],
		["negative subscript", /\$\{\w+\[-\d+\]\}/, `echo "\${a[-1]}"`],
		["case fall-through", /;;&|;&/, "a) echo ;;&"],
		["|& and &>>", /\|&|&>>/, "cmd |& tee log"],
		["coproc", /\bcoproc\b/, "coproc cat"],
		["test -v", /(?:\[\[|\btest|\[)\s+-v\b/, "[[ -v name ]]"],
		[
			"nameref, global or case attribute",
			/\b(?:declare|local|typeset)\s+-\w*[nglcu]/,
			"declare -l x",
		],
		[
			"parameter transform",
			/\$\{\w+(?:\[[^\]]*\])?@[QEPAaKkUuL]\}/,
			`echo "\${x@Q}"`,
		],
		["printf %(…)T", /%\([^)]*\)T/, "printf '%(%F)T'"],
		["read -N", /\bread\s+(?:-\w+\s+)*-\w*N/, "read -N 1 c"],
		[
			"brace step or padding",
			/\{-?\d+\.\.-?\d+\.\.-?\d+\}|\{0\d*\.\.\d+\}/,
			"echo {01..10}",
		],
		["fd variable", /(?<!\$)\{\w+\}[<>]/, "exec {fd}>log"],
		["\\u escape", /\$'[^']*\\[uU][0-9a-fA-F]/, "echo $'\\u00e9'"],
		[
			"shopt added in 4",
			/\bshopt\s+-s\s+(?:globstar|lastpipe|autocd|checkjobs|direxpand|dirspell|globasciiranges|compat\d+)/,
			"shopt -s globstar",
		],
		["wait -n", /\bwait\s+-n\b/, "wait -n"],
		[
			"bash 4 variables",
			/\$\{?(?:EPOCHSECONDS|EPOCHREALTIME|BASHPID|BASH_ARGV0|SRANDOM)\b/,
			"echo $BASHPID",
		],
	];

	/** The constructs `code` uses that bash 3.2 lacks, by name. */
	const newerThan32 = (code: string): string[] => {
		const lines = code
			.split("\n")
			.filter((line) => !line.trim().startsWith("#"))
			.join("\n");
		return NEWER_THAN_3_2.filter(([, re]) => re.test(lines)).map(
			([name]) => name,
		);
	};

	it.each(NEWER_THAN_3_2)("recognizes %s", (name, _re, sample) => {
		expect(newerThan32(sample)).toContain(name);
	});

	it.each([
		["an expansion followed by a redirect", `echo x \${out}>file`],
		["a read-only declare", "declare -r x=1"],
		["a plain $'…' escape", "echo $'\\t'"],
	])("does not flag %s", (_label, sample) => {
		expect(newerThan32(sample)).toEqual([]);
	});

	it("uses none of them, in the script or its ffmpeg shim", () => {
		expect(
			newerThan32(readFileSync("bin/make_audio_sprites.sh", "utf8")),
		).toEqual([]);
	});
});
