// Decodes System 7.5's `snd ` resources and writes them as WAV (plan
// 0018-dbd §4.2). A dev tool, not shipped: bin/export-assets.mjs runs it
// (Node strips the types; erasable syntax only).
//
// The formats follow Inside Macintosh: Sound (1994), chapter 2, "Sound
// Manager": a format 1 `snd ` lists its data types (each a synthesizer id
// and an init option), then its sound commands; a format 2 `snd ` has a
// reference count in place of the data types. Each command is 8 bytes:
// `cmd` (2), `param1` (2), `param2` (4). A sampled sound is a `bufferCmd`
// (or `soundCmd`) whose high bit (`dataOffsetFlag`) makes `param2` the
// offset of a sound header within the resource.

const DATA_OFFSET_FLAG = 0x8000;

// Sound command numbers (Inside Macintosh: Sound, "Sound Command Numbers").
export const SOUND_CMD = {
	nullCmd: 0,
	quietCmd: 3,
	waitCmd: 10,
	freqDurationCmd: 40,
	restCmd: 41,
	freqCmd: 42,
	ampCmd: 43,
	timbreCmd: 44,
	soundCmd: 80,
	bufferCmd: 81,
};

// Synthesizer ids (the data types of a format 1 `snd `).
export const SQUARE_WAVE_SYNTH = 1;
export const SAMPLED_SYNTH = 5;

/**
 * A `snd ` resource: its format, data types and commands, and, when a
 * command plays a buffer, that buffer's standard sound header as
 * `{ sampleRate, baseFrequency, samples }` (`samples` 8-bit offset binary,
 * as stored). Extended and compressed headers are refused: the System 7.5
 * alerts use none.
 */
export type SoundCommand = { cmd: number; param1: number; param2: number };

export type DecodedSound = {
	format: number;
	synths: { id: number; init: number }[];
	commands: SoundCommand[];
	sampled?: { sampleRate: number; baseFrequency: number; samples: Buffer };
};

export const decodeSound = (data: Buffer): DecodedSound => {
	const format = data.readUInt16BE(0);
	let at = 2;
	const synths: DecodedSound["synths"] = [];
	if (format === 1) {
		const count = data.readUInt16BE(at);
		at += 2;
		for (let i = 0; i < count; i++, at += 6)
			synths.push({
				id: data.readUInt16BE(at),
				init: data.readUInt32BE(at + 2),
			});
	} else if (format === 2) at += 2;
	else throw new Error(`snd format ${format} is not 1 or 2`);
	const count = data.readUInt16BE(at);
	at += 2;
	const commands: SoundCommand[] = [];
	for (let i = 0; i < count; i++, at += 8)
		commands.push({
			cmd: data.readUInt16BE(at),
			param1: data.readInt16BE(at + 2),
			param2: data.readUInt32BE(at + 4),
		});
	const play = commands.find(
		({ cmd }) =>
			(cmd & ~DATA_OFFSET_FLAG) === SOUND_CMD.bufferCmd ||
			(cmd & ~DATA_OFFSET_FLAG) === SOUND_CMD.soundCmd,
	);
	let sampled: DecodedSound["sampled"];
	if (play) {
		if (!(play.cmd & DATA_OFFSET_FLAG))
			throw new Error("snd buffer command holds a pointer, not an offset");
		const header = play.param2;
		const length = data.readUInt32BE(header + 4);
		const encode = data.readUInt8(header + 20);
		if (encode !== 0)
			throw new Error(`snd header encoding ${encode} is not stdSH (0)`);
		if (header + 22 + length > data.length)
			throw new Error(
				`snd resource is short: its header holds ${length} samples at ${header + 22}, the resource ${data.length} bytes`,
			);
		sampled = {
			sampleRate: data.readUInt32BE(header + 8) / 65536,
			baseFrequency: data.readUInt8(header + 21),
			samples: data.subarray(header + 22, header + 22 + length),
		};
	}
	return { format, synths, commands, sampled };
};

/** A MIDI note value's frequency in Hz (Sound Manager: 60 is middle C). */
export const noteFrequency = (note: number): number =>
	440 * 2 ** ((note - 69) / 12);

/**
 * The square-wave synthesizer's sample at `phase` (0–1) of a cycle, for an
 * amplitude of 0–255, as 8-bit unsigned (128 is silence). Inside Macintosh:
 * Sound documents only that the timbre runs from "a clear tone" (0) to "a
 * buzzing tone" (254); System 7.5.5's Sound Manager, recorded playing Simple
 * Beep (timbre 90) on Infinite Mac's Quadra 650, draws a plain square
 * whatever it is: half a cycle at 127 + amplitude / 8 and half at 127 -
 * amplitude / 8, high first (amplitude 224: 155 and 99, a 56-step swing).
 * Under 8 the swing is nothing, and the output is silence.
 */
