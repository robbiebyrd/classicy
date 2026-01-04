import { sha512 } from 'sha512-crypt-ts'
import { DefaultFSContent } from '@/SystemFolder/SystemResources/File/DefaultClassicyFileSystem'
import {
    ClassicyFileSystemEntry,
    ClassicyFileSystemEntryFileType,
    ClassicyFileSystemEntryMetadata,
} from '@/SystemFolder/SystemResources/File/ClassicyFileSystemModel'
import directoryIcon from '@img/icons/system/folders/directory.png'

export type ClassicyPathOrFileSystemEntry = string | ClassicyFileSystemEntry

export class ClassicyFileSystem {
    storageKey: string
    fs: ClassicyFileSystemEntry
    separator: string

    constructor(storageKey: string = 'classicyStorage', defaultFS: any = DefaultFSContent, separator: string = ':') {
        this.storageKey = storageKey
        this.fs = defaultFS

        const retrieved = localStorage.getItem(this.storageKey)
        if (typeof window !== 'undefined' && retrieved) {
            const parsed = JSON.parse(retrieved)
            if (parsed) {
                this.fs = parsed
            }
        }

        this.separator = separator
        localStorage.setItem(this.storageKey, this.snapshot())
    }

    load(data: string) {
        this.fs = JSON.parse(data) as ClassicyFileSystemEntry
    }

    snapshot(): string {
        return JSON.stringify(this.fs, null, 2)
    }

    pathArray = (path: string) => {
        return [...path.split(this.separator)].filter((v) => v !== '')
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
        let items = {} as ClassicyFileSystemEntry

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
    ): ClassicyFileSystemEntry {
        let filteredItems = {} as ClassicyFileSystemEntry
        if (!this.resolve(path)) return filteredItems
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
            const contents = this.readFile(path)
            if (contents != undefined) {
                return new Blob(contents.split('')).size
            }
        } else if ('_data' in path) {
            return new Blob((path['_data'] as string).split('')).size
        }

        return -1
    }

    hash(path: ClassicyPathOrFileSystemEntry): string | undefined {
        if (typeof path === 'string') {
            const contents = this.readFile(path)
            if (contents == undefined) {
                return
            }
            return sha512.crypt(contents, '')
        }

        if ('_data' in path) {
            return sha512.crypt(path['_data'], '')
        }
        return
    }

    readFile(path: ClassicyPathOrFileSystemEntry): string | undefined {
        if (typeof path === 'string') {
            let item: ClassicyFileSystemEntry = this.resolve(path)
            return this.readFile(item)
        }

        if ('_data' in path) {
            return path['_data'] as string
        }

        return
    }

    writeFile(path: string, data: string, metaData?: ClassicyFileSystemEntryMetadata) {
        const updateObjProp = (obj: Record<string, any>, value: string, propPath: string) => {
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
        //               _icon: `/img/icons/system/files/file.png`,
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
                _icon: directoryIcon,
            } as ClassicyFileSystemEntry
        }

        let current = {} as ClassicyFileSystemEntry
        let reference

        for (let i = parts.length - 1; i >= 0; i--) {
            reference = current
            current = i === 0 ? {} as ClassicyFileSystemEntry : newDirectoryObject()
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
            .map(([_, b]) => {
                return !b['_invisible']
            })
            .filter(function (element) {
                return element || undefined
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

    statDir(path: string): ClassicyFileSystemEntry | undefined {
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

    private deletePropertyPath(fileSystem: ClassicyFileSystemEntry, path: string): ClassicyFileSystemEntry | undefined {
        const pathToArray = path.split(':')

        for (let i = 0; i < pathToArray.length - 1; i++) {
            fileSystem = fileSystem[pathToArray[i]]
            if (typeof fileSystem === 'undefined') {
                return
            }
        }

        const updatedPath = pathToArray.pop()
        if (updatedPath) {
            delete fileSystem[updatedPath]
        }

        return fileSystem
    }
}
