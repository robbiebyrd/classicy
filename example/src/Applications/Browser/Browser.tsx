import {
	ClassicyApp,
	ClassicyButton,
	ClassicyControlLabel,
	ClassicyIcons,
	ClassicyInput,
	ClassicyWindow,
	quitAppHelper,
	useAppManager,
	useAppManagerDispatch,
} from "classicy";
import DOMPurify from "dompurify";
import {
	type FC as FunctionalComponent,
	useState,
	useRef,
	useCallback,
	useEffect,
	useMemo
} from "react";

import "./Browser.scss";
import "./BrowserContext";
import { useBrowserNavigation } from "./useBrowserNavigation";

interface BrowserFavorite {
	id: string;
	title: string;
	url: string;
	icon: string;
}

const DEFAULT_FAVORITES: BrowserFavorite[] = [
	{
		id: "cnn",
		title: "CNN",
		url: "http://www.cnn.com/",
		icon: ClassicyIcons.applications.internetExplorer.news,
	},
];

interface ShadowLinkClick {
	href: string;
	rawHref: string;
}

const ShadowContent: FunctionalComponent<{
	html: string;
	onLinkClick: (link: ShadowLinkClick) => void;
}> = ({ html, onLinkClick }) => {
	const hostRef = useRef<HTMLDivElement>(null);
	const shadowRef = useRef<ShadowRoot | null>(null);
	const onLinkClickRef = useRef(onLinkClick);
	onLinkClickRef.current = onLinkClick;

	useEffect(() => {
		if (hostRef.current && !shadowRef.current) {
			shadowRef.current = hostRef.current.attachShadow({ mode: "open" });
		}
		// No cleanup: ShadowRoot cannot be detached once attached (browser limitation)
	}, []);

	useEffect(() => {
		if (shadowRef.current) {
			shadowRef.current.innerHTML = DOMPurify.sanitize(html, {
				FORCE_BODY: true,
			});
		}
	}, [html]);

	useEffect(() => {
		const shadow = shadowRef.current;
		if (!shadow) return;
		const target = shadow as unknown as EventTarget;
		const handler = (e: Event) => {
			const mouseEvent = e as MouseEvent;
			const clickTarget = mouseEvent.composedPath()[0] as
				| HTMLElement
				| undefined;
			if (!clickTarget) return;
			const anchor = clickTarget.closest?.("a");
			if (!anchor) return;
			mouseEvent.preventDefault();
			onLinkClickRef.current({
				href: anchor.href,
				rawHref: anchor.getAttribute("href") || "",
			});
		};
		target.addEventListener("click", handler);
		return () => target.removeEventListener("click", handler);
	}, []);

	return <div ref={hostRef} className="browserPage" />;
};

