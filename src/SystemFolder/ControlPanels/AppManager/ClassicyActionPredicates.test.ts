import { describe, expect, it } from "vitest";
import {
	hasActiveTheme,
	hasApp,
	hasAppAndFileType,
	hasAppAndFileTypes,
	hasAppAndPath,
	hasAppAndWindow,
	hasAvailableThemes,
	hasBackgroundImage,
	hasBackgroundPosition,
	hasBackgroundRepeat,
	hasBackgroundSize,
	hasDateTime,
	hasDesktopAppRef,
	hasDisableBalloonHelp,
	hasDrive,
	hasErrorDialogMessage,
	hasFinderFile,
	hasFont,
	hasIconAddFields,
	hasIconId,
	hasIconIds,
	hasIconLocation,
	hasMenuBar,
	hasMouseEvent,
	hasPath,
	hasPaths,
	hasSortBy,
	hasTzOffset,
	hasWindow,
	hasWindowDragging,
	hasWindowMove,
	hasWindowPosition,
	hasWindowResizing,
	hasWindowZoomed,
} from "./ClassicyActionPredicates";

type Msg = Record<string, unknown> & { type: string };

// ─── hasApp ──────────────────────────────────────────────────────────────────

describe("hasApp", () => {
	it("returns true when action.app has a string id", () => {
		const m: Msg = { type: "X", app: { id: "Finder.app" } };
		expect(hasApp(m)).toBe(true);
	});

	it("returns false when action.app is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasApp(m)).toBe(false);
	});

	it("returns false when action.app.id is not a string", () => {
		const m: Msg = { type: "X", app: { id: 42 } };
		expect(hasApp(m)).toBe(false);
	});

	it("returns false when action.app is not an object", () => {
		const m: Msg = { type: "X", app: "Finder.app" };
		expect(hasApp(m)).toBe(false);
	});
});

// ─── hasAppAndFileTypes ───────────────────────────────────────────────────────

describe("hasAppAndFileTypes", () => {
	it("returns true when app.id is a string and fileTypes is an array", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			fileTypes: ["text_file"],
		};
		expect(hasAppAndFileTypes(m)).toBe(true);
	});

	it("returns false when fileTypes is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app" } };
		expect(hasAppAndFileTypes(m)).toBe(false);
	});

	it("returns false when fileTypes is not an array", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, fileTypes: "text_file" };
		expect(hasAppAndFileTypes(m)).toBe(false);
	});

	it("returns false when app is missing", () => {
		const m: Msg = { type: "X", fileTypes: ["text_file"] };
		expect(hasAppAndFileTypes(m)).toBe(false);
	});
});

// ─── hasAppAndPath ────────────────────────────────────────────────────────────

describe("hasAppAndPath", () => {
	it("returns true when app.id and path are both strings", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, path: "Mac HD:file.txt" };
		expect(hasAppAndPath(m)).toBe(true);
	});

	it("returns false when path is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app" } };
		expect(hasAppAndPath(m)).toBe(false);
	});

	it("returns false when path is not a string", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, path: 123 };
		expect(hasAppAndPath(m)).toBe(false);
	});

	it("returns false when app is missing", () => {
		const m: Msg = { type: "X", path: "Mac HD:file.txt" };
		expect(hasAppAndPath(m)).toBe(false);
	});
});

// ─── hasAppAndFileType ────────────────────────────────────────────────────────

describe("hasAppAndFileType", () => {
	it("returns true when app.id and fileType are both strings", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, fileType: "text_file" };
		expect(hasAppAndFileType(m)).toBe(true);
	});

	it("returns false when fileType is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app" } };
		expect(hasAppAndFileType(m)).toBe(false);
	});

	it("returns false when fileType is not a string", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, fileType: 42 };
		expect(hasAppAndFileType(m)).toBe(false);
	});
});

// ─── hasWindow ────────────────────────────────────────────────────────────────

describe("hasWindow", () => {
	it("returns true when action.window has a string id", () => {
		const m: Msg = { type: "X", window: { id: "w1" } };
		expect(hasWindow(m)).toBe(true);
	});

	it("returns false when window is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasWindow(m)).toBe(false);
	});

	it("returns false when window.id is not a string", () => {
		const m: Msg = { type: "X", window: { id: 1 } };
		expect(hasWindow(m)).toBe(false);
	});
});

