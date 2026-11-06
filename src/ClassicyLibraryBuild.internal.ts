// The library build's entry (vite.config.ts `build.lib.entry`); no source
// module imports it. The core, src/index.ts and everything it reaches,
// neither imports nor exports Platinum (ClassicyCoreImportGraph.test.ts):
// a host loads an Appearance Package itself. Until Platinum ships as its own
// package, `@classicy/appearance-platinum` (plan 0015 Phase 3), the built
// bundle still carries it, registering it after the core has evaluated, as
// a host's own Platinum import will, so dist keeps drawing the Platinum
// desktop and `verify:dist`'s package invariants hold. Platinum's names are
// not exported: the bundle's API is the barrel's.
export * from "./index";

import "./Appearance/Platinum";
