import { createContext } from "react";

/**
 * True while rendering inside a {@link ClassicyButtonToolbar}. Controls read it
 * to pick toolbar-appropriate defaults — an icon-only `ClassicyBevelButton`
 * goes square — without the toolbar having to clone or inspect its children.
 *
 * It lives in its own module so `ClassicyBevelButton` can consume it without
 * importing the toolbar component, which would be a cycle.
 */
export const ClassicyButtonToolbarContext = createContext<boolean>(false);
