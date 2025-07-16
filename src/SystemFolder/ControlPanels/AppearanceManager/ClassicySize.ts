export const intToPx = (int: number): string => {
    return int.toString() + 'px'
}

export const intToPct = (int: number | string): string => {
    if (typeof int === 'string') {
        return int
    }
    return int.toString() + '*'
}

export const pctToInt = (pct: string): number => {
    if (pct.trim().endsWith('%')) {
        pct = pct.slice(0, -1)
    }
    return parseInt(pct)
}

export const pxToInt = (px: string): number => {
    if (px.trim().endsWith('px')) {
        px = px.slice(0, -2)
    }
    return parseInt(px)
}
