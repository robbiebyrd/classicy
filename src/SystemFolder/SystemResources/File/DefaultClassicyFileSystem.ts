import { ClassicyFileSystemEntryFileType } from '@/SystemFolder/SystemResources/File/ClassicyFileSystemModel'
import diskIcon from 'img/icons/system/drives/disk.png'
import directoryIcon from 'img/icons/system/folders/directory.png'
import macIcon from 'img/icons/system/mac.png'


export const DefaultFSContent = {
    'Macintosh HD': {
        _type: ClassicyFileSystemEntryFileType.Drive,
        _icon: diskIcon,
        'Applications': {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: directoryIcon,
            'TextEdit': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
                _invisible: true,
            },
            'Calculator': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
                _invisible: true,
            },
        },
        'Library': {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: directoryIcon,
            Extensions: {
                _type: ClassicyFileSystemEntryFileType.File,
                _icon: macIcon,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
        },
        'System Folder': {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: directoryIcon,
            'Finder': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
            'System': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
        },
        'Users': {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: directoryIcon,
            'Guest': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
            'Shared': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
        },
        'Utilities': {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: directoryIcon,
            'Disk Utility.app': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
            'Terminal.app': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
        },
        'Videos': {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: directoryIcon,
            'BuckBunny.mov': {
                _type: ClassicyFileSystemEntryFileType.File,
                _creator: 'QuickTime',
                _format: 'Video',
                _mimeType: 'text/plain',
                _data: JSON.stringify({
                    url: 'https://cdn1.911realtime.org/transcoded/newsw/2001-09-11/NEWSW_20010911_040000_The_National.m3u8',
                    name: 'Buck Bunny',
                    options: {
                        forceHLS: true,
                        forceSafariHLS: false,
                    },
                    type: 'video',
                }),
            },
            'Monkees.mp3': {
                _type: ClassicyFileSystemEntryFileType.File,
                _creator: 'QuickTime',
                _format: 'Audio',
                _mimeType: 'text/plain',
                _data: JSON.stringify({
                    url: 'http://www.samisite.com/sound/cropShadesofGrayMonkees.mp3',
                    name: 'Monkees',
                    type: 'audio',
                    subtitlesUrl: `/test.srt`,
                }),
            },
        },
    },
}