// ─── hasAppAndWindow ──────────────────────────────────────────────────────────

describe("hasAppAndWindow", () => {
	it("returns true when both app.id and window.id are strings", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, window: { id: "w1" } };
		expect(hasAppAndWindow(m)).toBe(true);
	});

	it("returns false when app is missing", () => {
		const m: Msg = { type: "X", window: { id: "w1" } };
		expect(hasAppAndWindow(m)).toBe(false);
	});

	it("returns false when window is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app" } };
		expect(hasAppAndWindow(m)).toBe(false);
	});
});

// ─── hasWindowDragging ────────────────────────────────────────────────────────

describe("hasWindowDragging", () => {
	it("returns true when app, window, and boolean dragging are present", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			dragging: false,
		};
		expect(hasWindowDragging(m)).toBe(true);
	});

	it("returns false when dragging is not a boolean", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			dragging: 1,
		};
		expect(hasWindowDragging(m)).toBe(false);
	});

	it("returns false when dragging is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, window: { id: "w1" } };
		expect(hasWindowDragging(m)).toBe(false);
	});
});

// ─── hasWindowZoomed ─────────────────────────────────────────────────────────

describe("hasWindowZoomed", () => {
	it("returns true when app, window, and boolean zoomed are present", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			zoomed: true,
		};
		expect(hasWindowZoomed(m)).toBe(true);
	});

	it("returns false when zoomed is not a boolean", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			zoomed: "yes",
		};
		expect(hasWindowZoomed(m)).toBe(false);
	});
});

// ─── hasWindowResizing ────────────────────────────────────────────────────────

describe("hasWindowResizing", () => {
	it("returns true when app, window, boolean resizing, and size tuple are present", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			resizing: false,
			size: [800, 600],
		};
		expect(hasWindowResizing(m)).toBe(true);
	});

	it("returns false when size is missing", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			resizing: false,
		};
		expect(hasWindowResizing(m)).toBe(false);
	});

	it("returns false when size is not a 2-element array", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			resizing: false,
			size: [800],
		};
		expect(hasWindowResizing(m)).toBe(false);
	});

	it("returns false when resizing is not a boolean", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			resizing: 1,
			size: [800, 600],
		};
		expect(hasWindowResizing(m)).toBe(false);
	});
});

// ─── hasWindowMove ────────────────────────────────────────────────────────────

describe("hasWindowMove", () => {
	it("returns true when app, window, position tuple, and boolean moving are present", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			position: [10, 20],
			moving: true,
		};
		expect(hasWindowMove(m)).toBe(true);
	});

	it("returns false when position is missing", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			moving: true,
		};
		expect(hasWindowMove(m)).toBe(false);
	});

	it("returns false when moving is not a boolean", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			position: [10, 20],
			moving: "yes",
		};
		expect(hasWindowMove(m)).toBe(false);
	});
});

// ─── hasWindowPosition ───────────────────────────────────────────────────────

describe("hasWindowPosition", () => {
	it("returns true when app, window, and position tuple are present", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			position: [10, 20],
		};
		expect(hasWindowPosition(m)).toBe(true);
	});

	it("returns false when position is not a 2-element array of numbers", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app" },
			window: { id: "w1" },
			position: ["a", "b"],
		};
		expect(hasWindowPosition(m)).toBe(false);
	});

	it("returns false when position is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, window: { id: "w1" } };
		expect(hasWindowPosition(m)).toBe(false);
	});
});

// ─── hasMenuBar ───────────────────────────────────────────────────────────────

describe("hasMenuBar", () => {
	it("returns true when action.menuBar is an array", () => {
		const m: Msg = { type: "X", menuBar: [{ id: "file", title: "File" }] };
		expect(hasMenuBar(m)).toBe(true);
	});

	it("returns true for an empty array", () => {
		const m: Msg = { type: "X", menuBar: [] };
		expect(hasMenuBar(m)).toBe(true);
	});

	it("returns false when menuBar is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasMenuBar(m)).toBe(false);
	});

	it("returns false when menuBar is not an array", () => {
		const m: Msg = { type: "X", menuBar: "menu" };
		expect(hasMenuBar(m)).toBe(false);
	});
});

