# Adopting App Manifests

**Audience:** teams building applications on Classicy — either apps that live
inside a Classicy desktop, or host applications that consume Classicy as a
library and register their own apps, HyperCard effects, or filesystem
adapters.

**What changed:** Classicy now has an app manifest registry. One call,
`registerApp(...)`, replaces the split registration surface
(`registerAppEventHandler` + `registerClassicyUntrustedActionAllowlist`) and
additionally declares — as runtime data — the actions your app handles and
the shape of its internal state, both with written commentary. That metadata
powers balloon help, HyperCard script discovery and argument validation, and
dev-mode state validation in the kernel.

---

## 1. Do I have to change anything?

**No.** Both old APIs still work, unchanged:

- `registerAppEventHandler(prefix, handler)` — still the routing primitive;
  `registerApp` delegates to it.
- `registerClassicyUntrustedActionAllowlist(type)` — still the allowlist
  primitive, still floor-guarded.

Both are now marked `@deprecated`. An app registered the old way keeps
working exactly as before — it just has no manifest, so balloon help,
`listScriptableActions()`, and kernel validation see nothing for it.

Migrate when you want the metadata benefits, not because you must.

## 2. The one-call migration

Before:

```ts
import { registerAppEventHandler } from "classicy";

registerAppEventHandler("MyCompanyAppTV", myTvEventHandler);
```

After:

```ts
import { registerApp } from "classicy";
import { z } from "zod";

export const TvDataSchema = z.looseObject({
	channel: z.number().optional().describe("Currently tuned channel number."),
	muted: z.boolean().optional().describe("Whether audio is muted."),
});

export type TvData = z.infer<typeof TvDataSchema>;

registerApp({
	id: "TV.app",
	description: "Watch broadcast channels on the desktop.",
	prefix: "MyCompanyAppTV",
	handler: myTvEventHandler,
	actions: {
		MyCompanyAppTVTune: {
			description: "Tune the TV to a channel.",
			params: z.object({
				channel: z.number().describe("Channel number to tune to."),
			}),
		},
		MyCompanyAppTVMute: {
			description: "Toggle audio mute.",
		},
	},
	state: TvDataSchema,
});
```

Rules that matter:

- **`prefix` and `handler` travel together.** Passing one without the other
  registers no routing and logs a dev warning. Apps with no custom reducer
  can omit both and still declare `actions`/`state`.
- **`actions` and `state` are optional.** A `registerApp` call with only
  `prefix`/`handler` is a legal, metadata-free registration.
- **State schemas MUST be `z.looseObject`, never `z.object`.** The kernel
  writes keys your schema doesn't declare into `apps[id].data` (for example
  `openFiles` queues from the generic file-open route). `looseObject` passes
  unknown keys through validation and through `parseAppData` round-trips; a
  strict object would either reject valid stores or silently strip the
  kernel's keys.
- **Top-level state fields should be `.optional()`.** `apps[id].data` is
  legitimately `{}` or `undefined` before your app's first action; validation
  is for catching wrong shapes, not absence.
- **Put a `.describe()` on every field and a `description` on every
  action.** That text is the product: it is what balloon help and discovery
  surfaces display.

## 3. Apps that span multiple modules

Re-registering the same `id` **merges additively** (this is how HyperCard's
player and editor share `HyperCard.app`):

- A new `prefix`+`handler` pair is appended; the same prefix twice is a
  no-op.
- Action types merge first-wins.
- The **first** `state` schema wins; a differing second one logs a dev
  warning. Convention: the module that owns the app's primary lifecycle
  registers the state schema (covering keys the other modules write), and
  secondary modules register only their prefix and actions.
- `description` is first-wins too, so let the primary module register first
  (import order in your entry component decides).

## 4. Exposing actions to HyperCard stacks

Before, exposing an action to stack scripts took a separate call:

```ts
registerClassicyUntrustedActionAllowlist("MyCompanyAppTVTune");
```

Now declare it on the manifest entry:

```ts
MyCompanyAppTVTune: {
	description: "Tune the TV to a channel.",
	params: z.object({ channel: z.number().describe("Channel to tune.") }),
	scriptable: true,
},
```

What `scriptable: true` does — and does not do:

- It adds the type to the untrusted-action allowlist (same mechanism as
  before). It can **never** cross the kernel's guarded-route floor:
  declaring `ClassicyDesktop*`, `ClassicyWindow*`, or the guarded exact
  types scriptable has no effect, and guarded types are excluded from the
  discovery index entirely.
- Stacks can discover it: `listScriptableActions()` returns
  `{ appId, type, description, params }` for every scriptable action.
