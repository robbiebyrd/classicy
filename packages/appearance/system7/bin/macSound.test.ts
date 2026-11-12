import { describe, expect, it } from "vitest";
import {
	decodeSound,
	encodeWav,
	noteFrequency,
	renderSquareWave,
	SAMPLED_SYNTH,
	SOUND_CMD,
	type SoundCommand,
	SQUARE_WAVE_SYNTH,
	squareWaveSample,
} from "./macSound.ts";

/** A format 1 `snd ` with one data type and the given commands. */
const format1 = (
	synth: number,
	commands: SoundCommand[],
	tail = Buffer.alloc(0),
) => {
	const head = Buffer.alloc(12 + commands.length * 8);
	head.writeUInt16BE(1, 0);
	head.writeUInt16BE(1, 2);
	head.writeUInt16BE(synth, 4);
	head.writeUInt32BE(0, 6);
	head.writeUInt16BE(commands.length, 10);
	commands.forEach(({ cmd, param1, param2 }, i) => {
		head.writeUInt16BE(cmd, 12 + i * 8);
		head.writeInt16BE(param1, 14 + i * 8);
		head.writeUInt32BE(param2, 16 + i * 8);
	});
	return Buffer.concat([head, tail]);
};

const cmd = (c: number, param1 = 0, param2 = 0): SoundCommand => ({
	cmd: c,
	param1,
	param2,
});

describe("decodeSound", () => {
	it("reads a square-wave resource's data type and commands", () => {
		const commands = [
			cmd(SOUND_CMD.timbreCmd, 90),
			cmd(SOUND_CMD.ampCmd, 224),
			cmd(SOUND_CMD.freqCmd, 0, 69),
			cmd(SOUND_CMD.waitCmd, 40),
		];
		const sound = decodeSound(format1(SQUARE_WAVE_SYNTH, commands));
		expect(sound.format).toBe(1);
		expect(sound.synths).toEqual([{ id: SQUARE_WAVE_SYNTH, init: 0 }]);
		expect(sound.commands).toEqual(commands);
		expect(sound.sampled).toBeUndefined();
	});

	it("reads a sampled resource's standard header at the bufferCmd's offset", () => {
		const header = Buffer.alloc(22);
		header.writeUInt32BE(4, 4); // length
		header.writeUInt32BE(0x2b7745d1, 8); // 11127.27 Hz, Fixed
		header.writeUInt8(0, 20); // stdSH
		header.writeUInt8(60, 21);
		const samples = Buffer.from([0x80, 0x7f, 0x81, 0x80]);
		const sound = decodeSound(
			format1(
				SAMPLED_SYNTH,
				[cmd(0x8000 | SOUND_CMD.bufferCmd, 0, 20)],
				Buffer.concat([header, samples, Buffer.from([1, 2])]),
			),
		);
		expect(sound.sampled?.sampleRate).toBeCloseTo(11127.27, 2);
		expect(sound.sampled?.baseFrequency).toBe(60);
		expect([...(sound.sampled?.samples ?? [])]).toEqual([...samples]);
	});

	it("refuses a resource shorter than its header's sample count", () => {
		const header = Buffer.alloc(22);
		header.writeUInt32BE(8, 4); // 8 samples, 4 present
		const sound = (tail: Buffer) =>
			decodeSound(
				format1(
					SAMPLED_SYNTH,
					[cmd(0x8000 | SOUND_CMD.bufferCmd, 0, 20)],
					Buffer.concat([header, tail]),
				),
			);
		expect(() => sound(Buffer.alloc(4, 0x80))).toThrow(/short/);
		expect(sound(Buffer.alloc(8, 0x80)).sampled?.samples).toHaveLength(8);
	});

	it("refuses a header that is not a standard one", () => {
		const header = Buffer.alloc(22);
		header.writeUInt8(0xff, 20);
		expect(() =>
			decodeSound(
				format1(
					SAMPLED_SYNTH,
					[cmd(0x8000 | SOUND_CMD.bufferCmd, 0, 20)],
					header,
				),
			),
		).toThrow(/stdSH/);
	});
});

