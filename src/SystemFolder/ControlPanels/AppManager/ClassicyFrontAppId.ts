import type {
	ClassicyStoreSystemApp,
	ClassicyStoreSystemAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { listAppWindows } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppWindows";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";

/**
 * Whether an extension's window floats over the front application: an
 * extension window that publishes no menus (Apple Guide's) is a floating
 * window, which keeps the application in front and its menus, chords and
 * windows as they are, as Apple Guide's floating windows did in Mac OS 8
 * (HIGOS8 Ch. 2, floating windows stay active beside the document window; a
 * background-only extension has no menus of its own to show). An extension
 * window that does publish menus is an ordinary window of the front
 * application: it takes the bar, the Application menu and the keyboard scope.
 */
export const isFloatingExtensionWindow = (
	app: Pick<ClassicyStoreSystemApp, "extension">,
	menuBar: ClassicyMenuItem[] | undefined,
): boolean => app.extension === true && !menuBar?.length;

/** An extension whose focused window publishes menus (see above). */
const extensionHoldsBar = (app: ClassicyStoreSystemApp): boolean =>
	listAppWindows(app).some(
		(w) => w.focused && !w.closed && (w.menuBar?.length ?? 0) > 0,
	);

/**
 * The front application: the app whose menus the menu bar shows and whose
 * keyboard equivalents are in effect. It is the focused app. An extension
 * that holds focus with no menu-publishing window (Apple Guide) is not: the
 * front is then the most recently focused open, shown non-extension app
 * (`lastFocusedAt`, as `pickSuccessorApp` ranks them), else Finder. With no
 * app focused it is `undefined`.
 *
 * Store-free, so reducers and hooks both read it (the hook is
 * `useFrontAppId`, `ClassicyFrontApp.ts`).
 */
export function frontAppIdOf(
	applications: Pick<ClassicyStoreSystemAppManager, "apps" | "focusedAppId">,
): string | undefined {
	const { apps } = applications;
	const focusedAppId =
		applications.focusedAppId ??
		Object.values(apps ?? {}).find((a) => a.focused && !a.extension)?.id;
	const focused = focusedAppId ? apps?.[focusedAppId] : undefined;
	if (!focused?.extension || extensionHoldsBar(focused)) return focusedAppId;
	let best: string | undefined;
	let bestAt = Number.NEGATIVE_INFINITY;
	for (const app of Object.values(apps)) {
		if (!app.open || app.extension || app.hidden) continue;
		const at = app.lastFocusedAt ?? 0;
		if (at > bestAt) {
			best = app.id;
			bestAt = at;
		}
	}
	return best ?? (apps["Finder.app"] ? "Finder.app" : undefined);
}