// ─── hasDesktopAppRef ─────────────────────────────────────────────────────────

describe("hasDesktopAppRef", () => {
	it("returns true when app has id, name, and icon as strings", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app", name: "App", icon: "icon.png" },
		};
		expect(hasDesktopAppRef(m)).toBe(true);
	});

	it("returns false when app.name is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app", icon: "icon.png" } };
		expect(hasDesktopAppRef(m)).toBe(false);
	});

	it("returns false when app.icon is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app", name: "App" } };
		expect(hasDesktopAppRef(m)).toBe(false);
	});
});

// ─── hasMouseEvent ────────────────────────────────────────────────────────────

describe("hasMouseEvent", () => {
	it("returns true when action.e has clientX and clientY as numbers", () => {
		const m: Msg = {
			type: "X",
			e: { clientX: 100, clientY: 200, target: { id: "classicyDesktop" } },
		};
		expect(hasMouseEvent(m)).toBe(true);
	});

	it("returns false when e is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasMouseEvent(m)).toBe(false);
	});

	it("returns false when clientX is not a number", () => {
		const m: Msg = {
			type: "X",
			e: { clientX: "100", clientY: 200, target: {} },
		};
		expect(hasMouseEvent(m)).toBe(false);
	});
});

// ─── hasActiveTheme ───────────────────────────────────────────────────────────

describe("hasActiveTheme", () => {
	it("returns true when activeTheme is a string", () => {
		const m: Msg = { type: "X", activeTheme: "default" };
		expect(hasActiveTheme(m)).toBe(true);
	});

	it("returns false when activeTheme is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasActiveTheme(m)).toBe(false);
	});

	it("returns false when activeTheme is not a string", () => {
		const m: Msg = { type: "X", activeTheme: 42 };
		expect(hasActiveTheme(m)).toBe(false);
	});
});

// ─── hasBackgroundImage ───────────────────────────────────────────────────────

describe("hasBackgroundImage", () => {
	it("returns true when backgroundImage is a string", () => {
		const m: Msg = { type: "X", backgroundImage: "bg.png" };
		expect(hasBackgroundImage(m)).toBe(true);
	});

	it("returns false when backgroundImage is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasBackgroundImage(m)).toBe(false);
	});
});

// ─── hasBackgroundPosition ────────────────────────────────────────────────────

describe("hasBackgroundPosition", () => {
	it("returns true when backgroundPosition is a string", () => {
		const m: Msg = { type: "X", backgroundPosition: "center" };
		expect(hasBackgroundPosition(m)).toBe(true);
	});

	it("returns false when backgroundPosition is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasBackgroundPosition(m)).toBe(false);
	});
});

// ─── hasBackgroundRepeat ──────────────────────────────────────────────────────

describe("hasBackgroundRepeat", () => {
	it("returns true when backgroundRepeat is a string", () => {
		const m: Msg = { type: "X", backgroundRepeat: "no-repeat" };
		expect(hasBackgroundRepeat(m)).toBe(true);
	});

	it("returns false when backgroundRepeat is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasBackgroundRepeat(m)).toBe(false);
	});
});

// ─── hasBackgroundSize ────────────────────────────────────────────────────────

describe("hasBackgroundSize", () => {
	it("returns true when backgroundSize is a string", () => {
		const m: Msg = { type: "X", backgroundSize: "cover" };
		expect(hasBackgroundSize(m)).toBe(true);
	});

	it("returns false when backgroundSize is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasBackgroundSize(m)).toBe(false);
	});
});

// ─── hasFont ──────────────────────────────────────────────────────────────────

describe("hasFont", () => {
	it("returns true when fontType and font are both strings", () => {
		const m: Msg = { type: "X", fontType: "body", font: "Arial" };
		expect(hasFont(m)).toBe(true);
	});

	it("returns false when fontType is missing", () => {
		const m: Msg = { type: "X", font: "Arial" };
		expect(hasFont(m)).toBe(false);
	});

	it("returns false when font is missing", () => {
		const m: Msg = { type: "X", fontType: "body" };
		expect(hasFont(m)).toBe(false);
	});
});

// ─── hasAvailableThemes ───────────────────────────────────────────────────────

