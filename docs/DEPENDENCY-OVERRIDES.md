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

The rest of the overrides came from the August 2026 pass (78fcbfc66). Some of
their floors (undici, fast-uri, brace-expansion, svgo) are now below the latest
advisories, but the lockfile resolves above them because the parents' ranges
allow the patched versions.

## Keeping the lockfile's `libc` fields

pnpm 10 writes the `libc: [glibc]` and `libc: [musl]` fields only when it fetches
full registry metadata. A plain local `pnpm install` or `pnpm update` drops all
of them, which churns every platform binary entry. Dependabot puts them back.
Passing `--config.minimum-release-age=10080` keeps them: it makes pnpm fetch
full metadata, and it skips versions published less than a week ago.
