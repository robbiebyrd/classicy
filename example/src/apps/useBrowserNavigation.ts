import React from 'react'

interface BrowserHistoryEntry {
    url: string
    visitedAt: string
}

const HISTORY_STORAGE_KEY = 'Browser.app.visitedHistory'
const PROXY_BASE = 'http://localhost:8765'
const DEFAULT_TIME = '20010911000000'

const loadVisitedHistory = (): BrowserHistoryEntry[] => {
    try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY)
        return stored ? JSON.parse(stored) : []
    } catch {
        return []
    }
}

const saveVisitedHistory = (entries: BrowserHistoryEntry[]) => {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
}

const recordVisit = (url: string) => {
    const entries = loadVisitedHistory()
    entries.push({ url, visitedAt: new Date().toISOString() })
    saveVisitedHistory(entries)
}

const PROXY_PORT = new URL(PROXY_BASE).port

const formatArchiveTime = (time: string): string => {
    const match = time.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/)
    if (!match) return time
    const [, y, mo, d, h, mi, s] = match
    const utc = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s))
    return utc.toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    })
}

const extractOriginalUrl = (href: string): string | null => {
    // Proxy URL — extract the url query param (match on port to handle
    // localhost vs 127.0.0.1 vs 0.0.0.0 differences)
    try {
        const parsed = new URL(href)
        if (parsed.port === PROXY_PORT && parsed.searchParams.has('url')) {
            return parsed.searchParams.get('url')
        }
    } catch { /* not a valid URL, fall through */ }

    // Archive.org link — extract the original URL after the timestamp
    const match = href.match(/\/web\/\d+\*?\/(.+)/)
    return match ? match[1] : null
}

const isNavigableUrl = (href: string): boolean => {
    try {
        const url = new URL(href)
        return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
        return false
    }
}

interface UseBrowserNavigationOptions {
    defaultUrl: string
    archiveTime?: string
    onShowError: () => void
}

export const useBrowserNavigation = ({ defaultUrl, archiveTime = DEFAULT_TIME, onShowError }: UseBrowserNavigationOptions) => {
    const [history, setHistory] = React.useState<string[]>([defaultUrl])
    const [historyIndex, setHistoryIndex] = React.useState(0)
    const [htmlContent, setHtmlContent] = React.useState<string>('')
    const [addressBarValue, setAddressBarValue] = React.useState(defaultUrl)
    const [isLoading, setIsLoading] = React.useState(true)
    const [statusText, setStatusText] = React.useState('')
    const [pageTitle, setPageTitle] = React.useState('')
    const abortControllerRef = React.useRef<AbortController | null>(null)

    const canGoBack = historyIndex > 0
    const canGoForward = historyIndex < history.length - 1

    const fetchPage = React.useCallback(async (url: string) => {
        abortControllerRef.current?.abort()
        const controller = new AbortController()
        abortControllerRef.current = controller

        setIsLoading(true)
        setStatusText(`Loading ${url}...`)

        try {
            const proxyUrl = `${PROXY_BASE}/?url=${encodeURIComponent(url)}&time=${archiveTime}`
            const response = await fetch(proxyUrl, { signal: controller.signal })

            if (!response.ok) {
                setStatusText(`Error: ${response.status}`)
                setHtmlContent(`<p>Could not load page: ${response.status} ${response.statusText}</p>`)
                return
            }

            const html = await response.text()
            setHtmlContent(html)
            const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
            setPageTitle(titleMatch ? titleMatch[1].trim() : '')
            const actualTime = response.headers.get('X-Archive-Time') || archiveTime
            setStatusText(`Viewing page archived ${formatArchiveTime(actualTime)}`)
        } catch (e: unknown) {
            if (e instanceof DOMException && e.name === 'AbortError') return
            setStatusText('Error loading page')
            setHtmlContent('<p>Could not connect to TimeMachine server. Is it running?</p>')
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false)
            }
        }
    }, [archiveTime])

    // Load default page on mount
    React.useEffect(() => {
        recordVisit(defaultUrl)
        fetchPage(defaultUrl)
    }, [defaultUrl, fetchPage])

    // Cleanup abort controller on unmount
    React.useEffect(() => {
        return () => abortControllerRef.current?.abort()
    }, [])

    const navigateTo = React.useCallback((url: string) => {
        setHistory(prev => [...prev.slice(0, historyIndex + 1), url])
        setHistoryIndex(prev => prev + 1)
        setAddressBarValue(url)
        recordVisit(url)
        fetchPage(url)
    }, [historyIndex, fetchPage])

    const goTo = React.useCallback(() => {
        const value = addressBarValue.trim()
        if (!isNavigableUrl(value)) {
            onShowError()
            return
        }
        navigateTo(value)
    }, [addressBarValue, navigateTo, onShowError])

    const goBack = React.useCallback(() => {
        if (!canGoBack) return
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setAddressBarValue(history[newIndex])
        fetchPage(history[newIndex])
    }, [canGoBack, historyIndex, history, fetchPage])

    const goForward = React.useCallback(() => {
        if (!canGoForward) return
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setAddressBarValue(history[newIndex])
        fetchPage(history[newIndex])
    }, [canGoForward, historyIndex, history, fetchPage])

    const refresh = React.useCallback(() => {
        fetchPage(history[historyIndex])
    }, [history, historyIndex, fetchPage])

    const handleContentClick = React.useCallback((e: React.MouseEvent) => {
        const anchor = (e.target as HTMLElement).closest('a')
        if (!anchor) return

        e.preventDefault()
        const href = anchor.href
        if (!href) return

        // Archive.org link — extract the original URL
        const originalUrl = extractOriginalUrl(href)
        if (originalUrl) {
            navigateTo(originalUrl)
            return
        }

        // Direct http/https link
        if (isNavigableUrl(href)) {
            navigateTo(href)
        }
    }, [navigateTo])

    return {
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
        refresh,
        handleContentClick,
    }
}
