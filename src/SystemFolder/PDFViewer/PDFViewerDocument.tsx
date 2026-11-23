import "./PDFViewerDocument.scss";
import classNames from "classnames";
import type {
	PDFDocumentLoadingTask,
	PDFDocumentProxy,
	RenderTask,
} from "pdfjs-dist";
import {
	type CSSProperties,
	type FC as FunctionalComponent,
	type MouseEvent,
	type PointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import { useClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { onClassicyPointerStreamLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import { ClassicyIconImage } from "@/SystemFolder/SystemResources/Icon/ClassicyIconImage.internal";
import { classicyLog } from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { ClassicyScrollArea } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollArea";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

// pdfjs-dist's canvas module references the browser-only `DOMMatrix` global
// at module-evaluation time. A static import here would run that the instant
// anything is imported from the classicy barrel — crashing any consumer's
// non-browser environment (Node, test runners, SSR) even if they never
// render a PDFViewer. Load it lazily instead, on first use. The worker's
// source loads beside it: the worker ships deflated (plan 0019-fb7 Part 2),
// so in the ES build both are lazy chunks, and a host that never opens a PDF
// downloads neither.
//
// Both are pdf.js's legacy build (its API here, its worker in
// ClassicyPdfWorkerSource.internal.ts; one version, one place). The modern
// build calls methods newer than the browsers Classicy supports without
// polyfills, Map.prototype.getOrInsertComputed among them, which the oldest
// supported browsers (Chrome 120, Safari 16.2, Firefox 113) lack, so no page
// would draw ("Couldn't render this page."). The legacy build carries the
// polyfills (core-js's, installed on the page's own globals where a method
// is missing or nonconforming, when pdf.js loads). Its declarations
// re-export pdfjs-dist's own, so the types above still come from
// "pdfjs-dist".
type Pdfjs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let pdfjsModules: Promise<
	[Pdfjs, typeof import("./ClassicyPdfWorkerSource.internal")]
> | null = null;
function loadPdfjs(): Promise<Pdfjs> {
	// A load that failed (a chunk that did not arrive) is not kept: the next
	// document imports again, which loads it wherever the browser fetches a
	// failed module anew. Only these imports are retried; pdf.js keeps its own
	// failures (a fake worker that did not set up stays failed for the page).
	pdfjsModules ??= Promise.all([
		import("pdfjs-dist/legacy/build/pdf.mjs"),
		import("./ClassicyPdfWorkerSource.internal"),
	]).catch((error: unknown) => {
		pdfjsModules = null;
		throw error;
	});
	// Set on every load. The worker source keeps only a rebuilt URI and logs
	// nothing (its chunk imports nothing of Classicy's): when it cannot
	// rebuild one, pdf.js is left no worker, and the load rejects with the
	// reason, which the caller logs and shows as the load error. The next
	// document inflates again.
	return pdfjsModules.then(([pdfjs, { classicyPdfWorkerSrc }]) => {
		const worker = classicyPdfWorkerSrc();
		if (!worker.ok) {
			pdfjs.GlobalWorkerOptions.workerSrc = "";
			throw new Error(
				worker.problem,
				worker.error === undefined ? undefined : { cause: worker.error },
			);
		}
		pdfjs.GlobalWorkerOptions.workerSrc = worker.src;
		return pdfjs;
	});
}

/**
 * Is `reason` pdf.js's RenderingCancelledException, the rejection of a
 * render task that was cancelled on purpose? By class when pdf.js is at
 * hand, else by the name pdf.js gives it.
 */
const isRenderingCancelled = (reason: unknown, pdfjs?: Pdfjs): boolean =>
	(pdfjs !== undefined &&
		reason instanceof pdfjs.RenderingCancelledException) ||
	(reason instanceof Error && reason.name === "RenderingCancelledException");

const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;

interface PDFViewerDocumentProps {
	url: string;
	data?: string;
	/**
	 * Extra class names, merged onto the root element after the component's
	 * own — the loading and error messages while those show, then the viewer.
	 */
	className?: string;
	/** Inline style, merged onto the root element after the component's own. */
	style?: CSSProperties;
}

export const PDFViewerDocument: FunctionalComponent<PDFViewerDocumentProps> = ({
	url,
	data,
	className,
	style,
}) => {
	const zoomToolIcon =
		useClassicyAsset("icons", "system.sherlock.search") ?? "";
	const panToolIcon = useClassicyAsset("icons", "ui.cursors.hand") ?? "";
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const wrapperRef = useRef<HTMLDivElement>(null);
	// Pan-drag bookkeeping. A ref, not state: pointermove happens dozens of
	// times per second and only mutates the wrapper's scroll offsets — no
	// re-render wanted.
	const panDragRef = useRef<{
		startX: number;
		startY: number;
		scrollLeft: number;
		scrollTop: number;
	} | null>(null);
	// A pan watches the pointer stream while it lasts: lost (the window
	// blurs, a pointercancel, the page is hidden), it ends where it is.
	const stopWatchingPointerStreamRef = useRef<(() => void) | null>(null);
	useEffect(() => () => stopWatchingPointerStreamRef.current?.(), []);
	// Set by a Zoom-tool click, consumed by the render effect. The scroll
	// adjustment that keeps the clicked point under the cursor can only be
	// applied *after* the canvas has been resized to the new scale —
	// scrollLeft/Top set any earlier would be clamped to the old, smaller
	// content size.
	const pendingZoomScrollRef = useRef<{
		docX: number;
		docY: number;
		cursorX: number;
		cursorY: number;
	} | null>(null);
	const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
	const [currentPage, setCurrentPage] = useState(1);
	const [scale, setScale] = useState(1.0);
	const [activeTool, setActiveTool] = useState<"pan" | "zoom">("pan");
	// `error` means the document itself failed to load — there's no `doc`,
	// no `numPages`, and nothing for a toolbar to navigate, so this still
	// replaces the entire component output below.
	const [error, setError] = useState(false);
	// `pageError` means the document loaded fine but the *current* page
	// failed to render. The toolbar must stay usable here (e.g. to click
	// Next/Previous away from the bad page), so this only swaps out the
	// canvas-display area, not the whole component. Kept separate from
	// `error` so the two failure modes can't clobber each other.
	const [pageError, setPageError] = useState(false);

	// Load the document whenever the URL or embedded data changes. `data`
	// (compressed + base64url-encoded bytes) takes precedence over `url` when
	// both are set, matching resolveFileSystemEntrySource's precedence.
	useEffect(() => {
		let canceled = false;
		// `destroy()` lives on the loading task (not the resolved
		// PDFDocumentProxy), and is safe to call whether the load is still
		// in flight or has already settled — it aborts network requests and
		// tears down the worker/transport either way. Assigned once both pdfjs
		// and (if needed) decompression finish and the task is actually
		// created, so cleanup always tears down the instance that *this*
		// effect run created, exactly once.
		let loadingTask: PDFDocumentLoadingTask | null = null;
		setDoc(null);
		setError(false);
		setPageError(false);
		setCurrentPage(1);
		(async () => {
			try {
				// Decompressing `data` and loading pdfjs are both async steps
				// before pdf.js's own document load even starts; run them
				// concurrently since they're independent. `canceled` is checked
				// right after both settle, before creating the loading task, so
				// a fast unmount/re-run during either never creates an orphaned
				// task with nothing to destroy it.
				const [source, pdfjs] = await Promise.all([
					data
						? decompressFromBase64(data).then((bytes) => ({ data: bytes }))
						: Promise.resolve({ url }),
					loadPdfjs(),
				]);
				if (canceled) return;
				loadingTask = pdfjs.getDocument(source);
				const loadedDoc = await loadingTask.promise;
				if (!canceled) setDoc(loadedDoc);
			} catch (error) {
				// A load abandoned by this effect's cleanup (a new document, an
				// unmount) is not a failure.
				if (canceled) return;
				classicyLog("error", "PDFViewer", "Couldn't load this PDF.", error);
				setError(true);
			}
		})();
		return () => {
			canceled = true;
			loadingTask?.destroy();
		};
	}, [url, data]);

	// Render the current page whenever the document, page, or zoom changes
	useEffect(() => {
		if (!doc || !canvasRef.current) return;
		let canceled = false;
		let renderTask: RenderTask | null = null;
		// Reset any stale per-page error from a previous page/zoom before
		// attempting this render — e.g. clicking Next away from a page that
		// failed to render should give the new page a clean slate rather than
		// inheriting the old error.
		setPageError(false);
		const logPageFailure = (reason: unknown) =>
			classicyLog(
				"error",
				"PDFViewer",
				`Couldn't render page ${currentPage} of this PDF.`,
				reason,
			);
		Promise.all([doc.getPage(currentPage), loadPdfjs()])
			.then(([page, pdfjs]) => {
				if (canceled || !canvasRef.current) return;
				const viewport = page.getViewport({ scale });
				const context = canvasRef.current.getContext("2d");
				if (!context) return;
				canvasRef.current.width = viewport.width;
				canvasRef.current.height = viewport.height;
				// Now that the canvas holds its new-scale dimensions, the scroll
				// range is big enough to place the zoomed point back under the
				// cursor (see pendingZoomScrollRef).
				const pendingZoom = pendingZoomScrollRef.current;
				if (pendingZoom && wrapperRef.current) {
					pendingZoomScrollRef.current = null;
					wrapperRef.current.scrollLeft =
						pendingZoom.docX * scale - pendingZoom.cursorX;
					wrapperRef.current.scrollTop =
						pendingZoom.docY * scale - pendingZoom.cursorY;
				}
				renderTask = page.render({
					canvas: canvasRef.current,
					canvasContext: context,
					viewport,
				});
				// `renderTask.promise` rejects with a RenderingCancelledException
				// whenever cleanup calls `renderTask.cancel()` below (e.g. a fast
				// Next/Previous or Zoom click while a page is still rendering).
				// That's expected, routine behavior, not a real error — swallow
				// only that case, unlogged, so it never surfaces as an unhandled
				// promise rejection. Any other rejection reason is a genuine
				// render failure, so log it and surface it. This is a
				// *page*-render failure (the document already loaded fine), so it
				// sets `pageError`, not `error`.
				renderTask.promise.catch((reason: unknown) => {
					if (isRenderingCancelled(reason, pdfjs) || canceled) return;
					logPageFailure(reason);
					setPageError(true);
				});
			})
			.catch((reason: unknown) => {
				// The page did not load, or pdf.js threw starting its render.
				if (isRenderingCancelled(reason) || canceled) return;
				logPageFailure(reason);
				setPageError(true);
			});
		return () => {
			canceled = true;
			renderTask?.cancel();
		};
	}, [doc, currentPage, scale]);

	// A document-load failure means there's no `doc`, no `numPages`, and
	// nothing for a toolbar to navigate — full replacement is the only
	// sensible option here.
	if (error) {
		return (
			<p
				className={classNames("pdfViewerDocumentError", className)}
				style={style}
			>
				Couldn't load this PDF.
			</p>
		);
	}

	if (!doc) {
		return (
			<p
				className={classNames("pdfViewerDocumentLoading", className)}
				style={style}
			>
				Loading…
			</p>
		);
	}

	const numPages = doc.numPages;

	const handleWrapperPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (activeTool !== "pan") return;
		const wrapper = e.currentTarget;
		panDragRef.current = {
			startX: e.clientX,
			startY: e.clientY,
			scrollLeft: wrapper.scrollLeft,
			scrollTop: wrapper.scrollTop,
		};
		stopWatchingPointerStreamRef.current?.();
		stopWatchingPointerStreamRef.current =
			onClassicyPointerStreamLost(endPanDrag);
		// Keeps the drag alive when the pointer leaves the wrapper mid-drag.
		// Throws in environments without an active-pointer registry (jsdom);
		// the drag still works there, just without capture.
		try {
			wrapper.setPointerCapture(e.pointerId);
		} catch {
			/* capture unavailable — non-fatal */
		}
	};

	const handleWrapperPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		const drag = panDragRef.current;
		if (!drag) return;
		// Dragging moves the document with the hand, so the scroll offsets run
		// opposite to the pointer delta.
		e.currentTarget.scrollLeft = drag.scrollLeft + (drag.startX - e.clientX);
		e.currentTarget.scrollTop = drag.scrollTop + (drag.startY - e.clientY);
	};

	const endPanDrag = () => {
		panDragRef.current = null;
		stopWatchingPointerStreamRef.current?.();
		stopWatchingPointerStreamRef.current = null;
	};

	const handleWrapperClick = (e: MouseEvent<HTMLDivElement>) => {
		if (activeTool !== "zoom" || !canvasRef.current) return;
		const nextScale = e.ctrlKey
			? Math.max(MIN_SCALE, +(scale - SCALE_STEP).toFixed(2))
			: Math.min(MAX_SCALE, +(scale + SCALE_STEP).toFixed(2));
		if (nextScale === scale) return;
		const canvasRect = canvasRef.current.getBoundingClientRect();
		const wrapperRect = e.currentTarget.getBoundingClientRect();
		pendingZoomScrollRef.current = {
			// The clicked point in unscaled document coordinates — where it
			// lands after the rescale is docX/Y * nextScale.
			docX: (e.clientX - canvasRect.left) / scale,
			docY: (e.clientY - canvasRect.top) / scale,
			cursorX: e.clientX - wrapperRect.left,
			cursorY: e.clientY - wrapperRect.top,
		};
		setScale(nextScale);
	};

	return (
		<div
			className={classNames("pdfViewerDocument", className)}
			style={
				{
					"--classicy-pdf-zoom-cursor": `url("${zoomToolIcon}")`,
					...style,
				} as CSSProperties
			}
		>
			<div className="pdfViewerDocumentToolbar">
				<ClassicyButton
					buttonSize="small"
					disabled={currentPage <= 1}
					onClickFunc={() => setCurrentPage((p) => Math.max(1, p - 1))}
				>
					Previous
				</ClassicyButton>
				<ClassicyControlLabel label={`Page ${currentPage} of ${numPages}`} />
				<ClassicyButton
					buttonSize="small"
					disabled={currentPage >= numPages}
					onClickFunc={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
				>
					Next
				</ClassicyButton>
				<ClassicyButton
					buttonSize="small"
					aria-label="Zoom Out"
					disabled={scale <= MIN_SCALE}
					onClickFunc={() =>
						setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))
					}
				>
					-
				</ClassicyButton>
				<ClassicyButton
					buttonSize="small"
					aria-label="Zoom In"
					disabled={scale >= MAX_SCALE}
					onClickFunc={() =>
						setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))
					}
				>
					+
				</ClassicyButton>
				<ClassicyButton
					buttonSize="small"
					buttonShape="square"
					aria-label="Pan Tool"
					depressed={activeTool === "pan"}
					onClickFunc={() => setActiveTool("pan")}
				>
					<ClassicyIconImage
						src={panToolIcon}
						alt=""
						className="pdfViewerDocumentToolIcon"
					/>
				</ClassicyButton>
				<ClassicyButton
					buttonSize="small"
					buttonShape="square"
					aria-label="Zoom Tool"
					depressed={activeTool === "zoom"}
					onClickFunc={() => setActiveTool("zoom")}
				>
					<ClassicyIconImage
						src={zoomToolIcon}
						alt=""
						className="pdfViewerDocumentToolIcon"
					/>
				</ClassicyButton>
			</div>
			{/* Pointer-only tools on the page surface: the Zoom In / Zoom Out
			    buttons above and the scroll bars are their keyboard paths. The
			    page scrolls in a ClassicyScrollArea's viewport, the wrapper. */}
			<ClassicyScrollArea
				className="pdfViewerDocumentCanvasArea"
				viewportRef={wrapperRef}
				viewportClassName={classNames(
					"pdfViewerDocumentCanvasWrapper",
					activeTool === "pan"
						? "pdfViewerDocumentToolPan"
						: "pdfViewerDocumentToolZoom",
				)}
				viewportProps={{
					onPointerDown: handleWrapperPointerDown,
					onPointerMove: handleWrapperPointerMove,
					onPointerUp: endPanDrag,
					onPointerCancel: endPanDrag,
					onClick: handleWrapperClick,
				}}
			>
				{pageError ? (
					<p className="pdfViewerDocumentPageError">
						Couldn't render this page.
					</p>
				) : null}
				<canvas
					ref={canvasRef}
					className="pdfViewerDocumentCanvas"
					hidden={pageError}
				/>
			</ClassicyScrollArea>
		</div>
	);
};
