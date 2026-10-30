---
id: 0068-02e
title: 'H 1.1: bin/check-pixel-literals.ts and the ratchet allowlist'
purpose: Add the lint gate that counts bare pixel literals in SCSS against a per-file allowlist that only ever shrinks, and wire it into `pnpm lint`.
type: feat
status: in_progress
priority: "2"
effort: M
created: "2026-10-28T20:35:01.283Z"
updated: "2026-10-30T12:17:06.832Z"
started: "2026-10-30T12:17:06.832Z"
tags: []
milestone: ""
due_date: ""
planned_start: ""
planned_end: ""
order: 0
links:
  repo:
    local: ~/classicy
    files:
      - bin/check-pixel-literals.ts
      - bin/check-pixel-literals.test.ts
      - bin/pixel-literal-allowlist.json
      - package.json
  specs:
    - ./docs/plans/0000-aud-dsgn-reskinning-audit-structure-behavior-style-separation.md
  stories:
    - ["0083-v8n", "blocks"]
    - ["0067-opx", "depends"]
  plans:
    - ["0011-v9t", "included", ["1.1"]]
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
  "4":
    status: pending
  "5":
    status: pending
  "6":
    status: pending
  "7":
    status: pending
---

# H 1.1: bin/check-pixel-literals.ts and the ratchet allowlist

## Problem Statement

Audit §2.5 counts 331 pixel literals (re-measured: 283 bare + 50 fallbacks) in `src/**/*.scss`; D9 says none may remain. Without an automated gate the count drifts back up as soon as a rewrite section lands.

This section (plan 0011-v9t §1.1) adds `bin/check-pixel-literals.ts`: a dependency-free scanner with precise exemptions (`0px`, `calc(infinity * 1px)`, `@media`/`@container` preludes, comments, `url(…)` payloads, `savers/**`), a `bare` vs `fallback` classification, and a ratchet allowlist `bin/pixel-literal-allowlist.json` whose per-file counts must match exactly — fewer than listed is also a failure, so every later section is forced to tighten it. `pnpm lint` runs it after Biome.

**Impact:** Every later H section ends by ratcheting this allowlist; without the gate there is no proof the purge is complete and no protection against new literals.

## Steps

### 1: Write the failing tests in bin/check-pixel-literals.test.ts

Test code:
```ts
it('counts a bare literal beside a var() read', () => expect(scanPixelLiteralsInSource('a { padding: var(--x) 3px; }', 'f.scss')).toEqual([{ file: 'f.scss', line: 1, text: '3px', kind: 'bare' }]))
it('classifies a var() fallback', () => expect(scanPixelLiteralsInSource('a { gap: var(--button-gap, 12px); }', 'f.scss')[0].kind).toBe('fallback'))
it('ignores 0px, infinity, media preludes, comments and url payloads', () => expect(scanPixelLiteralsInSource('/* 245px */\n// 4px\n@media (max-width: 480px) {\n b { bottom: max(0px, 1%); border-radius: calc(infinity * 1px); background: url(data:image/svg+xml;base64,AAAApxAAA); }\n}', 'f.scss')).toEqual([]))
it('does not match inside identifiers', () => expect(scanPixelLiteralsInSource('$cp-wheel-max: 240; .x10px { }', 'f.scss')).toEqual([]))
it('ratchet: fewer than listed is a failure', () => expect(checkPixelLiteralAllowlist(new Map([['a.scss', [lit]]]), { 'a.scss': 2 })).toEqual(['tighten the allowlist for a.scss: 1 < 2']))
it('ratchet: unlisted file with literals fails with file:line text', () => expect(checkPixelLiteralAllowlist(new Map([['a.scss', [lit]]]), {})).toEqual(['a.scss:1 3px']))
it('scanPixelLiterals skips savers', () => expect([...scanPixelLiterals(process.cwd()).keys()].some(f => f.includes('/savers/'))).toBe(false))
```

### 2: Run it to verify it fails

`pnpm exec vitest run bin/check-pixel-literals.test.ts` — Expected: FAIL — Cannot find module './check-pixel-literals'.

