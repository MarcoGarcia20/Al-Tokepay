// ============================================================
// DataGrid — Tabla financiera reutilizable y responsiva
// Soporta búsqueda, ordenación, paginación, carga y animaciones
// ============================================================

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Inbox } from 'lucide-react'
import { listContainerVariants, listItemVariants } from '../animations/variants'


export interface ColumnDef<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

interface DataGridProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  isLoading?: boolean
  searchKey?: keyof T | ((row: T) => string)
  searchPlaceholder?: string
  actionsSlot?: React.ReactNode
  filtersSlot?: React.ReactNode
  emptyText?: string
  pageSize?: number
  onRowClick?: (row: T) => void
}

export function DataGrid<T>({
  data,
  columns,
  isLoading = false,
  searchKey,
  searchPlaceholder = 'Buscar...',
  actionsSlot,
  filtersSlot,
  emptyText = 'No se encontraron registros',
  pageSize = 10,
  onRowClick,
}: DataGridProps<T>) {
  // Estados de paginación, búsqueda y ordenación
  const [searchTerm, setSearchTerm] = useState('')
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  // 1. Filtrar los datos locales si hay searchKey y searchTerm
  const filteredData = useMemo(() => {
    if (!searchTerm || !searchKey) return data

    return data.filter((row) => {
      let value = ''
      if (typeof searchKey === 'function') {
        value = searchKey(row)
      } else {
        const rawValue = row[searchKey]
        value = rawValue ? String(rawValue) : ''
      }
      return value.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }, [data, searchTerm, searchKey])

  // Resetear a la página 1 cuando cambie la búsqueda
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1)
  }

  // 2. Ordenar datos
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData

    const sorted = [...filteredData]
    sorted.sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortConfig.key]
      const bVal = (b as Record<string, unknown>)[sortConfig.key]

      if (aVal === undefined || aVal === null) return 1
      if (bVal === undefined || bVal === null) return -1

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal
      }

      const strA = String(aVal).toLowerCase()
      const strB = String(bVal).toLowerCase()

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [filteredData, sortConfig])

  // Manejar click de ordenación
  const handleSort = (key: string, sortable = false) => {
    if (!sortable) return

    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // 3. Paginación
  const totalPages = Math.ceil(sortedData.length / pageSize)
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return sortedData.slice(start, end)
  }, [sortedData, currentPage, pageSize])

  const alignStyles = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right justify-end',
  }

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Barra de Filtros / Herramientas */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/20 p-1 rounded-2xl border border-slate-900/40">
        <div className="flex flex-1 items-center gap-3 w-full">
          {searchKey && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={handleSearchChange}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-slate-900/50 border border-slate-800/80 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/40 transition-all"
              />
            </div>
          )}
          {filtersSlot}
        </div>

        {actionsSlot && <div className="flex items-center gap-2 shrink-0">{actionsSlot}</div>}
      </div>

      {/* Tabla Contenedora */}
      <div className="overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/40 backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="financial-table">
            <thead>
              <tr>
                {columns.map((col) => {
                  const isSorted = sortConfig?.key === col.key
                  const sortDir = sortConfig?.direction

                  return (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key, col.sortable)}
                      className={`${col.sortable ? 'cursor-pointer select-none hover:bg-slate-900/60' : ''} transition-colors duration-150`}
                    >
                      <div className={`flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                        <span>{col.header}</span>
                        {col.sortable && (
                          <span className="text-slate-500">
                            {isSorted ? (
                              sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                            ) : (
                              <div className="flex flex-col -gap-0.5 opacity-30">
                                <ChevronUp size={8} />
                                <ChevronDown size={8} />
                              </div>
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <motion.tbody
              variants={listContainerVariants}
              initial="initial"
              animate="animate"
            >
              {isLoading ? (
                // Skeleton Rows
                Array.from({ length: pageSize }).map((_, rIndex) => (
                  <tr key={`skeleton-row-${rIndex}`}>
                    {columns.map((col) => (
                      <td key={`skeleton-cell-${col.key}`}>
                        <div className={`h-4 skeleton rounded ${col.align === 'right' ? 'w-20 ml-auto' : 'w-24'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={columns.length} className="text-center py-16">
                    <motion.div
                      className="flex flex-col items-center justify-center gap-3 text-slate-500"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="w-12 h-12 rounded-2xl bg-slate-900/50 border border-slate-800/50 flex items-center justify-center text-slate-400">
                        <Inbox size={22} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold text-slate-300">{emptyText}</span>
                        <span className="text-xs text-slate-500">Intenta cambiar los filtros o el texto de búsqueda</span>
                      </div>
                    </motion.div>
                  </td>
                </tr>
              ) : (
                // Data Rows
                paginatedData.map((row, index) => {
                  const rowId = (row as Record<string, unknown>).id || `row-${index}`

                  return (
                    <motion.tr
                      key={String(rowId)}
                      variants={listItemVariants}
                      onClick={() => onRowClick?.(row)}
                      className={onRowClick ? 'cursor-pointer hover:bg-slate-900/40 transition-colors' : ''}
                    >
                      {columns.map((col) => {
                        const content = col.render
                          ? col.render(row)
                          : String((row as Record<string, unknown>)[col.key] ?? '')

                        return (
                          <td
                            key={`${String(rowId)}-${col.key}`}
                            className={`${alignStyles[col.align || 'left']} text-slate-300 text-sm`}
                          >
                            {content}
                          </td>
                        )
                      })}
                    </motion.tr>
                  )
                })
              )}
            </motion.tbody>
          </table>
        </div>

        {/* Footer de Paginación */}
        {!isLoading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-900/80 bg-slate-950/80 px-6 py-4">
            <span className="text-xs text-slate-400">
              Mostrando <span className="font-semibold text-slate-200">{Math.min(filteredData.length, (currentPage - 1) * pageSize + 1)}</span> a{' '}
              <span className="font-semibold text-slate-200">{Math.min(filteredData.length, currentPage * pageSize)}</span> de{' '}
              <span className="font-semibold text-slate-200">{filteredData.length}</span> registros
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-800 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1
                const isCurrent = currentPage === pageNum
                return (
                  <button
                    key={`page-${pageNum}`}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 min-w-[32px] px-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                        : 'border border-slate-800 bg-slate-900/20 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-slate-200 hover:border-slate-700 disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:border-slate-800 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
