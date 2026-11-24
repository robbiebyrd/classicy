import type { ClassicyStoreSystemAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";

/**
 * The front application: the app whose menus the menu bar shows and whose
 * keyboard equivalents are in effect. It is the focused app, except that an
 * extension (Apple Guide) never takes the front: its window floats over the
 * application in use, as Apple Guide's did in Mac OS, which keeps its menus
 * and chords. While an extension holds focus the front is the most recently
 * focused open non-extension app (`lastFocusedAt`, as `pickSuccessorApp`
 * ranks them), else Finder. With no app focused it is `undefined`.
 *
 * Store-free (reducers and hooks both read it).
 */
export function frontAppIdOf(
	applications: Pick<ClassicyStoreSystemAppManager, "apps" | "focusedAppId">,
): string | undefined {
	const { apps } = applications;
	const focusedAppId =
		applications.focusedAppId ??
		Object.values(apps ?? {}).find((a) => a.focused && !a.extension)?.id;
	const focused = focusedAppId ? apps?.[focusedAppId] : undefined;
	if (!focused?.extension) return focusedAppId;
	let best: string | undefined;
	let bestAt = Number.NEGATIVE_INFINITY;
	for (const app of Object.values(apps)) {
		if (!app.open || app.extension) continue;
		const at = app.lastFocusedAt ?? 0;
		if (at > bestAt) {
			best = app.id;
			bestAt = at;
		}
	}
	return best ?? (apps["Finder.app"] ? "Finder.app" : undefined);
}

/** The front application's id (see `frontAppIdOf`), re-read on a change. */
export const useFrontAppId = (): string | undefined =>
	useAppManager((s) => frontAppIdOf(s.System.Manager.Applications));
