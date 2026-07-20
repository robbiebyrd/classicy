import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import type { ClassicyBootParadeIcon } from "@/SystemFolder/SystemResources/Boot/ClassicyBootManager";

const extensionIcons = ClassicyIcons.system.extensions;

/**
 * Classic Mac OS extension icons paraded on every boot splash by default.
 * ClassicyDesktop dispatches these on mount; the parade slice is session-only,
 * so re-registering on every mount is idempotent (dedup by id).
 */
export const ClassicyDefaultParadeIcons: ClassicyBootParadeIcon[] = [
	{
		id: "system.extensions.appleGuide",
		icon: extensionIcons.appleGuide,
		name: "Apple Guide",
	},
	{
		id: "system.extensions.appleShare",
		icon: extensionIcons.appleShare,
		name: "AppleShare",
	},
	{
		id: "system.extensions.appleVision",
		icon: extensionIcons.appleVision,
		name: "Apple Vision",
	},
	{
		id: "system.extensions.ethernet",
		icon: extensionIcons.ethernet,
		name: "Ethernet",
	},
	{
		id: "system.extensions.fmRadio",
		icon: extensionIcons.fmRadio,
		name: "FM Radio",
	},
	{
		id: "system.extensions.dateAndTime",
		icon: extensionIcons.dateAndTime,
		name: "Date and Time",
	},
	{
		id: "system.extensions.contextMenus",
		icon: extensionIcons.contextMenus,
		name: "Contextual Menus",
	},
	{
		id: "system.extensions.quickdraw",
		icon: extensionIcons.quickdraw,
		name: "QuickDraw",
	},
	{
		id: "system.extensions.quicktime",
		icon: extensionIcons.quicktime,
		name: "QuickTime",
	},
	{
		id: "system.extensions.quicktimeMpeg",
		icon: extensionIcons.quicktimeMpeg,
		name: "QuickTime MPEG",
	},
	{
		id: "system.extensions.soundManager",
		icon: extensionIcons.soundManager,
		name: "Sound Manager",
	},
];
