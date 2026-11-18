import { createContext } from "react";

/**
 * Claims, for the nearest `ClassicyWindow`, that its content lays itself out
 * from the window's edge; returns the release. The window provides it around
 * its children and counts the claims (see `useClassicyWindowSelfPadding`).
 * `null` outside any window.
 */
export type ClassicyWindowSelfPaddingClaim = () => () => void;

export const ClassicyWindowSelfPaddingContext =
	createContext<ClassicyWindowSelfPaddingClaim | null>(null);