describe("hasAvailableThemes", () => {
	it("returns true when availableThemes is an array", () => {
		const m: Msg = { type: "X", availableThemes: [] };
		expect(hasAvailableThemes(m)).toBe(true);
	});

	it("returns false when availableThemes is not an array", () => {
		const m: Msg = { type: "X", availableThemes: "themes" };
		expect(hasAvailableThemes(m)).toBe(false);
	});

	it("returns false when availableThemes is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasAvailableThemes(m)).toBe(false);
	});
});

// ─── hasDisableBalloonHelp ────────────────────────────────────────────────────

describe("hasDisableBalloonHelp", () => {
	it("returns true when disableBalloonHelp is a boolean", () => {
		const m: Msg = { type: "X", disableBalloonHelp: true };
		expect(hasDisableBalloonHelp(m)).toBe(true);
	});

	it("returns false when disableBalloonHelp is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasDisableBalloonHelp(m)).toBe(false);
	});

	it("returns false when disableBalloonHelp is not a boolean", () => {
		const m: Msg = { type: "X", disableBalloonHelp: 1 };
		expect(hasDisableBalloonHelp(m)).toBe(false);
	});
});

// ─── hasDrive ─────────────────────────────────────────────────────────────────

describe("hasDrive", () => {
	it("returns true when drive is a string", () => {
		expect(hasDrive({ type: "X", drive: "Macintosh HD" })).toBe(true);
	});
	it("returns false when drive is missing or non-string", () => {
		expect(hasDrive({ type: "X" })).toBe(false);
		expect(hasDrive({ type: "X", drive: 1 })).toBe(false);
	});
});

// ─── hasErrorDialogMessage ────────────────────────────────────────────────────

describe("hasErrorDialogMessage", () => {
	it("returns true when message is a string", () => {
		const m: Msg = { type: "X", message: "Something went wrong" };
		expect(hasErrorDialogMessage(m)).toBe(true);
	});

	it("returns false when message is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasErrorDialogMessage(m)).toBe(false);
	});

	it("returns false when message is not a string", () => {
		const m: Msg = { type: "X", message: 42 };
		expect(hasErrorDialogMessage(m)).toBe(false);
	});
});

// ─── hasSortBy ────────────────────────────────────────────────────────────────

describe("hasSortBy", () => {
	it("returns true when sortBy is a string", () => {
		const m: Msg = { type: "X", sortBy: "name" };
		expect(hasSortBy(m)).toBe(true);
	});

	it("returns false when sortBy is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasSortBy(m)).toBe(false);
	});

	it("returns false when sortBy is not a string", () => {
		const m: Msg = { type: "X", sortBy: 1 };
		expect(hasSortBy(m)).toBe(false);
	});
});

// ─── hasIconId ────────────────────────────────────────────────────────────────

describe("hasIconId", () => {
	it("returns true when iconId is a string", () => {
		const m: Msg = { type: "X", iconId: "HardDrive" };
		expect(hasIconId(m)).toBe(true);
	});

	it("returns false when iconId is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasIconId(m)).toBe(false);
	});

	it("returns false when iconId is not a string", () => {
		const m: Msg = { type: "X", iconId: 1 };
		expect(hasIconId(m)).toBe(false);
	});
});

// ─── hasIconIds ───────────────────────────────────────────────────────────────

describe("hasIconIds", () => {
	it("returns true when iconIds is an array", () => {
		const m: Msg = { type: "X", iconIds: ["HardDrive", "Trash"] };
		expect(hasIconIds(m)).toBe(true);
	});

	it("returns true for empty array", () => {
		const m: Msg = { type: "X", iconIds: [] };
		expect(hasIconIds(m)).toBe(true);
	});

	it("returns false when iconIds is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasIconIds(m)).toBe(false);
	});

	it("returns false when iconIds is not an array", () => {
		const m: Msg = { type: "X", iconIds: "HardDrive" };
		expect(hasIconIds(m)).toBe(false);
	});
});

// ─── hasIconAddFields ─────────────────────────────────────────────────────────

