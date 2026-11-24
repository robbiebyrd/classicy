import type { Plugin } from "vite";

// Classicy's components use hooks, context and browser APIs, so a React Server
// Components bundler (Next.js's App Router, with webpack or Turbopack) must
// treat the core's entry as a client module: its first statement is the
// `"use client"` directive, and a server component then imports Classicy's
// components as they are, with no client-component wrapper of the host's
// (story 0224-siu). Without it the bundler evaluates the core as a server
// module, where React has no `createContext` or hooks, and the host's build
// fails (`TypeError: (0 , V.createContext) is not a function`, Next.js 16.4.6,
// both bundlers). Rollup drops a module-level directive from the modules it
// bundles, so the build adds it back to the ES entry chunk as a banner, the
// documented way (Rollup's banners keep the source map right, and esbuild's
// minifier keeps the directive). Only the core's ES entry carries it:
//
// - The UMD bundle is for `<script>` tags and, through its CommonJS loader,
//   Node, neither of which has a client boundary; an RSC bundler resolves
//   `import`, which is the ES entry.
// - The lazy ES chunks (pdf.js and its worker source) are loaded only by the
//   entry's own `import()`, inside the client module graph, so they are never
//   where a server module meets a client one.
// - An Appearance Package registers itself when it loads, so it must load in
//   the browser, from a client module. Marked as a client module itself, a
//   server component's `import "@classicy/appearance-platinum"` builds, but
//   the browser never runs it (a client module only runs there when something
//   renders one of its exports), and the desktop draws its "No Appearance
//   Package" screen; unmarked, the same import fails the host's build, where
//   it calls the core's functions on the server (`Attempted to call
//   encodeClassicyPixelArtRows() from the server`). So the packages stay
//   unmarked (findClassicyNoUseClientProblems).

/** The directive, exactly as the core's ES entry bundle starts with it. */
export const CLASSICY_USE_CLIENT = '"use client";';

/**
 * Makes `"use client";` the first line of the entry chunk named `entry`
 * (`classicy.es.js`), ahead of its imports. Every other chunk, the UMD bundle
 * and the lazy chunks included, is left as it is.
 */
export function classicyUseClientPlugin(entry: string): Plugin {
	return {
		name: "classicy-use-client",
		banner: (chunk) =>
			chunk.isEntry && chunk.fileName === entry ? CLASSICY_USE_CLIENT : "",
	};
}

/**
 * verify:dist's problems with the core's ES entry bundle: `source` (null when
 * the file is missing) must start with `"use client";`, before any comment,
 * import or other code, so it is the bundle's first statement.
 */
export function findClassicyUseClientProblems(
	file: string,
	source: string | null,
): string[] {
	if (source === null)
		return [`${file}: missing, so it cannot start with ${CLASSICY_USE_CLIENT}`];
	if (source.startsWith(CLASSICY_USE_CLIENT)) return [];
	return [
		`${file}: does not start with ${CLASSICY_USE_CLIENT} -> a React Server Components bundler (Next.js's App Router) evaluates it as a server module, where React has no createContext or hooks, so a server component that imports it fails the host's build; check classicyUseClientPlugin in vite.config.ts (bin/classicyUseClient.ts).`,
	];
}

// A "use client" directive in a bundle's directive prologue, after any
// whitespace and comments.
const USE_CLIENT_PROLOGUE =
	/^(?:\s|\/\*[\s\S]*?\*\/|\/\/[^\n]*\n|(["'])(?!use client\1)[^"'\\\n]*\1\s*;?)*(["'])use client\2/;

/**
 * verify:dist's problems with an Appearance Package's ES bundle: `source`
 * (null when the file is missing) must not be a client module, since a server
 * component's import of a client module never runs in the browser, and the
 * package registers itself when it runs.
 */
export function findClassicyNoUseClientProblems(
	file: string,
	source: string | null,
): string[] {
	if (source === null) return [`${file}: missing`];
	if (!USE_CLIENT_PROLOGUE.test(source)) return [];
	return [
		`${file}: starts with a "use client" directive -> an Appearance Package registers itself when it loads: as a client module, a server component's import of it builds but never runs in the browser, and the desktop draws no package; unmarked, that import fails the host's build, and a client module's import of it works. Leave classicyUseClientPlugin out of the package's vite.config.ts (bin/classicyUseClient.ts).`,
	];
}
