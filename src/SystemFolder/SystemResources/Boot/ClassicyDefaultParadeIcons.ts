import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import type { ClassicyBootParadeIcon } from "@/SystemFolder/SystemResources/Boot/ClassicyBootManager";

const extensionIcon = (name: string): string =>
	resolveClassicyAsset("icons", `system.extensions.${name}`) ?? "";

/**
 * Classic Mac OS extension icons paraded on every boot splash by default.
 * ClassicyDesktop dispatches these on mount (icons resolve at call time, so a
 * registered appearance package's art is used); the parade slice is session-only,
 * so re-registering on every mount is idempotent (dedup by id).
 */
export const getClassicyDefaultParadeIcons = (): ClassicyBootParadeIcon[] => [
	{
		id: "system.extensions.appleGuide",
		icon: extensionIcon("appleGuide"),
		name: "Apple Guide",
	},
	{
		id: "system.extensions.appleShare",
		icon: extensionIcon("appleShare"),
		name: "AppleShare",
	},
	{
		id: "system.extensions.appleVision",
		icon: extensionIcon("appleVision"),
		name: "Apple Vision",
	},
	{
		id: "system.extensions.ethernet",
		icon: extensionIcon("ethernet"),
		name: "Ethernet",
	},
	{
		id: "system.extensions.fmRadio",
		icon: extensionIcon("fmRadio"),
		name: "FM Radio",
	},
	{
		id: "system.extensions.dateAndTime",
		icon: extensionIcon("dateAndTime"),
		name: "Date and Time",
	},
	{
		id: "system.extensions.contextMenus",
		icon: extensionIcon("contextMenus"),
		name: "Contextual Menus",
	},
	{
		id: "system.extensions.quickdraw",
		icon: extensionIcon("quickdraw"),
		name: "QuickDraw",
	},
	{
		id: "system.extensions.quicktime",
		icon: extensionIcon("quicktime"),
		name: "QuickTime",
	},
	{
		id: "system.extensions.quicktimeMpeg",
		icon: extensionIcon("quicktimeMpeg"),
		name: "QuickTime MPEG",
	},
	{
		id: "system.extensions.soundManager",
		icon: extensionIcon("soundManager"),
		name: "Sound Manager",
	},
];
