import { createContext } from "react";

/**
 * True while rendering inside a {@link ClassicyButtonToolbar}. Controls read it
 * to pick toolbar-appropriate defaults — an icon-only `ClassicyBevelButton`
 * goes square — without the toolbar having to clone or inspect its children.
 *
 * It lives in its own module so `ClassicyBevelButton` can consume it without
 * importing the toolbar component, which would be a cycle.
 *
 * **Follows the React tree, not the DOM tree.** Like any React context, this
 * flows through portals: a `ClassicyBevelButton` rendered via
 * `createPortal()` from a tree that originates inside a toolbar still reads
 * `true` here, even though its DOM node lands somewhere else entirely (e.g. a
 * modal mounted at the document root). That is React behaving as documented,
 * not a bug to work around. A consumer whose portalled control should NOT
 * inherit the toolbar's square default should pass `square` explicitly on
 * that `ClassicyBevelButton` — an explicit prop always wins over the
 * context-derived default.
 */
export const ClassicyButtonToolbarContext = createContext<boolean>(false);
