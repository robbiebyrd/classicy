import type { FC as FunctionalComponent } from "react";
import {
	ClassicyAppManagerProvider,
	type ClassicyAppManagerProviderProps,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	ClassicyDesktop,
	type ClassicyDesktopProps,
} from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

/**
 * Props of `Classicy`: every `ClassicyAppManagerProvider` prop
 * (analytics, `defaultState`, the default file system, `disable*` for the
 * built-in apps, `defaultMuted`) and every `ClassicyDesktop` prop (the
 * startup screen, `controlStrip`, `themeLinks`, `className`, `style`,
 * `children`). The two sets share no name, so each prop goes to the one
 * component that takes it.
 */
export type ClassicyProps = ClassicyAppManagerProviderProps &
	ClassicyDesktopProps;

/**
 * The whole Classicy system in one tag: a `ClassicyAppManagerProvider` with a
 * `ClassicyDesktop` inside it. Mount it once, with your `ClassicyApp`s as
 * children:
 *
 * ```tsx
 * <Classicy defaultMuted controlStrip={{ defaultCollapsed: true }}>
 *   <MyApp />
 * </Classicy>
 * ```
 *
 * It is exactly the two components nested, so the desktop also mounts in the
 * same commit as the provider (the desktop must never mount lazily after it).
 * Use the two components yourself only when something has to sit between
 * them, such as a component of your own that reads the provider's contexts
 * outside the desktop. `className` and `style` go to the desktop's root.
 */
export const Classicy: FunctionalComponent<ClassicyProps> = ({
	// ClassicyDesktop
	children,
	startupScreen,
	startupDuration,
	preBootScreen,
	startupLogo,
	startupWordmark,
	bootScreen,
	controlStrip,
	themeLinks,
	className,
	style,
	// ClassicyAppManagerProvider: everything else
	...providerProps
}) => (
	<ClassicyAppManagerProvider {...providerProps}>
		<ClassicyDesktop
			startupScreen={startupScreen}
			startupDuration={startupDuration}
			preBootScreen={preBootScreen}
			startupLogo={startupLogo}
			startupWordmark={startupWordmark}
			bootScreen={bootScreen}
			controlStrip={controlStrip}
			themeLinks={themeLinks}
			className={className}
			style={style}
		>
			{children}
		</ClassicyDesktop>
	</ClassicyAppManagerProvider>
);