### 3: Implement bin/check-pixel-literals.ts per the Interfaces block

`export type ClassicyPixelLiteral = { file: string; line: number; text: string; kind: "bare" | "fallback" }`; `export const scanPixelLiteralsInSource = (source: string, file: string): ClassicyPixelLiteral[]`; `export const scanPixelLiterals = (root: string): Map<string, ClassicyPixelLiteral[]>` (walks `src/**/*.scss`, skips `Extensions/ScreenSaver/savers/`); `export const checkPixelLiteralAllowlist = (found: Map<string, ClassicyPixelLiteral[]>, allowlist: Record<string, number>): string[]` (messages; empty = pass); CLI `main()` guarded by `import.meta.url === pathToFileURL(process.argv[1]).href`, reads `bin/pixel-literal-allowlist.json`, prints the messages and exits 1 when any. Scanner rules: strip `//` and `/* */` comments and the inside of `url(…)`; a match is `(?<![\w.-])-?\d+(\.\d+)?px`; `0px` and `infinity * 1px` are ignored; a line whose trimmed text starts with `@media` or `@container` is ignored; a match inside `var(--name, Npx)` is kind `fallback`, every other match `bare`. Allowlist semantics: file count must equal the listed count (fewer → `tighten the allowlist for <file>: <n> < <listed>`; more → `<file>:<line> <text>`); a file absent from the list must have 0. Use `node:fs`/`node:path` only (no deps); walk with `fs.readdirSync(dir, { withFileTypes: true })`; report paths repo-relative with forward slashes.

### 4: Seed the allowlist from the scanner

`node bin/check-pixel-literals.ts --write-allowlist` — add a `--write-allowlist` flag that writes the current per-file counts (bare + fallback) to `bin/pixel-literal-allowlist.json`, sorted by path. Expected today (before Parts A–G landed): 283 bare + 50 fallback over 44 files, ControlStrip 88 (84 + 4 fallbacks), HyperCard 40, FinderAboutThisComputer 20, Pager 17, ColorPicker 16, AppleGuide 12, KeyboardEquivalent 12, InputDialog 11, Alert 12, BalloonHelp 9, BevelButton 8 …; record the actual numbers in the commit message. Then `node bin/check-pixel-literals.ts` → exit 0.

### 5: Wire pnpm lint

`package.json` scripts: `"lint": "biome check . && node bin/check-pixel-literals.ts"`. Add `bin/pixel-literal-allowlist.json` to Biome's formatter include if `biome check` complains about it (run `pnpm lint`).

### 6: Run tests to verify they pass

`pnpm exec vitest run bin && pnpm lint` — Expected: PASS; `pnpm lint` exit 0.

### 7: Lint, type-check, commit

`pnpm lint && pnpm exec tsc --noEmit -p . && pnpm test` then `git add bin/check-pixel-literals.ts bin/check-pixel-literals.test.ts bin/pixel-literal-allowlist.json package.json && git commit -m "chore(lint): gate bare pixel literals in SCSS behind a shrinking allowlist"` (with the `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` trailer).

## Acceptance Criteria

- [ ] VERIFY: node bin/check-pixel-literals.ts; echo exit=$?  # expect exit=0 with the seeded allowlist
- [ ] VERIFY: pnpm exec vitest run bin/check-pixel-literals.test.ts
- [ ] VERIFY: grep -c 'node bin/check-pixel-literals.ts' package.json  # expect 1, inside the lint script

## Files

- `bin/check-pixel-literals.ts` - create: scanner, ratchet check and CLI
- `bin/check-pixel-literals.test.ts` - create: exemption and ratchet tests
- `bin/pixel-literal-allowlist.json` - create: seeded per-file counts
- `package.json` - modify: lint script runs the gate after Biome

## Work Log
### 2026-10-29T20:22:00.352Z - Moved one open [MANUAL] acceptance criterion to the program V&V ticket 0083-v8n (human verification and validation), where it is tracked and ticked. This story now closes on its automated criteria; 0083-v8n links back with `depends`.
