export function timeFriendly(seconds: number): string {
    if (!Number.isFinite(seconds)) return '0:00:00'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function getVolumeIcon(volume: number): string {
    if (volume === 0) return 'sound-off.png'
    if (volume > 0 && volume < 0.3) return 'sound-33.png'
    if (volume >= 0.3 && volume < 0.7) return 'sound-66.png'
    return 'sound-on.png'
}
