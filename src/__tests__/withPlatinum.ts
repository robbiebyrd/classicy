// A side-effect module for tests that mount ClassicyDesktop and expect the
// Platinum look or sounds: importing it registers the Platinum Appearance
// Package (its assets and sound pack included). The core registers no
// package (plan 0015 §1.6), and the desktop draws no desktop without one
// (ClassicyNoAppearancePackage), so such tests import this:
//
//   import "@/__tests__/withPlatinum";
import "@/Appearance/Platinum";