export const squareWaveSample = (phase: number, amplitude: number): number => {
	const swing = Math.min(Math.max(amplitude, 0), 255) >> 3;
	if (swing === 0) return 128;
	return phase < 0.5 ? 127 + swing : 127 - swing;
};

/**
 * Plays a square-wave synthesizer's commands (`timbreCmd`, `ampCmd`,
 * `freqCmd`, `freqDurationCmd`, `restCmd`, `quietCmd`, `waitCmd`) into
 * 8-bit unsigned mono samples at `rate` (`squareWaveSample`; the timbre is
 * read and changes nothing). Commands run in order; only the waits, the
 * notes' and the rests' durations take time, and the sound ends where the
 * last of them does. The waveform phase runs on across pitch and amplitude
 * changes.
 */
export const renderSquareWave = (
	commands: readonly SoundCommand[],
	rate: number,
): Uint8Array => {
	const out: number[] = [];
	let amplitude = 255;
	let frequency = 0;
	let phase = 0;
	// Time runs on the commands' clock, so rounding never accumulates: each
	// wait ends at the sample nearest its end time.
	let elapsed = 0;
	const run = (halfMs: number) => {
		elapsed += halfMs;
		const end = Math.round((elapsed / 2000) * rate);
		while (out.length < end) {
			out.push(frequency ? squareWaveSample(phase, amplitude) : 128);
			phase = (phase + frequency / rate) % 1;
		}
	};
	const note = (param2: number) => {
		const value = param2 & 0xffffff;
		if (value > 127)
			throw new Error(`note ${value} is not a MIDI note value (0-127)`);
		if (param2 >>> 24) amplitude = param2 >>> 24;
		return noteFrequency(value);
	};
	for (const { cmd, param1, param2 } of commands) {
		const duration = param1 & 0xffff;
		switch (cmd) {
			case SOUND_CMD.nullCmd:
			case SOUND_CMD.timbreCmd:
				break;
			case SOUND_CMD.ampCmd:
				amplitude = Math.min(Math.max(param1, 0), 255);
				break;
			case SOUND_CMD.freqCmd:
				frequency = note(param2);
				break;
			case SOUND_CMD.freqDurationCmd:
				frequency = note(param2);
				run(duration);
				break;
			case SOUND_CMD.restCmd:
			case SOUND_CMD.quietCmd:
				frequency = 0;
				if (cmd === SOUND_CMD.restCmd) run(duration);
				break;
			case SOUND_CMD.waitCmd:
				run(duration);
				break;
			default:
				throw new Error(`sound command ${cmd} is not a square-wave command`);
		}
	}
	return Uint8Array.from(out);
};

/**
 * A PCM WAV file: mono, `bits` 8 (unsigned, as a `snd ` stores them) or 16
 * (signed little-endian), at a whole-number `rate`. No chunks but `fmt ` and
 * `data`, so the bytes depend on the samples alone. An odd-length `data`
 * chunk is followed by one pad byte (RIFF chunks start on even offsets),
 * which its size leaves out and the RIFF size counts.
 */
export const encodeWav = ({
	rate,
	bits,
	samples,
}: {
	rate: number;
	bits: 8 | 16;
	samples: ArrayLike<number>;
}): Buffer => {
	const bytes = bits / 8;
	if (bits !== 8 && bits !== 16)
		throw new Error(`encodeWav: ${bits}-bit samples are not 8 or 16`);
	const data = Buffer.alloc(samples.length * bytes);
	for (let i = 0; i < samples.length; i++)
		if (bits === 8) data.writeUInt8(samples[i], i);
		else data.writeInt16LE(samples[i], i * 2);
	const pad = Buffer.alloc(data.length % 2);
	const header = Buffer.alloc(44);
	header.write("RIFF", 0, "latin1");
	header.writeUInt32LE(36 + data.length + pad.length, 4);
	header.write("WAVE", 8, "latin1");
	header.write("fmt ", 12, "latin1");
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20); // PCM
	header.writeUInt16LE(1, 22); // mono
	header.writeUInt32LE(rate, 24);
	header.writeUInt32LE(rate * bytes, 28);
	header.writeUInt16LE(bytes, 32);
	header.writeUInt16LE(bits, 34);
	header.write("data", 36, "latin1");
	header.writeUInt32LE(data.length, 40);
	return Buffer.concat([header, data, pad]);
};
