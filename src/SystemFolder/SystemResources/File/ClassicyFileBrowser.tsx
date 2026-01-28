import { ClassicyFileSystem } from '@/SystemFolder/SystemResources/File/ClassicyFileSystem'
import React, {useRef} from 'react'
import {ClassicyFileBrowserViewIcons} from '@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons'
import {ClassicyFileBrowserViewTable} from '@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable'

type ClassicyFileBrowserProps = {
    fs: ClassicyFileSystem
    path: string
    appId: string
    display?: 'icons' | 'list'
    dirOnClickFunc?: any
    fileOnClickFunc?: any
}

export const ClassicyFileBrowser: React.FC<ClassicyFileBrowserProps> = ({
    fs,
    display = 'icons',
    path,
    appId,
    dirOnClickFunc = () => {},
    fileOnClickFunc = () => {},
}) => {
    const holderRef = useRef<HTMLDivElement>(null)

    return (
        <div className="absolute w-full h-full">
            {(() => {
                switch (display) {
                    case 'list':
                        return (
                            <ClassicyFileBrowserViewTable
                                fileOnClickFunc={fileOnClickFunc}
                                dirOnClickFunc={dirOnClickFunc}
                                fs={fs}
                                path={path}
                                appId={appId}
                                iconSize={18}
                                holderRef={holderRef}
                            />
                        )
                    default:
                        return (
                            <ClassicyFileBrowserViewIcons
                                fileOnClickFunc={fileOnClickFunc}
                                dirOnClickFunc={dirOnClickFunc}
                                fs={fs}
                                path={path}
                                appId={appId}
                                holderRef={holderRef}
                            />
                        )
                }
            })()}
        </div>
    )
}
