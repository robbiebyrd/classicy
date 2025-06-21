import { capitalizeFirst, iconImageByType } from '@/app/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils'
import classicyFileBrowserViewTableStyles from '@/app/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.module.scss'
import { ClassicyFileSystem } from '@/app/SystemFolder/SystemResources/File/ClassicyFileSystem'
import { ClassicyFileSystemEntryMetadata } from '@/app/SystemFolder/SystemResources/File/ClassicyFileSystemModel'
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    getSortedRowModel,
    useReactTable,
} from '@tanstack/react-table'
import classNames from 'classnames'
import React, { useMemo, useState } from 'react'

type ClassicyFileBrowserViewTableProps = {
    fs: ClassicyFileSystem
    path: string
    appId: string
    iconSize?: number
    dirOnClickFunc?: any
    fileOnClickFunc?: any
}

type ColumnSort = {
    id: string
    desc: boolean
}
type SortingState = ColumnSort[]

const ClassicyFileBrowserViewTable: React.FC<ClassicyFileBrowserViewTableProps> = ({
    fs,
    path,
    iconSize = 64,
    appId,
    dirOnClickFunc = () => {},
    fileOnClickFunc = () => {},
}) => {
    const [selectedRow, setSelectedRow] = useState<string>()
    const [sorting, setSorting] = useState<SortingState>([{ id: '_name', desc: false }])

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

    const fileList = useMemo<ClassicyFileSystemEntryMetadata[]>(() => {
        const a = Object.entries(fs.filterByType(path, ['file', 'directory']))
        const directoryListing = a.map(([d, e]) => {
            let g = e
            g['_name'] = d
            g['_size'] = fs.formatSize(fs.size(e))
            g['_path'] = path + ':' + d
            return g
        })

        return Object.entries(directoryListing).map((entry, index) => {
            const filteredValues = {}
            const filteredKeyArray = Object.entries(entry[1]).filter((key) => key[0].startsWith('_'))
            for (const [key, value] of filteredKeyArray) {
                filteredValues[key] = value
            }

            return filteredValues as ClassicyFileSystemEntryMetadata
        })
    }, [path])

    const columnHelper = createColumnHelper<ClassicyFileSystemEntryMetadata>()

    const columns = useMemo(
        () => [
            columnHelper.accessor((row) => row._name, {
                id: '_name',
                cell: (info) => (
                    <div className={classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableRowContainer}>
                        <img
                            src={info.row.original['_icon'] || iconImageByType(info.row.original['_type'])}
                            width={iconSize}
                            alt={info.row.original['_path']}
                            className={classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableRowIcon}
                        />
                        <span className={classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableRowIconLabel}>
                            {info.getValue()}
                        </span>
                    </div>
                ),
                header: () => <span>Filename</span>,
                enableResizing: true,
            }),
            columnHelper.accessor((row) => row._type, {
                id: '_type',
                cell: (info) => <span>{capitalizeFirst(info.getValue())}</span>,
                header: () => <span>File Type</span>,
                enableResizing: true,
            }),
            columnHelper.accessor((row) => row._size, {
                id: '_size',
                cell: (info) => <span>{info.getValue()}</span>,
                header: () => <span>Size</span>,
                enableResizing: true,
            }),
        ],
        []
    )

    const table = useReactTable({
        data: fileList,
        columns,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        state: {
            sorting,
        },
        onSortingChange: setSorting,
    })

    return (
        <div
            key={appId + '_filebrowser_' + path}
            className={classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableContainer}
        >
            <table style={{}} className={classicyFileBrowserViewTableStyles.classicyFileBrowserViewTable}>
                <thead className={classNames(classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableHeader)}>
                    {table.getHeaderGroups().map((headerGroup) => (
                        <tr
                            key={headerGroup.id}
                            className={classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableColumnHeaderGroup}
                        >
                            {headerGroup.headers.map((header) => (
                                <th
                                    key={header.id}
                                    align={'left'}
                                    className={classNames(
                                        classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableColumnHeader,
                                        header.column.getIsResizing() ? 'isResizing' : '',
                                        header.id == sorting[0].id
                                            ? classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableColumnHeaderSelected
                                            : ''
                                    )}
                                    style={{
                                        width: header.id === '_icon' ? iconSize : 'auto',
                                    }}
                                    onClick={(e) => {
                                        if (
                                            header.column.getIsSorted() == false ||
                                            header.column.getIsSorted() == 'desc'
                                        ) {
                                            header.column.toggleSorting(false, false)
                                        } else {
                                            header.column.toggleSorting(true, false)
                                        }
                                    }}
                                >
                                    {!header.isPlaceholder &&
                                        flexRender(header.column.columnDef.header, header.getContext())}
                                    {header.id == sorting[0].id && (
                                        <img
                                            src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/img/ui/menu-dropdown-arrow-up.svg`}
                                            height={'50%'}
                                            style={{
                                                margin: '0 var(--window-padding-size)',
                                                transform: `rotate(${sorting[0].desc === true ? '0deg' : '180deg'})`,
                                            }}
                                        />
                                    )}
                                    {header.column.getCanResize() && (
                                        <div
                                            onMouseDown={header.getResizeHandler()}
                                            onTouchStart={header.getResizeHandler()}
                                            className={classNames(
                                                classicyFileBrowserViewTableStyles.resizer,
                                                header.column.getIsResizing() ? 'isResizing' : ''
                                            )}
                                        ></div>
                                    )}
                                </th>
                            ))}
                        </tr>
                    ))}
                </thead>
                <tbody className={classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableContent}>
                    {table.getRowModel().rows.map((row) => (
                        <tr
                            key={row.id}
                            className={classNames(
                                classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableRow,
                                selectedRow === row.id
                                    ? classicyFileBrowserViewTableStyles.classicyFileBrowserViewTableRowSelected
                                    : null
                            )}
                            onDoubleClick={() => openFileOrFolder(row.original, path, row.original._name)}
                            onClick={() => setSelectedRow(row.id)}
                        >
                            {row.getVisibleCells().map((cell) => (
                                <td key={cell.id} style={{ width: cell.column.getSize(), margin: 0, padding: 0 }}>
                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    {table.getFooterGroups().map((footerGroup) => (
                        <tr key={footerGroup.id}>
                            {footerGroup.headers.map((header) => (
                                <th key={header.id}>
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(header.column.columnDef.footer, header.getContext())}
                                </th>
                            ))}
                        </tr>
                    ))}
                </tfoot>
            </table>
            <div className="h-4" />
        </div>
    )
}

export default ClassicyFileBrowserViewTable