describe("hasIconAddFields", () => {
	it("returns true when app has id, name, icon and required icon fields are present", () => {
		const m: Msg = {
			type: "X",
			app: { id: "A.app", name: "App", icon: "icon.png" },
		};
		expect(hasIconAddFields(m)).toBe(true);
	});

	it("returns false when app is missing name", () => {
		const m: Msg = { type: "X", app: { id: "A.app", icon: "icon.png" } };
		expect(hasIconAddFields(m)).toBe(false);
	});

	it("returns false when app is missing icon", () => {
		const m: Msg = { type: "X", app: { id: "A.app", name: "App" } };
		expect(hasIconAddFields(m)).toBe(false);
	});
});

// ─── hasIconLocation ──────────────────────────────────────────────────────────

describe("hasIconLocation", () => {
	it("returns true when app.id is a string and location is a 2-number array", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, location: [100, 200] };
		expect(hasIconLocation(m)).toBe(true);
	});

	it("returns false when location is missing", () => {
		const m: Msg = { type: "X", app: { id: "A.app" } };
		expect(hasIconLocation(m)).toBe(false);
	});

	it("returns false when location is not a 2-number array", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, location: ["a", "b"] };
		expect(hasIconLocation(m)).toBe(false);
	});

	it("returns false when location has only 1 element", () => {
		const m: Msg = { type: "X", app: { id: "A.app" }, location: [100] };
		expect(hasIconLocation(m)).toBe(false);
	});
});

// ─── hasDateTime ──────────────────────────────────────────────────────────────

describe("hasDateTime", () => {
	it("returns true when dateTime is a Date instance", () => {
		const m: Msg = { type: "X", dateTime: new Date() };
		expect(hasDateTime(m)).toBe(true);
	});

	it("returns false when dateTime is a string", () => {
		const m: Msg = { type: "X", dateTime: "2024-01-01" };
		expect(hasDateTime(m)).toBe(false);
	});

	it("returns false when dateTime is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasDateTime(m)).toBe(false);
	});
});

// ─── hasTzOffset ──────────────────────────────────────────────────────────────

describe("hasTzOffset", () => {
	it("returns true when tzOffset is a string", () => {
		const m: Msg = { type: "X", tzOffset: "-5" };
		expect(hasTzOffset(m)).toBe(true);
	});

	it("returns false when tzOffset is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasTzOffset(m)).toBe(false);
	});

	it("returns false when tzOffset is a number (not narrowed to string)", () => {
		const m: Msg = { type: "X", tzOffset: -5 };
		expect(hasTzOffset(m)).toBe(false);
	});
});

// ─── hasPath ──────────────────────────────────────────────────────────────────

describe("hasPath", () => {
	it("returns true when path is a string", () => {
		const m: Msg = { type: "X", path: "Mac HD:Documents" };
		expect(hasPath(m)).toBe(true);
	});

	it("returns false when path is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasPath(m)).toBe(false);
	});

	it("returns false when path is not a string", () => {
		const m: Msg = { type: "X", path: 42 };
		expect(hasPath(m)).toBe(false);
	});
});

// ─── hasPaths ─────────────────────────────────────────────────────────────────

describe("hasPaths", () => {
	it("returns true when paths is an array", () => {
		const m: Msg = { type: "X", paths: ["Mac HD:Documents", "Mac HD:Desktop"] };
		expect(hasPaths(m)).toBe(true);
	});

	it("returns false when paths is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasPaths(m)).toBe(false);
	});

	it("returns false when paths is not an array", () => {
		const m: Msg = { type: "X", paths: "Mac HD:Documents" };
		expect(hasPaths(m)).toBe(false);
	});
});

// ─── hasFinderFile ────────────────────────────────────────────────────────────

describe("hasFinderFile", () => {
	it("returns true when file is an object", () => {
		const m: Msg = { type: "X", file: { _creator: "QuickTime", _data: "{}" } };
		expect(hasFinderFile(m)).toBe(true);
	});

	it("returns false when file is missing", () => {
		const m: Msg = { type: "X" };
		expect(hasFinderFile(m)).toBe(false);
	});

	it("returns false when file is not an object", () => {
		const m: Msg = { type: "X", file: "some-string" };
		expect(hasFinderFile(m)).toBe(false);
	});

	it("returns false when file is null", () => {
		const m: Msg = { type: "X", file: null };
		expect(hasFinderFile(m)).toBe(false);
	});
});
