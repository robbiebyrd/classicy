import soundOnImg from 'img/icons/control-panels/sound-manager/sound-on.png'
import soundOffImg from 'img/icons/control-panels/sound-manager/sound-off.png'
import sound66Img from 'img/icons/control-panels/sound-manager/sound-66.png'
import sound33Img from 'img/icons/control-panels/sound-manager/sound-33.png'

export function timeFriendly(seconds: number): string {
    if (!Number.isFinite(seconds)) {
        return '0:00:00'
    }
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function getVolumeIcon(volume: number): string {
    if (volume === 0) {
        return soundOffImg
    }
    if (volume > 0 && volume < 0.3) {
        return sound33Img
    }
    if (volume >= 0.3 && volume < 0.7) {
        return sound66Img
    }
    return soundOnImg
}
