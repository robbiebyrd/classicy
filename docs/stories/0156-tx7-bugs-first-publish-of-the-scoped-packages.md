---
id: 0156-tx7
title: The release can publish @classicy/classicy and @classicy/appearance-platinum for the first time
purpose: PR 333's merge publishes both 3.0.0 packages on the first try.
type: bugs
status: complete
priority: "1"
effort: S
created: "2026-11-06T20:00:49.444Z"
updated: "2026-11-06T20:59:02.523Z"
started: "2026-11-06T20:01:52.840Z"
completed: "2026-11-06T20:59:02.523Z"
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
      - .github/workflows/push.yml
      - bin/classicyReleaseWorkflow.test.ts
      - package.json
progress:
  "1":
    status: pending
  "2":
    status: pending
  "3":
    status: pending
---

# The release can publish @classicy/classicy and @classicy/appearance-platinum for the first time

## Problem Statement

From 0139 (2026-11-06). The owner uses npm trusted publishing (OIDC). npm configures a trusted publisher per package, on the package's settings page, so the two new scoped packages cannot have one until they exist; the unscoped `classicy` package's trust does not carry over. `push.yml` publishes with `NODE_AUTH_TOKEN: secrets.NPM_TOKEN` (secret last set 2026-01-27; npm stopped issuing classic tokens and caps granular publish tokens at 90 days, so it is likely expired) and runs `pnpm -r publish` on pnpm 10.26.0, whose OIDC publish support is unconfirmed (pnpm's docs show OIDC publish in 11.x; npm CLI needs 11.5.1+ and Node 22.14+ for trusted publishing). As it stands the 3.0.0 publish can fail after the version commit and tag are already pushed.

**Impact:** The release tags 3.0.0 but publishes nothing, or publishes only one package.

## Steps

### 1: Establish the facts

Confirm against current npm and pnpm docs (and, where possible, a dry run): (a) whether a trusted publisher can be added before a package's first publish (npm `trust` command, or the org settings); (b) whether pnpm 10.26 `publish` performs the OIDC exchange, and whether a set `NODE_AUTH_TOKEN` overrides it; (c) the npm CLI version on the runner (Node 24.x).

### 2: Pick and implement the first-publish path

Options: (A) the owner bootstraps both packages once by hand (a minimal first publish), then adds the trusted publisher (repo robbiebyrd/classicy, workflow push.yml) to each, and CI publishes 3.0.0 over OIDC; (B) a short-lived granular token with the `classicy` org's write scope is set as NPM_TOKEN just before the merge and revoked after, then trusted publishers are added for later releases; (C) the workflow publishes with `npm publish` per package (npm 11.5.1+) if pnpm 10.26 lacks OIDC. Recommend one, write the owner's exact steps into 0139, and change push.yml and its test as needed (keep 0141/0152's invariants).

### 3: Owner checklist

Update 0139's criteria with the exact owner actions in order (bootstrap or token, trusted publisher fields for each package, when to merge).

## Acceptance Criteria

- [x] VERIFY: A documented, tested first-publish path for both packages exists, and `bin/classicyReleaseWorkflow.test.ts` pins the publish step's auth (OIDC with id-token: write, and the fallback).
- [x] VERIFY: 0139 lists the exact owner steps, in order, for the first publish and for trusted publishing afterward.

## Files

- `.github/workflows/push.yml` - first-publish auth

## Work Log

### 2026-11-06T20:58:54.710Z - Landed at 484a92387 (c1b804fd9, c7d7cdd0b, d6cd45411, cbcfbeea2; rebased onto 6d774d876, clean). push.yml: a 'Check trusted publishing for every package' step (npm >= 11.5.1; npm publish --dry-run per package confirms the OIDC exchange) runs after the version sync and before the build, codename and the single push; both publish steps set NODE_AUTH_TOKEN '' and NPM_TOKEN is gone. bin/npm-bootstrap-trusted-publishing.sh (dry run unless --publish) publishes a deprecated 0.0.0 placeholder under the bootstrap dist-tag and adds the push.yml trusted publisher, safe to re-run. Fable review: push.yml change ready; bootstrap re-run and deprecate gaps fixed in cbcfbeea2. Implementer gate 496 / 7232; after the rebase workflow + bootstrap + audio tests 64/64, biome clean, bash -n OK. Owner steps copied into 0139 (criteria 8 and 9; criterion 2 not applicable). Unconfirmed: whether the registry sets latest on a new package's first version despite --tag bootstrap; the 3.0.0 release takes latest either way.
