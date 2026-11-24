// @vitest-environment node
// (Vite's esbuild refuses jsdom's TextEncoder: the dev-server test needs Node.)
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import deflatedWorker from "pdfjs-dist/build/pdf.worker.min.mjs?classicy-deflate";
import { createServer } from "vite";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
	CLASSICY_DEFLATE_ID_RE,
	CLASSICY_DEFLATE_MARK,
	CLASSICY_DEFLATE_QUERY,
	classicyDeflateAssetPlugin,
	classicyDeflatePayloads,
} from "./classicyDeflateAsset";
import deflatedSelf from "./classicyDeflateAsset.ts?classicy-deflate";

// A `?classicy-deflate` import embeds a file raw-deflated as base64 text
// (plan 0019-fb7 §3.1): the pdf.js worker's bytes, which the PDF viewer
// rebuilds into today's data: URI at runtime (§3.2).

const WORKER = createRequire(import.meta.url).resolve(
	"pdfjs-dist/build/pdf.worker.min.mjs",
);

const root = mkdtempSync(join(tmpdir(), "classicy-deflate-"));
afterAll(() => rmSync(root, { recursive: true, force: true }));

type LoadResult = { code: string; map: { mappings: string } } | null;
type LoadHook = (
	this: { addWatchFile: (id: string) => void },
	id: string,
) => Promise<LoadResult> | LoadResult;
type Resolved = { id: string; external?: boolean | "absolute" } | null;
type ResolveHook = (
	this: {
		resolve: (
			source: string,
			importer: string | undefined,
			options: { skipSelf?: boolean },
		) => Promise<Resolved>;
		error: (message: string) => never;
	},
	source: string,
	importer: string | undefined,
	options: { isEntry: boolean },
) => Promise<string | null> | string | null;

const plugin = classicyDeflateAssetPlugin();
const load = plugin.load as unknown as LoadHook;
const resolveId = plugin.resolveId as unknown as ResolveHook;

/** A loaded module's default export, its text after the mark inflated. */
const inflateModule = (code: string): Buffer => {
	const prefix = "export default ";
	expect(code.startsWith(prefix) && code.endsWith(";")).toBe(true);
	const text: string = JSON.parse(code.slice(prefix.length, -1));
	expect(text.startsWith(CLASSICY_DEFLATE_MARK)).toBe(true);
	return inflateRawSync(
		Buffer.from(text.slice(CLASSICY_DEFLATE_MARK.length), "base64"),
	);
};

const loadFile = async (file: string) => {
	const addWatchFile = vi.fn();
	const result = await load.call(
		{ addWatchFile },
		`${file}${CLASSICY_DEFLATE_QUERY}`,
	);
	if (!result) throw new Error(`load() handled nothing for ${file}`);
	return { result, addWatchFile };
};

describe("classicyDeflateAssetPlugin", () => {
	it("names itself and runs before Vite's own resolvers", () => {
		expect(CLASSICY_DEFLATE_QUERY).toBe("?classicy-deflate");
		expect(CLASSICY_DEFLATE_MARK).toBe("classicy-deflate:deflate-raw;base64,");
		expect(plugin.name).toBe("classicy-deflate-asset");
		expect(plugin.enforce).toBe("pre");
		expect(
			CLASSICY_DEFLATE_ID_RE.test(`${WORKER}${CLASSICY_DEFLATE_QUERY}`),
		).toBe(true);
		expect(CLASSICY_DEFLATE_ID_RE.test(`${WORKER}?url`)).toBe(false);
	});

	it("load() output inflates back to the file's bytes", async () => {
		const file = join(root, "sample.bin");
		const bytes = Buffer.from(
			Array.from({ length: 4096 }, (_, i) => (i * 31) % 256),
		);
		writeFileSync(file, bytes);
		const { result, addWatchFile } = await loadFile(file);
		expect(inflateModule(result.code).equals(bytes)).toBe(true);
		expect(result.map).toEqual({ mappings: "" });
		expect(addWatchFile).toHaveBeenCalledWith(file);

		const worker = await loadFile(WORKER);
		expect(inflateModule(worker.result.code).equals(readFileSync(WORKER))).toBe(
			true,
		);
	});

	it("the payload is the same on every run", async () => {
		const first = (await loadFile(WORKER)).result.code;
		const second = (await loadFile(WORKER)).result.code;
		expect(second).toBe(first);
	});

	it("load() leaves every other id alone", async () => {
		const addWatchFile = vi.fn();
		for (const id of [
			WORKER,
			`${WORKER}?url`,
			`${WORKER}?classicy-deflate&v=1`,
		])
			expect(await load.call({ addWatchFile }, id), id).toBeNull();
		expect(addWatchFile).not.toHaveBeenCalled();
	});

	it("resolveId keeps the query on the resolved path", async () => {
		const resolve = vi.fn(async (source: string) => ({
			id: `/r/node_modules/${source}`,
		}));
		const context = { resolve, error: vi.fn() as never };
		expect(
			await resolveId.call(
				context,
				"pdfjs-dist/build/pdf.worker.min.mjs?classicy-deflate",
				"/r/src/X.ts",
				{ isEntry: false },
			),
		).toBe(
			"/r/node_modules/pdfjs-dist/build/pdf.worker.min.mjs?classicy-deflate",
		);
		expect(resolve).toHaveBeenCalledWith(
			"pdfjs-dist/build/pdf.worker.min.mjs?raw",
			"/r/src/X.ts",
			expect.objectContaining({ skipSelf: true }),
		);
	});

	it("resolveId drops a query the resolver added (a dev server's version hash)", async () => {
		const context = {
			resolve: async () => ({ id: "/r/node_modules/p/w.mjs?raw&v=abc123" }),
			error: vi.fn() as never,
		};
		expect(
			await resolveId.call(context, "p/w.mjs?classicy-deflate", "/r/src/X.ts", {
				isEntry: false,
			}),
		).toBe("/r/node_modules/p/w.mjs?classicy-deflate");
	});

	it("resolveId passes on other sources and on what does not resolve", async () => {
		const resolve = vi.fn(async () => null);
		const context = { resolve, error: vi.fn() as never };
		expect(
			await resolveId.call(context, "./a.mjs?url", "/r/src/X.ts", {
				isEntry: false,
			}),
		).toBeNull();
		expect(resolve).not.toHaveBeenCalled();
		expect(
			await resolveId.call(context, "./a.mjs?classicy-deflate", "/r/src/X.ts", {
				isEntry: false,
			}),
		).toBeNull();
	});

	it("resolveId refuses a file that resolves as external", async () => {
		const context = {
			resolve: async () => ({ id: "p/w.mjs", external: true }),
			error: (message: string): never => {
				throw new Error(message);
			},
		};
		await expect(
			resolveId.call(context, "p/w.mjs?classicy-deflate", "/r/src/X.ts", {
				isEntry: false,
			}),
		).rejects.toThrow(/external/);
	});
});

