# Dependency overrides

`package.json` `pnpm.overrides` raises transitive dependencies past known
vulnerabilities where the package that pulls them in pins a vulnerable version.
Each override is keyed to the vulnerable range of one major, so it stops
matching once the parent moves past that range, and its target is a caret
range in the same major, so later patches still resolve.

Where the parent's own range already allows the patched version, the fix is a
lockfile update (`pnpm update -r --no-save --depth Infinity <pkg>`), not an
override.

## Overrides set by story 0092-prv

| Override | Alert | Parent and pin | Why it is safe |
| --- | --- | --- | --- |
| `js-yaml@>=4.0.0 <4.3.2` → `^4.3.2` | GHSA-2883-xcg3-v3hh (merge keys exhaust CPU) | `@mdxeditor/editor` pins `4.1.1` | A patch release in the same major. js-yaml is not in the shipped bundle: no js-yaml code appears in `dist/`. |
| `shell-quote@>=1.0.0 <1.11.0` → `^1.11.0` | GHSA-pqg4-j6r4-53mv (critical, `quote()` command injection) | `concurrently` pins `1.8.4` | A minor release in the same major. `concurrently` runs only the `build:watch` and `preview:dist` scripts. |
| `sharp@<0.35.5` → `^0.35.5` | GHSA-rgj7-g3m4-5g8c (libheif), GHSA-wq5f-xc86-pv6w (librsvg) | `vite-plugin-image-tools` asks for `^0.33.5` | The same 0.35 line the earlier override already chose. sharp runs only at build time, and Appearance Package assets bypass it. |

Story 0092-prv fixed the other alerts with lockfile updates inside their
parents' ranges: undici 7.30.1, fast-uri 3.1.9, svgo 3.3.5 and 4.1.0,
brace-expansion 1.1.21, 2.1.7 and 5.0.12, source-map-js 1.2.2, browserslist
4.29.5, baseline-browser-mapping 2.11.34, and vitest 5.0.5, which brings
`@vitest/mocker` 5.0.5. It also moved eslint-plugin-react-hooks's zod from
4.4.3 to the library's own 4.6.6 (GHSA-mrhx-c7xc-m3w5, which only `pnpm audit`
reports).

Story 0117-qjd later removed ESLint, and with it brace-expansion 1.1.21 and
minimatch 3.1.5, which only ESLint pulled in.

The rest of the overrides came from the August 2026 pass (78fcbfc66). Some of
their floors (undici, fast-uri, brace-expansion, svgo) are now below the latest
advisories, but the lockfile resolves above them because the parents' ranges
allow the patched versions.

## Overrides removed by story 0117-qjd

| Override | Added | Parent and pin | Why it was removed |
| --- | --- | --- | --- |
| `brace-expansion@<1.1.18` → `^1.1.18` | The August 2026 pass (78fcbfc66) | minimatch 3, pulled in only by ESLint | ESLint was removed, so no brace-expansion 1.x is left in the lockfile and the override matched nothing. |

## Overrides set by story 0118-qm6

| Override | Alert | Parent and pin | Why it is safe |
| --- | --- | --- | --- |
| `minimatch@>=7.0.0 <11.0.1` → `^11.0.1` | GHSA-g3hv-75wg-m249 (Dependabot #344, `globParts` amplification) | `@vue/language-core` (via `vite-plugin-dts`) asks for `^9.0.3`; `@microsoft/api-extractor` pins `10.2.3`; `nodemon` and `@typescript-eslint/typescript-estree` ask for `^10.2.x` | The one override that crosses a major: the fix exists only in 11, with no 9.x or 10.x backport. Every consumer calls only the named `minimatch(path, pattern, options)` function, with no options or only `dot`, `nocase` and `windowsPathsNoEscape`, all of which 11 keeps. All of them run only at build or watch time; minimatch is not in `dist/`. |
| `glob@>=13.0.0 <14.0.3` → `^14.0.3` | GHSA-g3hv-75wg-m249 (bundled copy); GHSA-3g3m-2fjr-6pw4 (an aborted async walk keeps reading directories) | `rimraf` (via `vite-plugin-image-tools`) asks for `^13.0.3`; `@joshwooding/vite-plugin-react-docgen-typescript` (via `@storybook/react-vite`) asks for `^13.0.1` | glob's default entry, `index.min.js`, bundles its own minimatch, so the minimatch override alone leaves 13's vulnerable copy in place. 14.0.3 is the first release that bundles a fixed minimatch 11; 14.0.0 to 14.0.2 bundle 11.0.0, which predates the fix. Both parents call only `glob`/`globSync` and read back an array of strings (`absolute`, `cwd`, `ignore` without a leading `/`, `nodir`, `withFileTypes: false`, `signal`), none of which 14 changes. Storybook's default `react-docgen` never loads the docgen plugin, and nothing here runs rimraf with globs. |

The minimatch override starts at 7.0.0, the advisory's lower bound, so
minimatch 3.1.5 (eslint 9, `@eslint/config-array`, `@eslint/eslintrc`) is left
alone: 3.x is outside the advisory's range, has none of the vulnerable code,
and cannot move to 11, because eslint calls the CommonJS default-export
function that 11 no longer provides. The lockfile now holds minimatch 3.1.5 and
11.0.3, glob 14.0.3 and path-scurry 3.0.0; brace-expansion 2.1.7, which only
minimatch 9 used, is gone.

One vulnerable copy is out of reach of any override: `storybook` 10.6.2 bundles
glob and minimatch 10 into `dist/_node-chunks/`, and so do 10.6.5 and 10.6.6,
the latest release. It matches only the `stories` globs in
`storybook/.storybook/main.ts`, at dev and build time. Dependabot cannot see a
bundled copy, so check a later Storybook release before treating the advisory
as gone.

## Keeping the lockfile's `libc` fields

pnpm 10 writes the `libc: [glibc]` and `libc: [musl]` fields only when it fetches
full registry metadata. A plain local `pnpm install` or `pnpm update` drops all
of them, which churns every platform binary entry. Dependabot puts them back.
Passing `--config.minimum-release-age=10080` keeps them: it makes pnpm fetch
full metadata, and it skips versions published less than a week ago.
