import { ClassicyFileSystem } from './ClassicyFileSystem'

process.env.NEXT_PUBLIC_BASE_PATH = '/platinum'

let defaultFSContent = {
    'Macintosh HD': {
        _type: 'drive',
        _icon: `drive.png`,
        Files: {
            _type: 'directory',
            _icon: `directory.png`,
            'Invisible File': {
                _type: 'file',
                _mimeType: 'text/plain',
                _data: 'Invisible File Contents',
                _invisible: true,
            },
            'Visible File': {
                _type: 'file',
                _mimeType: 'text/plain',
                _data: 'Visible File Contents',
                _invisible: false,
            },
        },
        Apps: {
            _type: 'directory',
            _icon: `directory.png`,
            Extensions: {
                _type: 'directory',
                _icon: `directory.png`,
                System: {
                    _type: 'file',
                    _mimeType: 'text/plain',
                    _data: 'File Contents',
                },
            },
            'Disk Utility.app': {
                _type: 'file',
                _mimeType: 'text/plain',
                _data: 'File Contents',
            },
            'Terminal.app': {
                _type: 'file',
                _mimeType: 'text/plain',
                _data: 'This is the Terminal Application.',
            },
        },
    },
}

const fs = new ClassicyFileSystem('', defaultFSContent)

describe('File System', () => {
    it('can stat a directory', () => {
        const baseDir = fs.statDir('Macintosh HD')
        expect(baseDir['_count']).toEqual(2)
        expect(baseDir['_countHidden']).toEqual(0)
        expect(baseDir['_icon']).toEqual('drive.png')
        expect(baseDir['_name']).toEqual('Macintosh HD')
        expect(baseDir['_path']).toEqual('Macintosh HD')
        expect(baseDir['_type']).toEqual('drive')

        const filesDir = fs.statDir('Macintosh HD:Files')
        expect(filesDir['_count']).toEqual(1)
        expect(filesDir['_countHidden']).toEqual(1)
        expect(filesDir['_icon']).toEqual('directory.png')
        expect(filesDir['_name']).toEqual('Files')
        expect(filesDir['_path']).toEqual('Macintosh HD:Files')
        expect(filesDir['_type']).toEqual('directory')
    })
    it('can calculate the size of a directory', () => {
        const rootDirectorySize = fs.calculateSizeDir('Macintosh HD')
        expect(rootDirectorySize).toEqual(103)

        const filesDirectorySize = fs.calculateSizeDir('Macintosh HD:Apps')
        expect(filesDirectorySize).toEqual(59)
    })

    it('can create a directory', () => {
        fs.mkDir('Macintosh HD:Test Directory')
        const rootDirectoryStat = fs.statDir('Macintosh HD:Test Directory')
        expect(rootDirectoryStat['_type']).toEqual('directory')
        expect(rootDirectoryStat['_name']).toEqual('Test Directory')
        expect(rootDirectoryStat['_path']).toEqual('Macintosh HD:Test Directory')
        expect(rootDirectoryStat['_icon']).toEqual('/classicy/img/icons/system/folders/directory.png')
        expect(rootDirectoryStat['_count']).toEqual(0)
        expect(rootDirectoryStat['_countHidden']).toEqual(0)
        expect(rootDirectoryStat['_size']).toEqual(0)
    })

    it('can create a nested directories', () => {
        fs.mkDir('Macintosh HD:Test Directory:Test Directory 2:Test Directory 3')
        const rootDirectoryStat = fs.statDir('Macintosh HD:Test Directory')

        const secondDirectoryStat = fs.statDir('Macintosh HD:Test Directory:Test Directory 2')

        const thirdDirectoryStat = fs.statDir('Macintosh HD:Test Directory:Test Directory 2:Test Directory 3')

        expect(rootDirectoryStat['_count']).toEqual(1)
        expect(secondDirectoryStat['_count']).toEqual(1)
        expect(thirdDirectoryStat['_count']).toEqual(0)
    })

    it('can remove a directory', () => {
        fs.mkDir('Macintosh HD:Test Directory')
        const rootDirectoryStat = fs.statDir('Macintosh HD:Test Directory')
        expect(rootDirectoryStat['_path']).toEqual('Macintosh HD:Test Directory')

        fs.rmDir('Macintosh HD:Test Directory')
        const secondDirectoryStat = fs.statDir('Macintosh HD:Test Directory')
        expect(secondDirectoryStat).toEqual(undefined)

        const baseDir = fs.statDir('Macintosh HD')
        expect(baseDir['_count']).toEqual(2)
        expect(baseDir['_countHidden']).toEqual(0)
        expect(baseDir['_icon']).toEqual('drive.png')
        expect(baseDir['_name']).toEqual('Macintosh HD')
        expect(baseDir['_path']).toEqual('Macintosh HD')
        expect(baseDir['_type']).toEqual('drive')
    })

    it('can read a file', () => {
        const rootDirectorySize = fs.readFile('Macintosh HD:Apps:Terminal.app')
        expect(rootDirectorySize).toEqual('This is the Terminal Application.')
    })

    it('can write a file', () => {
        fs.writeFile('Macintosh HD:Apps:Test Apps:Test App:Resources:Test.app', 'Test Data')
        const rootDirectorySize = fs.readFile('Macintosh HD:Apps:Test Apps:Test App:Resources:Test.app')
        expect(fs).toEqual('Test Data.')
    })
})