describe("classicyDeflatePayloads", () => {
	it("classicyDeflatePayloads finds one payload and ignores the bare mark", async () => {
		const { result } = await loadFile(WORKER);
		const code = [
			`const MARK = ${JSON.stringify(CLASSICY_DEFLATE_MARK)};`,
			result.code.replace("export default", "const worker ="),
		].join("\n");
		const payloads = classicyDeflatePayloads(code);
		expect(payloads).toHaveLength(1);
		expect(payloads[0].equals(readFileSync(WORKER))).toBe(true);
	});

	it("finds none in code without one", () => {
		expect(classicyDeflatePayloads("export default 1;")).toEqual([]);
	});
});

// The registration the core's tests run under (vitest.config.ts): these
// imports go through the plugin, a bare package path and a relative one.
describe("the vitest registration", () => {
	it("a ?classicy-deflate import is the file's bytes, deflated", () => {
		const [worker] = classicyDeflatePayloads(
			`export default ${JSON.stringify(deflatedWorker)};`,
		);
		expect(worker?.equals(readFileSync(WORKER))).toBe(true);
		const [self] = classicyDeflatePayloads(JSON.stringify(deflatedSelf));
		expect(
			self?.equals(
				readFileSync(join(import.meta.dirname, "classicyDeflateAsset.ts")),
			),
		).toBe(true);
	});
});

// Storybook and the example's live-source dev server run Vite's dependency
// optimizer, which answers a bare package import with a pre-bundled copy.
describe("under a dev server's dependency optimizer", () => {
	it("a package's file resolves to itself, never a pre-bundled copy", async () => {
		const cacheDir = mkdtempSync(join(tmpdir(), "classicy-deflate-vite-"));
		const server = await createServer({
			root: process.cwd(),
			configFile: false,
			logLevel: "silent",
			cacheDir,
			// No entry scan; discovery stays on, as in a dev server.
			optimizeDeps: { entries: [] },
			plugins: [classicyDeflateAssetPlugin()],
			server: { middlewareMode: true, hmr: false, ws: false, watch: null },
		});
		try {
			const client = server.environments.client;
			const resolved = await client.pluginContainer.resolveId(
				`pdfjs-dist/build/pdf.worker.min.mjs${CLASSICY_DEFLATE_QUERY}`,
				join(process.cwd(), "src/index.ts"),
			);
			expect(resolved?.id).toBe(`${WORKER}${CLASSICY_DEFLATE_QUERY}`);
			expect(client.depsOptimizer?.metadata.discovered).toEqual({});
			const module = await client.transformRequest(resolved?.id ?? "");
			const [payload] = classicyDeflatePayloads(module?.code ?? "");
			expect(payload?.equals(readFileSync(WORKER))).toBe(true);
		} finally {
			await server.close();
			rmSync(cacheDir, { recursive: true, force: true });
		}
	});
});

// Every config that compiles src/ registers it, so 3.2's runtime module
// imports the worker the same way in the library build, every test project,
// Storybook and the example's live-source dev server.
describe("where the plugin is registered", () => {
	it("every config that compiles src/", () => {
		for (const config of [
			"vite.config.ts",
			"vitest.config.ts",
			"packages/appearance/platinum/vitest.config.ts",
			"packages/appearance/system7/vitest.config.ts",
			"packages/appearance/windows98/vitest.config.ts",
			"storybook/.storybook/main.ts",
			"example/vite.config.ts",
		])
			expect(readFileSync(config, "utf8"), config).toContain(
				"classicyDeflateAssetPlugin()",
			);
	});

	it("every vitest config inlines a deflated file under node_modules", () => {
		for (const config of [
			"vitest.config.ts",
			"packages/appearance/platinum/vitest.config.ts",
			"packages/appearance/system7/vitest.config.ts",
			"packages/appearance/windows98/vitest.config.ts",
		])
			expect(readFileSync(config, "utf8"), config).toContain(
				"server: { deps: { inline: [CLASSICY_DEFLATE_ID_RE] } }",
			);
	});

	it("before the library build's source map plugin, which stays last", () => {
		const source = readFileSync("vite.config.ts", "utf8");
		const deflate = source.indexOf("classicyDeflateAssetPlugin()");
		const maps = source.indexOf("classicySourceMapTextPlugin()");
		expect(deflate).toBeGreaterThan(-1);
		expect(maps).toBeGreaterThan(deflate);
		expect(source.slice(maps)).toMatch(
			/^classicySourceMapTextPlugin\(\),\s*\],/,
		);
	});
});
