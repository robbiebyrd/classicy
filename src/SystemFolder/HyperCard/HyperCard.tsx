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
} from "react";
import {
	useAppManager,
	useAppManagerDispatch,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useSoundDispatch } from "@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext";
import { HyperCardCard } from "@/SystemFolder/HyperCard/HyperCardCard";
import { HyperCardDialog } from "@/SystemFolder/HyperCard/HyperCardDialog";
import {
	type HCStack,
	validateStack,
} from "@/SystemFolder/HyperCard/HyperCardModel";
import {
	getHyperCardEffectHandler,
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
import "./HyperCard.scss";

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

	const data = useHyperCardData();
	const activeStackId = data?.activeStackId;
	const open: HCOpenStack | undefined = activeStackId
		? data?.openStacks[activeStackId]
		: undefined;

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
				dispatch({
					type: e.event ?? "ClassicyAppOpen",
					app: { id: e.appId },
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
	// The reducer only queues paths (fetching is async); this effect resolves
	// each entry through the file system, fetches/decodes its JSON, validates
	// it, and either opens the stack or reports the failure.
	const fs = useClassicyFileSystem();
	const pendingOpenFiles = data?.pendingOpenFiles;
	const loadingRef = useRef<Set<string>>(new Set());
	useEffect(() => {
		if (!pendingOpenFiles || pendingOpenFiles.length === 0) return;
		for (const path of pendingOpenFiles) {
			if (loadingRef.current.has(path)) continue;
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
	}, [pendingOpenFiles, fs, dispatch]);

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
			dispatch({
				type: "ClassicyAppHyperCardNavigate",
				stackId: activeStackId,
				to,
			});
		},
		[activeStackId, dispatch],
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
		],
		[navigate, openStack, stackEntries],
	);

	const currentCard = open
		? getCard(open.stack, open.currentCardId)
		: undefined;
	const windowTitle = open
		? `${open.stack.name}${currentCard?.name ? ` — ${currentCard.name}` : ""}`
		: appName;

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			addSystemMenu={true}
			defaultWindow={"hypercard_main"}
			handlesFileTypes={[ClassicyFileSystemEntryFileType.Stack]}
		>
			<ClassicyWindow
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
					<div className={"classicyHyperCardStage"}>
						<HyperCardTransition
							transition={runtime?.transition}
							stackId={activeStackId}
							cardKey={open.currentCardId}
						>
							<HyperCardCard open={open} stackId={activeStackId} />
						</HyperCardTransition>
					</div>
				) : (
					<div style={{ padding: "1em" }}>
						<ClassicyControlLabel
							label={"No stack open. Choose File → Open to load a stack."}
						/>
					</div>
				)}
			</ClassicyWindow>

			{open && activeStackId && runtime?.dialog ? (
				<HyperCardDialog dialog={runtime.dialog} stackId={activeStackId} />
			) : null}
		</ClassicyApp>
	);
};

export default HyperCard;