export const Browser = () => {
	const appName = "Browser";
	const appId = "Browser.app";
	const appIcon = ClassicyIcons.applications.internetExplorer.app;

	const desktopEventDispatch = useAppManagerDispatch();
	const appState = useAppManager(
		(state) => state.System.Manager.Applications.apps[appId],
	);

	const favorites: BrowserFavorite[] = appState?.data?.favorites ?? [];

	const normalizeDomain = useCallback((url: string): string => {
		try {
			const hostname = new URL(url).hostname;
			return hostname.startsWith("www.") ? hostname.slice(4) : hostname;
		} catch {
			return "";
		}
	}, []);

	const defaultUrl = "http://www.apple.com/";
	const defaultHomeLabel = "Apple";
	const defaultHomeIcon = ClassicyIcons.applications.internetExplorer.apple;
	const homePage = appState?.data?.homePage ?? {
		url: defaultUrl,
		label: defaultHomeLabel,
		icon: defaultHomeIcon,
	};

	useEffect(() => {
		if (!appState) return;
		if (!appState.data?.favorites) {
			desktopEventDispatch({
				type: "ClassicyAppBrowserInitFavorites",
				favorites: DEFAULT_FAVORITES,
			});
		}
		if (!appState.data?.homePage) {
			desktopEventDispatch({
				type: "ClassicyAppBrowserSetHomePage",
				url: defaultUrl,
				label: defaultHomeLabel,
				icon: defaultHomeIcon,
			});
		}
	}, [appState, desktopEventDispatch, defaultHomeIcon]);

	const [showFavoritesBar, setShowFavoritesBar] = useState(true);
	const [urlError, setUrlError] = useState(false);
	const refAddressBar = useRef<HTMLInputElement>(null);
	const refToolbar = useRef<HTMLDivElement>(null);
	const [isCompact, setIsCompact] = useState(false);

	const showError = useCallback(() => {
		setUrlError(true);
		desktopEventDispatch({
			type: "ClassicyWindowFocus",
			app: { id: appId },
			window: { id: "browser_error" },
		});
	}, [desktopEventDispatch]);

	const recordVisit = useCallback(
		(url: string) => {
			desktopEventDispatch({
				type: "ClassicyAppBrowserRecordVisit",
				url,
			});
		},
		[desktopEventDispatch],
	);

	const {
		htmlContent,
		pageTitle,
		addressBarValue,
		setAddressBarValue,
		isLoading,
		statusText,
		canGoBack,
		canGoForward,
		goTo,
		goBack,
		goForward,
		handleContentClick,
	} = useBrowserNavigation({
		defaultUrl,
		onShowError: showError,
		onRecordVisit: recordVisit,
	});

	const windowIcon = useMemo(() => {
		const currentDomain = normalizeDomain(addressBarValue);
		if (!currentDomain) return appIcon;
		if (normalizeDomain(homePage.url) === currentDomain) return homePage.icon;
		const match = favorites.find(
			(f) => normalizeDomain(f.url) === currentDomain,
		);
		return match ? match.icon : appIcon;
	}, [addressBarValue, homePage, favorites, normalizeDomain, appIcon]);

	// Hide button labels when toolbar is narrow
	useEffect(() => {
		if (!refToolbar.current) return;
		const observer = new ResizeObserver(([entry]) => {
			setIsCompact(entry.contentRect.width < 450);
		});
		observer.observe(refToolbar.current);
		return () => observer.disconnect();
	}, []);

	const quitApp = useCallback(() => {
		desktopEventDispatch(quitAppHelper(appId, appName, appIcon));
	}, [desktopEventDispatch, appIcon]);

	const appMenu = useMemo(
		() => [
			{
				id: "file",
				title: "File",
				menuChildren: [
					{
						id: `${appId}_quit`,
						title: "Quit",
						onClickFunc: quitApp,
					},
				],
			},
			{
				id: "view",
				title: "View",
				menuChildren: [
					{
						id: `${appId}_show_favorites`,
						title: "Show Favorites",
						className: showFavoritesBar ? "browserMenuItemChecked" : "",
						onClickFunc: () => setShowFavoritesBar((prev) => !prev),
					},
				],
			},
		],
		[quitApp, showFavoritesBar],
	);

	return (
		<ClassicyApp
			id={appId}
			name={appName}
			icon={appIcon}
			defaultWindow={"browser"}
		>
			{urlError && (
				<ClassicyWindow
					id={"browser_error"}
					title={"Error"}
					appId={appId}
					modal={true}
					type={"error"}
					closable={true}
					resizable={false}
					zoomable={false}
					scrollable={false}
					collapsable={false}
					initialPosition={[200, 200]}
					onCloseFunc={() => setUrlError(false)}
				>
					<p>Please enter a valid URL starting with http:// or https://</p>
					<ClassicyButton onClickFunc={() => setUrlError(false)}>
						OK
					</ClassicyButton>
				</ClassicyWindow>
			)}
			<ClassicyWindow
				id={"browser"}
				title={pageTitle || appName}
				icon={windowIcon}
				appId={appId}
				scrollable={false}
				initialSize={[100, 500]}
				initialPosition={[100, 100]}
				appMenu={appMenu}
				growable={true}
			>
				<div className="browser">
					<div className="browserBar browserToolbar" ref={refToolbar}>
						<div className="browserToolbarInner">
							<div className="browserToolbarControls">
								<div className="browserNavButtons">
									<ClassicyButton onClickFunc={goBack} disabled={!canGoBack}>
										<div
											className={`browserNavButtonContent browserHoverSwap${!canGoBack ? " browserNavButtonContentDisabled" : ""}`}
										>
											<img
												src={
													ClassicyIcons.applications.internetExplorer.backward
												}
												className="browserIconDefault"
												alt="Back"
											/>
											<img
												src={
													ClassicyIcons.applications.internetExplorer.backwardOn
												}
												className="browserIconHover"
												alt="Back Hover"
											/>
											{!isCompact && (
												<ClassicyControlLabel label="Back"></ClassicyControlLabel>
											)}
										</div>
									</ClassicyButton>
									<ClassicyButton
										buttonSize="medium"
										onClickFunc={goForward}
										disabled={!canGoForward}
									>
										<div
											className={`browserNavButtonContent browserHoverSwap${!canGoForward ? " browserNavButtonContentDisabled" : ""}`}
										>
											<img
												src={
													ClassicyIcons.applications.internetExplorer.forward
												}
												className="browserIconDefault"
												alt="Forward"
											/>
											<img
												src={
													ClassicyIcons.applications.internetExplorer.forwardOn
												}
												className="browserIconHover"
												alt="Forward Hover"
											/>
											{!isCompact && (
												<ClassicyControlLabel label="Forward"></ClassicyControlLabel>
											)}
										</div>
									</ClassicyButton>
								</div>
								<div className="browserAddressBar">
									{!isCompact && <ClassicyControlLabel label="Address:" />}
									<ClassicyInput
										id={"browserAddress"}
										ref={refAddressBar}
										prefillValue={addressBarValue}
										onChangeFunc={(e) => setAddressBarValue(e.target.value)}
										backgroundColor="white"
										onEnterFunc={goTo}
									></ClassicyInput>
								</div>
								<ClassicyButton onClickFunc={(_) => goTo(undefined)}>
									<div className="browserNavButtonContent browserHoverSwap">
										<img
											src={ClassicyIcons.applications.internetExplorer.refresh}
											className="browserIconDefault"
											alt="Go"
										/>
										<img
											src={
												ClassicyIcons.applications.internetExplorer.refreshOn
											}
											className="browserIconHover"
											alt="Go Hover"
										/>
										{!isCompact && (
											<ClassicyControlLabel label="Go"></ClassicyControlLabel>
										)}
									</div>
								</ClassicyButton>
								<ClassicyButton onClickFunc={() => goTo(homePage.url)}>
									<div className="browserNavButtonContent browserHoverSwap">
										<img
											src={ClassicyIcons.applications.internetExplorer.documentHome}
											className="browserIconDefault"
											alt={homePage.label}
										/>
										<img
											src={ClassicyIcons.applications.internetExplorer.documentHome}
											className="browserIconHover"
											alt={`${homePage.label} Hover`}
										/>
										{!isCompact && (
											<ClassicyControlLabel label="Home"></ClassicyControlLabel>
										)}
									</div>
								</ClassicyButton>
							</div>
						</div>
						<img
							src={
								isLoading
									? ClassicyIcons.applications.internetExplorer.loaderAnimated
									: ClassicyIcons.applications.internetExplorer.loader
							}
							className="browserLoaderIcon"
							alt="Loader"
						/>
					</div>
					{showFavoritesBar && <div className="browserBar browserFavoritesBar">
						<ClassicyControlLabel label="Favorites: "></ClassicyControlLabel>
						{favorites.map((fav) => (
							<ClassicyButton
								key={fav.id}
								onClickFunc={() => goTo(fav.url)}
								buttonSize="small"
							>
								<div className="browserNavButtonContent">
									<img src={fav.icon} alt={fav.title} />
									{!isCompact && (
										<ClassicyControlLabel
											label={fav.title}
											labelSize="small"
										></ClassicyControlLabel>
									)}
								</div>
							</ClassicyButton>
						))}
					</div>}
					<div className="browserContents">
						<ShadowContent
							html={htmlContent}
							onLinkClick={handleContentClick}
						/>
					</div>
					<div className="browserStatusBar">{statusText}</div>
				</div>
			</ClassicyWindow>
		</ClassicyApp>
	);
};