describe("the square-wave synthesizer", () => {
	it("tunes MIDI note values: 60 is middle C, 69 is A 440", () => {
		expect(noteFrequency(69)).toBe(440);
		expect(noteFrequency(60)).toBeCloseTo(261.626, 3);
	});

	it("draws a sine at timbre 0 and a square at 254", () => {
		expect(squareWaveSample(0.25, 0)).toBeCloseTo(1, 10);
		expect(squareWaveSample(0.125, 0)).toBeCloseTo(Math.SQRT1_2, 10);
		expect(squareWaveSample(0.125, 254)).toBe(1);
		expect(squareWaveSample(0.625, 254)).toBe(-1);
		expect(squareWaveSample(0.125, 127)).toBeCloseTo(
			(Math.SQRT1_2 + 1) / 2,
			10,
		);
	});

	it("plays for the waits' half-milliseconds, at the amplitude in force", () => {
		const samples = renderSquareWave(
			[
				cmd(SOUND_CMD.timbreCmd, 254),
				cmd(SOUND_CMD.ampCmd, 255),
				cmd(SOUND_CMD.freqCmd, 0, 69),
				cmd(SOUND_CMD.waitCmd, 40),
				cmd(SOUND_CMD.ampCmd, 51),
				cmd(SOUND_CMD.waitCmd, 40),
				cmd(SOUND_CMD.ampCmd, 0),
			],
			22050,
		);
		// 2 × 20 ms at 22,050 Hz.
		expect(samples.length).toBe(882);
		const first = samples.slice(0, 441);
		const second = samples.slice(441);
		expect(Math.max(...first)).toBe(32767);
		expect(Math.min(...first)).toBe(-32767);
		expect(Math.max(...second)).toBe(Math.round(32767 / 5));
		// 440 Hz: 8.8 cycles in 20 ms, so 17 or 18 sign changes.
		let changes = 0;
		for (let i = 1; i < first.length; i++)
			if (Math.sign(first[i]) !== Math.sign(first[i - 1])) changes++;
		expect(changes).toBeGreaterThanOrEqual(17);
		expect(changes).toBeLessThanOrEqual(18);
	});

	it("is silent before a note and after a rest", () => {
		const samples = renderSquareWave(
			[
				cmd(SOUND_CMD.waitCmd, 20),
				cmd(SOUND_CMD.freqDurationCmd, 20, 69),
				cmd(SOUND_CMD.restCmd, 20),
			],
			22050,
		);
		expect(samples.length).toBe(Math.round(0.03 * 22050));
		expect(samples.slice(0, 220).every((s) => s === 0)).toBe(true);
		expect(samples.slice(220, 441).some((s) => s !== 0)).toBe(true);
		expect(samples.slice(441).every((s) => s === 0)).toBe(true);
	});

	it("refuses what it cannot play", () => {
		expect(() =>
			renderSquareWave([cmd(SOUND_CMD.freqCmd, 0, 440)], 22050),
		).toThrow(/MIDI note/);
		expect(() => renderSquareWave([cmd(SOUND_CMD.bufferCmd)], 22050)).toThrow(
			/not a square-wave command/,
		);
	});
});

describe("encodeWav", () => {
	it("writes 8-bit unsigned samples as stored", () => {
		const wav = encodeWav({ rate: 11127, bits: 8, samples: [0x80, 0xff, 0] });
		expect(wav.toString("latin1", 0, 4)).toBe("RIFF");
		expect(wav.readUInt32LE(4)).toBe(36 + 3 + 1); // and the pad byte
		expect(wav.toString("latin1", 8, 16)).toBe("WAVEfmt ");
		expect(wav.readUInt16LE(20)).toBe(1);
		expect(wav.readUInt16LE(22)).toBe(1);
		expect(wav.readUInt32LE(24)).toBe(11127);
		expect(wav.readUInt32LE(28)).toBe(11127);
		expect(wav.readUInt16LE(32)).toBe(1);
		expect(wav.readUInt16LE(34)).toBe(8);
		expect(wav.toString("latin1", 36, 40)).toBe("data");
		expect(wav.readUInt32LE(40)).toBe(3);
		expect([...wav.subarray(44, 47)]).toEqual([0x80, 0xff, 0]);
	});

	it("pads an odd-length data chunk to an even length, outside its size", () => {
		const wav = encodeWav({ rate: 11127, bits: 8, samples: [1, 2, 3] });
		expect(wav.length).toBe(44 + 4);
		expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
		expect(wav.readUInt32LE(40)).toBe(3);
		expect(wav[47]).toBe(0);
		const even = encodeWav({ rate: 11127, bits: 8, samples: [1, 2] });
		expect(even.length).toBe(44 + 2);
		expect(even.readUInt32LE(4)).toBe(even.length - 8);
	});

	it("writes 16-bit samples signed, little-endian", () => {
		const wav = encodeWav({ rate: 22050, bits: 16, samples: [1, -2] });
		expect(wav.readUInt32LE(28)).toBe(44100);
		expect(wav.readUInt16LE(32)).toBe(2);
		expect(wav.readUInt16LE(34)).toBe(16);
		expect(wav.readUInt32LE(40)).toBe(4);
		expect(wav.readInt16LE(44)).toBe(1);
		expect(wav.readInt16LE(46)).toBe(-2);
	});
});