- **Script-authored args are validated against `params` before dispatch.**
  A malformed effect is dropped with a dev warning naming the bad param —
  it never reaches your reducer. This is a behavior change to be aware of:
  if your schema is wrong, working stack effects will start being dropped
  in dev with a console warning telling you why.
- **The dispatched payload is zod's parsed output.** Plain `z.object`
  params strip keys the schema doesn't declare, and the kernel pins the
  action `type` and `app` record after the spread — a script cannot smuggle
  either. Declare every arg your reducer reads, or it won't arrive.

If you have hand-registered allowlist types with no manifest (custom
HyperCard effects reviewed by your host), they keep working: no manifest
entry means allowlist-check-only, exactly as before.

## 5. Retire your hand-rolled state guard

If you have an `isMyAppData(d)` type predicate, `parseAppData` replaces it
using your schema as the single source of truth:

```ts
import { parseAppData } from "classicy";

// In your reducer:
const raw = ds.System.Manager.Applications.apps[appId].data ?? {};
const appData: TvData = parseAppData<TvData>(appId, raw) ?? { ...raw };
```

- Valid data comes back typed, with unknown keys preserved (`looseObject`
  passthrough).
- Invalid data returns `undefined`; choose your fallback deliberately —
  `?? { ...raw }` preserves current behavior of carrying the raw object
  forward, `?? {}` resets to a clean slate.
- Derive your data type from the schema (`z.infer`) so the two can never
  drift.

## 6. Balloon help from your own manifest

Your settings UI can now describe itself from live metadata instead of
duplicated strings:

```tsx
import { ClassicyBalloonHelp, describeAppAction, describeAppState } from "classicy";

const muteBalloon = describeAppState("TV.app", "muted");

{muteBalloon ? (
	<ClassicyBalloonHelp title={muteBalloon.title} content={muteBalloon.content}>
		<ClassicyCheckbox ... />
	</ClassicyBalloonHelp>
) : (
	<ClassicyCheckbox ... />
)}
```

- `describeAppState(appId, "path.to.field")` — dot notation for nested
  fields; returns `{ title, content }` or `undefined` (unknown app/path, or
  no `.describe()` on the field). Render nothing when it's `undefined`.
- `describeAppAction(appId, type)` — same contract for actions.
- The returned `title` is the raw field name / action type. For end-user
  balloons you will usually want to supply your own `title` and use only
  the `content`.

## 7. What the kernel does with your state schema

In development builds only, after every dispatched action, the kernel
validates the routed app's `data` against its registered schema:

- On mismatch it logs **one** `console.warn` naming the appId, the action
  type, and zod's issue list. It never rejects or rolls back state.
- A warning means your **schema or handler is wrong** — fix the schema to
  match reality (or the handler bug it exposed). Never "fix" it by mangling
  user state.
- Production builds skip validation entirely; apps without a `state` schema
  are never validated.

Practical tip: after migrating, run your app's flows once with the console
open. A clean console means your schema matches your reducer's reality.

## 8. Migration checklist

- [ ] Replace `registerAppEventHandler(prefix, handler)` with one
      `registerApp({...})` per app id.
- [ ] Declare every action your reducer's `switch` handles, with a
      `description`; add `params` schemas matching exactly the fields each
      `case` reads.
- [ ] Declare `state` as `z.looseObject` with `.optional()` +
      `.describe()` on every top-level field; derive your data type via
      `z.infer`.
- [ ] Replace `registerClassicyUntrustedActionAllowlist(type)` with
      `scriptable: true` on the action entry (app-owned actions only).
- [ ] Replace `isMyAppData`-style guards with `parseAppData`.
- [ ] Exercise the app in dev and confirm no
      `[registerApp] App state failed its manifest schema` warnings.
- [ ] Optional: wire `describeAppAction`/`describeAppState` into your
      settings surfaces for balloon help.

## 9. API quick reference

All exported from the package root:

| Export | Purpose |
| --- | --- |
| `registerApp(def)` | The unified registration call. |
| `getAppManifest(appId)` / `listAppManifests()` | Raw manifest lookup. |
| `listScriptableActions()` / `getScriptableAction(type)` | HyperCard discovery surface (guarded routes excluded). |
| `describeAppAction(appId, type)` | Balloon-ready `{ title, content }` for an action. |
| `describeAppState(appId, fieldPath)` | Balloon-ready `{ title, content }` for a state field (dot paths). |
| `parseAppData<T>(appId, raw)` | Typed, validated read of `apps[id].data`; `undefined` on failure. |
| `validateAppStateForAction(ds, action)` | The kernel's dev-mode check (exposed for tests). |
| `registerAppEventHandler` / `registerClassicyUntrustedActionAllowlist` | Deprecated primitives — unchanged behavior, no manifest recorded. |
