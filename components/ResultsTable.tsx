import React, { useRef } from "react"
import type { ProductCalculatedData } from "../types"
import { useVirtualizer } from "@tanstack/react-virtual"

interface ResultsTableProps {
  results: ProductCalculatedData[]
  weekHeaders: string[]
}

const ResultsTable: React.FC<ResultsTableProps> = ({ results, weekHeaders }) => {
  const parentRef = useRef<HTMLDivElement>(null)

  if (!results || results.length === 0) {
    return <p className="text-center text-slate-600 my-8">No hay resultados para mostrar.</p>
  }

  // --- Column Configuration & Headers ---
  const originalPeriodHeaders = weekHeaders
  const reversedPeriodHeaders = [...originalPeriodHeaders].reverse()

  const staticHeaders = [
    "Venta Prom. Semanal",
    "Semanas Cobertura",
    "Stock Actual",
    "Stock Ideal",
    "Unidades a Abastecer",
    "Estado",
  ]
  const allHeaders = ["ID", "Nombre", "Venta Mes Actual", ...reversedPeriodHeaders, ...staticHeaders]

  const getColumnConfig = (header: string) => {
    switch (header) {
      case "ID":
        return { width: 70, align: "text-left" }
      case "Nombre":
        return { width: 319, align: "text-left" }
      case "Venta Mes Actual":
        return { width: 80, align: "text-right" }
      case "Venta Prom. Semanal":
        return { width: 80, align: "text-right" }
      case "Semanas Cobertura":
        return { width: 80, align: "text-right" }
      case "Stock Actual":
        return { width: 80, align: "text-right" }
      case "Stock Ideal":
        return { width: 80, align: "text-right" }
      case "Unidades a Abastecer":
        return { width: 80, align: "text-right" }
      case "Estado":
        return { width: 70, align: "text-center" }
      default: // For "Vta Semana XX"
        return { width: 70, align: "text-right" }
    }
  }

  const columnConfigs = allHeaders.map((h) => ({ header: h, ...getColumnConfig(h) }))
  const totalWidth = columnConfigs.reduce((acc, c) => acc + c.width, 0)

  // --- Virtualizer ---
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56, // Estimate for rows with wrapping text
    overscan: 10,
    measureElement: (element) => element.getBoundingClientRect().height,
  })
  const virtualItems = rowVirtualizer.getVirtualItems()

  // --- Helper Functions ---
  const formatHeader = (headerText: string): JSX.Element => {
    const words = headerText.split(" ")
    const lines: string[] = []
    let currentLine = ""
    for (const word of words) {
      if (currentLine.length > 0 && (currentLine + " " + word).length > 12) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = currentLine ? `${currentLine} ${word}` : word
      }
    }
    if (currentLine) lines.push(currentLine)
    return (
      <>
        {lines.map((line, index) => (
          <React.Fragment key={line + index}>
            {line}
            {index < lines.length - 1 && <br />}
          </React.Fragment>
        ))}
      </>
    )
  }

  const getStatusComponent = (product: ProductCalculatedData) => {
    if (product.error) {
      return (
        <span className="text-red-600 font-medium" title={product.error}>
          Error
        </span>
      )
    }
    if (product.status === "Fijo") {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">Fijo</span>
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">OK</span>
  }

  // --- Render ---
  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight: "70vh" }}>
        <div style={{ width: `${totalWidth}px` }}>
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 bg-slate-200">
            <div className="flex">
              {columnConfigs.map(({ header, width }, index) => {
                const isSticky = index < 2
                const stickyStyles = isSticky ? { left: index === 0 ? 0 : columnConfigs[0].width } : {}
                const stickyClasses = isSticky ? "sticky z-10" : ""
                const borderClass = index === 1 ? "border-r-2 border-slate-400" : "border-r border-slate-300/50"

                return (
                  <div
                    key={header}
                    className={`px-4 py-2 text-xs font-bold text-slate-700 flex items-end justify-center bg-slate-200 ${borderClass} last:border-r-0 ${stickyClasses}`}
                    style={{ flex: `0 0 ${width}px`, minHeight: "3.5rem", ...stickyStyles }}
                    title={header}
                  >
                    <div className={`leading-tight pb-1 w-full text-center`}>{formatHeader(header)}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Virtualized Body */}
          <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {virtualItems.map((virtualRow) => {
              const product = results[virtualRow.index]

              // Create an array of the cell content for the current product, in the correct display order
              const rowData = [
                product.ID,
                product.Nombre,
                product.Venta_Total_Mes_Actual,
                ...[...product.salesPeriods].reverse(), // Match reversed headers
                product.Venta_Promedio_Semanal,
                product.Semanas_Cobertura_Stock,
                product.Stock_Actual,
                product.Stock_Ideal,
                product.Unidades_A_Abastecer,
                getStatusComponent(product),
              ]

              return (
                <div
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className="group flex text-sm border-b border-slate-200"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {rowData.map((cellData, cellIndex) => {
                    const config = columnConfigs[cellIndex]
                    if (!config) return null

                    const getCellBgClass = (): string => {
                      if (product.error) {
                        return "bg-red-50 group-hover:bg-red-100"
                      }

                      const isUnidadesFijo = config.header === "Unidades a Abastecer" && product.status === "Fijo"
                      if (isUnidadesFijo) {
                        return "bg-purple-50 group-hover:bg-purple-100"
                      }

                      return "bg-white group-hover:bg-slate-50"
                    }

                    const isSticky = cellIndex < 2
                    const stickyStyles = isSticky ? { left: cellIndex === 0 ? 0 : columnConfigs[0].width } : {}
                    const isNombre = config.header === "Nombre"
                    const isUnidades = config.header === "Unidades a Abastecer"
                    const isNumericBold = ["Venta Prom. Semanal", "Stock Ideal"].includes(config.header)

                    const justifyContent =
                      {
                        "text-left": "justify-start",
                        "text-right": "justify-end",
                        "text-center": "justify-center",
                      }[config.align] || "justify-start"
                      
                    const bodyBorderClass =
                      cellIndex === columnConfigs.length - 1
                        ? "" // No right border on the last cell
                        : cellIndex === 1
                        ? "border-r-2 border-slate-400" // Thicker border after "Nombre"
                        : "border-r border-slate-300/50"; // Standard border for other cells

                    const stickyClasses = isSticky ? "sticky z-10" : ""

                    const classNames = [
                      "px-4 py-1 flex items-center text-slate-700",
                      justifyContent,
                      isNombre ? "whitespace-normal" : "whitespace-nowrap",
                      isUnidades ? "font-bold" : "",
                      isNumericBold ? "font-medium" : "",
                      getCellBgClass(),
                      stickyClasses,
                      bodyBorderClass,
                    ]
                      .filter(Boolean)
                      .join(" ")

                    return (
                      <div
                        key={config.header}
                        className={classNames}
                        style={{ flex: `0 0 ${config.width}px`, ...stickyStyles }}
                        title={String(cellData)}
                      >
                        {cellData}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResultsTable