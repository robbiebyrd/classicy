import { sha512 } from 'sha512-crypt-ts'

export enum ClassicyFileSystemEntryFileType {
    File = 'file',
    Shortcut = 'shortcut',
    AppShortcut = 'app_shortcut',
    Drive = 'drive',
    Directory = 'directory',
}

let defaultFSContent = {
    'Macintosh HD': {
        _type: ClassicyFileSystemEntryFileType.Drive,
        _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/drives/disk.png`,
        Applications: {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/folders/directory.png`,
            'TextEdit.app': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
                _invisible: true,
            },
            'Calculator.app': {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
                _invisible: true,
            },
        },
        Library: {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/folders/directory.png`,
            Extensions: {
                _type: ClassicyFileSystemEntryFileType.File,
                _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/mac.png`,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
        },
        'System Folder': {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/folders/directory.png`,
            Finder: {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
            System: {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
        },
        Users: {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/folders/directory.png`,
            Guest: {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
            Shared: {
                _type: ClassicyFileSystemEntryFileType.File,
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
        },
        Utilities: {
            _type: ClassicyFileSystemEntryFileType.Directory,
            _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/folders/directory.png`,
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
    },
}

export type ClassicyFileSystemEntryMetadata = {
    // The type of file
    _type: ClassicyFileSystemEntryFileType
    _mimeType?: string

    // Standard fields
    _label?: string
    _comments?: string

    // The URL if the file is a 'shortcut' type
    _url?: string

    // Icon data
    _icon?: string
    _badge?: React.ReactNode

    // Modification data
    _createdOn?: Date
    _modifiedOn?: Date
    _versions?: ClassicyFileSystemEntry[]

    // Entry Settings
    _readOnly?: boolean // The file cannot be modified. It's name can be changed.
    _nameLocked?: boolean // If true, the name cannot be changed.
    _trashed?: boolean // If true, this entry is in the trash and will not show, except in the Trash.
    _system?: boolean // The file is a system file and cannot be modified. It is also marked with an additional icon.
    _invisible?: boolean // The file is not normally visible, but can be accessed by apps.

    // Folders
    // Used for stat-ing directories
    _count?: number
    _countHidden?: number
    _path?: string

    // Files
    // The contents of the file.
    _data?: any

    // Used for stat-ing directories and files.
    _size?: number

    // Optional useful field for storing the name.
    _name?: string
}

export type ClassicyFileSystemEntry = {
    [entry: string]: any
} & ClassicyFileSystemEntryMetadata

export type ClassicyPathOrFileSystemEntry = string | ClassicyFileSystemEntry

export class ClassicyFileSystem {
    basePath: string
    fs: ClassicyFileSystemEntry
    separator: string

    constructor(basePath: string = '', defaultFS: any = defaultFSContent, separator: string = ':') {
        this.basePath = basePath
        this.fs =
            typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(this.basePath)) || defaultFS : defaultFS
        this.separator = separator
    }

    load(data: string) {
        this.fs = JSON.parse(data) as ClassicyFileSystemEntry
    }

    snapshot(): string {
        return JSON.stringify(this.fs, null, 2)
    }

    pathArray = (path: string) => {
        return [this.basePath, ...path.split(this.separator)].filter((v) => v !== '')
    }

    resolve(path: string): ClassicyFileSystemEntry {
        return this.pathArray(path).reduce((prev, curr) => prev?.[curr], this.fs)
    }

    formatSize(bytes: number, measure: 'bits' | 'bytes' = 'bytes', decimals: number = 2): string {
        if (!+bytes) {
            return '0 ' + measure
        }
        const sizes =
            measure === 'bits'
                ? ['Bits', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb']
                : ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

        const i = Math.floor(Math.log(bytes) / Math.log(1024))
        bytes = measure === 'bits' ? bytes * 8 : bytes

        return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(Math.max(0, decimals)))} ${sizes[i]}`
    }

    filterMetadata(content: ClassicyFileSystemEntry, mode: 'only' | 'remove' = 'remove') {
        let items: ClassicyFileSystemEntry | object = {}

        Object.entries(content).forEach(([key, value]) => {
            switch (mode) {
                case 'only': {
                    if (key.startsWith('_')) {
                        items[key] = value
                    }
                    break
                }
                default: {
                    if (!key.startsWith('_')) {
                        items[key] = value
                    }
                    break
                }
            }
        })
        return items
    }

    filterByType(
        path: string,
        byType: string | string[] = ['file', 'directory'],
        showInvisible: boolean = true
    ): ClassicyFileSystemEntry | {} {
        let filteredItems: ClassicyFileSystemEntry | {} = {}
        Object.entries(this.resolve(path)).forEach(([b, a]) => {
            if (a['_invisible'] === true && !showInvisible) {
                return
            }
            if (byType.includes(a['_type'])) {
                filteredItems[b] = a
            }
        })
        return filteredItems
    }

    statFile(path: string): ClassicyFileSystemEntry {
        let item = this.resolve(path)
        item['_size'] = this.size(path)
        return item
    }

    size(path: ClassicyPathOrFileSystemEntry): number {
        if (typeof path === 'string') {
            return new Blob(this.readFile(path).split('')).size
        }
        if (path instanceof Object && '_data' in path) {
            return new Blob((path['_data'] as string).split('')).size
        }
    }

    hash(path: ClassicyPathOrFileSystemEntry) {
        if (typeof path === 'string') {
            return sha512.crypt(this.readFile(path), '')
        }
        if (path instanceof Object && '_data' in path) {
            return sha512.crypt(path['_data'], '')
        }
    }

    readFile(path: ClassicyPathOrFileSystemEntry): string {
        if (path instanceof Object && '_data' in path) {
            return path['_data'] as string
        }
        if (typeof path === 'string') {
            let item: ClassicyFileSystemEntry = this.resolve(path)
            return this.readFile(item)
        }
    }

    writeFile(path: string, data: string, metaData?: ClassicyFileSystemEntryMetadata) {
        const updateObjProp = (obj, value, propPath) => {
            const [head, ...rest] = propPath.split(':')

            rest.length ? updateObjProp(obj[head], value, rest.join(':')) : (obj[head] = value)
        }

        let directoryPath = path.split(':')
        if (!this.resolve(directoryPath.join(':'))) {
            this.mkDir(directoryPath.join(':'))
        }

        return updateObjProp(this.fs, data, path)

        //     let directoryPath = path.split(':')
        //     const filename = directoryPath.pop()
        //     if (!this.resolve(directoryPath.join(':'))) {
        //         this.mkDir(directoryPath.join(':'))
        //     }
        //
        //     let pathArray = []
        //     let cs: ClassicyFileSystemEntry
        //     return directoryPath.map((p) => {
        //         pathArray.push(p)
        //
        //         const dir = this.resolve(directoryPath.join(':'))
        //         cs[p] = dir
        //         return dir
        //     })
        //
        //     let newDirectoryObject = metaData
        //         ? metaData
        //         : {
        //               _type: 'file',
        //               _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/files/file.png`,
        //           }
        //
        //     newDirectoryObject['_data'] = data
        //
        //     let current
        //     let reference = current
        //     const parts: string[] = this.pathArray(path)
        //
        //     for (let i = parts.length - 1; i >= 0; i--) {
        //         reference = current
        //         current = i === 0 ? {} : newDirectoryObject
        //         current[parts[i]] =
        //             i === parts.length - 1 ? newDirectoryObject : reference
        //     }
        //
        //     this.fs = this.deepMerge(current, this.fs)
        // }
    }

    rmDir(path: string) {
        return this.deletePropertyPath(this.fs, path)
    }

    mkDir(path: string) {
        const parts: string[] = this.pathArray(path)

        const newDirectoryObject = () => {
            return {
                _type: 'directory',
                _icon: `${process.env.NEXT_PUBLIC_BASE_PATH}/img/icons/system/folders/directory.png`,
            } as ClassicyFileSystemEntry
        }

        let current
        let reference = current

        for (let i = parts.length - 1; i >= 0; i--) {
            reference = current
            current = i === 0 ? {} : newDirectoryObject()
            current[parts[i]] = i === parts.length - 1 ? newDirectoryObject() : reference
        }

        this.fs = this.deepMerge(current, this.fs)
    }

    calculateSizeDir(path: ClassicyPathOrFileSystemEntry | string): number {
        const gatherSizes = (entry: ClassicyFileSystemEntry, field: string, value: string): any[] => {
            let results: string[] = []
            for (const key in entry) {
                if (key === field && entry[key] === value) {
                    results.push(String(this.size(entry)))
                } else if (typeof entry[key] === 'object' && entry[key] !== null) {
                    results = results.concat(gatherSizes(entry[key] as ClassicyFileSystemEntry, field, value))
                }
            }
            return results
        }

        if (typeof path === 'string') {
            path = this.resolve(path)
        }

        return gatherSizes(path, '_type', 'file').reduce((a, c) => a + +c, 0)
    }

    countVisibleFiles(path: string): number {
        const visibleFiles: boolean[] = Object.entries(this.filterMetadata(this.resolve(path)))
            .map(([a, b]) => {
                return !b['_invisible']
            })
            .filter(function (element) {
                return element !== false || undefined
            })
        return visibleFiles.length
    }

    countInvisibleFilesInDir(path: string): number {
        const invisibleFiles: boolean[] = Object.entries(this.filterMetadata(this.resolve(path)))
            .map(([a, b]) => {
                return b['_invisible']
            })
            .filter(function (element) {
                return element === false
            })
        return invisibleFiles.length
    }

    statDir(path: string): ClassicyFileSystemEntry {
        let current: ClassicyFileSystemEntry = this.resolve(path)
        if (!current) {
            return
        }
        let metaData = this.filterMetadata(current, 'only')

        let name = path.split(this.separator).slice(-1)

        let returnValue: ClassicyFileSystemEntry = {
            _count: this.countVisibleFiles(path),
            _countHidden: this.countInvisibleFilesInDir(path),
            _name: name[0],
            _path: path,
            _size: this.calculateSizeDir(current),
            _type: ClassicyFileSystemEntryFileType.Directory,
        }

        Object.entries(metaData).forEach(([key, value]) => {
            returnValue[key] = value
        })
        return returnValue
    }

    private deepMerge(source: ClassicyFileSystemEntry, target: ClassicyFileSystemEntry): ClassicyFileSystemEntry {
        Object.keys(target).forEach((key) => {
            const sourceKeyIsObject = source[key] instanceof Object
            const targetKeyIsObject = target[key] instanceof Object

            if (sourceKeyIsObject && targetKeyIsObject) {
                const sourceKeyIsArray = source[key] instanceof Array
                const targetKeyIsArray = target[key] instanceof Array

                if (sourceKeyIsArray && targetKeyIsArray) {
                    source[key] = Array.from(new Set(source[key].concat(target[key])))
                } else if (!sourceKeyIsArray && !targetKeyIsArray) {
                    this.deepMerge(source[key], target[key])
                } else {
                    source[key] = target[key]
                }
            } else {
                source[key] = target[key]
            }
        })
        return source
    }

    private deletePropertyPath(fileSystem: ClassicyFileSystemEntry, path: string): ClassicyFileSystemEntry {
        const pathToArray = path.split(':')

        for (let i = 0; i < pathToArray.length - 1; i++) {
            fileSystem = fileSystem[pathToArray[i]]
            if (typeof fileSystem === 'undefined') {
                return
            }
        }

        delete fileSystem[pathToArray.pop()]
        return fileSystem
    }
}
