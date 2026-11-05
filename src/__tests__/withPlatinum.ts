// A side-effect module for tests that mount ClassicyDesktop and expect the
// Platinum look or sounds: importing it registers the Platinum Appearance
// Package (its assets and sound pack included). The desktop draws no desktop
// without a package (ClassicyNoAppearancePackage), and the core will stop
// importing Platinum itself (plan 0015 §1.6), so such tests import this:
//
//   import "@/__tests__/withPlatinum";
import "@/Appearance/Platinum";
