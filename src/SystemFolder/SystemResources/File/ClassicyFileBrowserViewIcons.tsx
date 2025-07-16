import {useDesktop, useDesktopDispatch} from '@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext'
import {cleanupIcon, iconImageByType} from '@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils'
import {ClassicyFileSystem} from '@/SystemFolder/SystemResources/File/ClassicyFileSystem'
import {ClassicyIcon} from '@/SystemFolder/SystemResources/Icon/ClassicyIcon'
import {ClassicyFileSystemEntryMetadata} from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";
import React, {RefObject, useEffect, useState} from 'react'

type ClassicyFileBrowserViewIconsProps = {
    fs: ClassicyFileSystem
    path: string
    appId: string
    dirOnClickFunc?: (path: string) => void
    fileOnClickFunc?: (path: string) => void
    holderRef?: RefObject<HTMLDivElement | null>
}


type iconType = {
    appId: string;
    name: string;
    invisible: any;
    icon: any;
    onClickFunc: () => void | (() => void);
    holder: React.RefObject<HTMLDivElement | null>;
    initialPosition: any
}

export const ClassicyFileBrowserViewIcons: React.FC<ClassicyFileBrowserViewIconsProps> = ({
                                                                                       fs,
                                                                                       path,
                                                                                       appId,
                                                                                       dirOnClickFunc = () => {
                                                                                       },
                                                                                       fileOnClickFunc = () => {
                                                                                       },
                                                                                       holderRef,
                                                                                   }) => {
    const desktopContext = useDesktop(),
        desktopEventDispatch = useDesktopDispatch()

    const [items, setItems] = useState<iconType[]>([])

    const openFileOrFolder = (properties: ClassicyFileSystemEntryMetadata, path: string, filename: string) => {
        switch (properties['_type']) {
            case 'directory': {
                return dirOnClickFunc(path + ':' + filename)
            }
            case 'file': {
                return fileOnClickFunc(path + ':' + filename)
            }
            default: {
                return () => {
                }
            }
        }
    }

    useEffect(() => {
        if (!holderRef?.current) {
            return
        }

        const containerMeasure: [number, number] = [
            holderRef.current.getBoundingClientRect().width,
            holderRef.current.getBoundingClientRect().height,
        ]
        const directoryListing: ClassicyFileSystemEntryMetadata | {} = fs.filterByType(path, ['file', 'directory'])

        let icons: iconType[] = []

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
        <div style={{position: 'absolute', width: '100%', height: '100%'}} ref={holderRef}>
            {items.map((item) => {
                return <ClassicyIcon {...item} key={item.name}/>
            })}
        </div>
    )
}
