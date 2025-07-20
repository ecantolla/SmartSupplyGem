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

  // --- Column Configuration ---
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
      case "ID": return { width: "70px", align: "text-left" };
      case "Nombre": return { width: "319px", align: "text-left" };
      case "Venta Mes Actual": return { width: "80px", align: "text-right" };
      case "Venta Prom. Semanal": return { width: "80px", align: "text-right" };
      case "Semanas Cobertura": return { width: "80px", align: "text-right" };
      case "Stock Actual": return { width: "80px", align: "text-right" };
      case "Stock Ideal": return { width: "80px", align: "text-right" };
      case "Unidades a Abastecer": return { width: "80px", align: "text-right" };
      case "Estado": return { width: "70px", align: "text-center" };
      default: return { width: "70px", align: "text-right" }; // For "Vta Semana XX"
    }
  }

  const columnConfigs = allHeaders.map((h) => ({ header: h, ...getColumnConfig(h) }))
  
  // --- Virtualizer ---
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  })
  const virtualItems = rowVirtualizer.getVirtualItems()

  // --- Helper Functions ---
  const formatHeader = (headerText: string): JSX.Element => {
    const words = headerText.split(" ")
    if (words.length <= 2) return <>{headerText}</>
    return (
      <>
        {words.slice(0, 2).join(" ")}
        <br />
        {words.slice(2).join(" ")}
      </>
    )
  }

  const getStatusComponent = (product: ProductCalculatedData) => {
    if (product.error) {
      return <span className="text-red-600 font-medium" title={product.error}>Error</span>
    }
    if (product.status === "Fijo") {
      return <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">Fijo</span>
    }
    return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-bold rounded-full">OK</span>
  }

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div ref={parentRef} className="overflow-auto" style={{ maxHeight: "70vh", scrollbarGutter: 'stable' }}>
        <table className="border-collapse w-full">
          <thead className="sticky top-0 z-20 bg-slate-200">
            <tr>
              {columnConfigs.map(({ header, width, align }, index) => {
                const isSticky = index < 2
                const stickyStyles = isSticky ? { left: index === 0 ? 0 : columnConfigs[0].width } : {}

                return (
                  <th
                    key={header}
                    className={`px-4 py-2 text-xs font-bold text-slate-700 align-bottom ${align} ${isSticky ? "sticky z-10 bg-slate-200" : ""} border-b-2 border-slate-300`}
                    style={{ minWidth: width, width: width, ...stickyStyles }}
                  >
                    {formatHeader(header)}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}>
            {virtualItems.map((virtualRow) => {
              const product = results[virtualRow.index]
              const rowData = [
                product.ID,
                product.Nombre,
                product.Venta_Total_Mes_Actual,
                ...[...product.salesPeriods].reverse(),
                product.Venta_Promedio_Semanal,
                product.Semanas_Cobertura_Stock,
                product.Stock_Actual,
                product.Stock_Ideal,
                product.Unidades_A_Abastecer,
                getStatusComponent(product),
              ]
              
              const rowBgClass = product.error ? "bg-red-50" : "bg-white";

              return (
                <tr
                  key={virtualRow.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  className={`hover:bg-slate-50 ${rowBgClass}`}
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
                       if (config.header === "Unidades a Abastecer" && product.status === "Fijo") {
                          return "bg-purple-50 hover:bg-purple-100"
                       }
                       return "";
                    }

                    const isSticky = cellIndex < 2
                    const isNombre = config.header === "Nombre"
                    const isUnidades = config.header === "Unidades a Abastecer"
                    const isNumericBold = ["Venta Prom. Semanal", "Stock Ideal"].includes(config.header)

                    const classNames = [
                      "px-4 py-3 text-sm text-slate-700 border-b border-slate-200",
                      config.align,
                      isNombre ? "whitespace-normal" : "whitespace-nowrap",
                      isUnidades ? "font-bold" : "",
                      isNumericBold ? "font-medium" : "",
                      isSticky ? `sticky z-10 ${rowBgClass} hover:bg-slate-50` : "",
                      getCellBgClass(),
                    ]
                      .filter(Boolean)
                      .join(" ")
                      
                    const stickyStyles = isSticky ? { left: cellIndex === 0 ? 0 : columnConfigs[0].width } : {}

                    return (
                      <td
                        key={config.header}
                        className={classNames}
                        style={{...stickyStyles, minWidth: config.width, width: config.width}}
                        title={String(cellData)}
                      >
                        {cellData}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ResultsTable
