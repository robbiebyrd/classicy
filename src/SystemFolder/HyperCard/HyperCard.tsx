/**
 * HyperCard.app — a JSON-driven HyperCard stack player for Classicy.
 *
 * Renders the active stack's current card in a window, wires the Go/File menus,
 * and bridges the pure interpreter to the outside world: it consumes queued
 * sound/openApp effects, drives `wait` timers, animates card transitions, and
 * shows ask/answer dialogs — all by dispatching back into the reducer.
 */

import {
	type FC as FunctionalComponent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { HyperCardEditorCanvas } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorCanvas";
import { registerDownloadSaveProvider } from "@/SystemFolder/HyperCard/Editor/HyperCardEditorSave";
import type {
	HCEditState,
	HyperCardEditorData,
} from "@/SystemFolder/HyperCard/Editor/HyperCardEditorUtils";
import { HyperCardInspector } from "@/SystemFolder/HyperCard/Editor/HyperCardInspector";
import { HyperCardSavedStacks } from "@/SystemFolder/HyperCard/Editor/HyperCardSavedStacks";
import { HyperCardScriptEditor } from "@/SystemFolder/HyperCard/Editor/HyperCardScriptEditor";
import { HyperCardToolsPalette } from "@/SystemFolder/HyperCard/Editor/HyperCardToolsPalette";
import { HyperCardCard } from "@/SystemFolder/HyperCard/HyperCardCard";
import { HyperCardDialog } from "@/SystemFolder/HyperCard/HyperCardDialog";
import {
	type HCStack,
	validateStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	getHyperCardEffectHandler,
	getHyperCardSaveProviders,
	getRegisteredStacks,
} from "@/SystemFolder/HyperCard/HyperCardPlugins";
import { HyperCardBuiltInStacks } from "@/SystemFolder/HyperCard/HyperCardSampleStack";
import { HyperCardTransition } from "@/SystemFolder/HyperCard/HyperCardTransition";
import {
	getCard,
	type HCOpenStack,
	HyperCardAppInfo,
	type HyperCardData,
	isHyperCardData,
} from "@/SystemFolder/HyperCard/HyperCardUtils";
import { ClassicyApp } from "@/SystemFolder/SystemResources/App/ClassicyApp";
import { quitMenuItemHelper } from "@/SystemFolder/SystemResources/App/ClassicyAppUtils";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { resolveFileSystemEntrySource } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContentResolver";
import { useClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemContext";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";
// Side-effect import: registers the ClassicyAppHyperCard* reducer.
import "./HyperCardContext";
// Side-effect import: registers the ClassicyAppHCEdit* reducer.
import "./Editor/HyperCardEditorContext";
import "./HyperCard.scss";

// Registers the built-in Download save provider under the save-provider registry.
registerDownloadSaveProvider();

const { id: appId, name: appName, icon: appIcon } = HyperCardAppInfo;

function useHyperCardData(): HyperCardData | undefined {
	return useAppManager((s) => {
		const raw = s.System.Manager.Applications.apps[appId]?.data;
		return raw && isHyperCardData(raw) ? raw : undefined;
	});
}

export const HyperCard: FunctionalComponent = () => {
	const dispatch = useAppManagerDispatch();
	const player = useSoundDispatch();

	const [savedStacksOpen, setSavedStacksOpen] = useState(false);

	const data = useHyperCardData();
	const activeStackId = data?.activeStackId;
	const open: HCOpenStack | undefined = activeStackId
		? data?.openStacks[activeStackId]
		: undefined;

	const edit: HCEditState | undefined = useAppManager((s) => {
		const d = s.System.Manager.Applications.apps[appId]?.data as
			| HyperCardEditorData
			| undefined;
		return activeStackId ? d?.edits?.[activeStackId] : undefined;
	});
	const editingActive = Boolean(edit) && edit?.tool !== "browse";

	// Browse-preview: entering the browse tool pushes the draft into the player.
	const editTool = edit?.tool;
	useEffect(() => {
		if (!activeStackId || !edit || editTool !== "browse") return;
		dispatch({
			type: "ClassicyAppHyperCardOpenStack",
			stackId: activeStackId,
			stack: edit.draft,
		});
	}, [activeStackId, edit, editTool, dispatch]);

	const runtime = open?.runtime;
	const pendingEffects = runtime?.pendingEffects;
	const waitToken = runtime?.wait?.token;
	const waitMs = runtime?.wait?.ms;

	// --- consume queued sound / openApp effects (by id, once) ---
	const playedRef = useRef<Set<number>>(new Set());
	useEffect(() => {
		if (
			!open ||
			!activeStackId ||
			!pendingEffects ||
			pendingEffects.length === 0
		)
			return;
		const consumed: number[] = [];
		for (const e of pendingEffects) {
			consumed.push(e.id);
			if (playedRef.current.has(e.id)) continue;
			playedRef.current.add(e.id);
			if (e.kind === "beep") {
				player({ type: "ClassicySoundPlay", sound: "ClassicyBeep" });
			} else if (e.kind === "play") {
				player({ type: "ClassicySoundPlay", sound: e.sound });
			} else if (e.kind === "openApp") {
				// ClassicyAppOpen's predicate requires { id, name, icon }; stacks
				// author only the app id, so resolve the registered app record.
				const target =
					useAppManager.getState().System.Manager.Applications.apps[e.appId];
				dispatch({
					type: e.event ?? "ClassicyAppOpen",
					app: target
						? { id: target.id, name: target.name, icon: target.icon }
						: { id: e.appId },
					...(e.data ?? {}),
				});
			} else if (e.kind === "custom") {
				const handler = getHyperCardEffectHandler(e.name);
				const token = e.token;
				const sid = activeStackId;
				const resolveEmpty = () => {
					if (token) {
						dispatch({
							type: "ClassicyAppHyperCardResolveCommand",
							stackId: sid,
							token,
							result: "",
						});
					}
				};
				if (handler) {
					Promise.resolve(
						handler(e.args, {
							stackId: sid,
							resolve: (value: string) => {
								if (token) {
									dispatch({
										type: "ClassicyAppHyperCardResolveCommand",
										stackId: sid,
										token,
										result: value,
									});
								}
							},
							setField: (partId: string, value: string) =>
								dispatch({
									type: "ClassicyAppHyperCardCommitField",
									stackId: sid,
									partId,
									value,
								}),
							setVariable: (name: string, value) =>
								dispatch({
									type: "ClassicyAppHyperCardSetVariable",
									stackId: sid,
									name,
									value,
								}),
						}),
					).catch((err) => {
						console.error("[HyperCard] effect handler error", e.name, err);
						resolveEmpty();
					});
				} else {
					// No handler for a blocking command → resolve empty so the stack
					// never hangs waiting on a plugin that isn't registered.
					resolveEmpty();
				}
			}
		}
		dispatch({
			type: "ClassicyAppHyperCardConsumeEffects",
			stackId: activeStackId,
			ids: consumed,
		});
	}, [open, activeStackId, pendingEffects, player, dispatch]);

	// --- drive `wait` timers ---
	useEffect(() => {
		if (!activeStackId || !waitToken) return;
		const timer = setTimeout(() => {
			dispatch({
				type: "ClassicyAppHyperCardWaitComplete",
				stackId: activeStackId,
				token: waitToken,
			});
		}, waitMs ?? 0);
		return () => clearTimeout(timer);
	}, [activeStackId, waitToken, waitMs, dispatch]);

	// --- load queued `.stack` documents (Finder OpenFile routing) ---
	// Double-clicking a Stack file appends its path to this app's
	// data.openFiles (the kernel's generic *OpenFile handling). Read it raw —
	// not through useHyperCardData — because on first open the kernel writes
	// { openFiles } before any HyperCard action has seeded openStacks. This
	// effect resolves each entry through the file system, fetches/decodes its
	// JSON, validates it, and either opens the stack (keyed by its path) or
	// reports the failure; both outcomes consume the path.
	const fs = useClassicyFileSystem();
	const rawOpenFiles = useAppManager((s) => {
		const d = s.System.Manager.Applications.apps[appId]?.data as
			| { openFiles?: unknown }
			| undefined;
		return Array.isArray(d?.openFiles) ? (d.openFiles as string[]) : undefined;
	});
	const openStacksById = data?.openStacks;
	const loadingRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (!rawOpenFiles || rawOpenFiles.length === 0) return;
		for (const path of rawOpenFiles) {
			if (loadingRef.current.has(path)) continue;
			if (openStacksById?.[path]) {
				// Already open from this path (e.g. re-double-clicked): focus it
				// via the reducer's OpenFile case and clear the queue entry.
				dispatch({ type: "ClassicyAppHyperCardOpenFile", path });
				dispatch({ type: "ClassicyAppHyperCardOpenFileConsumed", path });
				continue;
			}
			loadingRef.current.add(path);
			const fileName = path.split(":").pop() ?? path;
			const fail = (message: string) => {
				loadingRef.current.delete(path);
				dispatch({
					type: "ClassicyAppHyperCardOpenFileFailed",
					path,
					message,
				});
			};
			let source: ReturnType<typeof resolveFileSystemEntrySource>;
			try {
				source = resolveFileSystemEntrySource(fs.resolve(path));
			} catch {
				source = { kind: "none" };
			}
			const textPromise: Promise<string> =
				source.kind === "url"
					? fetch(source.url).then((r) => {
							if (!r.ok) throw new Error(`HTTP ${r.status}`);
							return r.text();
						})
					: source.kind === "data"
						? decompressFromBase64(source.data).then((bytes) =>
								new TextDecoder().decode(bytes),
							)
						: Promise.reject(new Error("the file has no content"));
			textPromise
				.then((text) => {
					const result = validateStack(JSON.parse(text));
					if (result.ok === false) {
						fail(
							`“${fileName}” is not a valid HyperCard stack: ${result.errors[0]}`,
						);
						return;
					}
					loadingRef.current.delete(path);
					dispatch({
						type: "ClassicyAppHyperCardOpenStack",
						stackId: path,
						stackSource: path,
						stack: result.stack,
					});
					dispatch({ type: "ClassicyAppHyperCardOpenFileConsumed", path });
				})
				.catch((err: unknown) => {
					fail(
						`“${fileName}” could not be opened: ${err instanceof Error ? err.message : String(err)}.`,
					);
				});
		}
	}, [rawOpenFiles, openStacksById, fs, dispatch]);

	const openStack = useCallback(
		(id: string, stack: HCStack) => {
			dispatch({
				type: "ClassicyAppHyperCardOpenStack",
				stackId: id,
				stack,
			});
		},
		[dispatch],
	);

	// Built-in stacks plus any a host app registered via registerHyperCardStack.
	const stackEntries = useMemo(
		() => [
			...Object.values(HyperCardBuiltInStacks).map((e) => ({
				id: e.id,
				name: e.stack.name,
				stack: e.stack,
			})),
			...getRegisteredStacks(),
		],
		[],
	);

	const navigate = useCallback(
		(to: string) => {
			if (!activeStackId) return;
			if (editingActive) {
				dispatch({
					type: "ClassicyAppHCEditSetCard",
					stackId: activeStackId,
					to,
				});
				return;
			}
			dispatch({
				type: "ClassicyAppHyperCardNavigate",
				stackId: activeStackId,
				to,
			});
		},
		[activeStackId, editingActive, dispatch],
	);

	const appMenu: ClassicyMenuItem[] = useMemo(
		() => [
			{
				id: "file",
				title: "File",
				menuChildren: [
					...stackEntries.map((entry) => ({
						id: `open_${entry.id}`,
						title: `Open “${entry.name}”`,
						onClickFunc: () => openStack(entry.id, entry.stack),
					})),
					{ id: "file_sep", title: "-" },
					...(activeStackId && !edit
						? [
								{
									id: "edit_stack",
									title: "Edit Stack",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditEnter",
											stackId: activeStackId,
										}),
								},
							]
						: []),
					...(activeStackId && edit
						? getHyperCardSaveProviders()
								.filter((p) => p.canSave())
								.map((provider) => ({
									id: `save_${provider.id}`,
									title:
										provider.id === "download"
											? "Save a Copy…"
											: `Save to ${provider.label}`,
									onClickFunc: () => {
										void provider
											.save(edit.draft, { stackId: activeStackId })
											.then((result) => {
												if ("error" in result) {
													dispatch({
														type: "ClassicyAppHyperCardOpenFileFailed",
														path: "",
														message: `The stack can’t be saved: ${result.error}`,
													});
												} else {
													dispatch({
														type: "ClassicyAppHCEditMarkSaved",
														stackId: activeStackId,
													});
												}
											});
									},
								}))
						: []),
					...(getHyperCardSaveProviders().some((p) => p.list)
						? [
								{
									id: "open_saved",
									title: "Open Saved Stack…",
									onClickFunc: () => setSavedStacksOpen(true),
								},
							]
						: []),
					...(activeStackId && edit
						? [
								{
									id: "stop_editing",
									title: "Stop Editing (Discard)",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditExit",
											stackId: activeStackId,
										}),
								},
							]
						: []),
					...(activeStackId ? [{ id: "file_sep_2", title: "-" }] : []),
					quitMenuItemHelper(appId, appName, appIcon),
				],
			},
			{
				id: "go",
				title: "Go",
				menuChildren: [
					{
						id: "go_first",
						title: "First",
						onClickFunc: () => navigate("first"),
					},
					{ id: "go_prev", title: "Prev", onClickFunc: () => navigate("prev") },
					{ id: "go_next", title: "Next", onClickFunc: () => navigate("next") },
					{ id: "go_last", title: "Last", onClickFunc: () => navigate("last") },
					{ id: "go_sep", title: "-" },
					{ id: "go_back", title: "Back", onClickFunc: () => navigate("back") },
				],
			},
			...(activeStackId && edit
				? [
						{
							id: "edit",
							title: "Edit",
							menuChildren: [
								{
									id: "undo",
									title: "Undo",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditUndo",
											stackId: activeStackId,
										}),
								},
								{
									id: "redo",
									title: "Redo",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditRedo",
											stackId: activeStackId,
										}),
								},
								{ id: "edit_sep", title: "-" },
								{
									id: "copy_part",
									title: "Copy Part",
									onClickFunc: () =>
										edit.selectedPartId &&
										dispatch({
											type: "ClassicyAppHCEditCopyPart",
											stackId: activeStackId,
											partId: edit.selectedPartId,
										}),
								},
								{
									id: "paste_part",
									title: "Paste Part",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditPastePart",
											stackId: activeStackId,
										}),
								},
								{
									id: "delete_part",
									title: "Delete Part",
									onClickFunc: () =>
										edit.selectedPartId &&
										dispatch({
											type: "ClassicyAppHCEditDeletePart",
											stackId: activeStackId,
											partId: edit.selectedPartId,
										}),
								},
								{ id: "edit_sep_2", title: "-" },
								{
									id: "edit_script",
									title: "Edit Script…",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditShowScript",
											stackId: activeStackId,
											target: edit.selectedPartId
												? { kind: "part", partId: edit.selectedPartId }
												: { kind: "card" },
										}),
								},
							],
						},
						{
							id: "objects",
							title: "Objects",
							menuChildren: [
								{
									id: "new_card",
									title: "New Card",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditAddCard",
											stackId: activeStackId,
										}),
								},
								{
									id: "delete_card",
									title: "Delete Card",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditDeleteCard",
											stackId: activeStackId,
										}),
								},
								{ id: "objects_sep", title: "-" },
								{
									id: "toggle_layer",
									title:
										edit.layer === "background"
											? "Edit Card Layer"
											: "Edit Background",
									onClickFunc: () =>
										dispatch({
											type: "ClassicyAppHCEditSetLayer",
											stackId: activeStackId,
											layer:
												edit.layer === "background" ? "card" : "background",
										}),
								},
							],
						},
					]
				: []),
		],
		[navigate, openStack, stackEntries, activeStackId, edit, dispatch],
	);

	// Keep the menu bar in sync with the dynamic edit-mode menus. Focus
	// changes (app-level and between this app's own windows) restore the
	// focused window's registration-time menuBar record, which goes stale the
	// moment the menus change (enter/exit edit mode, layer toggle). Whenever
	// this app is focused but the desktop shows a different menu than ours,
	// push the live one. The reducer stores the dispatched array by reference,
	// so the identity check settles after one dispatch — no loop.
	const isFocusedApp = useAppManager(
		(s) => s.System.Manager.Applications.focusedAppId === appId,
	);
	const desktopMenu = useAppManager((s) => s.System.Manager.Desktop.appMenu);
	useEffect(() => {
		if (isFocusedApp && desktopMenu !== appMenu) {
			dispatch({ type: "ClassicyWindowMenu", menuBar: appMenu });
		}
	}, [isFocusedApp, desktopMenu, appMenu, dispatch]);

	const currentCard = open
		? getCard(open.stack, open.currentCardId)
		: undefined;
	const windowTitle = open
		? `${open.stack.name}${currentCard?.name ? ` — ${currentCard.name}` : ""}${
				edit?.dirty ? " •" : ""
			}`
		: appName;

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			addSystemMenu={true}
			defaultWindow={"hypercard_main"}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.Stack]}
			handlesOwnFiles={true}
		>
			<ClassicyWindow
				// Keyed on the active stack: a stack opened from a .stack file
				// loads after the window mounted at its empty-state size, and
				// ClassicyWindow reads its size once at mount. The OpenStack
				// reducer stamps the fitted size onto the window record; the
				// remount picks it up.
				key={activeStackId ?? "no-stack"}
				id={"hypercard_main"}
				title={windowTitle}
				appId={appId}
				appMenu={appMenu}
				scrollable={true}
				resizable={true}
				initialSize={open ? [(open.stack.size?.[0] ?? 420) + 4, 0] : [420, 320]}
				initialPosition={["center", 80]}
			>
				{open && activeStackId ? (
					editingActive && edit ? (
						<div className={"classicyHyperCardStage"}>
							<HyperCardEditorCanvas stackId={activeStackId} edit={edit} />
						</div>
					) : (
						<div className={"classicyHyperCardStage"}>
							<HyperCardTransition
								transition={runtime?.transition}
								stackId={activeStackId}
								cardKey={open.currentCardId}
							>
								<HyperCardCard open={open} stackId={activeStackId} />
							</HyperCardTransition>
						</div>
					)
				) : (
					<div style={{ padding: "1em" }}>
						<ClassicyControlLabel
							label={"No stack open. Choose File → Open to load a stack."}
						/>
					</div>
				)}
			</ClassicyWindow>

			{edit && activeStackId ? (
				<ClassicyWindow
					id={"hypercard_tools"}
					title={"Tools"}
					appId={appId}
					appMenu={appMenu}
					windowType={"utility"}
					initialSize={[130, 0]}
					initialPosition={[8, 100]}
				>
					<HyperCardToolsPalette stackId={activeStackId} edit={edit} />
				</ClassicyWindow>
			) : null}

			{edit && activeStackId ? (
				<ClassicyWindow
					id={"hypercard_inspector"}
					title={"Info"}
					appId={appId}
					appMenu={appMenu}
					windowType={"utility"}
					initialSize={[240, 0]}
					initialPosition={[8, 360]}
				>
					<HyperCardInspector stackId={activeStackId} edit={edit} />
				</ClassicyWindow>
			) : null}

			{edit?.script && activeStackId ? (
				<ClassicyWindow
					id={"hypercard_script"}
					title={"Script"}
					appId={appId}
					appMenu={appMenu}
					initialSize={[440, 0]}
					initialPosition={["center", 120]}
					scrollable={true}
				>
					<HyperCardScriptEditor stackId={activeStackId} edit={edit} />
				</ClassicyWindow>
			) : null}

			{savedStacksOpen ? (
				<ClassicyWindow
					id={"hypercard_saved"}
					title={"Saved Stacks"}
					appId={appId}
					appMenu={appMenu}
					initialSize={[300, 0]}
					initialPosition={["center", 160]}
				>
					<HyperCardSavedStacks
						onOpen={(stack, ref, providerId) => {
							dispatch({
								type: "ClassicyAppHyperCardOpenStack",
								stackId: `saved:${providerId}:${ref.id}`,
								stack,
							});
							setSavedStacksOpen(false);
						}}
					/>
				</ClassicyWindow>
			) : null}

			{open && activeStackId && runtime?.dialog ? (
				<HyperCardDialog dialog={runtime.dialog} stackId={activeStackId} />
			) : null}
		</ClassicyApp>
	);
};

export default HyperCard;
