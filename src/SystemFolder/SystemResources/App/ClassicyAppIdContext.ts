import { createContext } from "react";

/**
 * The `id` of the {@link ClassicyApp} lexically enclosing the current render,
 * or `undefined` outside any app.
 *
 * This is deliberately lexical, not derived from global focus/open state: a
 * dialog rendered deep inside an app's tree (e.g.
 * `ClassicyColorPickerDialog`) needs to know which app *called* it, not
 * which app happens to be focused right now. Reading global focus instead
 * would register the dialog under the wrong app whenever the owning app is
 * open-but-unfocused, and would migrate the registration out from under the
 * dialog (stealing focus) whenever focus changes elsewhere while the dialog
 * stays open.
 *
 * It lives in its own module so a consumer deep in the tree (e.g. a dialog
 * component) can read it without importing `ClassicyApp` itself, which would
 * be a cycle — `ClassicyApp` is the provider, not a consumer.
 */
export const ClassicyAppIdContext = createContext<string | undefined>(
	undefined,
);
