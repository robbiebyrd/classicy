import "./PDFViewerDocument.scss";
import classNames from "classnames";
import type {
	PDFDocumentLoadingTask,
	PDFDocumentProxy,
	RenderTask,
} from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import {
	type FC as FunctionalComponent,
	type MouseEvent,
	type PointerEvent,
	useEffect,
	useRef,
	useState,
} from "react";
import zoomToolIcon from "@img/icons/system/sherlock/search.png";
import panToolIcon from "@img/ui/cursors/cursor-hand.png";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";
import { ClassicyControlLabel } from "@/SystemFolder/SystemResources/ControlLabel/ClassicyControlLabel";
import { decompressFromBase64 } from "@/SystemFolder/SystemResources/Utils/base64Compression";

// pdfjs-dist's canvas module references the browser-only `DOMMatrix` global
// at module-evaluation time. A static import here would run that the instant
// anything is imported from the classicy barrel — crashing any consumer's
// non-browser environment (Node, test runners, SSR) even if they never
// render a PDFViewer. Load it lazily instead, once, on first use.
let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
function loadPdfjs() {
	if (!pdfjsPromise) {
		pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
			pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
			return pdfjs;
		});
	}
	return pdfjsPromise;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;
const SCALE_STEP = 0.25;

interface PDFViewerDocumentProps {
	url: string;
	data?: string;
}

export const PDFViewerDocument: FunctionalComponent<PDFViewerDocumentProps> = ({
	url,
	data,
}) => {
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
		let cancelled = false;
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
				// concurrently since they're independent. `cancelled` is checked
				// right after both settle, before creating the loading task, so
				// a fast unmount/re-run during either never creates an orphaned
				// task with nothing to destroy it.
				const [source, pdfjs] = await Promise.all([
					data
						? decompressFromBase64(data).then((bytes) => ({ data: bytes }))
						: Promise.resolve({ url }),
					loadPdfjs(),
				]);
				if (cancelled) return;
				loadingTask = pdfjs.getDocument(source);
				const loadedDoc = await loadingTask.promise;
				if (!cancelled) setDoc(loadedDoc);
			} catch {
				if (!cancelled) setError(true);
			}
		})();
		return () => {
			cancelled = true;
			loadingTask?.destroy();
		};
	}, [url, data]);

	// Render the current page whenever the document, page, or zoom changes
	useEffect(() => {
		if (!doc || !canvasRef.current) return;
		let cancelled = false;
		let renderTask: RenderTask | null = null;
		// Reset any stale per-page error from a previous page/zoom before
		// attempting this render — e.g. clicking Next away from a page that
		// failed to render should give the new page a clean slate rather than
		// inheriting the old error.
		setPageError(false);
		Promise.all([doc.getPage(currentPage), loadPdfjs()])
			.then(([page, pdfjs]) => {
				if (cancelled || !canvasRef.current) return;
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
				// only that case so it never surfaces as an unhandled promise
				// rejection. Any other rejection reason is a genuine render
				// failure, so surface it the same way the catch handlers above
				// do. This is a *page*-render failure (the document already
				// loaded fine), so it sets `pageError`, not `error`.
				renderTask.promise.catch((reason: unknown) => {
					if (reason instanceof pdfjs.RenderingCancelledException) return;
					if (!cancelled) setPageError(true);
				});
			})
			.catch(() => {
				if (!cancelled) setPageError(true);
			});
		return () => {
			cancelled = true;
			renderTask?.cancel();
		};
	}, [doc, currentPage, scale]);

	// A document-load failure means there's no `doc`, no `numPages`, and
	// nothing for a toolbar to navigate — full replacement is the only
	// sensible option here.
	if (error) {
		return <p className="pdfViewerDocumentError">Couldn't load this PDF.</p>;
	}

	if (!doc) {
		return <p className="pdfViewerDocumentLoading">Loading…</p>;
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
		<div className="pdfViewerDocument">
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
					<img src={panToolIcon} alt="" className="pdfViewerDocumentToolIcon" />
				</ClassicyButton>
				<ClassicyButton
					buttonSize="small"
					buttonShape="square"
					aria-label="Zoom Tool"
					depressed={activeTool === "zoom"}
					onClickFunc={() => setActiveTool("zoom")}
				>
					<img
						src={zoomToolIcon}
						alt=""
						className="pdfViewerDocumentToolIcon"
					/>
				</ClassicyButton>
			</div>
			<div
				ref={wrapperRef}
				className={classNames(
					"pdfViewerDocumentCanvasWrapper",
					activeTool === "pan"
						? "pdfViewerDocumentToolPan"
						: "pdfViewerDocumentToolZoom",
				)}
				onPointerDown={handleWrapperPointerDown}
				onPointerMove={handleWrapperPointerMove}
				onPointerUp={endPanDrag}
				onPointerCancel={endPanDrag}
				onClick={handleWrapperClick}
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
			</div>
		</div>
	);
};
