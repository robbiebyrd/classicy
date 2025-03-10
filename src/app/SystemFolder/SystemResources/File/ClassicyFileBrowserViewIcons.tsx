import { useDesktop, useDesktopDispatch } from '@/app/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import { ClassicyFileSystem } from '@/app/SystemFolder/SystemResources/File/ClassicyFileSystem'
import ClassicyIcon from '@/app/SystemFolder/SystemResources/Icon/ClassicyIcon'
import React from 'react'
import { getIconSize } from '@/app/SystemFolder/SystemResources/Desktop/ClassicyDesktopIconContext'
import { ClassicyTheme } from '@/app/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance'

type ClassicyFileBrowserViewIconsProps = {
    fs: ClassicyFileSystem
    path: string
    appId: string
    dirOnClickFunc?: (path: string) => void
    fileOnClickFunc?: (path: string) => void
    holderRef: React.RefObject<HTMLDivElement>
}

const ClassicyFileBrowserViewIcons: React.FC<ClassicyFileBrowserViewIconsProps> = ({
    fs,
    path,
    appId,
    dirOnClickFunc = () => {},
    fileOnClickFunc = () => {},
    holderRef,
}) => {
    const desktopContext = useDesktop(),
        desktopEventDispatch = useDesktopDispatch()

    const [items, setItems] = React.useState([])

    const iconImageByType = (byType: string) => {
        switch (byType) {
            case 'directory': {
                return `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/folders/directory.png`
            }
            default: {
                return `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/icons/system/files/file.png`
            }
        }
    }

    const openFileOrFolder = (properties, path: string, filename: string) => {
        switch (properties['_type']) {
            case 'directory': {
                return dirOnClickFunc(path + ':' + filename)
            }
            case 'file': {
                return fileOnClickFunc(path + ':' + filename)
            }
            default: {
                return () => {}
            }
        }
    }

    const createGrid = (
        iconSize: number,
        iconPadding: number,
        containerMeasure: [number, number]
    ): [number, number] => {
        return [
            Math.floor(containerMeasure[0] / (iconSize * 2 + iconPadding)),
            Math.floor(containerMeasure[1] / (iconSize * 2 + iconPadding)),
        ]
    }

    const getGridPosition = (i: number, grid: [number, number]): [number, number] => {
        return [i % grid[0], Math.floor(i / grid[0])]
    }

    function cleanupIcon(
        theme: ClassicyTheme,
        iconIndex: number,
        iconTotal: number,
        containerMeasure: [number, number]
    ): [number, number] {
        const [iconSize, iconPadding] = getIconSize(theme)
        let grid = createGrid(iconSize, iconTotal, containerMeasure)
        const [startX, startY] = getGridPosition(iconIndex, grid)

        return [iconPadding + Math.floor(iconSize * 2 * startX), iconPadding + Math.floor(iconSize * 2 * startY)]
    }

    React.useEffect(() => {
        const containerMeasure: [number, number] = [
            holderRef.current.getBoundingClientRect().width,
            holderRef.current.getBoundingClientRect().height,
        ]
        const directoryListing = fs.filterByType(path, ['file', 'directory'])

        let icons = []
        Object.entries(directoryListing).forEach(([filename, properties], index) => {
            icons.push({
                appId: appId,
                name: filename,
                invisible: properties['_invisible'],
                icon: properties['_icon'] || iconImageByType(properties['_type']),
                onClickFunc: () => openFileOrFolder(properties, path, filename),
                holder: holderRef,
                initialPosition: cleanupIcon(
                    desktopContext.System.Manager.Appearance.activeTheme,
                    index,
                    Object.entries(directoryListing).length,
                    containerMeasure
                ),
            })
        })
        setItems((_) => [...icons])
    }, [path, fs, desktopContext.System.Manager.Appearance.activeTheme, holderRef])

    return (
        <div style={{ position: 'absolute', width: '100%', height: '100%' }} ref={holderRef}>
            {items.map((item) => {
                return <ClassicyIcon {...item} key={item.name} />
            })}
        </div>
    )
}

export default ClassicyFileBrowserViewIcons
